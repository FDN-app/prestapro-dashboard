import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
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

  const [testChatId, setTestChatId] = useState('');
  const [isTestingBot, setIsTestingBot] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        nombre_negocio: settings.nombre_negocio || '',
        telefono: settings.telefono || '',
        mora_porcentaje_default: settings.mora_porcentaje_default || 0,
        dias_recordatorio: settings.dias_recordatorio || 2,
        telegram_bot_token: settings.telegram_bot_token || '',
        telegram_alertas_activas: settings.telegram_alertas_activas || false,
        telegram_dias_recordatorio: settings.telegram_dias_recordatorio || 2,
        telegram_chat_id: settings.telegram_chat_id || ''
      });
    }
  }, [settings]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando configuración...</div>;

  const handleSave = async () => {
    await updateSettings(form);
  };

  const handleTestBot = async () => {
    if (!form.telegram_chat_id) {
      toast.error('Agrega un Chat ID en la configuración y guárdalo para enviar el test');
      return;
    }
    setIsTestingBot(true);
    try {
      // Llamar a nuestra Edge Function recién creada
      const { data, error } = await supabase.functions.invoke('enviar-telegram', {
        body: { 
            chat_id: form.telegram_chat_id, 
            mensaje: '🟢 ¡Hola! Test de integración de Telegram Bot API mediante Edge Function exitoso.',
            tipo_mensaje: 'alerta_admin'
        }
      });
      
      if (error) {
          throw new Error(error.message);
      }
      
      if (data && data.success) {
        toast.success('Mensaje enviado exitosamente');
      } else {
        toast.error('Error reportado por Telegram: ' + JSON.stringify(data));
      }
    } catch (e: any) {
      toast.error('Error llamando a la Edge Function: ' + e.message);
    }
    setIsTestingBot(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Datos del Negocio</h3>
          <div className="space-y-2">
            <Label>Nombre del negocio</Label>
            <Input 
              value={form.nombre_negocio} 
              onChange={e => setForm({...form, nombre_negocio: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono del negocio</Label>
            <Input 
              value={form.telefono} 
              onChange={e => setForm({...form, telefono: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Mora por defecto (%)</Label>
            <Input 
              type="number" 
              value={form.mora_porcentaje_default} 
              onChange={e => setForm({...form, mora_porcentaje_default: Number(e.target.value)})} 
            />
          </div>
          <Button onClick={handleSave} disabled={isUpdating} className="w-full">
            {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>

        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2">
            <Send size={18} className="text-[#0088cc]" /> Telegram Bot API
          </h3>
          
          <div className="space-y-2">
            <Label>Habilitar / Deshabilitar Alertas</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={form.telegram_alertas_activas} 
                  onChange={e => setForm({...form, telegram_alertas_activas: e.target.checked})} 
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088cc]"></div>
              </label>
              <span className="text-sm text-muted-foreground">{form.telegram_alertas_activas ? 'Alertas Activadas' : 'Alertas Desactivadas'}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Token del Bot de Telegram</Label>
            <Input 
              type="password"
              placeholder="Ej: 8633232394:AAFv8Fg..."
              value={form.telegram_bot_token} 
              onChange={e => setForm({...form, telegram_bot_token: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Días de aviso previo al vencimiento</Label>
            <select 
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              value={form.telegram_dias_recordatorio}
              onChange={e => setForm({...form, telegram_dias_recordatorio: Number(e.target.value)})}
            >
              <option value={1}>1 día antes</option>
              <option value={2}>2 días antes</option>
              <option value={3}>3 días antes</option>
            </select>
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <Label className="text-xs text-muted-foreground mb-2 block">ID de Chat de Telegram del Administrador</Label>
            <div className="flex items-center gap-2">
              <Input 
                className="h-8 text-sm bg-background border-border"
                placeholder="Ej: 123456789" 
                value={form.telegram_chat_id} 
                onChange={e => setForm({...form, telegram_chat_id: e.target.value})} 
              />
              <Button onClick={handleTestBot} disabled={isTestingBot || !form.telegram_chat_id} size="sm" variant="outline" className="text-[#0088cc] border-[#0088cc] hover:bg-[#0088cc] hover:text-white">
                {isTestingBot ? 'Enviando...' : 'Probar'}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
