import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useCuotas } from '@/hooks/useCuotas';

function LoanAccordionItem({ loan }: { loan: any }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const { cuotas, isLoading } = useCuotas(isExpanded ? loan.id : null);
  
  const isPagado = loan.estado === 'pagado' || loan.estado === 'liquidado';
  const progress = isPagado ? 100 : Math.max(0, Math.round(((loan.monto_original - loan.saldo_pendiente) / loan.monto_original) * 100));

  const getCuotaStatusStyles = (estado: string, fecha_vencimiento: string) => {
    if (estado === 'pagada') return { label: 'Pagada', classes: 'bg-status-green/10 text-status-green border-status-green/20' };
    if (estado === 'vencida') return { label: 'Vencida', classes: 'bg-status-red/10 text-status-red border-status-red/20' };
    if (estado === 'parcial') return { label: 'Parcial', classes: 'bg-status-yellow/10 text-status-yellow border-status-yellow/20' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const vto = new Date(fecha_vencimiento);
    // Agregamos timezone offset fix (ignorando horas)
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
        className="w-full p-4 text-left hover:bg-secondary/50 transition-colors flex flex-col gap-3"
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-foreground">Préstamo #{loan.id.substring(0, 8)}...</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isPagado ? 'status-green' : 'text-primary'}`}>
              {isPagado ? '✅ Pagado' : `🔄 ${loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1)}`}
            </span>
            {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
          </div>
        </div>
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <span>{formatCurrency(loan.monto_original)}</span>
          <span>{new Date(loan.fecha_inicio).toLocaleDateString()}</span>
        </div>
        <div className="w-full">
          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
            <span>Progreso</span>
            <span>{progress}%</span>
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
              {cuotas.map((cuota) => {
                const requirePayment = cuota.estado === 'pendiente' || cuota.estado === 'parcial' || cuota.estado === 'vencida';
                const style = getCuotaStatusStyles(cuota.estado, cuota.fecha_vencimiento);
                
                return (
                  <div key={cuota.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-3 rounded-lg border border-border bg-card gap-2">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {cuota.numero_cuota}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(cuota.monto_cuota)}</p>
                        <p className="text-xs text-muted-foreground">Vence: {new Date(cuota.fecha_vencimiento).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`text-xs px-2 py-1 rounded-full border ${style.classes}`}>
                        {style.label}
                      </span>
                      {requirePayment && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => navigate(`/registrar-pago?prestamo=${loan.id}&cuota=${cuota.id}`)}
                        >
                          Registrar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No existen cuotas para este préstamo.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { clientes, isLoading: isLoadingClientes } = useClientes();
  const { prestamos, isLoading: isLoadingPrestamos } = usePrestamos();

  if (isLoadingClientes || isLoadingPrestamos) {
    return <div className="p-6 text-muted-foreground">Cargando datos del cliente...</div>;
  }

  const client = clientes.find(c => c.id === id);
  const clientLoans = prestamos.filter(l => l.cliente_id === id);

  if (!client) return <div className="p-6">Cliente no encontrado.</div>;

  const goodPayer = client.status === 'al_dia' || client.status === 'pagado';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate('/clientes')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <span className={`text-sm ${statusColor(client.status)}`}>{statusLabel(client.status)}</span>
          </div>
          <Button variant="outline" size="sm"><Pencil size={14} className="mr-1" /> Editar</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm">
          <div><span className="text-muted-foreground">Teléfono:</span> {client.phone}</div>
          <div><span className="text-muted-foreground">DNI:</span> {client.dni}</div>
          <div><span className="text-muted-foreground">Dirección:</span> {client.direccion || '-'}</div>
          {client.notas && <div className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {client.notas}</div>}
        </div>
      </div>

      {/* Historial */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Historial de Préstamos</h3>
          <Button size="sm" onClick={() => navigate(`/nuevo-prestamo?clientId=${id}`)}>
            <Plus size={16} className="mr-1" /> Nuevo Préstamo
          </Button>
        </div>
        <p className={`text-sm mb-3 ${goodPayer ? 'status-green' : 'status-yellow'}`}>
          {goodPayer ? '⭐ Buen pagador' : '⚠️ Pagador irregular'}
        </p>

        <div className="space-y-3">
          {clientLoans.map(loan => (
            <LoanAccordionItem key={loan.id} loan={loan} />
          ))}
          {clientLoans.length === 0 && <p className="text-sm text-muted-foreground">No hay préstamos registrados.</p>}
        </div>
      </div>
    </div>
  );
}
