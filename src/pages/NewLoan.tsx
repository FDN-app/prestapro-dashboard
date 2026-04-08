import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useClientes } from '@/hooks/useClientes';

export default function NewLoan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedClient = params.get('clientId') || '';
  
  const { clientes, isLoading: isLoadingClientes } = useClientes();

  const [clientId, setClientId] = useState(preselectedClient);
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(10);
  const [comision, setComision] = useState(0);
  const [rateType, setRateType] = useState<'fijo' | 'variable'>('fijo');
  const [frequency, setFrequency] = useState<'semanal' | 'quincenal' | 'mensual' | 'personalizado'>('semanal');
  const [customDays, setCustomDays] = useState(28);
  const [installments, setInstallments] = useState(12);
  const [promissory, setPromissory] = useState(false);
  const [notes, setNotes] = useState('');
  
  // By default, first installment date is empty, which means we will default to today + freqDays
  const [firstInstallmentDate, setFirstInstallmentDate] = useState('');

  const totalToPay = useMemo(() => amount * (1 + rate / 100), [amount, rate]);
  const perInstallment = useMemo(() => installments > 0 ? Math.round(totalToPay / installments) : 0, [totalToPay, installments]);

  const freqDays = frequency === 'semanal' ? 7 : frequency === 'quincenal' ? 14 : frequency === 'mensual' ? 30 : customDays;

  const schedule = useMemo(() => {
    let startD = new Date();
    if (firstInstallmentDate) {
      // Parse YYYY-MM-DD cleanly to avoid timezone offsets
      const [y, m, d] = firstInstallmentDate.split('-');
      // Start date exactly at that day (we don't add freqDays for the first installment if manual)
      startD = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      // Default behavior: add freqdays
      startD.setDate(startD.getDate() + freqDays);
    }
    
    return Array.from({ length: installments }, (_, i) => {
      const d = new Date(startD);
      // For manual date, first installment is exactly that date, subsequent are + freqDays
      if (firstInstallmentDate) {
        d.setDate(d.getDate() + freqDays * i);
      } else {
        d.setDate(d.getDate() + freqDays * i);
      }
      
      return {
        number: i + 1,
        date: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        rawDate: d.toISOString().split('T')[0],
        amount: perInstallment,
      };
    });
  }, [installments, freqDays, perInstallment, firstInstallmentDate]);

  const { createPrestamo, isCreating, refinanciarPrestamo, isRefinanciando } = usePrestamos();
  const oldLoanId = params.get('refinanciar');

  const handleSubmit = async () => {
    if (!clientId || amount <= 0 || installments <= 0 || (frequency === 'personalizado' && customDays <= 0)) {
      toast.error('Completá todos los campos obligatorios');
      return;
    }
    
    // Preparar el payload para el RPC
    const defaultFirstDate = new Date();
    defaultFirstDate.setDate(defaultFirstDate.getDate() + freqDays);
    const fechaPrimCuota = firstInstallmentDate || defaultFirstDate.toISOString().split('T')[0];

    let payload: any = {
      p_cliente_id: clientId,
      p_monto_original: amount,
      p_tasa_interes: rate,
      p_comision: comision,
      p_tipo_interes: rateType,
      p_cantidad_cuotas: installments,
      p_frecuencia_pago: frequency,
      p_frecuencia_dias: frequency === 'personalizado' ? customDays : freqDays,
      p_fecha_inicio: new Date().toISOString().split('T')[0],
      p_fecha_primera_cuota: fechaPrimCuota,
      p_cantidad_renovaciones: oldLoanId ? 1 : 0, 
      p_cuotas: schedule.map(s => {
        return {
          num: s.number,
          monto: s.amount,
          fecha_vto: s.rawDate
        };
      })
    };

    try {
      if (oldLoanId) {
        payload.p_viejo_prestamo_id = oldLoanId;
        await refinanciarPrestamo(payload);
      } else {
        await createPrestamo(payload);
      }
      navigate(-1);
    } catch (e) {
      // toast is inside hook
    }
  };

  const isWorking = isCreating || isRefinanciando;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">{oldLoanId ? 'Refinanciar Préstamo' : 'Nuevo Préstamo'}</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monto base ($) *</Label>
              <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Comisión inicial ($)</Label>
              <Input type="number" value={comision} onChange={e => setComision(Number(e.target.value))} />
            </div>
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
                <option value="mensual">Mensual (30 d)</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            {frequency === 'personalizado' ? (
              <div className="space-y-2">
                <Label>Días *</Label>
                <Input type="number" value={customDays} onChange={e => setCustomDays(Number(e.target.value))} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cuotas *</Label>
                <Input type="number" value={installments} onChange={e => setInstallments(Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {frequency === 'personalizado' && (
              <div className="space-y-2">
                <Label>Cuotas *</Label>
                <Input type="number" value={installments} onChange={e => setInstallments(Number(e.target.value))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>1° Cuota (Automático si vacío)</Label>
              <Input type="date" value={firstInstallmentDate} onChange={e => setFirstInstallmentDate(e.target.value)} />
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
          <div className="flex justify-end pt-4">
          <Button size="lg" className="w-full sm:w-auto" onClick={handleSubmit} disabled={isWorking}>
            {isWorking ? 'Guardando...' : (oldLoanId ? 'Confirmar Refinanciamiento' : 'Crear Préstamo')}
          </Button>
        </div>
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
