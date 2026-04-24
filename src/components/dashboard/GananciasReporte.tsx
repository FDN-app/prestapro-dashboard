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

export default function GananciasReporte() {
  const { pagos, isLoading } = usePagosAdmin();

  const semanas = useMemo(() => {
    const map = new Map<string, { label: string; gananciaNeta: number; startMs: number }>();
    
    pagos.forEach(p => {
      const label = getWeekLabel(p.fecha_pago);
      const tasa = p.prestamos?.tasa_interes || 0;
      const ganancia = p.monto_pagado * (tasa / (100 + tasa));
      
      if (!map.has(label)) {
        const d = new Date(p.fecha_pago);
        const day = d.getDay() || 7;
        const startMs = new Date(d.setDate(d.getDate() - (day - 1))).getTime();
        map.set(label, { label, gananciaNeta: 0, startMs });
      }
      map.get(label)!.gananciaNeta += ganancia;
    });

    return Array.from(map.values()).sort((a, b) => b.startMs - a.startMs);
  }, [pagos]);

  const totalHistorico = semanas.reduce((acc, s) => acc + s.gananciaNeta, 0);

  if (isLoading) return <div className="p-4 text-center text-sm">Cargando ganancias...</div>;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-muted/90 text-muted-foreground whitespace-nowrap text-xs tracking-wider uppercase font-semibold">
            <th className="text-left p-3 border-b border-border">Fecha (Semana)</th>
            <th className="text-right p-3 border-b border-border">Monto (Ganancia Neta)</th>
          </tr>
        </thead>
        <tbody>
          {semanas.length === 0 && (
            <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No hay ganancias registradas</td></tr>
          )}
          {semanas.map((s, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 border-b border-border/50 text-foreground font-medium">{s.label}</td>
              <td className="p-3 border-b border-border/50 text-status-green font-bold text-right">{formatCurrency(s.gananciaNeta)}</td>
            </tr>
          ))}
          {semanas.length > 0 && (
            <tr className="bg-muted/30">
              <td className="p-3 font-extrabold text-foreground uppercase text-xs tracking-wider">TOTAL HISTÓRICO</td>
              <td className="p-3 font-extrabold text-status-green text-right text-base">{formatCurrency(totalHistorico)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
