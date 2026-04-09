import React, { useMemo, useState } from 'react';
import { usePagosAdmin } from '@/hooks/usePagosAdmin';
import { formatCurrency } from '@/data/mockData';
import { TrendingUp, Percent } from 'lucide-react';

export default function GananciasReporte() {
  const { pagos, isLoading } = usePagosAdmin();
  const [expanded, setExpanded] = useState(false);

  // Todo esto es en memoria asumiendo pocos miles de pagos. Si crece, mover al backend.
  const metricas = useMemo(() => {
    let gananciaBruta = 0;
    let cuotasDetalle: any[] = [];
    let capitalDevueltoTotal = 0;

    pagos.forEach(p => {
      // Cálculo: Ganancia_Bruta = Monto_Pagado * (Tasa / (100 + Tasa))
      const tasa = p.prestamos?.tasa_interes || 0;
      const fraccionInteres = tasa / (100 + tasa);
      
      const interesPagado = Number(p.monto_pagado) * fraccionInteres;
      const capitalPagado = Number(p.monto_pagado) - interesPagado;
      
      const comisionCobrador = p.cobrador?.comision_porcentaje || 0; 
      const deduccionComision = interesPagado * (comisionCobrador / 100);

      gananciaBruta += interesPagado;
      capitalDevueltoTotal += capitalPagado;

      cuotasDetalle.push({
        id: p.id,
        fecha: new Date(p.fecha_pago).toLocaleDateString(),
        cliente: p.prestamos?.clientes?.nombre_completo || 'N/A',
        tasa,
        monto: Number(p.monto_pagado),
        capitalDevuelto: capitalPagado,
        interesGanado: interesPagado,
        comisionCobrador: deduccionComision,
        gananciaNetaDueño: interesPagado - deduccionComision
      });
    });

    const totalComisiones = cuotasDetalle.reduce((sum, c) => sum + c.comisionCobrador, 0);
    const gananciaNetaTotal = gananciaBruta - totalComisiones;

    return {
      gananciaBruta,
      capitalDevueltoTotal,
      totalComisiones,
      gananciaNetaTotal,
      detalle: cuotasDetalle.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    };
  }, [pagos]);

  if (isLoading) return <div className="p-4 text-center text-sm">Cargando ganancias...</div>;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="font-semibold text-foreground">Ganancias Netas</p>
            <p className="text-xs text-muted-foreground">Historico completo de intereses</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-status-green">
            {formatCurrency(metricas.gananciaNetaTotal)}
          </p>
        </div>
      </div>
      
      {expanded && (
        <div className="p-5 bg-muted/10 border-t border-border space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Interés Bruto</p>
              <p className="font-bold text-lg">{formatCurrency(metricas.gananciaBruta)}</p>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">- Comisiones (Empleados)</p>
              <p className="font-bold text-lg text-status-red">{formatCurrency(metricas.totalComisiones)}</p>
            </div>
            <div className="p-3 bg-card border border-primary/30 shadow-[0_0_15px_rgba(13,148,136,0.1)] rounded-lg">
              <p className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">Ganancia Neta Dueño</p>
              <p className="font-extrabold text-xl text-primary">{formatCurrency(metricas.gananciaNetaTotal)}</p>
            </div>
            <div className="p-3 bg-card rounded-lg border border-border">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Capital Retornado</p>
              <p className="font-bold text-lg text-emerald-600">{formatCurrency(metricas.capitalDevueltoTotal)}</p>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto pt-2">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2 font-medium">Fecha</th>
                  <th className="py-2 font-medium">Cliente</th>
                  <th className="py-2 font-medium text-right">Pago Bruto</th>
                  <th className="py-2 font-medium text-right text-primary">Interés</th>
                  <th className="py-2 font-medium text-right text-status-red">- Comisión</th>
                  <th className="py-2 font-medium text-right text-status-green">Neto Dueño</th>
                </tr>
              </thead>
              <tbody>
                {metricas.detalle.map((d, i) => (
                  <tr key={d.id + i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2">{d.fecha}</td>
                    <td className="py-2">{d.cliente}</td>
                    <td className="py-2 text-right">{formatCurrency(d.monto)}</td>
                    <td className="py-2 text-right text-primary font-medium">{formatCurrency(d.interesGanado)}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatCurrency(d.comisionCobrador)}</td>
                    <td className="py-2 text-right text-status-green font-bold">{formatCurrency(d.gananciaNetaDueño)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
