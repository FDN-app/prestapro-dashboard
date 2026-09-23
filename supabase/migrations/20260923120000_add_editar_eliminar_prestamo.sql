-- Migración: permitir a un admin eliminar o editar un préstamo creado por error,
-- siempre que no tenga pagos ni cuotas pagadas/parciales registradas.
-- Timestamp: 20260923120000

BEGIN;

CREATE OR REPLACE FUNCTION eliminar_prestamo(p_prestamo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar préstamos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cuotas WHERE prestamo_id = p_prestamo_id AND estado IN ('pagada', 'parcial')
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar un préstamo con cuotas pagadas o parciales';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pagos WHERE prestamo_id = p_prestamo_id
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar un préstamo con pagos registrados';
  END IF;

  DELETE FROM capital WHERE referencia_id = p_prestamo_id;
  DELETE FROM cuotas WHERE prestamo_id = p_prestamo_id;
  DELETE FROM mensajes_telegram WHERE prestamo_id = p_prestamo_id;
  DELETE FROM prestamos WHERE id = p_prestamo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION eliminar_prestamo(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION editar_prestamo_con_cuotas(
    p_prestamo_id UUID,
    p_monto_original DECIMAL,
    p_tasa_interes DECIMAL,
    p_comision DECIMAL,
    p_tipo_interes TEXT,
    p_cantidad_cuotas INT,
    p_frecuencia_pago TEXT,
    p_frecuencia_dias INT,
    p_fecha_inicio DATE,
    p_fecha_primera_cuota DATE,
    p_cuotas JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cuota JSONB;
    v_monto_anterior DECIMAL;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin'
    ) THEN
        RAISE EXCEPTION 'Solo administradores pueden editar préstamos';
    END IF;

    IF EXISTS (
        SELECT 1 FROM cuotas WHERE prestamo_id = p_prestamo_id AND estado IN ('pagada', 'parcial')
    ) THEN
        RAISE EXCEPTION 'No se puede editar un préstamo con cuotas pagadas o parciales';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pagos WHERE prestamo_id = p_prestamo_id
    ) THEN
        RAISE EXCEPTION 'No se puede editar un préstamo con pagos registrados';
    END IF;

    SELECT monto_original INTO v_monto_anterior FROM prestamos WHERE id = p_prestamo_id;

    UPDATE prestamos SET
        monto_original = p_monto_original,
        saldo_pendiente = p_monto_original,
        tasa_interes = p_tasa_interes,
        comision = p_comision,
        tipo_interes = p_tipo_interes,
        cantidad_cuotas = p_cantidad_cuotas,
        frecuencia_pago = p_frecuencia_pago,
        frecuencia_dias = p_frecuencia_dias,
        fecha_inicio = p_fecha_inicio,
        fecha_primera_cuota = p_fecha_primera_cuota
    WHERE id = p_prestamo_id;

    DELETE FROM cuotas WHERE prestamo_id = p_prestamo_id;

    FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
    LOOP
        INSERT INTO cuotas (
            prestamo_id, numero_cuota, monto_cuota, fecha_vencimiento
        ) VALUES (
            p_prestamo_id,
            (v_cuota->>'num')::INT,
            (v_cuota->>'monto')::DECIMAL,
            (v_cuota->>'fecha_vto')::DATE
        );
    END LOOP;

    IF v_monto_anterior IS DISTINCT FROM p_monto_original THEN
        UPDATE capital SET monto = p_monto_original
        WHERE referencia_id = p_prestamo_id AND tipo = 'egreso_por_prestamo';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION editar_prestamo_con_cuotas(UUID, DECIMAL, DECIMAL, DECIMAL, TEXT, INT, TEXT, INT, DATE, DATE, JSONB) TO authenticated;

COMMIT;
