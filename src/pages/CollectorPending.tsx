import { formatCurrency } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { useCuotasPendientes } from '@/hooks/useCuotasPendientes';

export default function CollectorPending() {
  const navigate = useNavigate();
  const { pendientes, isLoading } = useCuotasPendientes();

  const statusColor = (s: string) => {
    switch(s) {
      case 'vencida': return 'text-status-red';
      case 'parcial': return 'text-status-yellow';
      default: return 'text-status-green';
    }
  };

  const statusLabel = (s: string) => {
    switch(s) {
      case 'vencida': return '🔴 Vencida';
      case 'parcial': return '🟡 Parcial';
      default: return '🟢 Pendiente';
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando cobros pendientes...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-xl font-bold">Cobros Pendientes</h2>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Cliente</th>
              <th className="text-left p-3 font-medium">Cuota</th>
              <th className="text-left p-3 font-medium">Vencimiento</th>
              <th className="text-left p-3 font-medium">Monto Restante</th>
              <th className="text-left p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No hay cobros pendientes</td></tr>
            )}
            {pendientes.map((p) => {
              const clienteNombre = p.prestamos?.clientes?.nombre_completo || 'Desconocido';
              const montoRestante = p.monto_cuota - p.monto_cobrado;

              return (
              <tr key={p.id} onClick={() => navigate(`/registrar-pago?prestamo=${p.prestamos?.id}`)} className="border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer">
                <td className="p-3 font-medium">{clienteNombre}</td>
                <td className="p-3">#{p.numero_cuota}</td>
                <td className="p-3">{new Date(p.fecha_vencimiento).toLocaleDateString()}</td>
                <td className="p-3">{formatCurrency(montoRestante)}</td>
                <td className={`p-3 ${statusColor(p.estado)}`}>{statusLabel(p.estado)}</td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {pendientes.length === 0 && <div className="p-4 text-center text-muted-foreground">No hay cobros pendientes</div>}
        {pendientes.map((p) => {
          const clienteNombre = p.prestamos?.clientes?.nombre_completo || 'Desconocido';
          const montoRestante = p.monto_cuota - p.monto_cobrado;

          return (
          <button key={p.id} onClick={() => navigate(`/registrar-pago?prestamo=${p.prestamos?.id}`)} className="w-full bg-card rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <p className="font-medium">{clienteNombre}</p>
              <span className={`text-xs ${statusColor(p.estado)}`}>{statusLabel(p.estado)}</span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">Cuota #{p.numero_cuota} — {new Date(p.fecha_vencimiento).toLocaleDateString()}</span>
              <span className="font-medium">{formatCurrency(montoRestante)}</span>
            </div>
          </button>
        )})}
      </div>
    </div>
  );
}
