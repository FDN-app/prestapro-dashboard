import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useClientes } from '@/hooks/useClientes';
import { cn } from '@/lib/utils';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function NewLoan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedClient = params.get('clientId') || '';
  
  const { clientes, isLoading: isLoadingClientes } = useClientes();

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const savedDraft = useMemo(() => {
    const saved = sessionStorage.getItem('draft_new_loan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  }, []);

  const [clientId, setClientId] = useState(savedDraft?.clientId || preselectedClient);
  const [amount, setAmount] = useState<string>(savedDraft?.amount !== undefined ? savedDraft.amount : '');
  const [rate, setRate] = useState<string>(savedDraft?.rate !== undefined ? savedDraft.rate : '');
  const [comision, setComision] = useState<string>(savedDraft?.comision !== undefined ? savedDraft.comision : '');
  const [renovados, setRenovados] = useState<string>(savedDraft?.renovados !== undefined ? savedDraft.renovados : '');
  const [rateType, setRateType] = useState<'fijo' | 'variable'>(savedDraft?.rateType || 'fijo');
  const [frequency, setFrequency] = useState<'semanal' | 'quincenal' | 'mensual' | 'personalizado'>(savedDraft?.frequency || 'semanal');
  const [customDays, setCustomDays] = useState<string>(savedDraft?.customDays !== undefined ? savedDraft.customDays : '');
  const [installments, setInstallments] = useState<string>(savedDraft?.installments !== undefined ? savedDraft.installments : '');
  const [promissory, setPromissory] = useState(savedDraft?.promissory !== undefined ? savedDraft.promissory : false);
  const [notes, setNotes] = useState(savedDraft?.notes || '');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(savedDraft?.firstInstallmentDate || '');

  useEffect(() => {
    const draft = {
      clientId,
      amount,
      rate,
      comision,
      renovados,
      rateType,
      frequency,
      customDays,
      installments,
      promissory,
      notes,
      firstInstallmentDate
    };
    sessionStorage.setItem('draft_new_loan', JSON.stringify(draft));
  }, [
    clientId,
    amount,
    rate,
    comision,
    renovados,
    rateType,
    frequency,
    customDays,
    installments,
    promissory,
    notes,
    firstInstallmentDate
  ]);

  const hasChanges = useMemo(() => {
    return (
      clientId !== preselectedClient ||
      amount !== '' ||
      rate !== '' ||
      comision !== '' ||
      renovados !== '' ||
      rateType !== 'fijo' ||
      frequency !== 'semanal' ||
      customDays !== '' ||
      installments !== '' ||
      promissory !== false ||
      notes !== '' ||
      firstInstallmentDate !== ''
    );
  }, [
    clientId,
    preselectedClient,
    amount,
    rate,
    comision,
    renovados,
    rateType,
    frequency,
    customDays,
    installments,
    promissory,
    notes,
    firstInstallmentDate
  ]);

  const handleBack = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      navigate(-1);
    }
  };

  const totalToPay = useMemo(() => {
    const numAmount = Number(amount) || 0;
    const numRate = Number(rate) || 0;
    return numAmount * (1 + numRate / 100);
  }, [amount, rate]);

  const perInstallment = useMemo(() => {
    const insts = Number(installments) || 0;
    return insts > 0 ? Math.round(totalToPay / insts) : 0;
  }, [totalToPay, installments]);

  const freqDays = frequency === 'semanal' ? 7 : frequency === 'quincenal' ? 14 : frequency === 'mensual' ? 30 : (Number(customDays) || 0);

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
    
    const insts = Number(installments) || 0;
    return Array.from({ length: insts }, (_, i) => {
      const d = new Date(startD);
      // For manual date, first installment is exactly that date, subsequent are + freqDays
      d.setDate(d.getDate() + freqDays * i);
      
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
    const newErrors: Record<string, string> = {};
    if (!clientId) newErrors.clientId = 'Campo requerido';
    
    if (!amount) newErrors.amount = 'Campo requerido';
    else if (Number(amount) <= 0) newErrors.amount = 'El monto debe ser mayor a 0';
    
    if (!rate) newErrors.rate = 'Campo requerido';
    else if (Number(rate) < 0) newErrors.rate = 'La tasa no puede ser negativa';
    
    if (!installments) newErrors.installments = 'Campo requerido';
    else if (Number(installments) <= 0) newErrors.installments = 'Las cuotas deben ser mayor a 0';
    
    if (frequency === 'personalizado') {
      if (!customDays) newErrors.customDays = 'Campo requerido';
      else if (Number(customDays) <= 0) newErrors.customDays = 'Los días deben ser mayor a 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Completá todos los campos obligatorios');
      return;
    }
    
    // Preparar el payload para el RPC
    const defaultFirstDate = new Date();
    defaultFirstDate.setDate(defaultFirstDate.getDate() + freqDays);
    const fechaPrimCuota = firstInstallmentDate || defaultFirstDate.toISOString().split('T')[0];

    let payload: any = {
      p_cliente_id: clientId,
      p_monto_original: Number(amount),
      p_tasa_interes: Number(rate),
      p_comision: comision ? Number(comision) : 0,
      p_tipo_interes: rateType,
      p_cantidad_cuotas: Number(installments),
      p_frecuencia_pago: frequency,
      p_frecuencia_dias: frequency === 'personalizado' ? Number(customDays) : freqDays,
      p_fecha_inicio: fechaPrimCuota,
      p_fecha_primera_cuota: fechaPrimCuota,
      p_cantidad_renovaciones: oldLoanId ? 1 : 0, 
      p_renovados: renovados ? Number(renovados) : null,
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
      sessionStorage.removeItem('draft_new_loan');
      navigate(-1);
    } catch (e) {
      // toast is inside hook
    }
  };

  const isWorking = isCreating || isRefinanciando;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">{oldLoanId ? 'Refinanciar Préstamo' : 'Nuevo Préstamo'}</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <select 
              value={clientId} 
              onChange={e => {
                setClientId(e.target.value);
                if (errors.clientId) setErrors(prev => ({ ...prev, clientId: '' }));
              }} 
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.clientId && (
              <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                {errors.clientId}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Monto base ($) *</Label>
              <Input 
                type="number" 
                placeholder="Ej: 500000" 
                value={amount} 
                onChange={e => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                }} 
              />
              {errors.amount && (
                <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                  {errors.amount}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Comisión inicial ($)</Label>
              <Input 
                type="number" 
                placeholder="0" 
                value={comision} 
                onChange={e => setComision(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Monto renovado ($)</Label>
              <Input 
                type="number" 
                placeholder="Opcional" 
                value={renovados} 
                onChange={e => setRenovados(e.target.value)} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tasa de interés (%) *</Label>
              <Input 
                type="number" 
                placeholder="Ej: 10" 
                value={rate} 
                onChange={e => {
                  setRate(e.target.value);
                  if (errors.rate) setErrors(prev => ({ ...prev, rate: '' }));
                }} 
              />
              {errors.rate && (
                <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                  {errors.rate}
                </p>
              )}
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
                <Input 
                  type="number" 
                  placeholder="Ej: 28" 
                  value={customDays} 
                  onChange={e => {
                    setCustomDays(e.target.value);
                    if (errors.customDays) setErrors(prev => ({ ...prev, customDays: '' }));
                  }} 
                />
                {errors.customDays && (
                  <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                    {errors.customDays}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cuotas *</Label>
                <Input 
                  type="number" 
                  placeholder="Ej: 12" 
                  value={installments} 
                  onChange={e => {
                    setInstallments(e.target.value);
                    if (errors.installments) setErrors(prev => ({ ...prev, installments: '' }));
                  }} 
                />
                {errors.installments && (
                  <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                    {errors.installments}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {frequency === 'personalizado' && (
              <div className="space-y-2">
                <Label>Cuotas *</Label>
                <Input 
                  type="number" 
                  placeholder="Ej: 12" 
                  value={installments} 
                  onChange={e => {
                    setInstallments(e.target.value);
                    if (errors.installments) setErrors(prev => ({ ...prev, installments: '' }));
                  }} 
                />
                {errors.installments && (
                  <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                    {errors.installments}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 flex flex-col justify-end">
              <Label>1° Cuota (Automático si vacío)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between text-left font-normal h-10 px-3 py-2 border border-input rounded-md text-sm text-foreground",
                      "bg-[#252B48] hover:bg-[#252B48]/90 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    )}
                  >
                    <span>
                      {firstInstallmentDate ? (() => {
                        const [y, m, d] = firstInstallmentDate.split('-');
                        return `${d}/${m}/${y}`;
                      })() : "Seleccionar fecha"}
                    </span>
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={firstInstallmentDate ? new Date(firstInstallmentDate + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                        const dd = String(date.getDate()).padStart(2, '0');
                        setFirstInstallmentDate(`${yyyy}-${mm}-${dd}`);
                      } else {
                        setFirstInstallmentDate('');
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Querés descartar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tenés cambios sin guardar. ¿Querés descartar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>
              Seguir editando
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              sessionStorage.removeItem('draft_new_loan');
              setShowUnsavedDialog(false);
              navigate(-1);
            }}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
