import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useAuditoria } from '@/hooks/useAuditoria';

export default function AuditLog() {
  const { logs, isLoading } = useAuditoria();
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('todos');
  const [actionFilter, setActionFilter] = useState('todos');

  const filtered = logs.filter(e => {
    const userEmail = e.perfiles?.email || 'Sistema';
    const matchSearch = JSON.stringify(e.detalles).toLowerCase().includes(search.toLowerCase()) || userEmail.toLowerCase().includes(search.toLowerCase());
    const matchUser = userFilter === 'todos' || userEmail === userFilter;
    const matchAction = actionFilter === 'todos' || e.accion === actionFilter;
    return matchSearch && matchUser && matchAction;
  });

  const uniqueUsers = [...new Set(logs.map(e => e.perfiles?.email || 'Sistema'))];
  const uniqueActions = [...new Set(logs.map(e => e.accion))];

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando auditoría...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Log de Auditoría</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por detalle o usuario..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
              <th className="text-left p-3 font-medium">Entidad (ID)</th>
              <th className="text-left p-3 font-medium">Detalle (JSON)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No hay registros</td></tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(e.fecha).toLocaleString()}</td>
                <td className="p-3">{e.perfiles?.email || 'Sistema'}</td>
                <td className="p-3 font-medium">{e.accion}</td>
                <td className="p-3 text-xs">{e.entidad}<br/><span className="text-muted-foreground">{e.entidad_id?.substring(0,8)}</span></td>
                <td className="p-3 text-xs text-muted-foreground max-w-xs truncate" title={JSON.stringify(e.detalles)}>
                  {JSON.stringify(e.detalles)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
