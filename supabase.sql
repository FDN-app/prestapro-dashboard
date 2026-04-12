-- SCHEMA: PrestaPro Core
-- Contiene las tablas y reglas solicitadas por el Documento Maestro

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES (Roles)
CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'cobrador')),
    comision_porcentaje DECIMAL(5,2) DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los perfiles son visibles por todos los usuarios autenticados"
    ON perfiles FOR SELECT TO authenticated USING (true);

-- 3. TABLAA CLIENTES
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo TEXT NOT NULL,
    dni TEXT UNIQUE NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    notas TEXT,
    estado TEXT CHECK (estado IN ('activo', 'inactivo')) DEFAULT 'activo',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    creado_por UUID REFERENCES perfiles(id)
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes visibles por todos" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin y Cobrador pueden insertar" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin puede actualizar" ON clientes FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 4. TABLA PRESTAMOS
CREATE TABLE prestamos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    monto_original DECIMAL(10, 2) NOT NULL,
    saldo_pendiente DECIMAL(10, 2) NOT NULL,
    tasa_interes DECIMAL(5, 2),
    tipo_interes TEXT,
    comision DECIMAL(10, 2) DEFAULT 0,
    cantidad_cuotas INT NOT NULL,
    frecuencia_pago TEXT NOT NULL,
    frecuencia_dias INT,
    fecha_inicio DATE NOT NULL,
    fecha_primera_cuota DATE,
    cantidad_renovaciones INT DEFAULT 0,
    estado TEXT CHECK (estado IN ('activo', 'pagado', 'mora', 'refinanciado', 'liquidado')) DEFAULT 'activo',
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    creado_por UUID REFERENCES perfiles(id)
);

ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prestamos visibles por todos" ON prestamos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prestamos insertables por admin" ON prestamos FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Prestamos actualizables por admin" ON prestamos FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 5. TABLA CUOTAS
CREATE TABLE cuotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prestamo_id UUID NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL,
    monto_cuota DECIMAL(10, 2) NOT NULL,
    monto_cobrado DECIMAL(10, 2) DEFAULT 0,
    fecha_vencimiento DATE NOT NULL,
    estado TEXT CHECK (estado IN ('pendiente', 'parcial', 'pagada', 'vencida')) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP WITH TIME ZONE
);

ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cuotas visibles por todos" ON cuotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo admin puede insertar/modificar cuotas directamente" ON cuotas FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 6. TABLA PAGOS
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cuota_id UUID REFERENCES cuotas(id),
    prestamo_id UUID NOT NULL REFERENCES prestamos(id),
    cobrador_id UUID NOT NULL REFERENCES perfiles(id),
    monto_pagado DECIMAL(10, 2) NOT NULL,
    metodo_pago TEXT NOT NULL,
    notas TEXT,
    destino_caja TEXT DEFAULT 'en_caja' CHECK (destino_caja IN ('en_caja', 'capitalizado', 'retirado')),
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pagos visibles por todos" ON pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cobradores y Admins pueden registrar pagos" ON pagos FOR INSERT TO authenticated WITH CHECK (auth.uid() = cobrador_id);

-- 7. TABLA CAPITAL
CREATE TABLE capital (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT CHECK (tipo IN ('ingreso_por_pago', 'egreso_por_prestamo', 'aporte_inicial', 'retiro', 'ingreso_por_recaudacion')) NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    referencia_id UUID,
    usuario_id UUID REFERENCES perfiles(id),
    descripcion TEXT
);

ALTER TABLE capital ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Capital visible solo para admin" ON capital FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "Capital insertable por admin" ON capital FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 8. TABLA LOG DE AUDITORIA
CREATE TABLE log_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES perfiles(id),
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id UUID,
    detalles JSONB,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auditoria visible solo para admin" ON log_auditoria FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);
-- Nadie puede hacer UPDATE o DELETE en auditoria, logrando INMUTABILIDAD TOTAL
-- Los inserts se hacen por debajo de RLS usando SECURITY DEFINER en funciones/triggers.

-- ==============================================================================
-- LOGICA: Triggers de Auditoria
-- ==============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS trigger SECURITY DEFINER AS $$
DECLARE
    v_usuario_id UUID := auth.uid();
    v_accion TEXT;
    v_detalles JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_accion := 'CREAR_' || UPPER(TG_TABLE_NAME);
        v_detalles := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_accion := 'EDITAR_' || UPPER(TG_TABLE_NAME);
        v_detalles := jsonb_build_object('viejo', to_jsonb(OLD), 'nuevo', to_jsonb(NEW));
    END IF;

    INSERT INTO log_auditoria (usuario_id, accion, entidad, entidad_id, detalles)
    VALUES (v_usuario_id, v_accion, TG_TABLE_NAME, NEW.id, v_detalles);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_clientes AFTER INSERT OR UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_prestamos AFTER INSERT OR UPDATE ON prestamos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_pagos AFTER INSERT ON pagos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_perfiles AFTER INSERT OR UPDATE ON perfiles FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ==============================================================================
