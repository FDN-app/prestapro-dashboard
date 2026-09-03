import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, RotateCcw, Search, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/data/mockData';
import { useCuotasPendientes } from '@/hooks/useCuotasPendientes';
import { formatDateDisplay, formatDateLocal } from '@/lib/utils';

type Periodo = 'todos' | 'hoy' | '7' | '15' | '30' | 'personalizado';

const DAY_MS = 86_400_000;

function getToday(): string {
  return formatDateLocal(new Date());
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(year, month - 1, day);
  result.setDate(result.getDate() + days);
  return formatDateLocal(result);
}

function daysUntil(date: string, today: string): number {
  const due = new Date(`${date}T00:00:00`).getTime();
  const start = new Date(`${today}T00:00:00`).getTime();
  return Math.round((due - start) / DAY_MS);
}

export default function UpcomingInstallments() {
  const navigate = useNavigate();
  const { pendientes, isLoading } = useCuotasPendientes();
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('7');
  const [estado, setEstado] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const today = getToday();

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    let rangeStart = '';
    let rangeEnd = '';

    if (periodo === 'hoy') {
      rangeStart = today;
      rangeEnd = today;
    } else if (periodo === '7' || periodo === '15' || periodo === '30') {
      rangeStart = today;
      rangeEnd = addDays(today, Number(periodo));
    } else if (periodo === 'personalizado') {
      rangeStart = desde;
      rangeEnd = hasta;
    }

    return pendientes.filter((cuota) => {
      const name = cuota.prestamos?.clientes?.nombre_completo ?? '';
      const matchesSearch = !normalizedSearch || name.toLocaleLowerCase('es').includes(normalizedSearch);
      const matchesStatus = estado === 'todos' || cuota.estado === estado;
      const matchesStart = !rangeStart || cuota.fecha_vencimiento >= rangeStart;
      const matchesEnd = !rangeEnd || cuota.fecha_vencimiento <= rangeEnd;
      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [desde, estado, hasta, pendientes, periodo, search, today]);

  const total = useMemo(
    () => filtered.reduce((sum, cuota) => sum + (cuota.monto_cuota - cuota.monto_cobrado), 0),
    [filtered],
  );

  const resetFilters = () => {
    setSearch('');
    setPeriodo('7');
    setEstado('todos');
    setDesde('');
    setHasta('');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando cuotas a vencer...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarClock className="text-primary" size={22} /> Cuotas a vencer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Consultá próximos vencimientos y cuotas atrasadas por cliente.</p>
      </div>

      <section className="bg-card border border-border rounded-xl p-4 space-y-3" aria-label="Filtros de cuotas">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar cliente"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Período de vencimiento"
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value as Periodo)}
            className="h-10 bg-background border border-input rounded-md px-3 text-sm text-foreground"
          >
            <option value="todos">Todas las fechas</option>
            <option value="hoy">Vencen hoy</option>
            <option value="7">Próximos 7 días</option>
            <option value="15">Próximos 15 días</option>
            <option value="30">Próximos 30 días</option>
            <option value="personalizado">Rango personalizado</option>
          </select>
          <select
            aria-label="Estado de la cuota"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            className="h-10 bg-background border border-input rounded-md px-3 text-sm text-foreground"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Pago parcial</option>
            <option value="vencida">Vencidas</option>
          </select>
        </div>

        {periodo === 'personalizado' ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="text-sm flex-1">
              <span className="block text-muted-foreground mb-1">Desde</span>
              <Input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            </label>
            <label className="text-sm flex-1">
              <span className="block text-muted-foreground mb-1">Hasta</span>
              <Input type="date" min={desde} value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </label>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw size={15} className="mr-2" /> Limpiar filtros
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cuotas encontradas</p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total a cobrar</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="hidden md:block bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium">Cliente</th>
              <th className="text-left p-3 font-medium">Fecha vencimiento</th>
              <th className="text-center p-3 font-medium">Cuota</th>
              <th className="text-right p-3 font-medium">Monto restante</th>
              <th className="text-center p-3 font-medium">Situación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No hay cuotas que coincidan con los filtros.</td></tr>
            ) : filtered.map((cuota) => {
              const remaining = cuota.monto_cuota - cuota.monto_cobrado;
              const days = daysUntil(cuota.fecha_vencimiento, today);
              return (
                <tr
                  key={cuota.id}
                  onClick={() => navigate(`/registrar-pago?prestamo=${cuota.prestamos?.id}`)}
                  className="border-b border-border last:border-0 hover:bg-secondary/40 cursor-pointer"
                >
                  <td className="p-3 font-medium">{cuota.prestamos?.clientes?.nombre_completo || 'Cliente desconocido'}</td>
                  <td className="p-3">{formatDateDisplay(cuota.fecha_vencimiento)}</td>
                  <td className="p-3 text-center">#{cuota.numero_cuota}</td>
                  <td className="p-3 text-right font-semibold tabular-nums">{formatCurrency(remaining)}</td>
                  <td className={`p-3 text-center text-xs font-semibold ${days < 0 ? 'text-status-red' : days === 0 ? 'text-status-yellow' : 'text-status-green'}`}>
                    {days < 0 ? `Vencida hace ${Math.abs(days)} día${days === -1 ? '' : 's'}` : days === 0 ? 'Vence hoy' : `En ${days} día${days === 1 ? '' : 's'}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? <div className="p-8 text-center text-muted-foreground">No hay cuotas que coincidan con los filtros.</div> : null}
        {filtered.map((cuota) => {
          const remaining = cuota.monto_cuota - cuota.monto_cobrado;
          const days = daysUntil(cuota.fecha_vencimiento, today);
          return (
            <button
              key={cuota.id}
              onClick={() => navigate(`/registrar-pago?prestamo=${cuota.prestamos?.id}`)}
              className="w-full bg-card border border-border rounded-xl p-4 text-left hover:bg-secondary/40 transition-colors"
            >
              <div className="flex justify-between gap-3">
                <p className="font-semibold">{cuota.prestamos?.clientes?.nombre_completo || 'Cliente desconocido'}</p>
                <p className="font-bold text-primary whitespace-nowrap">{formatCurrency(remaining)}</p>
              </div>
              <div className="flex justify-between gap-3 mt-2 text-sm text-muted-foreground">
                <span>Cuota #{cuota.numero_cuota} · {formatDateDisplay(cuota.fecha_vencimiento)}</span>
                <span className={days < 0 ? 'text-status-red' : days === 0 ? 'text-status-yellow' : 'text-status-green'}>
                  {days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `En ${days} días`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <WalletCards size={14} /> Tocá una cuota para ir directamente a registrar el pago.
      </p>
    </div>
  );
}
