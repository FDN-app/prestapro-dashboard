BEGIN;

ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS renovado_desde_id UUID REFERENCES prestamos(id);
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS monto_cancelado_renovacion NUMERIC(12,2);
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS efectivo_entregado NUMERIC(12,2);
ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS monto_mora NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS moras_manuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  cuota_id UUID NOT NULL REFERENCES cuotas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('porcentaje', 'monto')),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  base_calculo NUMERIC(12,2) NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  creado_por UUID REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE moras_manuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moras visibles por usuarios" ON moras_manuales FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION agregar_mora_manual(
  p_prestamo_id UUID, p_cuota_id UUID, p_tipo TEXT, p_valor NUMERIC
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_capital NUMERIC; v_monto NUMERIC; v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede agregar mora';
  END IF;
  IF p_tipo NOT IN ('porcentaje', 'monto') OR p_valor <= 0 THEN RAISE EXCEPTION 'Valor de mora inválido'; END IF;
  SELECT monto_original INTO v_capital FROM prestamos WHERE id = p_prestamo_id FOR UPDATE;
  IF v_capital IS NULL OR NOT EXISTS (SELECT 1 FROM cuotas WHERE id = p_cuota_id AND prestamo_id = p_prestamo_id) THEN
    RAISE EXCEPTION 'Préstamo o cuota inválidos';
  END IF;
  v_monto := ROUND(CASE WHEN p_tipo = 'porcentaje' THEN v_capital * p_valor / 100 ELSE p_valor END, 2);
  UPDATE cuotas SET monto_mora = COALESCE(monto_mora, 0) + v_monto WHERE id = p_cuota_id;
  UPDATE prestamos SET saldo_pendiente = saldo_pendiente + v_monto WHERE id = p_prestamo_id;
  INSERT INTO moras_manuales(prestamo_id, cuota_id, tipo, valor, base_calculo, monto, creado_por)
  VALUES (p_prestamo_id, p_cuota_id, p_tipo, p_valor, v_capital, v_monto, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO log_auditoria(usuario_id, accion, entidad, entidad_id, detalles)
  VALUES (auth.uid(), 'AGREGAR_MORA', 'cuotas', p_cuota_id, jsonb_build_object('tipo', p_tipo, 'valor', p_valor, 'base', v_capital, 'monto', v_monto));
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION agregar_mora_manual(UUID, UUID, TEXT, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION renovar_prestamo_con_descuento(
  p_viejo_prestamo_id UUID, p_monto_cancelado NUMERIC, p_cliente_id UUID,
  p_monto_original NUMERIC, p_tasa_interes NUMERIC, p_comision NUMERIC,
  p_tipo_interes TEXT, p_cantidad_cuotas INT, p_frecuencia_pago TEXT,
  p_frecuencia_dias INT, p_fecha_inicio DATE, p_fecha_primera_cuota DATE,
  p_cantidad_renovaciones INT, p_cuotas JSONB, p_renovados NUMERIC DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_nuevo UUID; v_cuota JSONB; v_deuda NUMERIC; v_efectivo NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id=auth.uid() AND rol='admin') THEN RAISE EXCEPTION 'Solo un administrador puede renovar'; END IF;
  SELECT COALESCE(SUM(GREATEST(monto_cuota-monto_cobrado,0)+COALESCE(monto_mora,0)),0) INTO v_deuda
    FROM cuotas WHERE prestamo_id=p_viejo_prestamo_id AND estado IN ('pendiente','parcial','vencida');
  IF ABS(v_deuda-p_monto_cancelado) > 0.01 THEN RAISE EXCEPTION 'La deuda anterior cambió. Actualizá la pantalla e intentá nuevamente'; END IF;
  IF p_monto_original < v_deuda THEN RAISE EXCEPTION 'El nuevo préstamo no alcanza para cancelar la deuda anterior'; END IF;
  v_efectivo := p_monto_original-v_deuda;
  UPDATE prestamos SET estado='refinanciado', saldo_pendiente=0 WHERE id=p_viejo_prestamo_id AND cliente_id=p_cliente_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Préstamo anterior inválido'; END IF;
  UPDATE cuotas SET estado='cancelada' WHERE prestamo_id=p_viejo_prestamo_id AND estado IN ('pendiente','parcial','vencida');
  INSERT INTO prestamos(cliente_id,monto_original,saldo_pendiente,tasa_interes,comision,tipo_interes,cantidad_cuotas,
    frecuencia_pago,frecuencia_dias,fecha_inicio,fecha_primera_cuota,cantidad_renovaciones,renovados,creado_por,
    renovado_desde_id,monto_cancelado_renovacion,efectivo_entregado)
  VALUES(p_cliente_id,p_monto_original,p_monto_original,p_tasa_interes,p_comision,p_tipo_interes,p_cantidad_cuotas,
    p_frecuencia_pago,p_frecuencia_dias,p_fecha_inicio,p_fecha_primera_cuota,p_cantidad_renovaciones,p_renovados,auth.uid(),
    p_viejo_prestamo_id,v_deuda,v_efectivo) RETURNING id INTO v_nuevo;
  FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas) LOOP
    INSERT INTO cuotas(prestamo_id,numero_cuota,monto_cuota,fecha_vencimiento)
    VALUES(v_nuevo,(v_cuota->>'num')::INT,(v_cuota->>'monto')::NUMERIC,(v_cuota->>'fecha_vto')::DATE);
  END LOOP;
  IF v_efectivo > 0 THEN INSERT INTO capital(tipo,monto,referencia_id,usuario_id,descripcion)
    VALUES('egreso_por_prestamo',v_efectivo,v_nuevo,auth.uid(),'Desembolso neto por renovación'); END IF;
  RETURN v_nuevo;
END; $$;
GRANT EXECUTE ON FUNCTION renovar_prestamo_con_descuento(UUID,NUMERIC,UUID,NUMERIC,NUMERIC,NUMERIC,TEXT,INT,TEXT,INT,DATE,DATE,INT,JSONB,NUMERIC) TO authenticated;

-- El saldo real incluye capital/cuotas todavía impagas y mora todavía impaga.
CREATE OR REPLACE FUNCTION actualizar_saldo_pendiente_prestamo() RETURNS TRIGGER AS $$
DECLARE v_id UUID; v_saldo NUMERIC; v_estado TEXT;
BEGIN
  v_id := COALESCE(NEW.prestamo_id, OLD.prestamo_id);
  SELECT COALESCE(SUM(GREATEST(monto_cuota - monto_cobrado, 0) + COALESCE(monto_mora, 0)), 0)
    INTO v_saldo FROM cuotas WHERE prestamo_id = v_id;
  SELECT estado INTO v_estado FROM prestamos WHERE id = v_id;
  UPDATE prestamos SET saldo_pendiente = v_saldo,
    estado = CASE WHEN v_estado IN ('refinanciado','liquidado') THEN v_estado WHEN v_saldo <= 0 THEN 'pagado'
      WHEN EXISTS (SELECT 1 FROM cuotas WHERE prestamo_id=v_id AND estado='vencida') THEN 'mora' ELSE 'activo' END
    WHERE id = v_id;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

COMMIT;
