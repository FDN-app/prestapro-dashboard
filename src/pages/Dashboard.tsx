import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/data/mockData';
import { useClientes } from '@/hooks/useClientes';
import { useCapital } from '@/hooks/useCapital';
import { usePrestamos } from '@/hooks/usePrestamos';
import { useCashbox } from '@/hooks/useCashbox';

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('mes');

  const { clientes, isLoading: loadingClientes } = useClientes();
  const { movimientos, isLoading: loadingCapital } = useCapital();
  const { prestamos, isLoading: loadingPrestamos } = usePrestamos();
  const { totalEnCaja, isLoading: loadingCashbox } = useCashbox();

  const loading = loadingClientes || loadingCapital || loadingPrestamos || loadingCashbox;

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

      {/* Tabla Principal de Préstamos Activos */}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-foreground tracking-tight mb-4">Préstamos Activos (Simulador)</h3>
        <PrestamosTable />
      </div>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function PrestamosTable() {
  const { prestamos, isLoading, updatePrestamo, liquidarPrestamo } = usePrestamos();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // States para la fila expandida
  const [editInteres, setEditInteres] = useState<number>(0);
  const [editFrecPago, setEditFrecPago] = useState<string>('');
  const [editFrecDias, setEditFrecDias] = useState<number>(0);

  if (isLoading) return <div className="text-muted-foreground p-4">Cargando préstamos...</div>;

  const activos = prestamos.filter(p => p.estado !== 'pagado' && p.estado !== 'liquidado');

  const handleExpand = (p: any) => {
    if (expandedId === p.id) {
      setExpandedId(null);
    } else {
      setExpandedId(p.id);
      setEditInteres(p.tasa_interes);
      setEditFrecPago(p.frecuencia_pago);
      setEditFrecDias(p.frecuencia_dias || 0);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updatePrestamo({
        id, 
        updates: { 
          tasa_interes: editInteres, 
          frecuencia_pago: editFrecPago, 
          frecuencia_dias: editFrecPago === 'personalizado' ? editFrecDias : null 
        }
      });
    } catch (e) {
      // Error manejado en el hook
    }
  };

  const formatFreq = (p: any) => {
    if (p.frecuencia_pago === 'semanal') return `${p.cantidad_cuotas}s`;
    if (p.frecuencia_pago === 'quincenal') return `${p.cantidad_cuotas}q`;
    if (p.frecuencia_pago === 'mensual') return `${p.cantidad_cuotas}m`;
    if (p.frecuencia_pago === 'personalizado') {
        if (p.cantidad_cuotas === 1) return `${p.frecuencia_dias}`; // e.g. "28" or "10d"
        return `${p.cantidad_cuotas} (${p.frecuencia_dias}d)`;
    }
    return `${p.cantidad_cuotas}c`;
  };

  const getInteresAmount = (p: any) => {
    return (p.monto_original * p.tasa_interes) / 100;
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="text-muted-foreground whitespace-nowrap px-4 text-xs tracking-wider uppercase font-semibold">
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">CUIL</th>
            <th className="text-left p-3">Saldo</th>
            <th className="text-left p-3">Crédito</th>
            <th className="text-left p-3">Interés</th>
            <th className="text-left p-3">Cuotas</th>
            <th className="text-left p-3">Comisión</th>
            <th className="text-left p-3">Renovados</th>
            <th className="text-left p-3">Fecha</th>
          </tr>
        </thead>
        <tbody className="bg-transparent">
          {activos.length === 0 && (
            <tr><td colSpan={9} className="p-4 text-center text-muted-foreground bg-card/50 rounded-xl">No hay préstamos activos</td></tr>
          )}
          {activos.map((p) => (
            <React.Fragment key={p.id}>
              <tr 
                className={cn(
                  "group transition-all duration-300 cursor-pointer",
                  expandedId === p.id 
                    ? "bg-card/90 shadow-md ring-1 ring-primary/20 scale-[1.01]" 
                    : "bg-card/50 hover:bg-card/80 hover:shadow-lg hover:-translate-y-0.5 hover:ring-1 hover:ring-border"
                )}
                onClick={() => handleExpand(p)}
              >
                <td className="p-4 font-medium rounded-l-xl text-foreground group-hover:text-primary transition-colors">{p.clientes?.nombre_completo} <span className="text-xs text-primary/70">{p.tasa_interes}%</span></td>
                <td className="p-4 text-muted-foreground">{p.clientes?.dni}</td>
                <td className={`p-4 font-extrabold ${p.estado === 'mora' ? 'text-destructive' : 'text-rose-500'}`}>{formatCurrency(p.saldo_pendiente)}</td>
                <td className="p-4 font-medium">{formatCurrency(p.monto_original)}</td>
                <td className="p-4 text-muted-foreground">{formatCurrency(getInteresAmount(p))}</td>
                <td className="p-4 whitespace-nowrap text-muted-foreground font-medium">{formatFreq(p)}</td>
                <td className="p-4 text-muted-foreground">{p.comision > 0 ? formatCurrency(p.comision) : '-'}</td>
                <td className="p-4 text-muted-foreground font-semibold">{p.cantidad_renovaciones > 0 ? p.cantidad_renovaciones : '-'}</td>
                <td className="p-4 text-muted-foreground rounded-r-xl">{new Date(p.fecha_inicio).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '')}</td>
              </tr>
              {expandedId === p.id && (
                <tr>
                  <td colSpan={9} className="p-0">
                    <div className="mx-2 mb-4 mt-1 bg-card/30 backdrop-blur-md rounded-xl p-5 border border-primary/20 shadow-inner animate-in slide-in-from-top-2 duration-300">
                      
                      <div className="flex flex-col xl:flex-row gap-8">
                      {/* Editor Rápido */}
                      <div className="flex-1 space-y-4">
                        <h4 className="font-semibold text-primary">Modificar Condiciones</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Tasa de interés (%)</Label>
                            <Input type="number" value={editInteres} onChange={e => setEditInteres(Number(e.target.value))} />
                          </div>
                          <div className="space-y-1">
                            <Label>Frecuencia</Label>
                            <select value={editFrecPago} onChange={e => setEditFrecPago(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                              <option value="semanal">Semanal</option>
                              <option value="quincenal">Quincenal</option>
                              <option value="mensual">Mensual</option>
                              <option value="personalizado">Personalizado</option>
                            </select>
                          </div>
                          {editFrecPago === 'personalizado' && (
                            <div className="space-y-1 sm:col-span-2">
                              <Label>Días de frecuencia</Label>
                              <Input type="number" value={editFrecDias} onChange={e => setEditFrecDias(Number(e.target.value))} />
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleSaveEdit(p.id)}>Guardar Cambios</Button>
                      </div>

                      {/* Info adicional y Acciones */}
                      <div className="flex-1 space-y-4 xl:border-l xl:border-border xl:pl-6">
                        <h4 className="font-semibold text-primary">Detalle de Avance</h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Estado:</span>
                            <span className="font-medium capitalize">{p.estado}</span>
                          </div>
                          {/* El cálculo exacto de pagados requiere hacer JOIN de cuotas, para este MVP mostramos la metadata del prestamo */}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Saldo Restante:</span>
                            <span className="font-medium">{formatCurrency(p.saldo_pendiente)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" className="bg-status-green hover:bg-status-green/90 text-white" onClick={() => navigate(`/registrar-pago?prestamo=${p.id}`)}>Registrar Pago</Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => {
                              navigate(`/nuevo-prestamo?refinanciar=${p.id}`);
                            }}
                          >
                            Refinanciar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-status-blue text-status-blue hover:bg-status-blue/10"
                            onClick={async () => {
                              if (window.confirm(`¿Confirmás la liquidación total por ${formatCurrency(p.saldo_pendiente)}?`)) {
                                await liquidarPrestamo({ prestamo_id: p.id, monto_pago: p.saldo_pendiente });
                              }
                            }}
                          >
                            Liquidar Anticipado
                          </Button>
                        </div>
                      </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
