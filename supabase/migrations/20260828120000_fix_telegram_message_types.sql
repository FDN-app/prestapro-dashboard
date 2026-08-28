BEGIN;

ALTER TABLE mensajes_telegram
  DROP CONSTRAINT IF EXISTS mensajes_telegram_tipo_mensaje_check;

ALTER TABLE mensajes_telegram
  ADD CONSTRAINT mensajes_telegram_tipo_mensaje_check
  CHECK (tipo_mensaje IN (
    'recordatorio', 'vencimiento', 'confirmacion_pago', 'alerta_admin',
    'resumen_diario', 'alerta_vencidas'
  ));

ALTER TABLE settings_empresa
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

COMMIT;
