-- Migración: Ajustar fecha_inicio para que use el valor real provisto desde el frontend
-- Timestamp: 20260727153500

CREATE OR REPLACE FUNCTION crear_prestamo_con_cuotas(
    p_cliente_id UUID,
    p_monto_original DECIMAL,
    p_tasa_interes DECIMAL,
    p_comision DECIMAL,
    p_tipo_interes TEXT,
    p_cantidad_cuotas INT,
    p_frecuencia_pago TEXT,
    p_frecuencia_dias INT,
    p_fecha_inicio DATE,
    p_fecha_primera_cuota DATE,
    p_cantidad_renovaciones INT,
    p_cuotas JSONB,
    p_renovados DECIMAL DEFAULT NULL
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_prestamo_id UUID;
    v_cuota JSONB;
BEGIN
    -- 1. Insertar el préstamo utilizando p_fecha_inicio
    INSERT INTO prestamos (
        cliente_id, monto_original, saldo_pendiente, tasa_interes, comision,
        tipo_interes, cantidad_cuotas, frecuencia_pago, frecuencia_dias, fecha_inicio,
        fecha_primera_cuota, cantidad_renovaciones, renovados, creado_por
    ) VALUES (
        p_cliente_id, p_monto_original, p_monto_original, p_tasa_interes, p_comision,
        p_tipo_interes, p_cantidad_cuotas, p_frecuencia_pago, p_frecuencia_dias, p_fecha_inicio,
        p_fecha_primera_cuota, p_cantidad_renovaciones, p_renovados, auth.uid()
    ) RETURNING id INTO v_prestamo_id;

    -- 2. Insertar las cuotas
    FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
    LOOP
        INSERT INTO cuotas (
            prestamo_id, numero_cuota, monto_cuota, fecha_vencimiento
        ) VALUES (
            v_prestamo_id,
            (v_cuota->>'num')::INT,
            (v_cuota->>'monto')::DECIMAL,
            (v_cuota->>'fecha_vto')::DATE
        );
    END LOOP;

    -- 3. Registrar Salida de Capital
    INSERT INTO capital (tipo, monto, referencia_id, usuario_id, descripcion)
    VALUES ('egreso_por_prestamo', p_monto_original, v_prestamo_id, auth.uid(), 'Desembolso Préstamo');

    RETURN v_prestamo_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refinanciar_prestamo(
    p_viejo_prestamo_id UUID,
    p_cliente_id UUID,
    p_monto_original DECIMAL,
    p_tasa_interes DECIMAL,
    p_comision DECIMAL,
    p_tipo_interes TEXT,
    p_cantidad_cuotas INT,
    p_frecuencia_pago TEXT,
    p_frecuencia_dias INT,
    p_fecha_inicio DATE,
    p_cantidad_renovaciones INT,
    p_cuotas JSONB
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_nuevo_prestamo_id UUID;
    v_cuota JSONB;
BEGIN
    UPDATE prestamos 
    SET estado = 'refinanciado' 
    WHERE id = p_viejo_prestamo_id;

    UPDATE cuotas
    SET estado = 'cancelada',
        fecha_pago = timezone('utc'::text, now())
    WHERE prestamo_id = p_viejo_prestamo_id AND estado IN ('pendiente', 'parcial', 'vencida');

    -- Insertar el nuevo préstamo utilizando p_fecha_inicio directamente
    INSERT INTO prestamos (
        cliente_id, monto_original, saldo_pendiente, tasa_interes, comision,
        tipo_interes, cantidad_cuotas, frecuencia_pago, frecuencia_dias, fecha_inicio,
        cantidad_renovaciones, creado_por, estado
    ) VALUES (
        p_cliente_id, p_monto_original, p_monto_original, p_tasa_interes, p_comision,
        p_tipo_interes, p_cantidad_cuotas, p_frecuencia_pago, p_frecuencia_dias, p_fecha_inicio,
        p_cantidad_renovaciones, auth.uid(), 'activo'
    ) RETURNING id INTO v_nuevo_prestamo_id;

    FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
    LOOP
        INSERT INTO cuotas (
            prestamo_id, numero_cuota, monto_cuota, fecha_vencimiento
        ) VALUES (
            v_nuevo_prestamo_id,
            (v_cuota->>'num')::INT,
            (v_cuota->>'monto')::DECIMAL,
            (v_cuota->>'fecha_vto')::DATE
        );
    END LOOP;

    RETURN v_nuevo_prestamo_id;
END;
$$ LANGUAGE plpgsql;
