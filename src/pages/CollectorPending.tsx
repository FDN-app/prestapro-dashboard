import { collectorPendingPayments, formatCurrency, statusLabel, statusColor } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

export default function CollectorPending() {
  const navigate = useNavigate();

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
              <th className="text-left p-3 font-medium">Monto</th>
              <th className="text-left p-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {collectorPendingPayments.map((p, i) => (
              <tr key={i} onClick={() => navigate('/registrar-pago')} className="border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer">
                <td className="p-3 font-medium">{p.clientName}</td>
                <td className="p-3">#{p.installmentNum}</td>
                <td className="p-3">{p.dueDate}</td>
                <td className="p-3">{formatCurrency(p.amount)}</td>
                <td className={`p-3 ${statusColor(p.status)}`}>{statusLabel(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {collectorPendingPayments.map((p, i) => (
          <button key={i} onClick={() => navigate('/registrar-pago')} className="w-full bg-card rounded-lg border border-border p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <p className="font-medium">{p.clientName}</p>
              <span className={`text-xs ${statusColor(p.status)}`}>{statusLabel(p.status)}</span>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">Cuota #{p.installmentNum} — {p.dueDate}</span>
              <span className="font-medium">{formatCurrency(p.amount)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
