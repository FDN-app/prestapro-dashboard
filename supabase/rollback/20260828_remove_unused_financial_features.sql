-- REVERSIÓN TOTAL. USAR SOLAMENTE si todavía NO se aplicaron moras ni renovaciones.
-- El bloque aborta sin borrar nada si detecta datos creados por las funciones nuevas.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM moras_manuales LIMIT 1)
     OR EXISTS (SELECT 1 FROM prestamos WHERE renovado_desde_id IS NOT NULL LIMIT 1) THEN
    RAISE EXCEPTION 'Reversión total cancelada: existen moras o renovaciones. Use la reversión segura.';
  END IF;
END $$;

DROP FUNCTION IF EXISTS agregar_mora_manual(UUID, UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS renovar_prestamo_con_descuento(
  UUID, NUMERIC, UUID, NUMERIC, NUMERIC, NUMERIC, TEXT, INT, TEXT, INT,
  DATE, DATE, INT, JSONB, NUMERIC
);
DROP TABLE IF EXISTS moras_manuales;

ALTER TABLE prestamos DROP COLUMN IF EXISTS renovado_desde_id;
ALTER TABLE prestamos DROP COLUMN IF EXISTS monto_cancelado_renovacion;
ALTER TABLE prestamos DROP COLUMN IF EXISTS efectivo_entregado;

-- monto_mora ya existía en instalaciones anteriores de PrestaPro; se conserva.
ALTER TABLE cuotas DROP CONSTRAINT IF EXISTS cuotas_estado_check;
ALTER TABLE cuotas ADD CONSTRAINT cuotas_estado_check
  CHECK (estado IN ('pendiente', 'parcial', 'pagada', 'vencida'));
