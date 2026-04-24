import React, { useMemo } from 'react';
import { usePagosAdmin } from '@/hooks/usePagosAdmin';
import { formatCurrency } from '@/data/mockData';

function getWeekLabel(dateString: string) {
  const d = new Date(dateString);
  const day = d.getDay() || 7; 
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${monday.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} al ${sunday.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`;
}

export default function RendicionesPanel() {
  const { pagos, isLoading } = usePagosAdmin();

  const semanas = useMemo(() => {
    const map = new Map<string, { label: string; totalCobrado: number; parteCobrador: number; parteAdmin: number; startMs: number }>();
    
    pagos.forEach(p => {
      const label = getWeekLabel(p.fecha_pago);
      const tasa = p.prestamos?.tasa_interes || 0;
      const gananciaSemana = p.monto_pagado * (tasa / (100 + tasa));
      const comisionPorcentaje = p.cobrador?.comision_porcentaje || 0;
      
      const parteCobrador = gananciaSemana * (comisionPorcentaje / 100);
      const totalCobrado = Number(p.monto_pagado);
      const parteAdmin = totalCobrado - parteCobrador;
      
      if (!map.has(label)) {
        const d = new Date(p.fecha_pago);
        const day = d.getDay() || 7;
        const startMs = new Date(d.setDate(d.getDate() - (day - 1))).getTime();
        map.set(label, { label, totalCobrado: 0, parteCobrador: 0, parteAdmin: 0, startMs });
      }
      
      const week = map.get(label)!;
      week.totalCobrado += totalCobrado;
      week.parteCobrador += parteCobrador;
      week.parteAdmin += parteAdmin;
    });

    return Array.from(map.values()).sort((a, b) => b.startMs - a.startMs);
  }, [pagos]);

  const totales = semanas.reduce((acc, s) => ({
    totalCobrado: acc.totalCobrado + s.totalCobrado,
    parteCobrador: acc.parteCobrador + s.parteCobrador,
    parteAdmin: acc.parteAdmin + s.parteAdmin
  }), { totalCobrado: 0, parteCobrador: 0, parteAdmin: 0 });

  if (isLoading) return <div className="p-4 text-center text-sm">Cargando rendiciones...</div>;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-muted/90 text-muted-foreground whitespace-nowrap text-xs tracking-wider uppercase font-semibold">
            <th className="text-left p-3 border-b border-border">Fecha (Semana)</th>
            <th className="text-right p-3 border-b border-border">Total Cobrado</th>
            {totales.parteCobrador > 0 && <th className="text-right p-3 border-b border-border">Jorge (Cobrador)</th>}
            <th className="text-right p-3 border-b border-border">Yo (Admin)</th>
          </tr>
        </thead>
        <tbody>
          {semanas.length === 0 && (
            <tr><td colSpan={totales.parteCobrador > 0 ? 4 : 3} className="p-4 text-center text-muted-foreground">No hay pagos registrados</td></tr>
          )}
          {semanas.map((s, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 border-b border-border/50 text-foreground font-medium">{s.label}</td>
              <td className="p-3 border-b border-border/50 font-bold text-right">{formatCurrency(s.totalCobrado)}</td>
              {totales.parteCobrador > 0 && (
                <td className="p-3 border-b border-border/50 text-status-red text-right">{formatCurrency(s.parteCobrador)}</td>
              )}
              <td className="p-3 border-b border-border/50 text-primary font-bold text-right">{formatCurrency(s.parteAdmin)}</td>
            </tr>
          ))}
          {semanas.length > 0 && (
            <tr className="bg-muted/30">
              <td className="p-3 font-extrabold text-foreground uppercase text-xs tracking-wider">TOTALES</td>
              <td className="p-3 font-extrabold text-right text-base">{formatCurrency(totales.totalCobrado)}</td>
              {totales.parteCobrador > 0 && (
                <td className="p-3 font-extrabold text-status-red text-right text-base">{formatCurrency(totales.parteCobrador)}</td>
              )}
              <td className="p-3 font-extrabold text-primary text-right text-base">{formatCurrency(totales.parteAdmin)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