-- LOGICA: RPC para Crear Préstamo + Cuotas atómicamente
-- ==============================================================================

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
    p_cuotas JSONB -- Array of { num, monto, fecha_vto }
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_prestamo_id UUID;
    v_cuota JSONB;
BEGIN
    -- 1. Insertar el préstamo
    INSERT INTO prestamos (
        cliente_id, monto_original, saldo_pendiente, tasa_interes, comision,
        tipo_interes, cantidad_cuotas, frecuencia_pago, frecuencia_dias, fecha_inicio,
        fecha_primera_cuota, cantidad_renovaciones, creado_por
    ) VALUES (
        p_cliente_id, p_monto_original, p_monto_original, p_tasa_interes, p_comision,
        p_tipo_interes, p_cantidad_cuotas, p_frecuencia_pago, p_frecuencia_dias, p_fecha_inicio,
        p_fecha_primera_cuota, p_cantidad_renovaciones, auth.uid()
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

-- ==============================================================================
-- LOGICA: RPC para Registrar Pago Atómicamente
-- ==============================================================================
CREATE OR REPLACE FUNCTION registrar_pago(
    p_prestamo_id UUID,
    p_cuota_id UUID,
    p_monto DECIMAL,
    p_metodo TEXT,
    p_notas TEXT
) RETURNS UUID SECURITY DEFINER AS $$
DECLARE
    v_pago_id UUID;
    v_cuota_monto DECIMAL;
    v_cuota_cobrado DECIMAL;
    v_nuevo_cobrado DECIMAL;
    v_nuevo_estado_cuota TEXT;
    v_saldo_pendiente DECIMAL;
    v_nuevo_estado_prestamo TEXT;
BEGIN
    -- 1. Insertar el pago
    INSERT INTO pagos (cuota_id, prestamo_id, cobrador_id, monto_pagado, metodo_pago, notas, destino_caja)
    VALUES (p_cuota_id, p_prestamo_id, auth.uid(), p_monto, p_metodo, p_notas, 'en_caja')
    RETURNING id INTO v_pago_id;

    -- 2. Actualizar la cuota
    SELECT monto_cuota, monto_cobrado INTO v_cuota_monto, v_cuota_cobrado
    FROM cuotas WHERE id = p_cuota_id FOR UPDATE;

    v_nuevo_cobrado := v_cuota_cobrado + p_monto;
    
    IF v_nuevo_cobrado >= v_cuota_monto THEN
        v_nuevo_estado_cuota := 'pagada';
    ELSE
        v_nuevo_estado_cuota := 'parcial';
    END IF;

    UPDATE cuotas
    SET monto_cobrado = v_nuevo_cobrado,
        estado = v_nuevo_estado_cuota,
        fecha_pago = CASE WHEN v_nuevo_estado_cuota = 'pagada' THEN now() ELSE fecha_pago END
    WHERE id = p_cuota_id;

    -- 3. Actualizar el préstamo
    SELECT saldo_pendiente INTO v_saldo_pendiente
    FROM prestamos WHERE id = p_prestamo_id FOR UPDATE;

    v_saldo_pendiente := GREATEST(v_saldo_pendiente - p_monto, 0);
    
    IF v_saldo_pendiente <= 0 THEN
        v_nuevo_estado_prestamo := 'pagado';
    ELSE
        v_nuevo_estado_prestamo := (SELECT estado FROM prestamos WHERE id = p_prestamo_id);
    END IF;

    UPDATE prestamos
    SET saldo_pendiente = v_saldo_pendiente,
        estado = v_nuevo_estado_prestamo
    WHERE id = p_prestamo_id;

    -- 4. YA NO Registramos Ingreso de Capital Aquí. El pago queda flotando en "en_caja" para que el admin lo pase manulamente.
    
    RETURN v_pago_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- LOGICA: RPC para Transferir Caja
-- ==============================================================================
CREATE OR REPLACE FUNCTION procesar_recaudacion(
    p_pagos_ids UUID[],
    p_accion TEXT -- 'capitalizar' o 'retirar'
) RETURNS VOID SECURITY DEFINER AS $$
DECLARE
    v_monto_total DECIMAL := 0;
    v_sum_parcial DECIMAL := 0;
    v_id UUID;
    v_estado_final TEXT;
    v_tipo_capital TEXT;
    v_descripcion TEXT;
BEGIN
    IF p_accion = 'capitalizar' THEN
        v_estado_final := 'capitalizado';
        v_tipo_capital := 'ingreso_por_recaudacion';
        v_descripcion := 'Transferencia desde Caja de Cobros a Capital';
    ELSIF p_accion = 'retirar' THEN
        v_estado_final := 'retirado';
        v_tipo_capital := 'retiro';
        v_descripcion := 'Retiro de Caja para uso personal';
    ELSE
        RAISE EXCEPTION 'Acción inválida. Utilice capitalizar o retirar.';
    END IF;

    -- Recorremos y marcamos los pagos, sumando el total
    FOREACH v_id IN ARRAY p_pagos_ids
    LOOP
        SELECT monto_pagado INTO v_sum_parcial FROM pagos WHERE id = v_id AND destino_caja = 'en_caja' FOR UPDATE;
        
        IF v_sum_parcial IS NOT NULL THEN
            UPDATE pagos SET destino_caja = v_estado_final WHERE id = v_id;
            v_monto_total := v_monto_total + v_sum_parcial;
        END IF;
    END LOOP;

    -- Si se proceso algo, registramos en la tabla capital
    IF v_monto_total > 0 THEN
        INSERT INTO capital (tipo, monto, fecha, usuario_id, descripcion)
        VALUES (v_tipo_capital, v_monto_total, now(), auth.uid(), v_descripcion);
    END IF;
    
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- FASE 1.5: Configuración Empresa & Moras Diarias
-- ==============================================================================

CREATE TABLE IF NOT EXISTS settings_empresa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_negocio TEXT NOT NULL DEFAULT 'PrestaPro',
    telefono TEXT DEFAULT '',
    mora_porcentaje_default DECIMAL(5,2) DEFAULT 5.0,
    dias_recordatorio INTEGER DEFAULT 2,
    moneda TEXT DEFAULT 'ARS',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE settings_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver la configuracion" ON settings_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins pueden actualizar configuracion" ON settings_empresa FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
);

