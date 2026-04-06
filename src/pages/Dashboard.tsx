import { useNavigate } from 'react-router-dom';
import { recentPayments, formatCurrency } from '@/data/mockData';
import { useState } from 'react';

const semaphore = [
  { label: 'AL DÍA', count: 15, color: 'border-status-green', textColor: 'status-green', filter: 'al_dia' },
  { label: 'POR VENCER', count: 8, color: 'border-status-yellow', textColor: 'status-yellow', filter: 'por_vencer' },
  { label: 'EN MORA', count: 4, color: 'border-status-red', textColor: 'status-red', filter: 'en_mora' },
];

const metrics = [
  { label: 'Capital disponible', value: 2500000 },
  { label: 'Capital en calle', value: 8200000 },
  { label: 'Ingresos del mes', value: 1850000, hasFilter: true },
  { label: 'Por cobrar', value: 3100000 },
  { label: 'Mora total', value: 1100000 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('mes');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>

      {/* Semáforo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {semaphore.map(s => (
          <button
            key={s.label}
            onClick={() => navigate('/clientes')}
            className="bg-card rounded-lg p-5 border-t-4 border border-border text-left hover:bg-secondary transition-colors"
            style={{ borderTopColor: `var(--tw-border-opacity, 1)` }}
          >
            <div className={`border-t-4 -mt-5 -mx-5 mb-4 rounded-t-lg ${s.color}`} />
            <p className={`text-sm font-medium ${s.textColor}`}>{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.count}</p>
            <p className="text-xs text-muted-foreground">clientes</p>
          </button>
        ))}
      </div>

      {/* Panel Financiero */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Panel Financiero</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="bg-card rounded-lg p-4 border border-border">
              {m.hasFilter && (
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="text-xs bg-secondary text-foreground rounded px-2 py-0.5 mb-2 border-none outline-none"
                >
                  <option value="semana">Semana</option>
                  <option value="quincena">Quincena</option>
                  <option value="mes">Mes</option>
                </select>
              )}
              <p className="text-xl lg:text-2xl font-bold">{formatCurrency(m.value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Actividad Reciente</h3>
        <div className="bg-card rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Monto</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Fecha</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="p-3">{p.client}</td>
                  <td className="p-3">{formatCurrency(p.amount)}</td>
                  <td className="p-3 hidden sm:table-cell">{p.date}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{p.registeredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
