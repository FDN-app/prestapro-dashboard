import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import {
  BarChart3, Users, Banknote, ShieldCheck, ClipboardList, Settings, List, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const adminNav = [
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Registrar Pago', icon: Banknote, path: '/registrar-pago' },
  { label: 'Cobradores', icon: ShieldCheck, path: '/cobradores' },
  { label: 'Auditoría', icon: ClipboardList, path: '/auditoria' },
  { label: 'Configuración', icon: Settings, path: '/configuracion' },
];

const collectorNav = [
  { label: 'Cobros Pendientes', icon: List, path: '/cobros-pendientes' },
  { label: 'Registrar Pago', icon: Banknote, path: '/registrar-pago' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, setRole, isAdmin } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = isAdmin ? adminNav : collectorNav;
  const mobileNav = isAdmin ? adminNav.slice(0, 5) : collectorNav;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-primary">💰 PrestaPro</h1>
          <p className="text-xs text-muted-foreground mt-1">Tu cartera bajo control</p>
        </div>

        {/* Role toggle */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-xs text-muted-foreground mb-2">Vista:</p>
          <div className="flex bg-secondary rounded-lg p-1">
            <button
              onClick={() => { setRole('admin'); navigate('/dashboard'); }}
              className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-colors',
                role === 'admin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >Admin</button>
            <button
              onClick={() => { setRole('cobrador'); navigate('/cobros-pendientes'); }}
              className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-colors',
                role === 'cobrador' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >Cobrador</button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
              <h1 className="text-xl font-bold text-primary">💰 PrestaPro</h1>
              <button onClick={() => setSidebarOpen(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="px-4 py-3 border-b border-sidebar-border">
              <p className="text-xs text-muted-foreground mb-2">Vista:</p>
              <div className="flex bg-secondary rounded-lg p-1">
                <button
                  onClick={() => { setRole('admin'); navigate('/dashboard'); setSidebarOpen(false); }}
                  className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-colors',
                    role === 'admin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >Admin</button>
                <button
                  onClick={() => { setRole('cobrador'); navigate('/cobros-pendientes'); setSidebarOpen(false); }}
                  className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-colors',
                    role === 'cobrador' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >Cobrador</button>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {nav.map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-primary">💰 PrestaPro</h1>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-40">
          {mobileNav.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors',
                location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon size={20} />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
