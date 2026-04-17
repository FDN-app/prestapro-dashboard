import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, RefreshCcw, Landmark } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useCuotas } from '@/hooks/useCuotas';
import { Badge } from '@/components/ui/badge';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prestamos, extenderPrestamo, liquidarPrestamo, diferirCuota } = usePrestamos();
  const { cuotas, isLoading: loadingCuotas } = useCuotas(id || null);
  
  const loan = prestamos.find(l => l.id === id);
  
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [refiOpen, setRefiOpen] = useState(false);
  const [refiStep, setRefiStep] = useState(1);
  const [discount, setDiscount] = useState(0);

  // States para refinanciación
  const [refiTasa, setRefiTasa] = useState(10);
  const [refiCuotas, setRefiCuotas] = useState(12);
  const [refiFrec, setRefiFrec] = useState('mensual');

  if (!loan) return <div className="p-6">Préstamo no encontrado.</div>;

  const progress = Math.round(((loan.monto_original - loan.saldo_pendiente) / loan.monto_original) * 100);

  const handleDiferir = async (cuotaId: string) => {
    const dias = window.prompt('¿Cuántos días desea diferir esta cuota y las siguientes?', '7');
    if (dias) {
      try {
        await diferirCuota({ cuota_id: cuotaId, dias_atraso: parseInt(dias) });
      } catch (e) {}
    }
  };

  const handleRefinanciar = async () => {
    try {
      await extenderPrestamo({
        prestamo_id: loan.id,
        nueva_tasa: refiTasa,
        nuevas_cuotas: refiCuotas,
        frecuencia_pago: refiFrec
      });
      setRefiOpen(false);
      navigate('/dashboard');
    } catch (e) {}
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Préstamo #{loan.id.slice(0,8)}</h2>
              <Badge variant={loan.estado === 'activo' ? 'default' : 'secondary'} className="capitalize">
                {loan.estado}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Cliente: <span className="font-semibold text-foreground">{loan.clientes?.nombre_completo}</span></p>
          </div>
          
          <div className="flex gap-2">
             <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => navigate(`/registrar-pago?prestamo=${loan.id}`)}>
                Registrar Pago
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Monto Original</p>
            <p className="text-lg font-bold">{formatCurrency(loan.monto_original)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Saldo Pendiente</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(loan.saldo_pendiente)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa e Interés</p>
            <p className="text-lg font-bold">{loan.tasa_interes}% <span className="text-xs font-medium text-muted-foreground">({loan.frecuencia_pago})</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Inicio del Crédito</p>
            <p className="text-lg font-bold">{new Date(loan.fecha_inicio).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-primary">{progress}% pagado</span>
            <span className="text-muted-foreground">Restan {formatCurrency(loan.saldo_pendiente)}</span>
          </div>
          <div className="w-full bg-secondary/50 rounded-full h-2.5 overflow-hidden">
            <div className="bg-primary rounded-full h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(20,184,166,0.3)]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Action buttons */}
        {loan.estado === 'activo' && (
          <div className="flex flex-wrap gap-3 mt-8">
            <Button onClick={() => { setRefiStep(1); setRefiOpen(true); }} className="gap-2">
              <RefreshCcw size={16} /> Refinanciar
            </Button>
            <Button variant="secondary" onClick={() => setEarlyOpen(true)} className="gap-2">
              <Landmark size={16} /> Liquidación Anticipada
            </Button>
          </div>
        )}
      </div>

      {/* Installments */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="text-primary" size={20} />
          Cronograma de Cuotas
        </h3>
        <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground">
                <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest">Nº</th>
                <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest">Vencimiento</th>
                <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest">Monto</th>
                <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest">Pagado</th>
                <th className="p-4 text-left font-bold uppercase text-[10px] tracking-widest">Estado</th>
                <th className="p-4 text-right font-bold uppercase text-[10px] tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loadingCuotas ? (
                <tr><td colSpan={6} className="p-8 text-center animate-pulse">Cargando cuotas...</td></tr>
              ) : cuotas.map(inst => (
                <tr key={inst.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="p-4 font-bold text-muted-foreground">#{inst.numero_cuota}</td>
                  <td className="p-4 font-medium">{new Date(inst.fecha_vencimiento).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">{formatCurrency(inst.monto_cuota)}</td>
                  <td className="p-4 text-status-green font-medium">{formatCurrency(inst.monto_cobrado)}</td>
                  <td className="p-4">
                    <Badge variant="outline" className={`capitalize ${
                      inst.estado === 'pagada' ? 'bg-status-green/10 text-status-green border-status-green/20' : 
                      inst.estado === 'vencida' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''
                    }`}>
                      {inst.estado}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    {inst.estado !== 'pagada' && (
                      <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-tighter hover:bg-primary/20 hover:text-primary" onClick={() => handleDiferir(inst.id)}>
                        Diferir
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Early Settlement Modal */}
      <Dialog open={earlyOpen} onOpenChange={setEarlyOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Liquidación Anticipada</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Saldo pendiente total</p>
              <p className="text-3xl font-black text-primary">{formatCurrency(loan.saldo_pendiente)}</p>
            </div>
            <div className="space-y-2">
              <Label>Descuento por pronto pago (%)</Label>
              <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="text-lg font-bold" />
            </div>
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm font-medium">Monto final a cobrar:</span>
              <span className="text-xl font-bold">{formatCurrency(loan.saldo_pendiente * (1 - discount / 100))}</span>
            </div>
            <Button className="w-full font-bold py-6" onClick={async () => {
              try {
                await liquidarPrestamo({ prestamo_id: loan.id, monto_pago: loan.saldo_pendiente * (1 - discount / 100) });
                setEarlyOpen(false);
                navigate('/dashboard');
              } catch (e) {}
            }}>Confirmar Liquidación</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refinancing Modal */}
      <Dialog open={refiOpen} onOpenChange={setRefiOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Refinanciamiento — Paso {refiStep}/3</DialogTitle>
          </DialogHeader>
          {refiStep === 1 && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                 <p className="text-sm text-amber-600 font-semibold mb-2 flex items-center gap-2">
                   ⚠️ Advertencia
                 </p>
                 <p className="text-sm">Se cerrará el préstamo actual y se abrirá una nueva línea de crédito con el saldo pendiente capitalizado.</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold">Saldo a Financiar</p>
                <p className="text-3xl font-black">{formatCurrency(loan.saldo_pendiente)}</p>
              </div>
              <Button className="w-full font-bold py-6" onClick={() => setRefiStep(2)}>Configurar Nuevas Condiciones</Button>
            </div>
          )}
          {refiStep === 2 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nueva Tasa (%)</Label>
                  <Input type="number" value={refiTasa} onChange={e => setRefiTasa(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Nº Cuotas</Label>
                  <Input type="number" value={refiCuotas} onChange={e => setRefiCuotas(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia de Pago</Label>
                <select 
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-medium"
                  value={refiFrec}
                  onChange={e => setRefiFrec(e.target.value)}
                >
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                 <Button variant="outline" className="flex-1" onClick={() => setRefiStep(1)}>Atrás</Button>
                 <Button className="flex-[2] font-bold" onClick={() => setRefiStep(3)}>Revisar Nueva Cuota</Button>
              </div>
            </div>
          )}
          {refiStep === 3 && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Nuevo Capital:</span>
                  <span className="font-bold">{formatCurrency(loan.saldo_pendiente)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Interés total ({refiTasa}%):</span>
                  <span className="font-bold text-status-green">+{formatCurrency(loan.saldo_pendiente * (refiTasa / 100))}</span>
                </div>
                <div className="p-4 bg-primary/10 rounded-xl flex justify-between items-center">
                  <span className="font-bold">Valor de cada cuota:</span>
                  <span className="text-xl font-black text-primary">
                    {formatCurrency((loan.saldo_pendiente * (1 + refiTasa/100)) / refiCuotas)}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                 <Button variant="outline" className="flex-1" onClick={() => setRefiStep(2)}>Atrás</Button>
                 <Button className="flex-[2] font-bold bg-primary hover:bg-primary/90" onClick={handleRefinanciar}>Confirmar y Crear</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
