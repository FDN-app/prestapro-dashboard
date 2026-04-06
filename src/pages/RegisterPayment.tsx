import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clients, loans, formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPayment() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [installment, setInstallment] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');

  const clientLoans = loans.filter(l => l.clientId === clientId && l.status === 'activo');
  const selectedLoan = loans.find(l => l.id === loanId);
  const pendingInstallments = selectedLoan?.installments.filter(i => i.status !== 'pagada') || [];

  const selectedInst = pendingInstallments.find(i => i.number.toString() === installment);
  const isPartial = selectedInst && amount && Number(amount) < selectedInst.amount;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">Registrar Pago</h2>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); setLoanId(''); setInstallment(''); }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
            <option value="">Seleccionar cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Préstamo *</Label>
          <select value={loanId} onChange={e => { setLoanId(e.target.value); setInstallment(''); }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={!clientId}>
            <option value="">Seleccionar préstamo</option>
            {clientLoans.map(l => <option key={l.id} value={l.id}>#{l.id} — {formatCurrency(l.amount)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Cuota *</Label>
          <select value={installment} onChange={e => { setInstallment(e.target.value); const inst = pendingInstallments.find(i => i.number.toString() === e.target.value); if (inst) setAmount(inst.amount.toString()); }} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground" disabled={!loanId}>
            <option value="">Seleccionar cuota</option>
            {pendingInstallments.map(i => <option key={i.number} value={i.number}>Cuota #{i.number} — {i.dueDate}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Monto ($) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          {isPartial && <p className="text-xs status-yellow">Pago parcial</p>}
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
          <Label>Comprobante (opcional)</Label>
          <Input type="file" accept="image/*" className="text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales..." />
        </div>
        <Button className="w-full" onClick={() => { toast.success('Pago registrado correctamente'); navigate(-1); }}>Confirmar Pago</Button>
      </div>
    </div>
  );
}
