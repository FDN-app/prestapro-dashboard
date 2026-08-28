BEGIN;

CREATE OR REPLACE FUNCTION actualizar_saldo_pendiente_prestamo() RETURNS TRIGGER AS $$
DECLARE v_id UUID; v_saldo NUMERIC; v_estado TEXT;
BEGIN
  v_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.prestamo_id ELSE NEW.prestamo_id END;
  SELECT COALESCE(SUM(GREATEST(monto_cuota - monto_cobrado, 0) + COALESCE(monto_mora, 0)), 0)
    INTO v_saldo
    FROM cuotas
    WHERE prestamo_id = v_id
      AND estado IN ('pendiente', 'parcial', 'vencida');
  SELECT estado INTO v_estado FROM prestamos WHERE id = v_id;
  UPDATE prestamos SET saldo_pendiente = v_saldo,
    estado = CASE
      WHEN v_estado IN ('refinanciado','liquidado') THEN v_estado
      WHEN v_saldo <= 0 THEN 'pagado'
      WHEN EXISTS (SELECT 1 FROM cuotas WHERE prestamo_id=v_id AND estado='vencida') THEN 'mora'
      ELSE 'activo'
    END
    WHERE id = v_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

-- Los préstamos refinanciados/liquidados no conservan deuda exigible.
UPDATE prestamos
SET saldo_pendiente = 0
WHERE estado IN ('refinanciado', 'liquidado')
  AND NOT EXISTS (
    SELECT 1
    FROM cuotas
    WHERE cuotas.prestamo_id = prestamos.id
      AND cuotas.estado IN ('pendiente', 'parcial', 'vencida')
  )
  AND saldo_pendiente <> 0;

COMMIT;
