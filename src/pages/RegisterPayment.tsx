import { useState, useEffect, useMemo } from 'react';
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

  const { clientes, isLoading: loadingClientes } = useClientes();
  const { prestamos, isLoading: loadingPrestamos } = usePrestamos();
  const { registrarPago, isRegistrando } = usePagos();

  const initialClient = prestamos.find(p => p.id === preselectedLoan)?.cliente_id || '';

  const [clientId, setClientId] = useState(initialClient);
  const [loanId, setLoanId] = useState(preselectedLoan);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');

  const { cuotas, isLoading: loadingCuotas } = useCuotas(loanId);

  const clientLoans = useMemo(() => prestamos.filter(l => l.cliente_id === clientId && l.estado !== 'pagado' && l.estado !== 'liquidado'), [prestamos, clientId]);
  
  const pendingInstallments = useMemo(() => cuotas.filter(i => i.estado === 'pendiente' || i.estado === 'parcial' || i.estado === 'vencida').sort((a, b) => a.numero_cuota - b.numero_cuota), [cuotas]);
  
  const currentTotalPending = useMemo(() => pendingInstallments.reduce((sum, i) => sum + (i.monto_cuota - i.monto_cobrado), 0), [pendingInstallments]);

  // Default to oldest unpaid installment or the total
  const defaultAmount = pendingInstallments.length > 0 ? (pendingInstallments[0].monto_cuota - pendingInstallments[0].monto_cobrado) : 0;

  useEffect(() => {
    if (pendingInstallments.length > 0 && !amount && loanId) {
      setAmount(defaultAmount.toString());
    }
  }, [pendingInstallments, amount, loanId, defaultAmount]);

  const handleConfirm = async () => {
    if (!loanId || !amount || Number(amount) <= 0) {
      toast.error('Complete los campos obligatorios y un monto mayor a 0');
      return;
    }

    try {
      await registrarPago({
        p_prestamo_id: loanId,
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
          <select value={clientId} onChange={e => { setClientId(e.target.value); setLoanId(''); }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="">Seleccionar cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>Préstamo *</Label>
          <select value={loanId} onChange={e => setLoanId(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={!clientId}>
            <option value="">Seleccionar préstamo</option>
            {clientLoans.map(l => <option key={l.id} value={l.id}>[{new Date(l.fecha_inicio).toLocaleDateString()}] Saldo: {formatCurrency(l.saldo_pendiente)}</option>)}
          </select>
        </div>

        {loanId && (
          <div className="bg-secondary/30 p-3 rounded-lg border border-border/50 text-sm">
            <h4 className="font-medium text-foreground mb-1">Próximos Vencimientos</h4>
            {loadingCuotas ? 'Cargando cuotas...' : (
              <ul className="space-y-1 mt-2 mb-2 text-muted-foreground divide-y divide-border/30">
                {pendingInstallments.slice(0, 3).map(inst => (
                  <li key={inst.id} className="py-1 flex justify-between">
                    <span>Cuota #{inst.numero_cuota} ({inst.estado})</span>
                    <span className="font-medium text-foreground">{formatCurrency(inst.monto_cuota - inst.monto_cobrado)}</span>
                  </li>
                ))}
                {pendingInstallments.length > 3 && <li className="text-xs italic pt-1">+ {pendingInstallments.length - 3} cuotas impagas ocultas</li>}
              </ul>
            )}
            <div className="mt-2 pt-2 border-t border-border/50 flex justify-between font-bold text-primary">
              <span>Monto Total Adeudado</span>
              <span>{formatCurrency(currentTotalPending)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Monto a Pagar ($) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={!loanId} max={currentTotalPending} />
          <p className="text-xs text-muted-foreground">Ojo: Los pagos se asignan automáticamente a las cuotas más viejas primero (Cascada).</p>
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

        <Button className="w-full bg-status-green hover:bg-status-green/90 text-white" onClick={handleConfirm} disabled={isRegistrando || !loanId}>
          {isRegistrando ? 'Procesando...' : 'Confirmar Pago en Cascada'}
        </Button>
      </div>
      )}
    </div>
  );
}
