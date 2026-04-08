import { useCapital } from '@/hooks/useCapital';
import { useCashbox } from '@/hooks/useCashbox';
import { formatCurrency } from '@/data/mockData';
import { ArrowUpCircle, ArrowDownCircle, Info, Search, Wallet, Plus, Minus, Send, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function CapitalFlow() {
  const { movimientos, isLoading: capLoading, registrarMovimiento, isRegistering } = useCapital();
  const { pendientes, totalEnCaja, processCashbox, isProcessing, isLoading: cajaLoading } = useCashbox();
  const [search, setSearch] = useState('');
  
  // Modals state
  const [modalType, setModalType] = useState<'aportar' | 'retirar_caja' | 'capitalizar_caja' | null>(null);
  const [montoModal, setMontoModal] = useState('');
  const [descModal, setDescModal] = useState('');
  
  const filtered = movimientos.filter(m => 
    (m.descripcion?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (m.perfiles?.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'ingreso_por_recaudacion':
      case 'aporte_inicial':
        return <ArrowUpCircle className="text-status-green" size={20} />;
      case 'egreso_por_prestamo':
      case 'retiro':
        return <ArrowDownCircle className="text-status-red" size={20} />;
      default:
        return <Info className="text-muted-foreground" size={20} />;
    }
  };

  const getLabel = (tipo: string) => {
    switch (tipo) {
      case 'ingreso_por_recaudacion': return 'Transferencia desde Caja';
      case 'egreso_por_prestamo': return 'Desembolso Préstamo';
      case 'aporte_inicial': return 'Aporte de Capital';
      case 'retiro': return 'Retiro (Uso Personal)';
      default: return tipo;
    }
  };

  const handleModalSubmit = async () => {
    if (!montoModal || isNaN(Number(montoModal)) || Number(montoModal) <= 0) return;

    if (modalType === 'aportar') {
      await registrarMovimiento({ tipo: 'aporte_inicial', monto: Number(montoModal), descripcion: descModal || 'Aporte manual' });
    } else if (modalType === 'retirar_caja') {
      // Retiro desde caja
      const ids = pendientes.map(p => p.id); // For simplicity MVP, process all pending.
      await processCashbox({ pagosIds: ids, accion: 'retirar' });
    } else if (modalType === 'capitalizar_caja') {
      const ids = pendientes.map(p => p.id);
      await processCashbox({ pagosIds: ids, accion: 'capitalizar' });
    }
    
    setModalType(null);
    setMontoModal('');
    setDescModal('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-8">
      {/* HEADER & PORTFOLIO ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión Dinero</h2>
          <p className="text-sm text-muted-foreground mt-1">Caja flotante de cobranza y capital matriz de la empresa</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={() => setModalType('aportar')} className="flex-1 md:flex-none gap-2 bg-status-green hover:bg-status-green/90 text-white">
            <Plus size={16} /> Aportar a Capital
          </Button>
        </div>
      </div>

      {/* CASHBOX WIDGET (CAJA DE RECAUDACION) */}
      <div className="bg-gradient-to-br from-card to-secondary/30 rounded-lg border border-border p-5 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Caja Flotante (Cobros sin asignar)</p>
              {cajaLoading ? <p className="text-xl font-bold">...</p> : <h3 className="text-3xl font-bold">{formatCurrency(totalEnCaja)}</h3>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={() => setModalType('capitalizar_caja')} disabled={totalEnCaja === 0} className="gap-2">
              <Send size={16} /> Pasar a Capital
            </Button>
            <Button size="sm" onClick={() => setModalType('retirar_caja')} disabled={totalEnCaja === 0} variant="outline" className="gap-2 text-status-red border-status-red hover:bg-status-red/10">
              <Download size={16} /> Retirar Uso Personal
            </Button>
          </div>
        </div>
        
        {pendientes.length > 0 && (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-right p-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.slice(0, 5).map(p => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-2 text-muted-foreground">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                    <td className="p-2 truncate max-w-[120px]">{p.prestamos?.clientes?.nombre_completo || '-'}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(p.monto_pagado)}</td>
                  </tr>
                ))}
                {pendientes.length > 5 && (
                  <tr><td colSpan={3} className="p-2 text-center text-muted-foreground text-xs">Y {pendientes.length - 5} pagos más...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FILTER & HISTORY */}
      <h3 className="text-xl font-bold mt-8">Historial de Flujo de Capital (Matriz)</h3>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar en historial por descripción o usuario..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        {capLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando flujos...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">Fecha</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Descripción</th>
                <th className="text-left p-3 font-medium">Usuario</th>
                <th className="text-right p-3 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No hay movimientos registrados</td></tr>
              )}
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(m.fecha).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 font-medium">
                      {getIcon(m.tipo)}
                      {getLabel(m.tipo)}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{m.descripcion || '-'}</td>
                  <td className="p-3">{m.perfiles?.email || 'Sistema'}</td>
                  <td className={`p-3 text-right font-bold ${['ingreso_por_recaudacion', 'aporte_inicial'].includes(m.tipo) ? 'text-status-green' : 'text-status-red'}`}>
                    {['ingreso_por_recaudacion', 'aporte_inicial'].includes(m.tipo) ? '+' : '-'}{formatCurrency(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Acción Modal */}
      <Dialog open={!!modalType} onOpenChange={(o) => !o && setModalType(null)}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'aportar' ? 'Aportar Capital' : modalType === 'retirar_caja' ? 'Retiro de Dinero para Uso' : 'Pasar Caja a Capital'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {modalType === 'aportar' ? (
              <>
                <div className="space-y-2">
                  <Label>Monto a Inyectar</Label>
                  <Input type="number" placeholder="Ej: 50000" value={montoModal} onChange={e => setMontoModal(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Razón o Descripción</Label>
                  <Input placeholder="Ej: Capital socio A" value={descModal} onChange={e => setDescModal(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="p-4 bg-secondary/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Se procesarán pagos pendientes de caja por un total de:</p>
                <p className="text-3xl font-bold my-2">{formatCurrency(totalEnCaja)}</p>
                <p className="text-xs text-muted-foreground">Nota MVP: Se vaciará la totalidad de la caja flotante.</p>
              </div>
            )}
            
            <Button 
              className="w-full" 
              onClick={handleModalSubmit}
              disabled={isRegistering || isProcessing || (modalType === 'aportar' && !montoModal)}
            >
              Confirmar Operación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
