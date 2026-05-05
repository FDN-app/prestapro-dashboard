CREATE OR REPLACE FUNCTION public.importar_ecosistema_sebastian(p_clientes jsonb, p_prestamos jsonb, p_cuotas jsonb, p_pagos jsonb, p_accion text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_cliente JSONB;
    v_prestamo JSONB;
    v_cuota JSONB;
    v_pago JSONB;
    v_cliente_id UUID;
BEGIN
    IF p_accion = 'reemplazar' THEN
        DELETE FROM pagos WHERE true;
        DELETE FROM cuotas WHERE true;
        DELETE FROM prestamos WHERE true;
        DELETE FROM clientes WHERE true;
        DELETE FROM capital WHERE true;
    END IF;

    -- 1. Insertar Clientes
    FOR v_cliente IN SELECT * FROM jsonb_array_elements(p_clientes)
    LOOP
        INSERT INTO clientes (id, nombre_completo, dni, telefono, estado)
        VALUES (
            (v_cliente->>'id')::UUID,
            v_cliente->>'nombre_completo',
            v_cliente->>'dni',
            v_cliente->>'telefono',
            v_cliente->>'estado'
        )
        ON CONFLICT (dni) DO UPDATE SET estado = EXCLUDED.estado;
    END LOOP;

    -- 2. Insertar Préstamos
    FOR v_prestamo IN SELECT * FROM jsonb_array_elements(p_prestamos)
    LOOP
        SELECT id INTO v_cliente_id FROM clientes WHERE dni = v_prestamo->>'cliente_dni' LIMIT 1;
        
        IF v_cliente_id IS NULL THEN
            RAISE EXCEPTION 'Cliente con DNI % no encontrado para el préstamo', v_prestamo->>'cliente_dni';
        END IF;

        INSERT INTO prestamos (
            id, cliente_id, monto_original, saldo_pendiente, tasa_interes, cantidad_cuotas, frecuencia_pago, fecha_inicio, estado
        ) VALUES (
            (v_prestamo->>'id')::UUID,
            v_cliente_id,
            (v_prestamo->>'monto_original')::DECIMAL,
            (v_prestamo->>'saldo_pendiente')::DECIMAL,
            (v_prestamo->>'tasa_interes')::DECIMAL,
            (v_prestamo->>'cantidad_cuotas')::INT,
            v_prestamo->>'frecuencia_pago',
            (v_prestamo->>'fecha_inicio')::TIMESTAMP,
            v_prestamo->>'estado'
        );
    END LOOP;

    -- 3. Insertar Cuotas
    FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
    LOOP
        INSERT INTO cuotas (
            id, prestamo_id, numero_cuota, monto_cuota, monto_cobrado, fecha_vencimiento, estado, fecha_pago
        ) VALUES (
            (v_cuota->>'id')::UUID,
            (v_cuota->>'prestamo_id')::UUID,
            (v_cuota->>'numero_cuota')::INT,
            (v_cuota->>'monto_cuota')::DECIMAL,
            (v_cuota->>'monto_cobrado')::DECIMAL,
            (v_cuota->>'fecha_vencimiento')::DATE,
            v_cuota->>'estado',
            CASE WHEN v_cuota->>'fecha_pago' IS NULL THEN NULL ELSE (v_cuota->>'fecha_pago')::TIMESTAMP END
        );
    END LOOP;

    -- 4. Insertar Pagos
    FOR v_pago IN SELECT * FROM jsonb_array_elements(p_pagos)
    LOOP
        INSERT INTO pagos (
            id, prestamo_id, cuota_id, cobrador_id, monto_pagado, metodo_pago, fecha_pago, notas, destino_caja
        ) VALUES (
            (v_pago->>'id')::UUID,
            (v_pago->>'prestamo_id')::UUID,
            (v_pago->>'cuota_id')::UUID,
            COALESCE((v_pago->>'cobrador_id')::UUID, (SELECT id FROM perfiles WHERE rol = 'admin' LIMIT 1)),
            (v_pago->>'monto_pagado')::DECIMAL,
            v_pago->>'metodo_pago',
            (v_pago->>'fecha_pago')::TIMESTAMP,
            'Importado de RC Jorge',
            'en_caja'
        );
    END LOOP;

END;
$function$;
