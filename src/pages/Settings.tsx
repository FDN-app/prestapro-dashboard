import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Nombre del negocio</Label>
          <Input defaultValue="PrestaPro" />
        </div>
        <div className="space-y-2">
          <Label>Teléfono del negocio</Label>
          <Input defaultValue="+54 11 5555-0000" />
        </div>
        <div className="space-y-2">
          <Label>Mora por defecto (%)</Label>
          <Input type="number" defaultValue={5} />
        </div>
        <div className="space-y-2">
          <Label>Días de recordatorio antes del vencimiento</Label>
          <Input type="number" defaultValue={2} />
        </div>
        <Button onClick={() => toast.success('Configuración guardada')}>Guardar</Button>
      </div>
    </div>
  );
}
