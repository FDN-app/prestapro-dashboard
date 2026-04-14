import React, { useMemo, useState } from 'react';
import { usePagosAdmin } from '@/hooks/usePagosAdmin';
import { formatCurrency } from '@/data/mockData';
import { Button } from '@/components/ui/button';

export default function RendicionesPanel() {
  const { pagos, isLoading, marcarRendido, isMarcando } = usePagosAdmin();
  const [expanded, setExpanded] = useState<string | null>(null);

  const rendiciones = useMemo(() => {
    // Agrupar por cobrador_id solo los 'en_caja' (pendientes)
    const map = new Map();
    pagos.forEach(p => {
      // Rendición histórica vs actual. El admin quiere ver los pendientes para rendir.
      if (p.destino_caja === 'en_caja') {
        if (!map.has(p.cobrador_id)) {
          map.set(p.cobrador_id, {
            id: p.cobrador_id,
            nombre: p.cobrador?.email || 'Admin',
            total: 0,
            pagos: []
          });
        }
        const cobrador = map.get(p.cobrador_id);
        cobrador.total += Number(p.monto_pagado);
        cobrador.pagos.push(p);
      }
    });
    return Array.from(map.values());
  }, [pagos]);

  if (isLoading) return <div className="p-4 text-center text-sm">Cargando rendiciones...</div>;

  if (rendiciones.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground text-center">No hay recaudación pendiente de rendir.</div>;
  }

  return (
    <div className="space-y-4">
      {rendiciones.map((r: any) => (
        <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
          >
            <div>
              <p className="font-semibold text-foreground">{r.nombre}</p>
              <p className="text-sm font-medium text-status-red">Pendiente de rendir</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">{formatCurrency(r.total)}</p>
              <p className="text-xs text-muted-foreground">{r.pagos.length} pagos registrados</p>
            </div>
          </div>
          
          {expanded === r.id && (
            <div className="p-4 bg-muted/20 border-t border-border space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {r.pagos.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center bg-card p-2 rounded border border-border text-sm">
                    <div>
                      <p className="font-medium">{p.prestamos?.clientes?.nombre_completo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.fecha_pago).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(p.monto_pagado)}</p>
                  </div>
                ))}
              </div>
              <Button 
                className="w-full" 
                onClick={(e) => { e.stopPropagation(); marcarRendido(r.id); }}
                disabled={isMarcando}
              >
                {isMarcando ? 'Procesando...' : 'Marcar plata entregada (Rendido)'}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
