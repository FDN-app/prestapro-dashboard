import React, { useMemo, useState } from 'react';
import { usePagosAdmin } from '@/hooks/usePagosAdmin';
import { useClientes } from '@/hooks/useClientes';
import { formatCurrency } from '@/data/mockData';

// Función para obtener "Lunes a Domingo" dado un Date u obj similar
function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday=7
  d.setDate(d.getDate() - day + 1); // Monday
  const mon = new Date(d);
  d.setDate(d.getDate() + 6); // Sunday
  const sun = new Date(d);
  return `${mon.getDate()}/${mon.getMonth()+1} al ${sun.getDate()}/${sun.getMonth()+1}`;
}

export default function CobrosPeriodo() {
  const { pagos, isLoading } = usePagosAdmin();
  const { clientes } = useClientes();
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  // Semanas recientes unicas
  const weeksData = useMemo(() => {
    const map = new Map<string, { weekRange: string, total: number, pagos: any[] }>();
    pagos.forEach(p => {
      const pDate = new Date(p.fecha_pago);
      const week = getWeekRange(pDate);
      if (!map.has(week)) {
        map.set(week, { weekRange: week, total: 0, pagos: [] });
      }
      const data = map.get(week)!;
      data.total += Number(p.monto_pagado);
      data.pagos.push({
        ...p,
        cliente_nombre: p.prestamos?.clientes?.nombre_completo || 'Desconocido'
      });
    });

    // Sort: most recent week first? Actually we just do chronological maybe.
    // It's hard to sort string ranges. We sort by the first payment date in the array.
    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.pagos[0].fecha_pago).getTime();
      const dateB = new Date(b.pagos[0].fecha_pago).getTime();
      return dateB - dateA;
    });
  }, [pagos]);

  if (isLoading) return <div className="p-4 text-center text-sm">Cargando cobros...</div>;

  return (
    <div className="space-y-3">
      {weeksData.map((w) => (
        <div key={w.weekRange} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setExpandedWeek(expandedWeek === w.weekRange ? null : w.weekRange)}
          >
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Semana</p>
              <p className="font-bold text-foreground">{w.weekRange}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
                {formatCurrency(w.total)}
              </p>
            </div>
          </div>
          
          {expandedWeek === w.weekRange && (
            <div className="bg-muted/20 border-t border-border p-4">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium text-right">Monto Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(
                    w.pagos.reduce((acc, curr) => {
                      // Sum by client if they paid twice in a week
                      if (!acc[curr.cliente_nombre]) acc[curr.cliente_nombre] = { nombre: curr.cliente_nombre, monto: 0 };
                      acc[curr.cliente_nombre].monto += Number(curr.monto_pagado);
                      return acc;
                    }, {} as Record<string, any>)
                  ).map((p: any, idx) => (
                    <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                      <td className="py-2">{p.nombre}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(p.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
