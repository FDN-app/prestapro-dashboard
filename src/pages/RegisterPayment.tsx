import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useClientes } from '@/hooks/useClientes';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useCuotas } from '@/hooks/useCuotas';
import { usePagos } from '@/hooks/usePagos';

export default function RegisterPayment() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedLoan = params.get('prestamo') || '';
  const preselectedCuota = params.get('cuota') || '';

  const { clientes, isLoading: loadingClientes } = useClientes();
  const { prestamos, isLoading: loadingPrestamos } = usePrestamos();
  const { registrarPago, isRegistrando } = usePagos();

  // Find initial client if loan was auto-selected
  const initialClient = prestamos.find(p => p.id === preselectedLoan)?.cliente_id || '';

  const [clientId, setClientId] = useState(initialClient);
  const [loanId, setLoanId] = useState(preselectedLoan);
  const [installmentId, setInstallmentId] = useState(preselectedCuota);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');

  const { cuotas, isLoading: loadingCuotas } = useCuotas(loanId);

  const clientLoans = prestamos.filter(l => l.cliente_id === clientId && l.estado !== 'pagado' && l.estado !== 'liquidado');
  
  const pendingInstallments = cuotas.filter(i => i.estado === 'pendiente' || i.estado === 'parcial' || i.estado === 'vencida');
  const selectedInst = pendingInstallments.find(i => i.id === installmentId);
  const remainingAmount = selectedInst ? (selectedInst.monto_cuota - selectedInst.monto_cobrado) : 0;
  
  useEffect(() => {
    if (installmentId && pendingInstallments.length > 0 && !amount) {
      const inst = pendingInstallments.find(i => i.id === installmentId);
      if (inst) setAmount((inst.monto_cuota - inst.monto_cobrado).toString());
    }
  }, [installmentId, pendingInstallments, amount]);

  const isPartial = amount && Number(amount) < remainingAmount;

  const handleInstallmentSelect = (id: string) => {
    setInstallmentId(id);
    const inst = pendingInstallments.find(i => i.id === id);
    if (inst) {
      setAmount((inst.monto_cuota - inst.monto_cobrado).toString());
    }
  };

  const handleConfirm = async () => {
    if (!loanId || !installmentId || !amount || Number(amount) <= 0) {
      toast.error('Complete los campos obligatorios y un monto mayor a 0');
      return;
    }

    try {
      await registrarPago({
        p_prestamo_id: loanId,
        p_cuota_id: installmentId,
        p_monto: Number(amount),
        p_metodo: method,
        p_notas: notes
      });
      navigate(-1);
    } catch (e) {
      // Error handled in hook
    }
  };

  const isLoading = loadingClientes || loadingPrestamos;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">Registrar Pago</h2>

      {isLoading ? (
        <div className="p-4 text-muted-foreground">Cargando datos...</div>
      ) : (
      <div className="bg-card rounded-lg border border-border p-5 space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); setLoanId(''); setInstallmentId(''); }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="">Seleccionar cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Préstamo *</Label>
          <select value={loanId} onChange={e => { setLoanId(e.target.value); setInstallmentId(''); }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={!clientId}>
            <option value="">Seleccionar préstamo</option>
            {clientLoans.map(l => <option key={l.id} value={l.id}>[{new Date(l.fecha_inicio).toLocaleDateString()}] Saldo: {formatCurrency(l.saldo_pendiente)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Cuota *</Label>
          <select value={installmentId} onChange={e => handleInstallmentSelect(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={!loanId || loadingCuotas}>
            <option value="">Seleccionar cuota pendiente</option>
            {pendingInstallments.map(i => (
              <option key={i.id} value={i.id}>
                Cuota #{i.numero_cuota} — Resta {formatCurrency(i.monto_cuota - i.monto_cobrado)} ({i.estado})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Monto ($) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={!installmentId} max={remainingAmount} />
          {isPartial && <p className="text-xs status-yellow">Pago parcial (Resta: {formatCurrency(remainingAmount - Number(amount))})</p>}
        </div>
        <div className="space-y-2">
          <Label>Método de pago</Label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales..." />
        </div>
        <Button className="w-full bg-status-green hover:bg-status-green/90 text-white" onClick={handleConfirm} disabled={isRegistrando || !installmentId}>
          {isRegistrando ? 'Procesando...' : 'Confirmar Pago'}
        </Button>
      </div>
      )}
    </div>
  );
}
