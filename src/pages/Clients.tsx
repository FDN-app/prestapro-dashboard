import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';

export default function Clients() {
  const navigate = useNavigate();
  const { clientes, isLoading } = useClientes();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [debtFilter, setDebtFilter] = useState('todos');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = clientes.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = statusFilter === 'todos' ||
      (statusFilter === 'activos' && c.status !== 'pagado') ||
      (statusFilter === 'inactivos' && c.status === 'pagado');
    const matchDebt = debtFilter === 'todos' ||
      (debtFilter === 'con_deuda' && c.totalBalance > 0) ||
      (debtFilter === 'sin_deuda' && c.totalBalance === 0);
    return matchSearch && matchStatus && matchDebt;
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando datos de clientes y préstamos...</div>;
  }

  const getLoanStatusLabel = (s: string) => {
    switch (s) {
      case 'activo': return 'Al día';
      case 'mora': return 'En mora';
      case 'pagado':
      case 'liquidado': return 'Pagado';
      default: return 'Al día';
    }
  };

  const getLoanStatusColor = (s: string) => {
    switch (s) {
      case 'activo': return 'text-status-green bg-status-green/10';
      case 'mora': return 'text-status-red bg-status-red/10';
      case 'pagado':
      case 'liquidado': return 'text-status-blue bg-status-blue/10';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clientes (Excel View)</h2>
        <Button size="sm" onClick={() => navigate('/nuevo-cliente')}>
          <Plus size={16} className="mr-1" /> Nuevo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o teléfono" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="todos">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
        <select value={debtFilter} onChange={e => setDebtFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="todos">Todos</option>
          <option value="con_deuda">Con deuda</option>
          <option value="sin_deuda">Sin deuda</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-x-auto shadow-sm">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-muted-foreground">
              <th className="text-left p-3 font-medium whitespace-nowrap">Nombre e Interés</th>
              <th className="text-left p-3 font-medium whitespace-nowrap">DNI / CUIL</th>
              <th className="text-left p-3 font-medium">Teléfono</th>
              <th className="text-right p-3 font-medium">Crédito</th>
              <th className="text-right p-3 font-medium">Interés ($)</th>
              <th className="text-right p-3 font-medium">Saldo Deudor</th>
              <th className="text-center p-3 font-medium">Cuotas</th>
              <th className="text-center p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
               <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No hay clientes que coincidan</td></tr>
            )}
            {filtered.map(c => {
              const prestamos = c.prestamos || [];
              const hasMultiple = prestamos.length > 1;
              const isExpanded = expandedIds[c.id];
              const displayLoans = hasMultiple && !isExpanded ? [prestamos[0]] : prestamos;
              
              if (prestamos.length === 0) {
                // Return fallback row for clients without loans
                return (
                  <tr key={c.id} onClick={() => navigate(`/cliente/${c.id}`)} className="border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer">
                    <td className="p-3 font-semibold">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.dni || '-'}</td>
                    <td className="p-3 text-muted-foreground">{c.phone || '-'}</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center"><span className="px-2 py-1 rounded-full text-xs bg-secondary text-muted-foreground">Sin Préstamos</span></td>
                  </tr>
                );
              }

              return (
                <React.Fragment key={c.id}>
                  {displayLoans.map((p: any, index: number) => {
                    const interesMonto = p.monto_original * (p.tasa_interes / 100);
                    const cuotasPagadas = p.cuotas?.filter((q: any) => q.estado === 'pagada').length || 0;
                    const progreso = `${cuotasPagadas}/${p.cantidad_cuotas} ${p.frecuencia_pago}`;
                    
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => navigate(`/cliente/${c.id}`)} 
                        className={`border-b border-border hover:bg-secondary/20 cursor-pointer ${index === 0 && hasMultiple ? 'bg-secondary/5' : ''}`}
                      >
                        <td className="p-3 font-medium flex items-center gap-2">
                          {hasMultiple && index === 0 && (
                            <button onClick={(e) => toggleExpand(c.id, e)} className="p-1 hover:bg-secondary rounded">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                          {!hasMultiple && <span className="w-6" />}
                          {c.name} <span className="font-normal text-muted-foreground text-xs bg-secondary px-1.5 py-0.5 rounded ml-1">{p.tasa_interes}%</span>
                          {hasMultiple && index === 0 && !isExpanded && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-2">+{prestamos.length - 1} más</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground tabular-nums">{c.dni || '-'}</td>
                        <td className="p-3 text-muted-foreground">{c.phone || '-'}</td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(p.monto_original)}</td>
                        <td className="p-3 text-right text-muted-foreground tabular-nums">{formatCurrency(interesMonto)}</td>
                        <td className={`p-3 text-right font-bold tabular-nums ${p.saldo_pendiente > 0 ? 'text-status-red' : 'text-status-green'}`}>
                          {formatCurrency(p.saldo_pendiente)}
                        </td>
                        <td className="p-3 text-center text-xs whitespace-nowrap">{progreso}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${getLoanStatusColor(p.estado)}`}>
                            {getLoanStatusLabel(p.estado)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards (legacy view updated) */}
      <div className="md:hidden space-y-3">
        {filtered.map(c => (
          <button key={c.id} onClick={() => navigate(`/cliente/${c.id}`)} className="w-full bg-card rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.name}</p>
              <span className={`text-xs ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.phone} • DNI: {c.dni}</p>
            <div className="flex justify-between mt-3 text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">{c.activeLoans} préstamo(s) act.</span>
              <span className="font-bold text-status-red">{formatCurrency(c.totalBalance)} deuda</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
