import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useCuotas } from '@/hooks/useCuotas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { usePagos } from '@/hooks/usePagos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { formatDateDisplay } from '@/lib/utils';

function LoanAccordionItem({ loan, clientName }: { loan: any; clientName: string }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { registrarPago, isRegistrando } = usePagos();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendInterest, setExtendInterest] = useState('0');

  // Estados para Pagó Todo
  const [showPayAllModal, setShowPayAllModal] = useState(false);
  const [selectedCuotaPayAll, setSelectedCuotaPayAll] = useState<any>(null);
  const [payAllAmount, setPayAllAmount] = useState(0);
  const [payAllMethod, setPayAllMethod] = useState('efectivo');

  // Estados para Pagó Parcial
  const [showPayPartialModal, setShowPayPartialModal] = useState(false);
  const [selectedCuotaPayPartial, setSelectedCuotaPayPartial] = useState<any>(null);
  const [payPartialAmount, setPayPartialAmount] = useState('');
  const [payPartialMethod, setPayPartialMethod] = useState('efectivo');
  const [payPartialNotes, setPayPartialNotes] = useState('');

  const { cuotas, isLoading } = useCuotas(loan.id); 
  const { extenderPrestamo, isExtendiendo } = usePrestamos();

  const handlePagarTodoClick = (cuota: any, restante: number) => {
    setSelectedCuotaPayAll(cuota);
    setPayAllAmount(restante);
    setPayAllMethod('efectivo');
    setShowPayAllModal(true);
  };

  const handlePagarParcialClick = (cuota: any, restante: number) => {
    setSelectedCuotaPayPartial(cuota);
    setPayPartialAmount('');
    setPayPartialMethod('efectivo');
    setPayPartialNotes('');
    setShowPayPartialModal(true);
  };

  const handleConfirmPayAll = async () => {
    if (!selectedCuotaPayAll) return;
    try {
      await registrarPago({
        p_prestamo_id: loan.id,
        p_monto: payAllAmount,
        p_metodo: payAllMethod,
        p_notas: '',
        p_es_cobro_directo_admin: false,
      });
      setShowPayAllModal(false);
    } catch (e) {
      // error toast managed by hook
    }
  };

  const handleConfirmPayPartial = async () => {
    if (!selectedCuotaPayPartial || !payPartialAmount) {
      toast.error('Por favor ingrese el monto pagado');
      return;
    }

    const amountNum = Number(payPartialAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (amountNum > Number(loan.saldo_pendiente)) {
      toast.error(`El monto NO puede ser mayor al saldo total pendiente del préstamo (${formatCurrency(loan.saldo_pendiente)})`);
      return;
    }

    try {
      await registrarPago({
        p_prestamo_id: loan.id,
        p_monto: amountNum,
        p_metodo: payPartialMethod,
        p_notas: payPartialNotes,
        p_es_cobro_directo_admin: false,
      });
      setShowPayPartialModal(false);
      toast.success('Pago parcial registrado. Saldo aplicado a la próxima cuota si corresponde.');
    } catch (e) {
      // error toast managed by hook
    }
  };
  
  const isPagado = loan.estado === 'pagado' || loan.estado === 'liquidado';
  const progress = isPagado ? 100 : Math.max(0, Math.round(((loan.monto_original - loan.saldo_pendiente) / loan.monto_original) * 100));

  const totalADevolver = cuotas?.reduce((acc: number, c: any) => acc + Number(c.monto_cuota), 0) || 0;
  const interesTotal = Math.max(0, totalADevolver - Number(loan.monto_original));
  const valorCuota = cuotas && cuotas.length > 0 ? Number(cuotas[0].monto_cuota) : 0;
  const cuotasPagadas = cuotas?.filter((c: any) => c.estado === 'pagada').length || 0;
  const cantidadReal = loan.cantidad_cuotas || cuotas?.length || 0;

  const getCuotaStatusStyles = (estado: string, fecha_vencimiento: string) => {
    if (estado === 'pagada') return { label: 'Pagada', classes: 'bg-status-green/10 text-status-green border-status-green/20' };
    if (estado === 'vencida') return { label: 'Vencida', classes: 'bg-status-red/10 text-status-red border-status-red/20' };
    if (estado === 'parcial') return { label: 'Parcial', classes: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const vto = new Date(fecha_vencimiento);
    vto.setMinutes(vto.getMinutes() + vto.getTimezoneOffset());
    
    const diffTime = vto.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 3 && diffDays >= 0) {
      return { label: 'Por vencer', classes: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20' };
    }
    return { label: 'Pendiente', classes: 'bg-secondary text-muted-foreground border-border' };
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-secondary/50 transition-colors flex flex-col gap-4"
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-foreground">Préstamo #{loan.id.substring(0, 8)}...</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${isPagado ? 'bg-status-green/10 text-status-green' : (loan.estado === 'mora' ? 'bg-status-red/10 text-status-red' : 'bg-primary/10 text-primary')}`}>
              {loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1)}
            </span>
            {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Capital Prestado</span>
            <span className="font-medium">{formatCurrency(loan.monto_original)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Interés Total</span>
            <span className="font-medium">{isLoading ? '...' : formatCurrency(interesTotal)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total a Devolver</span>
            <span className="font-medium">{isLoading ? '...' : formatCurrency(totalADevolver)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Cuotas (Frecuencia)</span>
            <span className="font-medium">{cantidadReal} ({loan.frecuencia_pago === 'personalizado' ? (loan.frecuencia_dias ? `cada ${loan.frecuencia_dias} días` : 'personalizado') : loan.frecuencia_pago})</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Valor de Cuota</span>
            <span className="font-medium">{isLoading ? '...' : formatCurrency(valorCuota)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Fecha de Inicio</span>
            <span className="font-medium">{formatDateDisplay(loan.fecha_inicio)}</span>
          </div>
        </div>

        <div className="w-full mt-2">
          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
            <span>Progreso de Pago</span>
            <span>{progress}% — {isLoading ? '...' : `${cuotasPagadas}/${cantidadReal}`} cuotas</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-background/50 p-4 animate-in slide-in-from-top-2 duration-300">
          <h4 className="font-semibold text-sm mb-3">Lista de Cuotas</h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando cuotas...</p>
          ) : cuotas.length > 0 ? (
            <div className="space-y-2">
              {(() => {
                let arrastre_acumulado = 0;
                const sortedCuotas = [...cuotas].sort((a, b) => a.numero_cuota - b.numero_cuota);

                return sortedCuotas.map((cuota, index) => {
                  const actual_cuota = Number(cuota.monto_cuota);
                  const cobrado = Number(cuota.monto_cobrado) || 0;
                  const restante = Math.max(0, actual_cuota - cobrado);
                  
                  const arrastre_visual = arrastre_acumulado;
                  const total_a_pagar = actual_cuota + arrastre_visual;
                  
                  // Arrastre solo acumula remanentes de pagos PARCIALES reales
                  if (cuota.estado === 'parcial' && cobrado > 0) {
                    arrastre_acumulado += restante;
                  }

                  const requirePayment = cuota.estado === 'pendiente' || cuota.estado === 'parcial' || cuota.estado === 'vencida';
                  const style = getCuotaStatusStyles(cuota.estado, cuota.fecha_vencimiento);
                  
                  return (
                    <div key={cuota.id} className={`flex flex-wrap sm:flex-nowrap items-center justify-between p-3 rounded-lg border ${arrastre_visual > 0 && requirePayment ? 'border-status-yellow/30 bg-status-yellow/5' : 'border-border bg-card'} gap-2`}>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {cuota.numero_cuota}
                        </div>
                        <div>
                          {arrastre_visual > 0 && requirePayment ? (
                             <div className="mb-1">
                               <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">Orig: {formatCurrency(actual_cuota)}</p>
                               <div className="flex items-center gap-1">
                                 <span className="text-[10px] bg-status-yellow text-status-yellow-foreground px-1.5 py-0.5 rounded font-bold">Arrastre: {formatCurrency(arrastre_visual)}</span>
                               </div>
                               <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(total_a_pagar)}</p>
                             </div>
                          ) : (
                             <p className="text-sm font-medium">{formatCurrency(actual_cuota)}</p>
                          )}
                          
                          <p className="text-xs text-muted-foreground">Vence: {formatDateDisplay(cuota.fecha_vencimiento)}</p>
                          
                          {cuota.estado === 'parcial' && (
                             <div className="flex items-center gap-2 mt-1 text-[11px] font-medium">
                               <span className="text-status-green">Pagado: {formatCurrency(cobrado)}</span>
                               <span className="text-status-red">Restante: {formatCurrency(restante)}</span>
                             </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                        <span className={`text-xs px-2 py-1 rounded-full border w-fit ${style.classes}`}>
                          {style.label}
                        </span>
                        {requirePayment && (role === 'admin' || role === 'cobrador') && (
                          <div className="flex flex-col sm:flex-row gap-1.5 w-full sm:w-auto">
                            <Button 
                              size="sm"
                              className="h-7 text-xs bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold transition-colors w-full sm:w-auto"
                              onClick={() => handlePagarTodoClick(cuota, restante)}
                            >
                              ✅ Pagó todo
                            </Button>
                            <Button 
                              size="sm"
                              className="h-7 text-xs bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white font-semibold transition-colors w-full sm:w-auto"
                              onClick={() => handlePagarParcialClick(cuota, restante)}
                            >
                              💰 Pagó parcial
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
              
              {!isPagado && loan.saldo_pendiente > 0 && cuotas.every(c => c.estado !== 'pendiente') && (
                 <div className="pt-2 mt-2 border-t border-dashed border-border flex justify-end">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all"
                      onClick={() => setIsExtendModalOpen(true)}
                    >
                      <Plus size={14} className="mr-1" /> Refinanciar / Extender saldo
                    </Button>
                 </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No existen cuotas para este préstamo.</p>
          )}
        </div>
      )}

      {/* Modal Extend Loan */}
      <Dialog open={isExtendModalOpen} onOpenChange={setIsExtendModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Extender Préstamo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Se agregará 1 cuota más respetando la frecuencia de este préstamo para cubrir el saldo pendiente actual de <strong>{formatCurrency(loan.saldo_pendiente)}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Añadir interés por refinanciación/mora (%)</Label>
              <Input 
                type="number"
                value={extendInterest} 
                onChange={e => setExtendInterest(e.target.value)} 
                min="0"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">Por defecto es 0%. Si agregás interés, el saldo deudor total aumentará.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={async () => {
                await extenderPrestamo({ prestamo_id: loan.id, interes_porcentaje: Number(extendInterest) });
                setIsExtendModalOpen(false);
              }} 
              disabled={isExtendiendo}
            >
              {isExtendiendo ? 'Extendiendo...' : 'Confirmar Extensión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Pago Total */}
      <Dialog open={showPayAllModal} onOpenChange={setShowPayAllModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar pago total</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-left">
            <p className="text-sm text-muted-foreground">
              ¿Confirmás que <span className="font-semibold text-foreground">{clientName}</span> pagó <span className="font-semibold text-[#10B981]">{formatCurrency(payAllAmount)}</span> de la cuota #{selectedCuotaPayAll?.numero_cuota}?
            </p>
            <div className="space-y-2">
              <Label htmlFor="pay-all-method">Método de pago</Label>
              <select 
                id="pay-all-method" 
                value={payAllMethod} 
                onChange={e => setPayAllMethod(e.target.value)} 
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayAllModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmPayAll} 
              disabled={isRegistrando}
              className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold"
            >
              {isRegistrando ? 'Registrando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Pago Parcial */}
      <Dialog open={showPayPartialModal} onOpenChange={setShowPayPartialModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Registrar pago parcial</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-left">
            {selectedCuotaPayPartial && (
              <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded border border-border">
                Cuota #{selectedCuotaPayPartial.numero_cuota} — Monto original: <span className="font-semibold text-foreground">{formatCurrency(selectedCuotaPayPartial.monto_cuota)}</span>. Ingresá cuánto pagó el cliente.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="pay-partial-amount">Monto pagado ($) *</Label>
              <Input 
                id="pay-partial-amount"
                type="number"
                value={payPartialAmount}
                onChange={e => setPayPartialAmount(e.target.value)}
                placeholder="0"
                required
              />
              {selectedCuotaPayPartial && payPartialAmount && Number(payPartialAmount) === (Number(selectedCuotaPayPartial.monto_cuota) - (Number(selectedCuotaPayPartial.monto_cobrado) || 0)) && (
                <p className="text-xs text-[#F59E0B] font-medium animate-in fade-in duration-200">
                  Sugerencia: Podés usar la opción "Pagó todo" para esta cuota.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-partial-method">Método de pago</Label>
              <select 
                id="pay-partial-method" 
                value={payPartialMethod} 
                onChange={e => setPayPartialMethod(e.target.value)} 
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-partial-notes">Notas</Label>
              <Textarea 
                id="pay-partial-notes"
                value={payPartialNotes}
                onChange={e => setPayPartialNotes(e.target.value)}
                placeholder="Notas opcionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayPartialModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmPayPartial} 
              disabled={isRegistrando}
              className="bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white font-semibold"
            >
              {isRegistrando ? 'Registrando...' : 'Confirmar pago parcial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { clientes, isLoading: isLoadingClientes, updateCliente, isUpdating } = useClientes();
  const { prestamos, isLoading: isLoadingPrestamos } = usePrestamos();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre_completo: '',
    telefono: '',
    direccion: '',
    notas: '',
    telegram_chat_id: ''
  });

  if (isLoadingClientes || isLoadingPrestamos) {
    return <div className="p-6 text-muted-foreground">Cargando datos del cliente...</div>;
  }

  const client = clientes.find(c => c.id === id);
  const clientLoans = prestamos.filter(l => l.cliente_id === id);

  if (!client) return <div className="p-6">Cliente no encontrado.</div>;

  const goodPayer = client.status === 'al_dia' || client.status === 'pagado';

  const handleEditClick = () => {
    setEditForm({
      nombre_completo: client.nombre_completo || '',
      telefono: client.telefono || client.phone || '',
      direccion: client.direccion || '',
      notas: client.notas || '',
      telegram_chat_id: client.telegram_chat_id || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateCliente({ id: client.id, updates: {
        nombre_completo: editForm.nombre_completo,
        telefono: editForm.telefono,
        direccion: editForm.direccion,
        notas: editForm.notas,
        telegram_chat_id: editForm.telegram_chat_id || null
      }});
      setIsEditModalOpen(false);
    } catch (e) {
      // ya manejado por toast en el hook
    }
  };

  const handleArchiveClick = () => {
    const activeLoans = clientLoans.filter(l => ['activo', 'mora'].includes(l.estado));
    if (activeLoans.length > 0) {
      toast.error('No podés archivar un cliente con préstamos activos');
      return;
    }
    setShowArchiveDialog(true);
  };

  const handleConfirmArchive = async () => {
    setShowArchiveDialog(false);
    try {
      await updateCliente({
        id: client.id,
        updates: { archivado: true }
      });
      toast.success('Cliente archivado correctamente');
      navigate('/clientes');
    } catch (e) {
      // ya manejado por toast en el hook
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <button onClick={() => navigate('/clientes')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header Ficha Cliente */}
      <div className="bg-card rounded-xl border border-border p-5 lg:p-6 relative overflow-hidden">
        {/* Decorative background element based on status */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 ${goodPayer ? 'bg-status-green' : 'bg-status-red'}`} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${goodPayer ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red'}`}>
              {(client.nombre_completo || client.name || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            
            {/* Titulo y Estado */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">{client.nombre_completo}</h2>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-0.5 rounded-full shadow-sm font-medium ${statusColor(client.status)}`}>
                  {statusLabel(client.status)}
                </span>
                <span className="text-xs text-muted-foreground">ID: {client.id.substring(0, 8)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            <Button variant="outline" size="sm" onClick={handleEditClick} className="h-8 text-xs font-medium w-full sm:w-auto">
              <Pencil size={13} className="mr-1.5" /> Editar Perfil
            </Button>
            {isAdmin && !client.archivado && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleArchiveClick} 
                className="h-8 text-xs font-medium w-full sm:w-auto bg-destructive hover:bg-destructive/90"
              >
                Archivar cliente
              </Button>
            )}
          </div>
        </div>
        
        {/* Grid Datos Personales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm relative z-10 border-b border-border/50 pb-5">
          <div className="flex flex-col border-l-2 border-primary/20 pl-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">DNI</span> 
            <span className="font-medium text-foreground">{client.dni}</span>
          </div>
          <div className="flex flex-col border-l-2 border-primary/20 pl-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Teléfono / Contacto</span> 
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{client.phone}</span>
              {client.telegram_chat_id && (
                <span className="inline-flex items-center justify-center bg-[#0088cc]/10 text-[#0088cc] text-[10px] px-1.5 py-0.5 rounded font-bold" title={`Telegram ID: ${client.telegram_chat_id}`}>
                  TEL
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col border-l-2 border-primary/20 pl-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Dirección</span> 
            <span className="font-medium text-foreground truncate" title={client.direccion || '-'}>{client.direccion || '-'}</span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center relative z-10">
          <div className="bg-secondary/40 rounded-lg p-3">
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Fecha de Alta</span>
            <span className="text-sm font-semibold">{client.creado_en ? new Date(client.creado_en).toLocaleDateString() : 'N/D'}</span>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3">
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Préstamos</span>
            <span className="text-sm font-semibold">{clientLoans.length}</span>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3">
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Monto Histórico</span>
            <span className="text-sm font-bold text-primary">
              {formatCurrency(clientLoans.reduce((acc, curr) => acc + Number(curr.monto_original), 0))}
            </span>
          </div>
        </div>

        {/* Notas (si existen) */}
        <div className="mt-4 bg-muted/50 p-3 rounded-lg border border-border/50 text-sm relative z-10">
          <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Observaciones / Notas</span> 
          <p className="text-muted-foreground italic leading-relaxed">
            {client.notas || 'Sin descripción adicional para este cliente.'}
          </p>
        </div>
      </div>

      {/* Historial de Préstamos */}
      <div className="pt-2">
        <div className="flex flex-row items-end justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Historial de Préstamos</h3>
            <p className={`text-xs mt-1 py-0.5 ${goodPayer ? 'status-green' : 'status-yellow'}`}>
              {goodPayer ? '⭐ Buen comportamiento de pago' : '⚠️ Posee deudas y/o irregularidades'}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(`/nuevo-prestamo?clientId=${id}`)}>
            <Plus size={16} className="mr-1" /> Préstamo
          </Button>
        </div>

        <div className="space-y-3">
          {clientLoans.map(loan => (
            <LoanAccordionItem key={loan.id} loan={loan} clientName={client.nombre_completo} />
          ))}
          {clientLoans.length === 0 && (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/30">
              No hay préstamos registrados para este cliente.
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar Cliente */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil de Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input 
                value={editForm.nombre_completo} 
                onChange={e => setEditForm({...editForm, nombre_completo: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input 
                value={editForm.telefono} 
                onChange={e => setEditForm({...editForm, telefono: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input 
                value={editForm.direccion} 
                onChange={e => setEditForm({...editForm, direccion: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#0088cc]">Telegram Chat ID</Label>
              <Input 
                value={editForm.telegram_chat_id} 
                onChange={e => setEditForm({...editForm, telegram_chat_id: e.target.value})} 
                placeholder="Opcional. Ej: 1694629692"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas Generales</Label>
              <Textarea 
                value={editForm.notas} 
                onChange={e => setEditForm({...editForm, notas: e.target.value})} 
                placeholder="Observaciones..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Archivación */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro que querés archivar a {client.nombre_completo}?</AlertDialogTitle>
            <AlertDialogDescription>
              No aparecerá más en la lista principal pero sus datos se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowArchiveDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
