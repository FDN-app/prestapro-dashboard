import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewClient() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">Nuevo Cliente</h2>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Nombre completo *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellido" />
        </div>
        <div className="space-y-2">
          <Label>DNI / Documento</Label>
          <Input placeholder="30.000.000" />
        </div>
        <div className="space-y-2">
          <Label>Teléfono *</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 11 5555-0000" />
        </div>
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Input placeholder="Dirección completa" />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea placeholder="Notas opcionales..." />
        </div>
        <Button className="w-full" onClick={() => {
          if (!name || !phone) { toast.error('Nombre y teléfono son obligatorios'); return; }
          toast.success('Cliente creado exitosamente');
          navigate('/clientes');
        }}>Guardar Cliente</Button>
      </div>
    </div>
  );
}
