import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, ArrowLeft, ChevronDown, ChevronUp, MoreVertical, Calendar as CalendarIcon } from 'lucide-react';
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
import { formatDateDisplay, cn, parseDateLocal, formatDateLocal, generarCronogramaCuotas, Frecuencia } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function LoanAccordionItem({ loan, clientName, replacementLoanId }: { loan: any; clientName: string; replacementLoanId?: string }) {
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

  // Estados para Pago con Fecha
  const [showPayDateModal, setShowPayDateModal] = useState(false);
  const [selectedCuotaPayDate, setSelectedCuotaPayDate] = useState<any>(null);
  const [payDateAmount, setPayDateAmount] = useState('');
  const [payDateValue, setPayDateValue] = useState<string>(''); // YYYY-MM-DD
  const [payDateMethod, setPayDateMethod] = useState('efectivo');
  const [payDateNotes, setPayDateNotes] = useState('');
  const [showMoraModal, setShowMoraModal] = useState(false);
  const [selectedCuotaMora, setSelectedCuotaMora] = useState<any>(null);
  const [moraTipo, setMoraTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [moraValor, setMoraValor] = useState('10');

  const { cuotas, isLoading } = useCuotas(loan.id);
  const { extenderPrestamo, isExtendiendo, updatePrestamo, agregarMora, isAgregandoMora, eliminarPrestamo, isEliminando, editarPrestamo, isEditando } = usePrestamos();

  // Estados para Eliminar préstamo
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Estados para Editar préstamo
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [editMonto, setEditMonto] = useState(String(loan.monto_original));
  const [editTasa, setEditTasa] = useState(String(loan.tasa_interes));
  const [editComision, setEditComision] = useState(String(loan.comision || 0));
  const [editCuotas, setEditCuotas] = useState(String(loan.cantidad_cuotas));
  const [editFrecuencia, setEditFrecuencia] = useState<Frecuencia>(loan.frecuencia_pago);
  const [editCustomDays, setEditCustomDays] = useState(String(loan.frecuencia_dias || 1));
  const [editFechaInicio, setEditFechaInicio] = useState(loan.fecha_inicio?.split('T')[0] || '');

  const openEditModal = () => {
    setEditMonto(String(loan.monto_original));
    setEditTasa(String(loan.tasa_interes));
    setEditComision(String(loan.comision || 0));
    setEditCuotas(String(loan.cantidad_cuotas));
    setEditFrecuencia(loan.frecuencia_pago);
    setEditCustomDays(String(loan.frecuencia_dias || 1));
    setEditFechaInicio(loan.fecha_inicio?.split('T')[0] || '');
    setShowEditModal(true);
  };

  const editSchedule = useMemo(() => {
    if (!editFechaInicio) return [];
    return generarCronogramaCuotas({
      monto: Number(editMonto) || 0,
      tasa: Number(editTasa) || 0,
      cuotas: Number(editCuotas) || 0,
      frecuencia: editFrecuencia,
      customDays: Number(editCustomDays) || 1,
      fechaInicio: parseDateLocal(editFechaInicio),
    });
  }, [editMonto, editTasa, editCuotas, editFrecuencia, editCustomDays, editFechaInicio]);

  const handleConfirmEdit = async () => {
    try {
      await editarPrestamo({
        p_prestamo_id: loan.id,
        p_monto_original: Number(editMonto),
        p_tasa_interes: Number(editTasa),
        p_comision: Number(editComision) || 0,
        p_tipo_interes: loan.tipo_interes,
        p_cantidad_cuotas: Number(editCuotas),
        p_frecuencia_pago: editFrecuencia,
        p_frecuencia_dias: editFrecuencia === 'personalizado' ? Number(editCustomDays) || 1 : (editFrecuencia === 'semanal' ? 7 : editFrecuencia === 'quincenal' ? 15 : editFrecuencia === 'mensual' ? 30 : 1),
        p_fecha_inicio: editFechaInicio,
        p_fecha_primera_cuota: editSchedule[0]?.fecha_vto || editFechaInicio,
        p_cuotas: editSchedule,
      });
      setShowEditConfirm(false);
      setShowEditModal(false);
    } catch (error) {
      setShowEditConfirm(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await eliminarPrestamo(loan.id);
      setShowDeleteDialog(false);
    } catch (error) {
      setShowDeleteDialog(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updatePrestamo({ id: loan.id, updates: { archivado: true } });
    } catch (error) {
      console.error(error);
    }
  };

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updatePrestamo({ id: loan.id, updates: { archivado: false } });
    } catch (error) {
      console.error(error);
    }
  };

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

  const handlePagarConFechaClick = (cuota: any, restante: number) => {
    setSelectedCuotaPayDate(cuota);
    setPayDateAmount(String(restante));
    
    // Set date to today (YYYY-MM-DD in local time)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPayDateValue(`${yyyy}-${mm}-${dd}`);
    
    setPayDateMethod('efectivo');
    setPayDateNotes('');
    setShowPayDateModal(true);
  };

  const handleConfirmPayDate = async () => {
    if (!selectedCuotaPayDate || !payDateAmount) {
      toast.error('Por favor ingrese el monto pagado');
      return;
    }
    if (!payDateValue) {
      toast.error('Por favor seleccione una fecha de pago');
      return;
    }

    const amountNum = Number(payDateAmount);

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
        p_metodo: payDateMethod,
        p_notas: payDateNotes,
        p_es_cobro_directo_admin: false,
        p_fecha_pago: payDateValue,
      });
      setShowPayDateModal(false);
      toast.success('Pago con fecha registrado correctamente.');
    } catch (e) {
      // error toast managed by hook
    }
  };
  
  const isRefinanciado = loan.estado === 'refinanciado';
  const isPagado = loan.estado === 'pagado' || loan.estado === 'liquidado' || isRefinanciado;
  const tieneMovimientos = (cuotas?.some((c: any) => c.estado === 'pagada' || c.estado === 'parcial')) || (loan.pagos && loan.pagos.length > 0);
  const canManage = role === 'admin' && !tieneMovimientos;
  const progress = isPagado ? 100 : Math.max(0, Math.round(((loan.monto_original - loan.saldo_pendiente) / loan.monto_original) * 100));
  const estadoLabel = isRefinanciado
    ? 'Finalizado por renovación'
    : loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1);
  const estadoClasses = isRefinanciado
    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
    : isPagado
      ? 'bg-status-green/10 text-status-green'
      : loan.estado === 'mora'
        ? 'bg-status-red/10 text-status-red'
        : 'bg-primary/10 text-primary';

  const totalCuotas = cuotas?.reduce((acc: number, c: any) => acc + Number(c.monto_cuota), 0) || 0;
  const moraTotal = cuotas?.reduce((sum: number, c: any) => sum + Number(c.monto_mora ?? 0), 0) || 0;
  const totalADevolver = totalCuotas + moraTotal;
  const interesTotal = Math.max(0, totalCuotas - Number(loan.monto_original));
  const valorCuota = cuotas && cuotas.length > 0 ? Number(cuotas[0].monto_cuota) : 0;
  const cuotasPagadas = cuotas?.filter((c: any) => c.estado === 'pagada').length || 0;
  const cantidadReal = loan.cantidad_cuotas || cuotas?.length || 0;
  const fechaFinalizacion = cuotas?.length
    ? [...cuotas].sort((a, b) => b.numero_cuota - a.numero_cuota)[0].fecha_vencimiento
    : null;

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
    <div className={`bg-card rounded-lg border overflow-hidden transition-all duration-300 ${isRefinanciado ? 'border-violet-500/30 bg-violet-500/[0.03]' : 'border-border'} ${loan.archivado ? 'opacity-70 border-dashed bg-card/60' : ''}`}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-secondary/50 transition-colors flex flex-col gap-4 cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-foreground">Préstamo #{loan.id.substring(0, 8)}...</span>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {loan.archivado && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold uppercase tracking-wider">
                Archivado
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${estadoClasses}`}>
              {estadoLabel}
            </span>
            
            {((isPagado && !loan.archivado) || loan.archivado || canManage) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isPagado && !loan.archivado && (
                    <DropdownMenuItem onClick={handleArchive}>
                      Archivar
                    </DropdownMenuItem>
                  )}
                  {loan.archivado && (
                    <DropdownMenuItem onClick={handleUnarchive}>
                      Desarchivar
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <DropdownMenuItem onClick={openEditModal}>
                      Editar préstamo
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-status-red focus:text-status-red">
                      Eliminar préstamo
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Capital Prestado</span>
            <span className="font-medium">{formatCurrency(loan.monto_original)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Tasa de Interés</span>
            <span className="font-medium">{loan.tasa_interes}%</span>
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
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Fecha de Finalización</span>
            <span className="font-medium">{isLoading ? '...' : (fechaFinalizacion ? formatDateDisplay(fechaFinalizacion) : '—')}</span>
          </div>
          {moraTotal > 0 && <div className="flex flex-col"><span className="text-xs text-muted-foreground">Mora pendiente</span><span className="font-medium text-status-red">{formatCurrency(moraTotal)}</span></div>}
          {loan.renovado_desde_id && <div className="flex flex-col"><span className="text-xs text-muted-foreground">Renovación</span><span className="font-medium">Desde #{loan.renovado_desde_id.substring(0, 8)} · Pagó {formatCurrency(loan.pago_cliente_renovacion || 0)} · Descontado {formatCurrency(loan.monto_cancelado_renovacion || 0)} · Entregado {formatCurrency(loan.efectivo_entregado || 0)}</span></div>}
          {isRefinanciado && replacementLoanId && <div className="flex flex-col"><span className="text-xs text-muted-foreground">Continuidad</span><span className="font-medium text-violet-300">Reemplazado por préstamo #{replacementLoanId.substring(0, 8)}</span></div>}
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
      </div>

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
                  const moraCuota = Number(cuota.monto_mora ?? 0);
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
                          {moraCuota > 0 && requirePayment ? (
                            <div className="mb-1">
                              <p className="text-xs text-muted-foreground">Cuota original: {formatCurrency(actual_cuota)}</p>
                              <span className="inline-flex text-[10px] bg-status-red/10 text-status-red border border-status-red/20 px-1.5 py-0.5 rounded font-bold">Mora: +{formatCurrency(moraCuota)}</span>
                              <p className="text-sm font-bold text-foreground mt-0.5">Total: {formatCurrency(actual_cuota + arrastre_visual + moraCuota)}</p>
                            </div>
                          ) : arrastre_visual > 0 && requirePayment ? (
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
                              onClick={() => handlePagarTodoClick(cuota, restante + Number(cuota.monto_mora ?? 0))}
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
                            <Button 
                              size="sm"
                              className="h-7 text-xs bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-semibold transition-colors w-full sm:w-auto flex items-center justify-center gap-1"
                              onClick={() => handlePagarConFechaClick(cuota, restante)}
                            >
                              <CalendarIcon size={13} />
                              <span>Pago con fecha</span>
                            </Button>
                            {role === 'admin' && <Button size="sm" variant="outline" className="h-7 text-xs border-status-red/40 text-status-red" onClick={() => { setSelectedCuotaMora(cuota); setMoraTipo('porcentaje'); setMoraValor('10'); setShowMoraModal(true); }}>Agregar mora</Button>}
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
      <Dialog open={showMoraModal} onOpenChange={setShowMoraModal}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Agregar monto por mora</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-sm text-muted-foreground">Cuota #{selectedCuotaMora?.numero_cuota}. Si elegís porcentaje, se calcula sobre el capital prestado de {formatCurrency(loan.monto_original)}.</p>
            <div className="grid grid-cols-2 gap-2"><Button type="button" variant={moraTipo === 'porcentaje' ? 'default' : 'outline'} onClick={() => setMoraTipo('porcentaje')}>Porcentaje</Button><Button type="button" variant={moraTipo === 'monto' ? 'default' : 'outline'} onClick={() => setMoraTipo('monto')}>Monto manual</Button></div>
            <div className="space-y-2"><Label>{moraTipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto ($)'}</Label><Input type="number" min="0.01" step="0.01" value={moraValor} onChange={e => setMoraValor(e.target.value)} /></div>
            {Number(moraValor) > 0 && <p className="text-sm font-medium">Se agregarán {formatCurrency(moraTipo === 'porcentaje' ? Number(loan.monto_original) * Number(moraValor) / 100 : Number(moraValor))} al saldo.</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowMoraModal(false)}>Cancelar</Button><Button disabled={isAgregandoMora || Number(moraValor) <= 0} onClick={async () => { await agregarMora({ prestamo_id: loan.id, cuota_id: selectedCuotaMora.id, tipo: moraTipo, valor: Number(moraValor) }); setShowMoraModal(false); }}>Confirmar mora</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Modal Registrar Pago con Fecha */}
      <Dialog open={showPayDateModal} onOpenChange={setShowPayDateModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Registrar pago con fecha</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 text-left">
            {selectedCuotaPayDate && (
              <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded border border-border">
                Cuota #{selectedCuotaPayDate.numero_cuota} — Restante: <span className="font-semibold text-foreground">{formatCurrency(Number(selectedCuotaPayDate.monto_cuota) - (Number(selectedCuotaPayDate.monto_cobrado) || 0))}</span>.
              </p>
            )}
            
            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="pay-date-amount">Monto pagado ($) *</Label>
              <Input 
                id="pay-date-amount"
                type="number"
                value={payDateAmount}
                onChange={e => setPayDateAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            {/* Fecha */}
            <div className="space-y-2 flex flex-col">
              <Label>Fecha de pago *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between text-left font-normal h-10 px-3 py-2 border border-input rounded-md text-sm text-foreground bg-[#252B48] hover:bg-[#252B48]/90"
                    )}
                  >
                    <span>
                      {payDateValue ? (() => {
                        const [y, m, d] = payDateValue.split('-');
                        return `${d}/${m}/${y}`;
                      })() : "Seleccionar fecha"}
                    </span>
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={payDateValue ? parseDateLocal(payDateValue) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                        const dd = String(date.getDate()).padStart(2, '0');
                        setPayDateValue(`${yyyy}-${mm}-${dd}`);
                      }
                    }}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Método */}
            <div className="space-y-2">
              <Label htmlFor="pay-date-method">Método de pago</Label>
              <select 
                id="pay-date-method" 
                value={payDateMethod} 
                onChange={e => setPayDateMethod(e.target.value)} 
                className="w-full bg-[#252B48] border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="pay-date-notes">Notas</Label>
              <Textarea 
                id="pay-date-notes"
                value={payDateNotes}
                onChange={e => setPayDateNotes(e.target.value)}
                placeholder="Notas opcionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDateModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleConfirmPayDate} 
              disabled={isRegistrando}
              className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white font-semibold"
            >
              {isRegistrando ? 'Registrando...' : 'Confirmar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Préstamo */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar préstamo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded border border-border">
              Solo se puede editar mientras no tenga cuotas pagadas ni pagos registrados. Al guardar, se recalcula el cronograma completo de cuotas.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monto base ($)</Label>
                <Input type="number" value={editMonto} onChange={e => setEditMonto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tasa de interés (%)</Label>
                <Input type="number" value={editTasa} onChange={e => setEditTasa(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Comisión inicial ($)</Label>
                <Input type="number" value={editComision} onChange={e => setEditComision(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cuotas</Label>
                <Input type="number" value={editCuotas} onChange={e => setEditCuotas(e.target.value)} />
              </div>
            </div>
            <div className={cn("grid gap-3", editFrecuencia === 'personalizado' ? "grid-cols-2" : "grid-cols-1")}>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <select
                  value={editFrecuencia}
                  onChange={e => setEditFrecuencia(e.target.value as Frecuencia)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual (30 d)</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              {editFrecuencia === 'personalizado' && (
                <div className="space-y-2">
                  <Label>Días entre cuotas</Label>
                  <Input type="number" min="1" step="1" value={editCustomDays} onChange={e => setEditCustomDays(e.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-2 flex flex-col">
              <Label>Fecha de inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left font-normal h-10 px-3 py-2 border border-input rounded-md text-sm text-foreground bg-[#252B48] hover:bg-[#252B48]/90"
                  >
                    <span>{editFechaInicio ? formatDateDisplay(editFechaInicio) : "Seleccionar fecha"}</span>
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={editFechaInicio ? parseDateLocal(editFechaInicio) : undefined}
                    onSelect={(date) => { if (date) setEditFechaInicio(formatDateLocal(date)); }}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {editSchedule.length > 0 && (
              <div className="rounded border border-border p-3 text-sm space-y-1">
                <p className="text-muted-foreground text-xs">Nuevo cronograma ({editSchedule.length} cuotas de {formatCurrency(editSchedule[0]?.monto || 0)} c/u)</p>
                <p className="text-xs">Última cuota vence: <span className="font-medium">{formatDateDisplay(editSchedule[editSchedule.length - 1]?.fecha_vto)}</span></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={() => setShowEditConfirm(true)} disabled={isEditando || !editFechaInicio || Number(editCuotas) <= 0}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de guardar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a reemplazar el cronograma de cuotas de este préstamo por el nuevo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit} disabled={isEditando}>
              {isEditando ? 'Guardando...' : 'Sí, guardar cambios'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar este préstamo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a borrar el préstamo #{loan.id.substring(0, 8)} y sus cuotas de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isEliminando} className="bg-status-red text-white hover:bg-status-red/90">
              {isEliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { clientes, isLoading: isLoadingClientes, updateCliente, isUpdating } = useClientes();
  const { prestamos, isLoading: isLoadingPrestamos } = usePrestamos();

  const allClientLoans = useMemo(() => {
    if (!id || !prestamos) return [];
    return prestamos.filter(l => l.cliente_id === id);
  }, [prestamos, id]);

  const loanIds = useMemo(() => allClientLoans.map(l => l.id), [allClientLoans]);

  const { data: allCuotas = [], isLoading: isLoadingAllCuotas } = useQuery({
    queryKey: ['client-cuotas-score', id, loanIds],
    queryFn: async () => {
      if (loanIds.length === 0) return [];
      const { data, error } = await supabase
        .from('cuotas')
        .select('*')
        .in('prestamo_id', loanIds);
      if (error) {
        console.error(error);
        return [];
      }
      return data;
    },
    enabled: loanIds.length > 0
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [loanView, setLoanView] = useState<'active' | 'finished'>('active');
  const [editForm, setEditForm] = useState({
    nombre_completo: '',
    dni: '',
    telefono: '',
    direccion: '',
    notas: '',
    telegram_chat_id: ''
  });

  if (isLoadingClientes || isLoadingPrestamos || isLoadingAllCuotas) {
    return <div className="p-6 text-muted-foreground">Cargando datos del cliente...</div>;
  }

  const client = clientes.find(c => c.id === id);
  const finishedStates = ['pagado', 'liquidado', 'refinanciado'];
  const clientLoans = allClientLoans.filter(loan =>
    loanView === 'active'
      ? !loan.archivado && !finishedStates.includes(loan.estado)
      : loan.archivado || finishedStates.includes(loan.estado)
  );
  const replacementByPreviousId = new Map(
    allClientLoans
      .filter(loan => loan.renovado_desde_id)
      .map(loan => [loan.renovado_desde_id as string, loan.id])
  );

  if (!client) return <div className="p-6">Cliente no encontrado.</div>;

  // Calcular atrasos
  const { punctualityStatus, averageDelay } = (() => {
    const paidCuotas = allCuotas.filter((c: any) => c.estado === 'pagada');
    if (paidCuotas.length === 0) {
      return { punctualityStatus: null, averageDelay: null };
    }

    const totalDelay = paidCuotas.reduce((sum: number, cuota: any) => {
      if (!cuota.fecha_pago) return sum;
      
      const pDateStr = cuota.fecha_pago.substring(0, 10);
      const vDateStr = cuota.fecha_vencimiento.substring(0, 10);
      
      const p = new Date(pDateStr + 'T00:00:00');
      const v = new Date(vDateStr + 'T00:00:00');
      
      const diffTime = p.getTime() - v.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, diffDays);
    }, 0);

    const avg = totalDelay / paidCuotas.length;
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (avg <= 3) {
      status = 'green';
    } else if (avg <= 7) {
      status = 'yellow';
    } else {
      status = 'red';
    }

    return { punctualityStatus: status, averageDelay: avg };
  })();

  const goodPayer = client.status === 'al_dia' || client.status === 'pagado';

  // Clases dinámicas basadas en puntualidad
  let decorBgClass = goodPayer ? 'bg-status-green' : 'bg-status-red';
  let avatarClass = goodPayer ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red';

  if (punctualityStatus === 'green') {
    decorBgClass = 'bg-status-green';
    avatarClass = 'bg-status-green/20 text-status-green';
  } else if (punctualityStatus === 'yellow') {
    decorBgClass = 'bg-status-yellow';
    avatarClass = 'bg-status-yellow/20 text-status-yellow';
  } else if (punctualityStatus === 'red') {
    decorBgClass = 'bg-status-red';
    avatarClass = 'bg-status-red/20 text-status-red';
  }

  const handleEditClick = () => {
    setEditForm({
      nombre_completo: client.nombre_completo || '',
      dni: client.dni || '',
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
        dni: editForm.dni,
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
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 ${decorBgClass}`} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-sm ${avatarClass}`}>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Historial de Préstamos</h3>
            {punctualityStatus && (
              <p className={`text-xs mt-1 py-0.5 ${
                punctualityStatus === 'green' ? 'status-green' : 
                punctualityStatus === 'yellow' ? 'status-yellow' : 'status-red'
              }`}>
                {punctualityStatus === 'green' && `⭐ Buen pagador (Atraso prom: ${averageDelay.toFixed(1)} días)`}
                {punctualityStatus === 'yellow' && `⚠️ Pagador irregular (Atraso prom: ${averageDelay.toFixed(1)} días)`}
                {punctualityStatus === 'red' && `🚨 Mal pagador (Atraso prom: ${averageDelay.toFixed(1)} días)`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex bg-secondary rounded-lg p-0.5 border border-border text-xs">
              <button 
                onClick={() => setLoanView('active')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${loanView === 'active' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Activos
              </button>
              <button 
                onClick={() => setLoanView('finished')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${loanView === 'finished' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Finalizados
              </button>
            </div>
            <Button size="sm" onClick={() => navigate(`/nuevo-prestamo?clientId=${id}`)}>
              <Plus size={16} className="mr-1" /> Préstamo
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {clientLoans.map(loan => (
            <LoanAccordionItem key={loan.id} loan={loan} clientName={client.nombre_completo} replacementLoanId={replacementByPreviousId.get(loan.id)} />
          ))}
          {clientLoans.length === 0 && (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/30">
              {loanView === 'active' ? 'No hay préstamos activos para este cliente.' : 'No hay préstamos finalizados para este cliente.'}
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
              <Label>DNI / Documento</Label>
              <Input 
                value={editForm.dni} 
                onChange={e => setEditForm({...editForm, dni: e.target.value})} 
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
