import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, ArrowLeft } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { usePrestamos } from '@/hooks/usePrestamos';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { clientes, isLoading: isLoadingClientes } = useClientes();
  const { prestamos, isLoading: isLoadingPrestamos } = usePrestamos();

  if (isLoadingClientes || isLoadingPrestamos) {
    return <div className="p-6 text-muted-foreground">Cargando datos del cliente...</div>;
  }

  const client = clientes.find(c => c.id === id);
  const clientLoans = prestamos.filter(l => l.cliente_id === id);

  if (!client) return <div className="p-6">Cliente no encontrado.</div>;

  const goodPayer = client.status === 'al_dia' || client.status === 'pagado';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate('/clientes')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <span className={`text-sm ${statusColor(client.status)}`}>{statusLabel(client.status)}</span>
          </div>
          <Button variant="outline" size="sm"><Pencil size={14} className="mr-1" /> Editar</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm">
          <div><span className="text-muted-foreground">Teléfono:</span> {client.phone}</div>
          <div><span className="text-muted-foreground">DNI:</span> {client.dni}</div>
          <div><span className="text-muted-foreground">Dirección:</span> {client.direccion || '-'}</div>
          {client.notas && <div className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {client.notas}</div>}
        </div>
      </div>

      {/* Historial */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Historial de Préstamos</h3>
          <Button size="sm" onClick={() => navigate(`/nuevo-prestamo?clientId=${id}`)}>
            <Plus size={16} className="mr-1" /> Nuevo Préstamo
          </Button>
        </div>
        <p className={`text-sm mb-3 ${goodPayer ? 'status-green' : 'status-yellow'}`}>
          {goodPayer ? '⭐ Buen pagador' : '⚠️ Pagador irregular'}
        </p>

        <div className="space-y-3">
          {clientLoans.map(loan => {
            const isPagado = loan.estado === 'pagado' || loan.estado === 'liquidado';
            // Placeholder for progress, you'd calculate it based on paid installments in a real app
            const progress = isPagado ? 100 : Math.max(0, Math.round(((loan.monto_original - loan.saldo_pendiente) / loan.monto_original) * 100));

            return (
              <button
                key={loan.id}
                onClick={() => navigate(`/prestamo/${loan.id}`)}
                className="w-full bg-card rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Utilizando el UUID acortado para que no ocupe toda la pantalla */}
                  <span className="font-medium">Préstamo #{loan.id.substring(0, 8)}...</span>
                  <span className={`text-xs ${isPagado ? 'status-green' : 'text-primary'}`}>
                    {isPagado ? '✅ Pagado' : `🔄 ${loan.estado.charAt(0).toUpperCase() + loan.estado.slice(1)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
                  <span>{formatCurrency(loan.monto_original)}</span>
                  <span>{new Date(loan.fecha_inicio).toLocaleDateString()}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progreso</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </button>
            )
          })}
          {clientLoans.length === 0 && <p className="text-sm text-muted-foreground">No hay préstamos registrados.</p>}
        </div>
      </div>
    </div>
  );
}
