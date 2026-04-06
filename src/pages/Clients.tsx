import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clients, formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [debtFilter, setDebtFilter] = useState('todos');

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = statusFilter === 'todos' ||
      (statusFilter === 'activos' && c.status !== 'pagado') ||
      (statusFilter === 'inactivos' && c.status === 'pagado');
    const matchDebt = debtFilter === 'todos' ||
      (debtFilter === 'con_deuda' && c.totalBalance > 0) ||
      (debtFilter === 'sin_deuda' && c.totalBalance === 0);
    return matchSearch && matchStatus && matchDebt;
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Clientes</h2>
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
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Nombre</th>
              <th className="text-left p-3 font-medium">Teléfono</th>
              <th className="text-left p-3 font-medium">Préstamos</th>
              <th className="text-left p-3 font-medium">Saldo total</th>
              <th className="text-left p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => navigate(`/cliente/${c.id}`)} className="border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.phone}</td>
                <td className="p-3">{c.activeLoans}</td>
                <td className="p-3">{formatCurrency(c.totalBalance)}</td>
                <td className={`p-3 ${statusColor(c.status)}`}>{statusLabel(c.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(c => (
          <button key={c.id} onClick={() => navigate(`/cliente/${c.id}`)} className="w-full bg-card rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.name}</p>
              <span className={`text-xs ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.phone}</p>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">{c.activeLoans} préstamo(s)</span>
              <span className="font-medium">{formatCurrency(c.totalBalance)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
