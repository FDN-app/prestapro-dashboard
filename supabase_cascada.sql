CREATE OR REPLACE FUNCTION registrar_pago_cascada(
    p_prestamo_id UUID,
    p_monto DECIMAL,
    p_metodo TEXT,
    p_notas TEXT
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_pago_id UUID;
    v_monto_restante DECIMAL := p_monto;
    v_cuota RECORD;
    v_a_cubrir_capital DECIMAL;
    v_a_cubrir_mora DECIMAL;
    v_cubierto_mora DECIMAL;
    v_cubierto_capital DECIMAL;
    v_nuevo_estado_cuota TEXT;
    v_saldo_pendiente DECIMAL;
    v_nuevo_estado_prestamo TEXT;
BEGIN
    -- 1. Validación de TEST-04: El monto no puede superar el saldo pendiente total
    SELECT saldo_pendiente INTO v_saldo_pendiente
    FROM prestamos WHERE id = p_prestamo_id FOR UPDATE;

    IF p_monto > v_saldo_pendiente THEN
        RAISE EXCEPTION 'El monto del pago ($%) supera el saldo pendiente del préstamo ($%). Operación rechazada.', p_monto, v_saldo_pendiente;
    END IF;

    -- 2. Loop de distribución en cascada
    FOR v_cuota IN 
        SELECT id, monto_cuota, monto_cobrado, monto_mora, estado 
        FROM cuotas 
        WHERE prestamo_id = p_prestamo_id 
          AND estado IN ('pendiente', 'parcial', 'vencida')
        ORDER BY numero_cuota ASC
    LOOP
        IF v_monto_restante <= 0 THEN
            EXIT;
        END IF;

        -- Fase A: Cubrir Mora (TEST-02)
        v_cubierto_mora := 0;
        v_a_cubrir_mora := v_cuota.monto_mora;
        
        IF v_a_cubrir_mora > 0 THEN
            IF v_monto_restante >= v_a_cubrir_mora THEN
                v_cubierto_mora := v_a_cubrir_mora;
                v_monto_restante := v_monto_restante - v_cubierto_mora;
            ELSE
                v_cubierto_mora := v_monto_restante;
                v_monto_restante := 0;
            END IF;
            
            UPDATE cuotas SET monto_mora = monto_mora - v_cubierto_mora WHERE id = v_cuota.id;
        END IF;

        -- Fase B: Cubrir Capital
        v_cubierto_capital := 0;
        IF v_monto_restante > 0 THEN
            v_a_cubrir_capital := v_cuota.monto_cuota - v_cuota.monto_cobrado;
            
            IF v_monto_restante >= v_a_cubrir_capital THEN
                v_cubierto_capital := v_a_cubrir_capital;
                v_nuevo_estado_cuota := 'pagada';
                v_monto_restante := v_monto_restante - v_cubierto_capital;
            ELSE
                v_cubierto_capital := v_monto_restante;
                v_nuevo_estado_cuota := 'parcial';
                v_monto_restante := 0;
            END IF;

            UPDATE cuotas
            SET monto_cobrado = monto_cobrado + v_cubierto_capital,
                estado = v_nuevo_estado_cuota,
                fecha_pago = CASE WHEN v_nuevo_estado_cuota = 'pagada' THEN now() ELSE fecha_pago END
            WHERE id = v_cuota.id;
        END IF;

        -- 3. Registro del pago físico en la tabla pagos (Mora + Capital)
        IF (v_cubierto_mora + v_cubierto_capital) > 0 THEN
            INSERT INTO pagos (cuota_id, prestamo_id, cobrador_id, monto_pagado, metodo_pago, notas, destino_caja)
            VALUES (v_cuota.id, p_prestamo_id, auth.uid(), (v_cubierto_mora + v_cubierto_capital), p_metodo, p_notas, 'en_caja')
            RETURNING id INTO v_pago_id;
        END IF;
    END LOOP;

    -- 4. Actualizar el préstamo global
    v_saldo_pendiente := v_saldo_pendiente - p_monto;
    
    IF v_saldo_pendiente <= 0 THEN
        v_nuevo_estado_prestamo := 'pagado';
    ELSE
        -- Verificamos si alguna cuota sigue vencida
        IF EXISTS (SELECT 1 FROM cuotas WHERE prestamo_id = p_prestamo_id AND estado = 'vencida') THEN
            v_nuevo_estado_prestamo := 'mora';
        ELSE
            v_nuevo_estado_prestamo := 'activo';
        END IF;
    END IF;

    UPDATE prestamos
    SET saldo_pendiente = v_saldo_pendiente,
        estado = v_nuevo_estado_prestamo
    WHERE id = p_prestamo_id;

    RETURN v_pago_id;
END;

$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION extender_prestamo(
    p_prestamo_id UUID,
    p_interes_porcentaje DECIMAL
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_saldo_pendiente DECIMAL;
    v_nueva_cuota_monto DECIMAL;
    v_ultima_fecha DATE;
    v_nuevo_numero INT;
    v_frecuencia_pago TEXT;
    v_frecuencia_dias INT;
    v_nueva_fecha DATE;
    v_interes_monetario DECIMAL;
    v_nueva_cuota_id UUID;
BEGIN
    -- Bloquear y leer préstamo
    SELECT saldo_pendiente, frecuencia_pago, frecuencia_dias INTO v_saldo_pendiente, v_frecuencia_pago, v_frecuencia_dias
    FROM prestamos WHERE id = p_prestamo_id FOR UPDATE;

    IF v_saldo_pendiente <= 0 THEN
        RAISE EXCEPTION 'No se puede extender un préstamo pagado';
    END IF;

    -- Calcular interés total en dinero que se le carga a la deuda global
    v_interes_monetario := v_saldo_pendiente * (p_interes_porcentaje / 100);
    v_nueva_cuota_monto := v_saldo_pendiente + v_interes_monetario;

    -- Obtener la última cuota
    SELECT numero_cuota, fecha_vencimiento INTO v_nuevo_numero, v_ultima_fecha
    FROM cuotas WHERE prestamo_id = p_prestamo_id ORDER BY numero_cuota DESC LIMIT 1;

    v_nuevo_numero := COALESCE(v_nuevo_numero, 0) + 1;
    v_ultima_fecha := COALESCE(v_ultima_fecha, now()::date);

    -- Sumar tiempo
    IF v_frecuencia_pago = 'diario' THEN v_nueva_fecha := v_ultima_fecha + v_frecuencia_dias;
    ELSIF v_frecuencia_pago = 'semanal' THEN v_nueva_fecha := v_ultima_fecha + 7;
    ELSIF v_frecuencia_pago = 'quincenal' THEN v_nueva_fecha := v_ultima_fecha + 15;
    ELSIF v_frecuencia_pago = 'mensual' THEN v_nueva_fecha := v_ultima_fecha + interval '1 month';
    ELSE v_nueva_fecha := v_ultima_fecha + 30;
    END IF;

    -- Modificar préstamo sumando el interes a la deuda + sumar 1 cantidad_cuotas + estado refinanciado
    UPDATE prestamos 
    SET saldo_pendiente = saldo_pendiente + v_interes_monetario,
        cantidad_cuotas = cantidad_cuotas + 1,
        estado = 'refinanciado'
    WHERE id = p_prestamo_id;

    -- Insertar nueva cuota
    INSERT INTO cuotas (prestamo_id, numero_cuota, monto_cuota, fecha_vencimiento, estado)
    VALUES (p_prestamo_id, v_nuevo_numero, v_nueva_cuota_monto, v_nueva_fecha, 'pendiente')
    RETURNING id INTO v_nueva_cuota_id;

    RETURN v_nueva_cuota_id;
END;
$$ LANGUAGE plpgsql;
