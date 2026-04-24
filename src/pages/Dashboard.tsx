import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { useCapital } from '@/hooks/useCapital';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useCashbox } from '@/hooks/useCashbox';
import CobrosPeriodo from '@/components/dashboard/CobrosPeriodo';
import RendicionesPanel from '@/components/dashboard/RendicionesPanel';
import GananciasReporte from '@/components/dashboard/GananciasReporte';
import { useSuscripcion } from '@/hooks/useSuscripcion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CreditCard } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('mes');

  const { clientes, isLoading: loadingClientes } = useClientes();
  const { movimientos, isLoading: loadingCapital } = useCapital();
  const { prestamos, isLoading: loadingPrestamos } = usePrestamos();
  const { totalEnCaja, isLoading: loadingCashbox } = useCashbox();
  const { suscripcion, isLoading: loadingSuscripcion } = useSuscripcion();

  const loading = loadingClientes || loadingCapital || loadingPrestamos || loadingCashbox || loadingSuscripcion;

  // Calculamos el semáforo en base a los clientes
  const semaphoreStats = useMemo(() => {
    let alDia = 0;
    let atraso = 0;
    clientes.forEach(c => {
      if (c.status === 'al_dia') alDia++;
      if (c.status === 'atraso') atraso++;
    });
    return [
      { label: 'AL DÍA', count: alDia, color: 'border-status-green', textColor: 'text-status-green', filter: 'al_dia' },
      { label: 'EN MORA', count: atraso, color: 'border-status-red', textColor: 'text-status-red', filter: 'en_mora' },
    ];
  }, [clientes]);

  // Calculamos las métricas financieras
  const financialMetrics = useMemo(() => {
    let capitalEnCalle = 0;
    let moraTotal = 0;
    
    prestamos.filter(p => !['pagado', 'liquidado'].includes(p.estado)).forEach(p => {
      capitalEnCalle += p.saldo_pendiente;
      if (p.estado === 'mora') {
        const cuotasMora = (p as any).cuotas?.filter((c: any) => c.estado === 'mora' || c.estado === 'vencida') || [];
        const montoMoraCuotas = cuotasMora.reduce((sum: number, c: any) => sum + (c.monto_total - c.monto_pagado), 0);
        // Si hay cuotas vencidas sumamos esas, sino estimamos todo el saldo en riesgo (depende relacional)
        moraTotal += montoMoraCuotas > 0 ? montoMoraCuotas : p.saldo_pendiente;
      }
    });

    // Capital disponible: Aportes + Ingresos manuales desde Caja - Egresos - Retiros
    const capitalDisponible = movimientos.reduce((sum, m) => {
      if (['ingreso_por_recaudacion', 'aporte_inicial', 'ingreso_por_pago'].includes(m.tipo)) return sum + m.monto;
      return sum - m.monto;
    }, 0);

    const totalNegocio = capitalDisponible + totalEnCaja + capitalEnCalle;

    return [
      { label: 'Disponible para prestar', value: capitalDisponible },
      { label: 'En caja (cobros sin asignar)', value: totalEnCaja },
      { label: 'En la calle (prestado)', value: capitalEnCalle },
      { label: 'Mora total', value: moraTotal },
      { label: 'Total del negocio', value: totalNegocio },
    ];
  }, [prestamos, movimientos, totalEnCaja]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      {!loading && suscripcion && suscripcion.estado !== 'activo' && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Suscripción Inactiva</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>Tu acceso a las funciones completas está restringido. Por favor, regulariza tu pago.</span>
            <Button 
              size="sm" 
              variant="destructive" 
              className="w-full sm:w-auto font-bold"
              onClick={() => navigate('/suscripcion')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Ver Suscripción
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-muted-foreground animate-pulse p-4 text-center">Cargando métricas...</div>
      ) : (
        <>
          {/* Semáforo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {semaphoreStats.map(s => (
              <button
                key={s.label}
                onClick={() => navigate('/clientes')}
                className="relative overflow-hidden group bg-card/60 backdrop-blur-md rounded-2xl p-6 border border-border hover:border-primary/50 text-left transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-current to-transparent opacity-5 rounded-full blur-2xl -mr-16 -mt-16 ${s.textColor}`} />
                <div className={`w-12 h-1 rounded-full mb-5 transition-all duration-300 group-hover:w-16 ${s.color.replace('border-', 'bg-')}`} />
                <p className={`text-sm font-semibold tracking-wider ${s.textColor}`}>{s.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold text-foreground">{s.count}</p>
                  <p className="text-sm text-muted-foreground font-medium">clientes</p>
                </div>
              </button>
            ))}
          </div>

          {/* Panel Financiero */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Panel Financiero</h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {financialMetrics.map(m => (
                <div key={m.label} className="relative overflow-hidden bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-border/60 hover:bg-secondary/40 transition-colors duration-300 group">
                  <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
                  
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">{m.label}</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-extrabold text-foreground tracking-tight">
                    {formatCurrency(m.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Accordion Sections */}
      <div className="space-y-4 pt-4">
        <ExpandableSection title="Cobros del período" subtitle="Matriz semanal de clientes" icon={<span className="text-xl">📅</span>}>
          <CobrosPeriodo />
        </ExpandableSection>
        
        <ExpandableSection title="Total Rendido Semanal" subtitle="Control de caja por cobrador" icon={<span className="text-xl">💰</span>}>
          <RendicionesPanel />
        </ExpandableSection>
        
        <ExpandableSection title="Ganancias Semanales" subtitle="Neto mensual e intereses" icon={<span className="text-xl">📈</span>}>
          <GananciasReporte />
        </ExpandableSection>
        
        <ExpandableSection title="Préstamos Activos" subtitle="Tabla interactiva y simulador" icon={<span className="text-xl">💸</span>}>
          <PrestamosTable />
        </ExpandableSection>
      </div>
    </div>
  );
}

function ExpandableSection({ title, subtitle, icon, children }: { title: string, subtitle: string, icon: React.ReactNode, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-card/40 border border-border rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="text-primary/60">
          <svg className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {isOpen && (
        <div className="p-4 border-t border-border/50 bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function PrestamosTable() {
  const { prestamos, isLoading } = usePrestamos();
  const navigate = useNavigate();

  const weeks = useMemo(() => {
    const w = [];
    const currDate = new Date();
    // Ajustar al lunes de la semana actual
    const day = currDate.getDay() || 7; 
    currDate.setDate(currDate.getDate() - (day - 1));
    currDate.setHours(0,0,0,0);
    
    for (let i = 0; i < 12; i++) {
      const monday = new Date(currDate);
      monday.setDate(monday.getDate() - i * 7);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      
      w.push({
        label: `${monday.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} al ${sunday.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`,
        start: monday.getTime(),
        end: sunday.getTime()
      });
    }
    return w;
  }, []);

  if (isLoading) return <div className="text-muted-foreground p-4">Cargando préstamos...</div>;

  const activos = prestamos.filter(p => p.estado !== 'pagado' && p.estado !== 'liquidado');

  const formatFreq = (p: any) => {
    if (p.frecuencia_pago === 'semanal') return `${p.cantidad_cuotas}s`;
    if (p.frecuencia_pago === 'quincenal') return `${p.cantidad_cuotas}q`;
    if (p.frecuencia_pago === 'mensual') return `${p.cantidad_cuotas}m`;
    if (p.frecuencia_pago === 'personalizado') {
        if (p.cantidad_cuotas === 1) return `${p.frecuencia_dias}`; 
        return `${p.cantidad_cuotas} (${p.frecuencia_dias}d)`;
    }
    return `${p.cantidad_cuotas}c`;
  };

  const getInteresAmount = (p: any) => (p.monto_original * p.tasa_interes) / 100;

  return (
    <div className="w-full max-h-[65vh] overflow-auto border-t border-border rounded-lg shadow-sm bg-card">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-muted/90 text-muted-foreground whitespace-nowrap text-xs tracking-wider uppercase font-semibold">
            <th className="text-left p-3 sticky left-0 top-0 z-30 bg-muted border-b border-r border-border shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.1)]">Nombre</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">CUIL</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">Saldo</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">Crédito</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">interes</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">Cuotas</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">Comisión cancelados</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">Renovados</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">fecha</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-primary/10 backdrop-blur border-b border-border">suma total semanales</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-primary/10 backdrop-blur border-b border-border">Clientes q me pagaron a mi</th>
            <th className="text-left p-3 sticky top-0 z-20 bg-primary/10 backdrop-blur border-b border-border font-bold">Total Semanales</th>
            {weeks.map((w, i) => (
              <th key={i} className="text-left p-3 sticky top-0 z-20 bg-muted/90 backdrop-blur border-b border-border">{w.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activos.length === 0 && (
            <tr><td colSpan={12 + weeks.length} className="p-4 text-center text-muted-foreground">No hay préstamos activos</td></tr>
          )}
          {activos.map((p) => {
            const pagos = p.pagos || [];
            
            const sumaTotalSemanales = pagos.reduce((acc, pago) => acc + Number(pago.monto_pagado), 0);
            const pagadoAdmin = pagos.filter(pago => pago.es_cobro_directo_admin).reduce((acc, pago) => acc + Number(pago.monto_pagado), 0);
            const totalSemanales = sumaTotalSemanales; // Según el mapeo, es igual

            return (
              <tr 
                key={p.id}
                className="group transition-colors duration-200 hover:bg-muted/30 cursor-pointer border-b border-border/50"
                onClick={() => navigate(`/prestamo/${p.id}`)}
              >
                <td className="p-3 font-medium text-foreground whitespace-nowrap sticky left-0 z-10 bg-card group-hover:bg-muted/90 border-b border-border/50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                  {p.clientes?.nombre_completo} {p.tasa_interes}%
                </td>
                <td className="p-3 text-muted-foreground whitespace-nowrap border-b border-border/50">{p.clientes?.dni}</td>
                <td className={`p-3 font-bold border-b border-border/50 ${p.estado === 'mora' ? 'text-destructive' : 'text-primary'}`}>{formatCurrency(p.saldo_pendiente)}</td>
                <td className="p-3 font-medium border-b border-border/50 whitespace-nowrap">{formatCurrency(p.monto_original)}</td>
                <td className="p-3 text-muted-foreground border-b border-border/50 whitespace-nowrap">{formatCurrency(getInteresAmount(p))}</td>
                <td className="p-3 text-muted-foreground font-medium border-b border-border/50 whitespace-nowrap">{formatFreq(p)}</td>
                <td className="p-3 text-muted-foreground border-b border-border/50">{(p as any).comision_cancelados ? formatCurrency((p as any).comision_cancelados) : '-'}</td>
                <td className="p-3 text-muted-foreground border-b border-border/50">{(p as any).renovados ? formatCurrency((p as any).renovados) : '-'}</td>
                <td className="p-3 text-muted-foreground whitespace-nowrap border-b border-border/50">{new Date(p.fecha_inicio).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</td>
                
                <td className="p-3 bg-primary/5 font-semibold text-foreground border-b border-border/50 whitespace-nowrap">{formatCurrency(sumaTotalSemanales)}</td>
                <td className="p-3 bg-primary/5 font-semibold text-foreground border-b border-border/50 whitespace-nowrap">{formatCurrency(pagadoAdmin)}</td>
                <td className="p-3 bg-primary/5 font-bold text-primary border-b border-border/50 whitespace-nowrap">{formatCurrency(totalSemanales)}</td>
                
                {weeks.map((w, i) => {
                  const cobradoSemana = pagos.filter(pago => {
                    const d = new Date(pago.fecha_pago).getTime();
                    return d >= w.start && d <= w.end;
                  }).reduce((acc, pago) => acc + Number(pago.monto_pagado), 0);
                  
                  return (
                    <td key={i} className="p-3 text-muted-foreground border-b border-border/50 whitespace-nowrap">
                      {cobradoSemana > 0 ? formatCurrency(cobradoSemana) : '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
