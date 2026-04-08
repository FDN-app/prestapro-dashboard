import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
  const [form, setForm] = useState({
    nombre_negocio: '',
    telefono: '',
    mora_porcentaje_default: 5,
    dias_recordatorio: 2
  });

  useEffect(() => {
    if (settings) {
      setForm({
        nombre_negocio: settings.nombre_negocio || '',
        telefono: settings.telefono || '',
        mora_porcentaje_default: settings.mora_porcentaje_default || 0,
        dias_recordatorio: settings.dias_recordatorio || 0
      });
    }
  }, [settings]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Cargando configuración...</div>;

  const handleSave = async () => {
    await updateSettings(form);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4 max-w-lg">
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
        <div className="space-y-2">
          <Label>Días de recordatorio antes del vencimiento</Label>
          <Input 
            type="number" 
            value={form.dias_recordatorio} 
            onChange={e => setForm({...form, dias_recordatorio: Number(e.target.value)})} 
          />
        </div>
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  );
}
