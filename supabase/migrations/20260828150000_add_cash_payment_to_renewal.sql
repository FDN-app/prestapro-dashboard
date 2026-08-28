BEGIN;

ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS pago_cliente_renovacion NUMERIC(12,2);

DROP FUNCTION IF EXISTS renovar_prestamo_con_descuento(
  UUID, NUMERIC, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, INT, TEXT, INT,
  DATE, DATE, INT, JSONB, NUMERIC
);

CREATE FUNCTION renovar_prestamo_con_descuento(
  p_viejo_prestamo_id UUID, p_monto_cancelado NUMERIC, p_cliente_id UUID,
  p_monto_original NUMERIC, p_tasa_interes NUMERIC, p_comision NUMERIC,
  p_tipo_interes TEXT, p_cantidad_cuotas INT, p_frecuencia_pago TEXT,
  p_frecuencia_dias INT, p_fecha_inicio DATE, p_fecha_primera_cuota DATE,
  p_cantidad_renovaciones INT, p_cuotas JSONB, p_renovados NUMERIC DEFAULT NULL,
  p_pago_cliente NUMERIC DEFAULT 0
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_nuevo UUID; v_cuota JSONB; v_deuda NUMERIC; v_restante NUMERIC; v_efectivo NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id=auth.uid() AND rol='admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede renovar';
  END IF;
  SELECT COALESCE(SUM(GREATEST(monto_cuota-monto_cobrado,0)+COALESCE(monto_mora,0)),0)
    INTO v_deuda FROM cuotas
    WHERE prestamo_id=p_viejo_prestamo_id AND estado IN ('pendiente','parcial','vencida');
  IF p_pago_cliente < 0 OR p_pago_cliente > v_deuda THEN
    RAISE EXCEPTION 'El pago del cliente no puede superar la deuda anterior';
  END IF;

  -- Registra primero el dinero que el cliente efectivamente entrega.
  IF p_pago_cliente > 0 THEN
    PERFORM registrar_pago_cascada(
      p_viejo_prestamo_id, p_pago_cliente, 'efectivo',
      'Pago recibido durante renovación', false, NULL::date
    );
  END IF;

  SELECT COALESCE(SUM(GREATEST(monto_cuota-monto_cobrado,0)+COALESCE(monto_mora,0)),0)
    INTO v_restante FROM cuotas
    WHERE prestamo_id=p_viejo_prestamo_id AND estado IN ('pendiente','parcial','vencida');
  IF ABS(v_restante-p_monto_cancelado) > 0.01 THEN
    RAISE EXCEPTION 'La deuda anterior cambió. Actualizá la pantalla e intentá nuevamente';
  END IF;
  IF p_monto_original < v_restante THEN
    RAISE EXCEPTION 'El nuevo préstamo no alcanza para cancelar la deuda anterior';
  END IF;
  v_efectivo := p_monto_original-v_restante;

  UPDATE prestamos SET estado='refinanciado', saldo_pendiente=0
    WHERE id=p_viejo_prestamo_id AND cliente_id=p_cliente_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Préstamo anterior inválido'; END IF;
  UPDATE cuotas SET estado='cancelada'
    WHERE prestamo_id=p_viejo_prestamo_id AND estado IN ('pendiente','parcial','vencida');

  INSERT INTO prestamos(cliente_id,monto_original,saldo_pendiente,tasa_interes,comision,tipo_interes,cantidad_cuotas,
    frecuencia_pago,frecuencia_dias,fecha_inicio,fecha_primera_cuota,cantidad_renovaciones,renovados,creado_por,
    renovado_desde_id,monto_cancelado_renovacion,efectivo_entregado,pago_cliente_renovacion)
  VALUES(p_cliente_id,p_monto_original,p_monto_original,p_tasa_interes,p_comision,p_tipo_interes,p_cantidad_cuotas,
    p_frecuencia_pago,p_frecuencia_dias,p_fecha_inicio,p_fecha_primera_cuota,p_cantidad_renovaciones,p_renovados,auth.uid(),
    p_viejo_prestamo_id,v_restante,v_efectivo,p_pago_cliente) RETURNING id INTO v_nuevo;
  FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas) LOOP
    INSERT INTO cuotas(prestamo_id,numero_cuota,monto_cuota,fecha_vencimiento)
    VALUES(v_nuevo,(v_cuota->>'num')::INT,(v_cuota->>'monto')::NUMERIC,(v_cuota->>'fecha_vto')::DATE);
  END LOOP;
  IF v_efectivo > 0 THEN
    INSERT INTO capital(tipo,monto,referencia_id,usuario_id,descripcion)
    VALUES('egreso_por_prestamo',v_efectivo,v_nuevo,auth.uid(),'Desembolso neto por renovación');
  END IF;
  RETURN v_nuevo;
END; $$;

GRANT EXECUTE ON FUNCTION renovar_prestamo_con_descuento(
  UUID,NUMERIC,UUID,NUMERIC,NUMERIC,NUMERIC,TEXT,INT,TEXT,INT,DATE,DATE,INT,JSONB,NUMERIC,NUMERIC
) TO authenticated;

COMMIT;
