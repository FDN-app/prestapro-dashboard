-- ============================================================
-- Migración: crear tabla backup_history
-- Paso 3 del sistema de backups automáticos de PrestaPro
-- ============================================================

CREATE TABLE IF NOT EXISTS public.backup_history (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_backup         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre_archivo       TEXT        NOT NULL,
  ruta_bucket          TEXT,                         -- path en Storage: xlsx/PrestaPro_Backup_...
  tamano_bytes         BIGINT,
  estado               TEXT        NOT NULL          -- 'success' | 'failed' | 'skipped_no_changes'
                         CHECK (estado IN ('success', 'failed', 'skipped_no_changes')),
  mensaje_error        TEXT,                         -- solo cuando estado = 'failed'
  duracion_ms          INTEGER,
  tipo_disparo         TEXT        NOT NULL          -- 'cron' | 'manual' | 'test'
                         CHECK (tipo_disparo IN ('cron', 'manual', 'test')),
  registros_exportados JSONB                         -- {"clientes": 54, "prestamos": 55, ...}
);

-- Índice para consultar el último backup exitoso rápidamente
CREATE INDEX IF NOT EXISTS idx_backup_history_fecha_estado
  ON public.backup_history (fecha_backup DESC, estado);

-- RLS desactivado: solo accede el Service Role Key (función Edge)
ALTER TABLE public.backup_history DISABLE ROW LEVEL SECURITY;

-- Comentario descriptivo
COMMENT ON TABLE public.backup_history IS
  'Registro histórico de todos los backups automáticos y manuales de PrestaPro. Sin RLS; acceso exclusivo via Service Role.';