INSERT INTO settings_empresa (nombre_negocio) 
SELECT 'PrestaPro'
WHERE NOT EXISTS (SELECT 1 FROM settings_empresa);

ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS monto_mora DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS fecha_ultima_mora DATE;

CREATE OR REPLACE FUNCTION proceso_diario_mora() RETURNS VOID SECURITY DEFINER AS $$
DECLARE
    v_porcentaje DECIMAL;
    v_cuota RECORD;
    v_monto_penalidad DECIMAL;
BEGIN
    SELECT mora_porcentaje_default INTO v_porcentaje FROM settings_empresa LIMIT 1;
    IF v_porcentaje IS NULL THEN v_porcentaje := 5.0; END IF;

    FOR v_cuota IN 
        SELECT c.id, c.monto_cuota, c.monto_cobrado, c.prestamo_id 
        FROM cuotas c 
        WHERE c.estado IN ('pendiente', 'parcial', 'vencida') 
          AND c.fecha_vencimiento < CURRENT_DATE
          AND (c.fecha_ultima_mora IS NULL OR c.fecha_ultima_mora < CURRENT_DATE)
    LOOP
        v_monto_penalidad := (v_cuota.monto_cuota - v_cuota.monto_cobrado) * (v_porcentaje / 100.0);
        
        UPDATE cuotas 
        SET monto_mora = monto_mora + v_monto_penalidad,
            estado = 'vencida',
            fecha_ultima_mora = CURRENT_DATE
        WHERE id = v_cuota.id;

        UPDATE prestamos
        SET saldo_pendiente = saldo_pendiente + v_monto_penalidad,
            estado = 'mora'
        WHERE id = v_cuota.prestamo_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- FASE 1.5: Refinanciacion y Liquidacion Anticipada
-- ==============================================================================

-- Ampliamos estados permitidos (En Supabase real lo manejamos volando constraint check por un momento o directo string 'cancelada')
-- ALTER TABLE cuotas DROP CONSTRAINT IF EXISTS cuotas_estado_check;
-- ALTER TABLE cuotas ADD CONSTRAINT cuotas_estado_check CHECK (estado IN ('pendiente', 'parcial', 'pagada', 'vencida', 'cancelada'));

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

CREATE OR REPLACE FUNCTION liquidar_prestamo(
    p_prestamo_id UUID,
    p_monto_pago DECIMAL
) RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    INSERT INTO pagos (
        prestamo_id, cuota_id, monto_pagado, fecha_pago, metodo_pago, cobrador_id, destino_caja
    ) VALUES (
        p_prestamo_id, NULL, p_monto_pago, timezone('utc'::text, now()), 'efectivo', auth.uid(), 'en_caja'
    );

    UPDATE prestamos
    SET estado = 'liquidado',
        saldo_pendiente = 0
    WHERE id = p_prestamo_id;

    UPDATE cuotas
    SET estado = 'pagada',
        monto_cobrado = monto_cuota,
        fecha_pago = timezone('utc'::text, now())
    WHERE prestamo_id = p_prestamo_id AND estado IN ('pendiente', 'parcial', 'vencida');
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- FASE 2: Integración Telegram Bot API
-- ==============================================================================

CREATE TABLE IF NOT EXISTS mensajes_telegram (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES clientes(id),
    prestamo_id UUID REFERENCES prestamos(id),
    tipo_mensaje TEXT CHECK (tipo_mensaje IN ('recordatorio', 'vencimiento', 'confirmacion_pago', 'alerta_admin')),
    contenido TEXT,
    estado TEXT CHECK (estado IN ('enviado', 'error', 'pendiente')) DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE mensajes_telegram ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visibles para todos" ON mensajes_telegram FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insertable por auth" ON mensajes_telegram FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE settings_empresa ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT;
ALTER TABLE settings_empresa ADD COLUMN IF NOT EXISTS telegram_alertas_activas BOOLEAN DEFAULT false;
ALTER TABLE settings_empresa ADD COLUMN IF NOT EXISTS telegram_dias_recordatorio INT DEFAULT 2;
