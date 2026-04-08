import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCobradores } from '@/hooks/useCobradores';

export default function Collectors() {
  const { cobradores, isLoading, createCobrador, isCreating } = useCobradores();
  const [newOpen, setNewOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error('Completar email y contraseña');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      await createCobrador({ email, password });
      setNewOpen(false);
    } catch (e) {
      // Error is handled in the hook
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Cobradores</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestión de usuarios con perfil de cobrador</p>
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)}>Nuevo Cobrador</Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando cobradores...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Rol</th>
                <th className="text-left p-3 font-medium">Fecha Alta</th>
                <th className="text-left p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cobradores.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No hay cobradores registrados</td></tr>
              )}
              {cobradores.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="p-3 font-medium">{c.email}</td>
                  <td className="p-3 text-muted-foreground capitalize">{c.rol}</td>
                  <td className="p-3 text-muted-foreground">{new Date(c.creado_en).toLocaleDateString()}</td>
                  <td className="p-3 text-status-green">🟢 Activo</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nuevo Cobrador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-status-yellow/10 border border-status-yellow/20 rounded-md">
              <p className="text-xs text-status-yellow font-medium">
                ⚠️ Aviso de Seguridad (Fase MVP): Al generar el perfil del cobrador, tu sesión de Administrador se cerrará automáticamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contraseña temporal</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Creando perfil...' : 'Crear Perfil y Cerrar Sesión'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
