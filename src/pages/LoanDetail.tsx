import { useParams, useNavigate } from 'react-router-dom';
import { loans, formatCurrency, statusLabel, statusColor, statusBgColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loan = loans.find(l => l.id === id);
  const [moraOpen, setMoraOpen] = useState(false);
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [refiOpen, setRefiOpen] = useState(false);
  const [refiStep, setRefiStep] = useState(1);
  const [discount, setDiscount] = useState(0);

  if (!loan) return <div className="p-6">Préstamo no encontrado.</div>;

  const paid = loan.installments.filter(i => i.status === 'pagada').reduce((s, i) => s + i.amount, 0);
  const pending = loan.totalToPay - paid;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold">Préstamo #{loan.id}</h2>
            <p className="text-sm text-muted-foreground">Cliente: {loan.clientName}</p>
          </div>
          <span className={`text-sm ${loan.status === 'pagado' ? 'status-green' : 'text-primary'}`}>
            {loan.status === 'pagado' ? '✅ Pagado' : '🔄 Activo'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div><span className="text-muted-foreground">Monto:</span> {formatCurrency(loan.amount)}</div>
          <div><span className="text-muted-foreground">Tasa:</span> {loan.rate}% {loan.rateType}</div>
          <div><span className="text-muted-foreground">Frecuencia:</span> {loan.frequency}</div>
          <div><span className="text-muted-foreground">Inicio:</span> {loan.startDate}</div>
          <div><span className="text-muted-foreground">Pagaré:</span> {loan.promissoryNote ? 'Sí' : 'No'}</div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>{loan.progress}% pagado</span>
            <span className="text-muted-foreground">{formatCurrency(paid)} de {formatCurrency(loan.totalToPay)}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${loan.progress}%` }} />
          </div>
        </div>

        {/* Action buttons */}
        {loan.status === 'activo' && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => { setRefiStep(1); setRefiOpen(true); }}>Refinanciar</Button>
            <Button variant="outline" size="sm" onClick={() => setEarlyOpen(true)}>Liquidación anticipada</Button>
            <Button variant="outline" size="sm" onClick={() => setMoraOpen(true)}>Configurar mora</Button>
          </div>
        )}
      </div>

      {/* Installments */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Cuotas</h3>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-3 text-left font-medium">#</th>
                <th className="p-3 text-left font-medium">Vencimiento</th>
                <th className="p-3 text-left font-medium">Monto</th>
                <th className="p-3 text-left font-medium">Estado</th>
                <th className="p-3 text-left font-medium hidden sm:table-cell">Fecha pago</th>
                <th className="p-3 text-left font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loan.installments.map(inst => (
                <tr key={inst.number} className={`border-b border-border last:border-0 ${statusBgColor(inst.status)}`}>
                  <td className="p-3">{inst.number}</td>
                  <td className="p-3">{inst.dueDate}</td>
                  <td className="p-3">{formatCurrency(inst.amount)}</td>
                  <td className={`p-3 ${statusColor(inst.status)}`}>{statusLabel(inst.status)}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{inst.paidDate || '—'}</td>
                  <td className="p-3">
                    {(inst.status === 'por_vencer' || inst.status === 'pendiente' || inst.status === 'vencida') && (
                      <Button size="sm" variant="outline" onClick={() => navigate('/registrar-pago')}>
                        Registrar Pago
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mora Modal */}
      <Dialog open={moraOpen} onOpenChange={setMoraOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Configurar Mora</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Activar mora</Label>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label>Porcentaje de mora (%)</Label>
              <Input type="number" defaultValue={5} />
            </div>
            <Button className="w-full" onClick={() => { setMoraOpen(false); toast.success('Mora configurada'); }}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Early Settlement Modal */}
      <Dialog open={earlyOpen} onOpenChange={setEarlyOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Liquidación Anticipada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Saldo pendiente total:</p>
              <p className="text-xl font-bold">{formatCurrency(pending)}</p>
            </div>
            <div className="space-y-2">
              <Label>Descuento (%)</Label>
              <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Monto final a pagar:</p>
              <p className="text-lg font-bold">{formatCurrency(pending * (1 - discount / 100))}</p>
            </div>
            <Button className="w-full" onClick={() => { setEarlyOpen(false); toast.success('Liquidación confirmada'); }}>Confirmar Liquidación</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refinancing Modal */}
      <Dialog open={refiOpen} onOpenChange={setRefiOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Refinanciamiento — Paso {refiStep}/3</DialogTitle></DialogHeader>
          {refiStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Préstamo original: #{loan.id}</p>
              <p className="text-sm">Saldo pendiente: <span className="font-bold">{formatCurrency(pending)}</span></p>
              <Button className="w-full" onClick={() => setRefiStep(2)}>Siguiente</Button>
            </div>
          )}
          {refiStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nueva tasa de interés (%)</Label><Input type="number" defaultValue={10} /></div>
              <div className="space-y-2"><Label>Nuevas cuotas</Label><Input type="number" defaultValue={12} /></div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                  <option>Semanal</option><option>Quincenal</option><option>Mensual</option>
                </select>
              </div>
              <Button className="w-full" onClick={() => setRefiStep(3)}>Siguiente</Button>
            </div>
          )}
          {refiStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm">Se cerrará el préstamo #{loan.id} y se creará uno nuevo por {formatCurrency(pending)} en 12 cuotas.</p>
              <Button className="w-full" onClick={() => { setRefiOpen(false); toast.success('Refinanciamiento confirmado'); }}>Confirmar Refinanciamiento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
