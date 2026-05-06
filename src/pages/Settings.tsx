import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { Send, UserPlus, Key, X, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const queryClient = useQueryClient();
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

  // Employee modal
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({ email: '', password: '', nombre_completo: '', rol: 'cobrador', comision_porcentaje: 0 });
  const [isCreatingEmp, setIsCreatingEmp] = useState(false);

  // Password modal
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ nueva: '', confirmar: '' });
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Capital modal
  const [showCapModal, setShowCapModal] = useState(false);
  const [capForm, setCapForm] = useState({ monto: '', descripcion: '' });
  const [isSavingCap, setIsSavingCap] = useState(false);

  // Fetch employees
  const { data: empleados } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const { data } = await supabase.from('perfiles').select('*').order('creado_en', { ascending: false });
      return data || [];
    }
  });

  // Fetch capital total
  const { data: capitalTotal } = useQuery({
    queryKey: ['capital-total'],
    queryFn: async () => {
      const { data } = await supabase.from('capital').select('monto');
      return (data || []).reduce((sum: number, r: any) => sum + Number(r.monto), 0);
    }
  });

  // Current user role
  const { data: currentUserRole } = useQuery({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
      return data?.rol || null;
    }
  });

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

  const handleSaveNegocio = async () => {
    setIsSavingNegocio(true);
    try { await updateSettings({ nombre_negocio: form.nombre_negocio, telefono: form.telefono, mora_porcentaje_default: form.mora_porcentaje_default, dias_recordatorio: form.dias_recordatorio }); }
    finally { setIsSavingNegocio(false); }
  };

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    try { await updateSettings({ telegram_bot_token: form.telegram_bot_token, telegram_alertas_activas: form.telegram_alertas_activas, telegram_dias_recordatorio: form.telegram_dias_recordatorio, telegram_chat_id: form.telegram_chat_id }); }
    finally { setIsSavingTelegram(false); }
  };

  const handleTestBot = async () => {
    if (!form.telegram_chat_id) { toast.error('Ingresá un Chat ID y guardá la configuración antes de probar'); return; }
    setIsTestingBot(true);
    try {
      const { data, error } = await supabase.functions.invoke('enviar-telegram', { body: { chat_id: form.telegram_chat_id, mensaje: '🟢 ¡Hola! Test de integración de Telegram Bot API mediante Edge Function exitoso.', tipo_mensaje: 'alerta_admin' } });
      if (error) throw new Error(error.message);
      if (data && data.success) toast.success('Mensaje de prueba enviado exitosamente ✅');
      else toast.error('Error reportado por Telegram: ' + JSON.stringify(data));
    } catch (e: any) { toast.error('Error llamando a la Edge Function: ' + e.message); }
    finally { setIsTestingBot(false); }
  };

  const handleCreateEmployee = async () => {
    if (!empForm.email || !empForm.password || !empForm.nombre_completo) { toast.error('Completá todos los campos'); return; }
    setIsCreatingEmp(true);
    try {
      const { data, error } = await supabase.functions.invoke('crear-usuario', { body: empForm });
      // When Edge Function returns 400, error is generic but data contains the real error
      if (error) {
        const realError = data?.error || error.message;
        throw new Error(realError);
      }
      if (data?.error) throw new Error(data.error);
      toast.success(`Empleado ${empForm.nombre_completo} creado exitosamente`);
      setShowEmpModal(false);
      setEmpForm({ email: '', password: '', nombre_completo: '', rol: 'cobrador', comision_porcentaje: 0 });
      queryClient.invalidateQueries({ queryKey: ['empleados'] });
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setIsCreatingEmp(false); }
  };

  const handleChangePassword = async () => {
    if (pwdForm.nueva.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pwdForm.nueva !== pwdForm.confirmar) { toast.error('Las contraseñas no coinciden'); return; }
    setIsChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.nueva });
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente');
      setShowPwdModal(false);
      setPwdForm({ nueva: '', confirmar: '' });
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setIsChangingPwd(false); }
  };

  const handleAjusteCapital = async () => {
    const montoNum = Number(capForm.monto);
    if (!capForm.monto || isNaN(montoNum)) { toast.error('Ingresá un monto válido'); return; }
    setIsSavingCap(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('capital').insert({
        tipo: 'ajuste_manual',
        monto: montoNum,
        descripcion: capForm.descripcion || 'Ajuste manual de capital',
        usuario_id: user?.id,
      });
      if (error) throw error;
      toast.success('Capital ajustado correctamente');
      setShowCapModal(false);
      setCapForm({ monto: '', descripcion: '' });
      queryClient.invalidateQueries({ queryKey: ['capital-total'] });
    } catch (e: any) { toast.error('Error: ' + e.message); }
    finally { setIsSavingCap(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* ── Datos del Negocio ── */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Datos del Negocio</h3>
          <div className="space-y-2"><Label>Nombre del negocio</Label><Input value={form.nombre_negocio} onChange={e => setForm({ ...form, nombre_negocio: e.target.value })} /></div>
          <div className="space-y-2"><Label>Teléfono del negocio</Label><Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
          <div className="space-y-2"><Label>Mora por defecto (%)</Label><Input type="number" value={form.mora_porcentaje_default} onChange={e => setForm({ ...form, mora_porcentaje_default: Number(e.target.value) })} /></div>
          <Button onClick={handleSaveNegocio} disabled={isSavingNegocio} className="w-full">{isSavingNegocio ? 'Guardando...' : 'Guardar Cambios'}</Button>
        </div>

        {/* ── Telegram Bot API ── */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2 flex items-center gap-2"><Send size={18} className="text-[#0088cc]" /> Telegram Bot API</h3>
          <div className="space-y-2">
            <Label>Habilitar / Deshabilitar Alertas</Label>
            <div className="flex items-center gap-3 mt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={form.telegram_alertas_activas} onChange={e => setForm({ ...form, telegram_alertas_activas: e.target.checked })} />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088cc]"></div>
              </label>
              <span className="text-sm text-muted-foreground">{form.telegram_alertas_activas ? 'Alertas Activadas' : 'Alertas Desactivadas'}</span>
            </div>
          </div>
          <div className="space-y-2 pt-2"><Label>Token del Bot de Telegram</Label><Input type="password" placeholder="Ej: 8633232394:AAFv8Fg..." value={form.telegram_bot_token} onChange={e => setForm({ ...form, telegram_bot_token: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Días de aviso previo al vencimiento</Label>
            <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground" value={form.telegram_dias_recordatorio} onChange={e => setForm({ ...form, telegram_dias_recordatorio: Number(e.target.value) })}>
              <option value={1}>1 día antes</option><option value={2}>2 días antes</option><option value={3}>3 días antes</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground block">ID de Chat de Telegram del Administrador</Label>
            <div className="flex items-center gap-2">
              <Input className="h-8 text-sm bg-background border-border" placeholder="Ej: 123456789" value={form.telegram_chat_id} onChange={e => setForm({ ...form, telegram_chat_id: e.target.value })} />
              <Button onClick={handleTestBot} disabled={isTestingBot || !form.telegram_chat_id} size="sm" variant="outline" className="text-[#0088cc] border-[#0088cc] hover:bg-[#0088cc] hover:text-white shrink-0">{isTestingBot ? 'Enviando...' : 'Probar'}</Button>
            </div>
          </div>
          <Button onClick={handleSaveTelegram} disabled={isSavingTelegram} className="w-full bg-[#0088cc] hover:bg-[#0077bb] text-white">{isSavingTelegram ? 'Guardando...' : 'Guardar configuración de Telegram'}</Button>
        </div>

        {/* ── Empleados / Cobradores ── */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2"><UserPlus size={18} className="text-primary" /> Empleados / Cobradores</h3>
            <Button size="sm" onClick={() => setShowEmpModal(true)} className="gap-1"><UserPlus size={14} /> Agregar</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Nombre</th><th className="p-2">Email</th><th className="p-2">Rol</th><th className="p-2">Comisión</th></tr></thead>
              <tbody>
                {empleados?.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-2 font-medium">{emp.nombre_completo || '—'}</td>
                    <td className="p-2 text-muted-foreground">{emp.email}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${emp.rol === 'admin' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-500'}`}>{emp.rol}</span></td>
                    <td className="p-2">{emp.comision_porcentaje}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Capital Disponible (admin only) ── */}
        {currentUserRole === 'admin' && (
          <div className="bg-card rounded-lg border border-border p-5 space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><DollarSign size={18} className="text-green-500" /> Capital Disponible</h3>
            <div className="text-center py-3">
              <p className="text-3xl font-bold text-green-500">${(capitalTotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground mt-1">Sumatoria de todos los movimientos</p>
            </div>
            <Button variant="outline" onClick={() => setShowCapModal(true)} className="w-full gap-2"><DollarSign size={14} /> Ajustar Capital</Button>
          </div>
        )}

        {/* ── Cambiar Contraseña ── */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><Key size={18} /> Mi Cuenta</h3>
          <p className="text-sm text-muted-foreground">Cambiá tu contraseña de acceso al sistema.</p>
          <Button variant="outline" onClick={() => setShowPwdModal(true)} className="w-full gap-2"><Key size={14} /> Cambiar Contraseña</Button>
        </div>

      </div>

      {/* ── Modal: Agregar Empleado ── */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowEmpModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Agregar Empleado</h3><button onClick={() => setShowEmpModal(false)}><X size={20} /></button></div>
            <div className="space-y-2"><Label>Nombre completo</Label><Input value={empForm.nombre_completo} onChange={e => setEmpForm({ ...empForm, nombre_completo: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contraseña temporal</Label><Input type="password" value={empForm.password} onChange={e => setEmpForm({ ...empForm, password: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Rol</Label><select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" value={empForm.rol} onChange={e => setEmpForm({ ...empForm, rol: e.target.value })}><option value="cobrador">Cobrador</option><option value="admin">Admin</option></select></div>
              <div className="space-y-2"><Label>Comisión (%)</Label><Input type="number" value={empForm.comision_porcentaje} onChange={e => setEmpForm({ ...empForm, comision_porcentaje: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={handleCreateEmployee} disabled={isCreatingEmp} className="w-full">{isCreatingEmp ? 'Creando...' : 'Crear Empleado'}</Button>
          </div>
        </div>
      )}

      {/* ── Modal: Cambiar Contraseña ── */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPwdModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Cambiar Contraseña</h3><button onClick={() => setShowPwdModal(false)}><X size={20} /></button></div>
            <div className="space-y-2"><Label>Nueva contraseña</Label><Input type="password" value={pwdForm.nueva} onChange={e => setPwdForm({ ...pwdForm, nueva: e.target.value })} /></div>
            <div className="space-y-2"><Label>Confirmar contraseña</Label><Input type="password" value={pwdForm.confirmar} onChange={e => setPwdForm({ ...pwdForm, confirmar: e.target.value })} /></div>
            <Button onClick={handleChangePassword} disabled={isChangingPwd} className="w-full">{isChangingPwd ? 'Actualizando...' : 'Actualizar Contraseña'}</Button>
          </div>
        </div>
      )}

      {/* ── Modal: Ajustar Capital ── */}
      {showCapModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCapModal(false)}>
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Ajustar Capital</h3><button onClick={() => setShowCapModal(false)}><X size={20} /></button></div>
            <p className="text-sm text-muted-foreground">Ingresá un monto positivo para sumar o negativo para restar del capital disponible.</p>
            <div className="space-y-2"><Label>Monto ($)</Label><Input type="number" step="0.01" value={capForm.monto} onChange={e => setCapForm({ ...capForm, monto: e.target.value })} placeholder="0" /></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={capForm.descripcion} onChange={e => setCapForm({ ...capForm, descripcion: e.target.value })} placeholder="Ej: Aporte de efectivo" /></div>
            <Button onClick={handleAjusteCapital} disabled={isSavingCap} className="w-full">{isSavingCap ? 'Guardando...' : 'Guardar Ajuste'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
