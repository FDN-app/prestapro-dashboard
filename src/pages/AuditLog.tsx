import { useState } from 'react';
import { auditLog } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function AuditLog() {
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('todos');
  const [actionFilter, setActionFilter] = useState('todos');

  const filtered = auditLog.filter(e => {
    const matchSearch = e.detail.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase());
    const matchUser = userFilter === 'todos' || e.user === userFilter;
    const matchAction = actionFilter === 'todos' || e.action === actionFilter;
    return matchSearch && matchUser && matchAction;
  });

  const uniqueUsers = [...new Set(auditLog.map(e => e.user))];
  const uniqueActions = [...new Set(auditLog.map(e => e.action))];

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Log de Auditoría</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="todos">Todos los usuarios</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground">
          <option value="todos">Todas las acciones</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Fecha/Hora</th>
              <th className="text-left p-3 font-medium">Usuario</th>
              <th className="text-left p-3 font-medium">Acción</th>
              <th className="text-left p-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="p-3 text-muted-foreground whitespace-nowrap">{e.dateTime}</td>
                <td className="p-3">{e.user}</td>
                <td className="p-3">{e.action}</td>
                <td className="p-3 text-muted-foreground">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
