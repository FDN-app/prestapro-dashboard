BEGIN;

-- Recalcula nuevamente al cerrar la transacción. Esto garantiza que funciones
-- preexistentes que actualizan prestamos después de cuotas no puedan dejar afuera
-- una mora todavía pendiente.
DROP TRIGGER IF EXISTS trg_recalcular_saldo_con_mora_deferred ON cuotas;
CREATE CONSTRAINT TRIGGER trg_recalcular_saldo_con_mora_deferred
AFTER INSERT OR UPDATE OR DELETE ON cuotas
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_pendiente_prestamo();

-- La actualización de cuotas ya dispara el recálculo; no se incrementa el
-- préstamo manualmente para evitar sumar la mora dos veces dentro de la operación.
CREATE OR REPLACE FUNCTION agregar_mora_manual(
  p_prestamo_id UUID, p_cuota_id UUID, p_tipo TEXT, p_valor NUMERIC
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_capital NUMERIC; v_monto NUMERIC; v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Solo un administrador puede agregar mora';
  END IF;
  IF p_tipo NOT IN ('porcentaje', 'monto') OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor de mora inválido';
  END IF;
  SELECT monto_original INTO v_capital FROM prestamos WHERE id = p_prestamo_id FOR UPDATE;
  IF v_capital IS NULL OR NOT EXISTS (
    SELECT 1 FROM cuotas WHERE id = p_cuota_id AND prestamo_id = p_prestamo_id
  ) THEN
    RAISE EXCEPTION 'Préstamo o cuota inválidos';
  END IF;
  v_monto := ROUND(CASE WHEN p_tipo = 'porcentaje' THEN v_capital * p_valor / 100 ELSE p_valor END, 2);
  UPDATE cuotas SET monto_mora = COALESCE(monto_mora, 0) + v_monto WHERE id = p_cuota_id;
  INSERT INTO moras_manuales(prestamo_id, cuota_id, tipo, valor, base_calculo, monto, creado_por)
  VALUES (p_prestamo_id, p_cuota_id, p_tipo, p_valor, v_capital, v_monto, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO log_auditoria(usuario_id, accion, entidad, entidad_id, detalles)
  VALUES (auth.uid(), 'AGREGAR_MORA', 'cuotas', p_cuota_id,
    jsonb_build_object('tipo', p_tipo, 'valor', p_valor, 'base', v_capital, 'monto', v_monto));
  RETURN v_id;
END; $$;

COMMIT;
