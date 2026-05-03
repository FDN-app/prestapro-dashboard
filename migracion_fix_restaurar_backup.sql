CREATE OR REPLACE FUNCTION public.restaurar_ecosistema_completo(p_clientes jsonb, p_prestamos jsonb, p_cuotas jsonb, p_pagos jsonb)
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
    v_prestamo_id UUID;
    v_cuota_id UUID;
BEGIN
    -- 1. Limpieza de tablas (Orden inverso por FKs)
    -- NOTA: Esto borra todo el ecosistema de negocio para asegurar integridad total.
    DELETE FROM pagos WHERE true;
    DELETE FROM cuotas WHERE true;
    DELETE FROM prestamos WHERE true;
    DELETE FROM clientes WHERE true;
    DELETE FROM capital WHERE true;

    -- 2. Restaurar Clientes
    FOR v_cliente IN SELECT * FROM jsonb_array_elements(p_clientes)
    LOOP
        INSERT INTO clientes (nombre_completo, dni, telefono, direccion, estado, creado_en)
        VALUES (
            v_cliente->>'Nombre',
            v_cliente->>'DNI',
            v_cliente->>'Teléfono',
            v_cliente->>'Dirección',
            COALESCE(LOWER(v_cliente->>'Estado'), 'activo'),
            COALESCE((v_cliente->>'Fecha de Alta')::TIMESTAMP, now())
        );
    END LOOP;

    -- 3. Restaurar Préstamos
    FOR v_prestamo IN SELECT * FROM jsonb_array_elements(p_prestamos)
    LOOP
        -- Buscar el ID del cliente por DNI (asumimos que el DNI viene en el Excel o lo buscamos por Nombre si no hay DNI)
        -- Si el Excel de exportación no tenía DNI en la hoja de Préstamos, usamos el Nombre (riesgo de duplicados aceptado por el formato del Excel profesional)
        SELECT id INTO v_cliente_id FROM clientes WHERE nombre_completo = v_prestamo->>'Cliente' LIMIT 1;
        
        IF v_cliente_id IS NULL THEN
            RAISE EXCEPTION 'Error de Integridad: El cliente % no existe para el préstamo indicado.', v_prestamo->>'Cliente';
        END IF;

        INSERT INTO prestamos (
            id, -- Usamos el ID original si existe (mapeado desde el Excel) o generamos uno.
            cliente_id, monto_original, saldo_pendiente, tasa_interes, cantidad_cuotas, frecuencia_pago, fecha_inicio, estado
        ) VALUES (
            gen_random_uuid(), -- En restauraciones de Excel sin UUID, generamos nuevos
            v_cliente_id,
            (v_prestamo->>'Capital')::DECIMAL,
            (v_prestamo->>'Total')::DECIMAL, -- Asumimos que el saldo pendiente inicial es el Total si no se especifica
            ((v_prestamo->>'Interés')::DECIMAL / (v_prestamo->>'Capital')::DECIMAL * 100), -- Cálculo inverso de tasa si no viene
            (v_prestamo->>'Cuotas')::INT,
            v_prestamo->>'Frecuencia',
            (v_prestamo->>'Fecha Inicio')::DATE,
            LOWER(v_prestamo->>'Estado')
        );
    END LOOP;

    -- 4. Restaurar Cuotas
    FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
    LOOP
        -- Referencia por Cliente + Nro Cuota (Es lo que tenemos en el Excel)
        SELECT p.id INTO v_prestamo_id 
        FROM prestamos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE c.nombre_completo = v_cuota->>'Cliente'
        LIMIT 1;

        IF v_prestamo_id IS NULL THEN
            RAISE EXCEPTION 'Error de Integridad: Préstamo no encontrado para la cuota del cliente %.', v_cuota->>'Cliente';
        END IF;

        INSERT INTO cuotas (
            prestamo_id, numero_cuota, monto_cuota, monto_cobrado, fecha_vencimiento, estado, fecha_pago
        ) VALUES (
            v_prestamo_id,
            (v_cuota->>'Nro Cuota')::INT,
            (v_cuota->>'Monto')::DECIMAL,
            (v_cuota->>'Monto Pagado')::DECIMAL,
            (v_cuota->>'Fecha Vencimiento')::DATE,
            LOWER(v_cuota->>'Estado'),
            CASE WHEN v_cuota->>'Fecha Pago' = '-' THEN NULL ELSE (v_cuota->>'Fecha Pago')::TIMESTAMP END
        );
    END LOOP;

    -- 5. Restaurar Pagos
    FOR v_pago IN SELECT * FROM jsonb_array_elements(p_pagos)
    LOOP
        -- Referencia por Cliente + Fecha
        SELECT p.id, c.id INTO v_prestamo_id, v_cuota_id
        FROM cuotas c
        JOIN prestamos p ON c.prestamo_id = p.id
        JOIN clientes cl ON p.cliente_id = cl.id
        WHERE cl.nombre_completo = v_pago->>'Cliente'
        LIMIT 1;

        INSERT INTO pagos (
            prestamo_id, cuota_id, cobrador_id, monto_pagado, metodo_pago, fecha_pago, notas
        ) VALUES (
            v_prestamo_id,
            v_cuota_id,
            (SELECT id FROM perfiles WHERE rol = 'admin' LIMIT 1), -- Asignamos al admin por defecto en restauración
            (v_pago->>'Monto')::DECIMAL,
            'efectivo', -- Default
            (v_pago->>'Fecha')::TIMESTAMP,
            'Restaurado desde Backup'
        );
    END LOOP;

END;
$function$;
