import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clients, formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewLoan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedClient = params.get('clientId') || '';

  const [clientId, setClientId] = useState(preselectedClient);
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(10);
  const [rateType, setRateType] = useState<'fijo' | 'variable'>('fijo');
  const [frequency, setFrequency] = useState<'semanal' | 'quincenal' | 'mensual'>('semanal');
  const [installments, setInstallments] = useState(12);
  const [promissory, setPromissory] = useState(false);
  const [notes, setNotes] = useState('');

  const totalToPay = useMemo(() => amount * (1 + rate / 100), [amount, rate]);
  const perInstallment = useMemo(() => installments > 0 ? Math.round(totalToPay / installments) : 0, [totalToPay, installments]);

  const freqDays = frequency === 'semanal' ? 7 : frequency === 'quincenal' ? 14 : 30;

  const schedule = useMemo(() => {
    const today = new Date();
    return Array.from({ length: installments }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + freqDays * (i + 1));
      return {
        number: i + 1,
        date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        amount: perInstallment,
      };
    });
  }, [installments, freqDays, perInstallment]);

  const handleSubmit = () => {
    if (!clientId || amount <= 0 || installments <= 0) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }
    toast.success('Préstamo creado exitosamente');
    navigate(-1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">Nuevo Préstamo</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="">Seleccionar cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Monto del préstamo ($) *</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tasa de interés (%) *</Label>
              <Input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex bg-secondary rounded-lg p-1">
                <button onClick={() => setRateType('fijo')} className={`flex-1 text-xs py-1.5 rounded-md font-medium ${rateType === 'fijo' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Fijo</button>
                <button onClick={() => setRateType('variable')} className={`flex-1 text-xs py-1.5 rounded-md font-medium ${rateType === 'variable' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Variable</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Frecuencia *</Label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as any)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cuotas *</Label>
              <Input type="number" value={installments} onChange={e => setInstallments(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Pagaré</Label>
            <Switch checked={promissory} onCheckedChange={setPromissory} />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales..." />
          </div>
          <Button className="w-full" onClick={handleSubmit}>Confirmar Préstamo</Button>
        </div>

        {/* Preview */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <h3 className="font-semibold">Preview del préstamo</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Monto por cuota:</span><p className="font-bold text-lg">{formatCurrency(perInstallment)}</p></div>
            <div><span className="text-muted-foreground">Total a pagar:</span><p className="font-bold text-lg">{formatCurrency(totalToPay)}</p></div>
          </div>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-2 font-medium">Cuota</th>
                  <th className="text-left p-2 font-medium">Vencimiento</th>
                  <th className="text-left p-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(s => (
                  <tr key={s.number} className="border-b border-border last:border-0">
                    <td className="p-2">{s.number}</td>
                    <td className="p-2">{s.date}</td>
                    <td className="p-2">{formatCurrency(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
