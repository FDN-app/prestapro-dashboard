import { useParams, useNavigate } from 'react-router-dom';
import { clients, loans, formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, ArrowLeft } from 'lucide-react';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = clients.find(c => c.id === id);
  const clientLoans = loans.filter(l => l.clientId === id);

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
          <div><span className="text-muted-foreground">Dirección:</span> {client.address}</div>
          {client.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {client.notes}</div>}
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
          {clientLoans.map(loan => (
            <button
              key={loan.id}
              onClick={() => navigate(`/prestamo/${loan.id}`)}
              className="w-full bg-card rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Préstamo #{loan.id}</span>
                <span className={`text-xs ${loan.status === 'pagado' ? 'status-green' : 'text-primary'}`}>
                  {loan.status === 'pagado' ? '✅ Pagado' : '🔄 Activo'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
                <span>{formatCurrency(loan.amount)}</span>
                <span>{loan.startDate}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progreso</span>
                  <span>{loan.progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${loan.progress}%` }} />
                </div>
              </div>
            </button>
          ))}
          {clientLoans.length === 0 && <p className="text-sm text-muted-foreground">No hay préstamos registrados.</p>}
        </div>
      </div>
    </div>
  );
}
