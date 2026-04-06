import { collectors } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Collectors() {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cobradores</h2>
        <Button size="sm" onClick={() => setNewOpen(true)}>Nuevo Cobrador</Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Nombre</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Estado</th>
              <th className="text-left p-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {collectors.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.email}</td>
                <td className={`p-3 ${c.status === 'activo' ? 'status-green' : 'status-red'}`}>
                  {c.status === 'activo' ? '🟢 Activo' : '🔴 Inactivo'}
                </td>
                <td className="p-3">
                  <Button variant="outline" size="sm">
                    {c.status === 'activo' ? 'Desactivar' : 'Activar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nuevo Cobrador</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Nombre completo" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@ejemplo.com" /></div>
            <div className="space-y-2"><Label>Contraseña temporal</Label><Input type="password" placeholder="••••••" /></div>
            <Button className="w-full" onClick={() => { setNewOpen(false); toast.success('Cobrador creado exitosamente'); }}>Crear Cobrador</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
