import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const [form, setForm] = useState({
    nombre_negocio: '',
    telefono: '',
    mora_porcentaje_default: 5,
    dias_recordatorio: 2,
    telegram_bot_token: '',
    telegram_alertas_activas: false,
    telegram_dias_recordatorio: 2,
    telegram_chat_id: ''
  });

  const [isTestingBot, setIsTestingBot] = useState(false);
  const [isSavingNegocio, setIsSavingNegocio] = useState(false);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  // Pre-cargar los valores desde settings_empresa al montar la pantalla
  useEffect(() => {
    if (settings) {
      setForm({
        nombre_negocio: settings.nombre_negocio || '',
        telefono: settings.telefono || '',
        mora_porcentaje_default: settings.mora_porcentaje_default || 5,
        dias_recordatorio: settings.dias_recordatorio || 2,
        telegram_bot_token: settings.telegram_bot_token || '',
        telegram_alertas_activas: settings.telegram_alertas_activas || false,
        telegram_dias_recordatorio: settings.telegram_dias_recordatorio || 2,
        telegram_chat_id: settings.telegram_chat_id || ''
      });
    }
  }, [settings]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando configuración...</div>;

  // Guardar solo los campos del negocio
  const handleSaveNegocio = async () => {
    setIsSavingNegocio(true);
    try {
      await updateSettings({
        nombre_negocio: form.nombre_negocio,
        telefono: form.telefono,
        mora_porcentaje_default: form.mora_porcentaje_default,
        dias_recordatorio: form.dias_recordatorio,
      });
    } finally {
      setIsSavingNegocio(false);
    }
  };

  // Guardar solo los campos de Telegram — llama a updateSettings con los 4 campos Telegram
  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    try {
      await updateSettings({
        telegram_bot_token: form.telegram_bot_token,
        telegram_alertas_activas: form.telegram_alertas_activas,
        telegram_dias_recordatorio: form.telegram_dias_recordatorio,
        telegram_chat_id: form.telegram_chat_id,
      });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // Probar el bot usando los valores actuales del form SIN modificarlo ni resetearlo
  const handleTestBot = async () => {
    if (!form.telegram_chat_id) {
      toast.error('Ingresá un Chat ID y guardá la configuración antes de probar');
      return;
    }
    setIsTestingBot(true);
    try {
      const { data, error } = await supabase.functions.invoke('enviar-telegram', {
        body: {
          chat_id: form.telegram_chat_id,
          mensaje: '🟢 ¡Hola! Test de integración de Telegram Bot API mediante Edge Function exitoso.',
          tipo_mensaje: 'alerta_admin'
        }
      });

      if (error) throw new Error(error.message);

      if (data && data.success) {
        toast.success('Mensaje de prueba enviado exitosamente ✅');
      } else {
        toast.error('Error reportado por Telegram: ' + JSON.stringify(data));
      }
    } catch (e: any) {
      toast.error('Error llamando a la Edge Function: ' + e.message);
    } finally {
      setIsTestingBot(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* ── Datos del Negocio ── */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Datos del Negocio</h3>
          <div className="space-y-2">
            <Label>Nombre del negocio</Label>
            <Input
              value={form.nombre_negocio}
              onChange={e => setForm({ ...form, nombre_negocio: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono del negocio</Label>
            <Input
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Mora por defecto (%)</Label>
            <Input
              type="number"
              value={form.mora_porcentaje_default}
              onChange={e => setForm({ ...form, mora_porcentaje_default: Number(e.target.value) })}
            />
          </div>
          <Button onClick={handleSaveNegocio} disabled={isSavingNegocio} className="w-full">
            {isSavingNegocio ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>

        {/* ── Telegram Bot API ── */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
            <Send size={18} className="text-[#0088cc]" /> Telegram Bot API
          </h3>

          {/* Toggle habilitación */}
          <div className="space-y-2">
            <Label>Habilitar / Deshabilitar Alertas</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.telegram_alertas_activas}
                  onChange={e => setForm({ ...form, telegram_alertas_activas: e.target.checked })}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088cc]"></div>
              </label>
              <span className="text-sm text-muted-foreground">
                {form.telegram_alertas_activas ? 'Alertas Activadas' : 'Alertas Desactivadas'}
              </span>
            </div>
          </div>

          {/* Token del bot */}
          <div className="space-y-2 pt-2">
            <Label>Token del Bot de Telegram</Label>
            <Input
              type="password"
              placeholder="Ej: 8633232394:AAFv8Fg..."
              value={form.telegram_bot_token}
              onChange={e => setForm({ ...form, telegram_bot_token: e.target.value })}
            />
          </div>

          {/* Días de aviso */}
          <div className="space-y-2">
            <Label>Días de aviso previo al vencimiento</Label>
            <select
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              value={form.telegram_dias_recordatorio}
              onChange={e => setForm({ ...form, telegram_dias_recordatorio: Number(e.target.value) })}
            >
              <option value={1}>1 día antes</option>
              <option value={2}>2 días antes</option>
              <option value={3}>3 días antes</option>
            </select>
          </div>

          {/* Chat ID del admin + botón Probar */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground block">
              ID de Chat de Telegram del Administrador
            </Label>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-sm bg-background border-border"
                placeholder="Ej: 123456789"
                value={form.telegram_chat_id}
                onChange={e => setForm({ ...form, telegram_chat_id: e.target.value })}
              />
              <Button
                onClick={handleTestBot}
                disabled={isTestingBot || !form.telegram_chat_id}
                size="sm"
                variant="outline"
                className="text-[#0088cc] border-[#0088cc] hover:bg-[#0088cc] hover:text-white shrink-0"
              >
                {isTestingBot ? 'Enviando...' : 'Probar'}
              </Button>
            </div>
          </div>

          {/* Botón guardar configuración de Telegram */}
          <Button
            onClick={handleSaveTelegram}
            disabled={isSavingTelegram}
            className="w-full bg-[#0088cc] hover:bg-[#0077bb] text-white"
          >
            {isSavingTelegram ? 'Guardando...' : 'Guardar configuración de Telegram'}
          </Button>
        </div>

      </div>
    </div>
  );
}
