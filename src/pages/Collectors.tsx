import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCobradores } from '@/hooks/useCobradores';

export default function Collectors() {
  const { cobradores, isLoading, createCobrador, isCreating, updateCobrador } = useCobradores();
  const [newOpen, setNewOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [comision, setComision] = useState<number>(0);

  const handleCreate = async () => {
    if (!email || !password || !nombre) {
      toast.error('Completar nombre, email y contraseña');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      await createCobrador({ email, password, nombre, comision });
      setNewOpen(false);
    } catch (e) {
      // Error is handled in the hook
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Cobradores y Reparto</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestión de usuarios y sus niveles de comisión</p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>Nuevo Miembro</Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando nómina...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                <th className="p-4 font-semibold uppercase tracking-wider text-xs">Nombre</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-xs">Email</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-xs">Comisión %</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-xs text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cobradores.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground italic">No hay empleados registrados</td></tr>
              )}
              {cobradores.map(c => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-foreground">
                    <input 
                      type="text" 
                      defaultValue={c.nombre}
                      onBlur={(e) => updateCobrador({ id: c.id, updates: { nombre: e.target.value } })}
                      className="bg-transparent border-none outline-none w-full hover:bg-muted/30 focus:bg-muted p-1 rounded"
                      placeholder="Sin Nombre"
                    />
                  </td>
                  <td className="p-4 text-muted-foreground">{c.email}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        defaultValue={c.comision_porcentaje || 0}
                        onBlur={(e) => updateCobrador({ id: c.id, updates: { comision_porcentaje: Number(e.target.value) } })}
                        className="bg-secondary border border-border outline-none focus:ring-1 focus:ring-primary w-20 px-2 py-1 flex rounded font-mono text-right"
                      />
                      <span className="text-muted-foreground font-bold">%</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-status-green/10 text-status-green">
                      <div className="w-1.5 h-1.5 rounded-full bg-status-green" /> Activo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Nuevo Cobrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-status-yellow/10 border border-status-yellow/20 rounded-lg">
              <p className="text-xs text-status-yellow font-medium leading-relaxed">
                ⚠️ <strong className="font-bold">Aviso (Fase MVP):</strong> Al generar el perfil del cobrador, tu sesión de Administrador se cerrará automáticamente en 3 segundos. Luego el cobrador podrá iniciar sesión.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Nombre completo</Label>
                <Input placeholder="Ej. Carlos Pérez" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Comisión base (%)</Label>
                <Input type="number" placeholder="Ej. 10" value={comision} onChange={e => setComision(Number(e.target.value))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="carlos@prestapro.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Contraseña temporal *</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            <Button 
              className="w-full mt-4" 
              size="lg"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Generando Perfil...' : 'Crear Perfil y Cerrar Sesión'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
