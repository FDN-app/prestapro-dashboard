import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  BarChart3, Users, Banknote, ShieldCheck, ClipboardList, Settings, List, Menu, X, LogOut, DatabaseBackup, Activity
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const adminNav = [
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Registrar Pago', icon: Banknote, path: '/registrar-pago' },
  { label: 'Cobradores', icon: ShieldCheck, path: '/cobradores' },
  { label: 'Flujo de Capital', icon: Activity, path: '/capital' },
  { label: 'Auditoría', icon: ClipboardList, path: '/auditoria' },
  { label: 'Backups', icon: DatabaseBackup, path: '/backups' },
  { label: 'Configuración', icon: Settings, path: '/configuracion' },
];

const collectorNav = [
  { label: 'Cobros Pendientes', icon: List, path: '/cobros-pendientes' },
  { label: 'Registrar Pago', icon: Banknote, path: '/registrar-pago' },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, role, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Proteger rutas
  if (!isLoading && !session) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando la aplicación...</div>;
  }

  const nav = isAdmin ? adminNav : collectorNav;
  const mobileNav = isAdmin ? adminNav.slice(0, 5) : collectorNav;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/30">
      {/* Desktop Sidebar (Glassmorphism & Floating feel) */}
      <aside className="hidden lg:flex flex-col w-72 bg-sidebar/70 backdrop-blur-3xl border-r border-sidebar-border shrink-0 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="p-6 border-b border-sidebar-border/50 bg-gradient-to-b from-sidebar to-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Banknote className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
                PrestaPro
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-medium">Finance Sys</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 bg-secondary/40 backdrop-blur-sm p-3 rounded-lg border border-border/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
              {role === 'admin' ? 'A' : 'C'}
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none">Logueado como</p>
              <p className="text-sm font-semibold capitalize text-foreground mt-1 leading-none">{role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Menu Principal</p>
          {nav.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(20,184,166,0.05)] border border-primary/20'
                  : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-secondary/40 hover:translate-x-1 hover:border-border/50'
              )}
            >
              <item.icon size={18} className={cn("transition-transform duration-300", location.pathname === item.path ? "scale-110" : "group-hover:scale-110")} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-5 border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar to-transparent">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 hover:translate-x-1 border border-transparent hover:border-destructive/20"
          >
            <LogOut size={18} className="transition-transform duration-300 hover:-translate-x-1" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[280px] bg-sidebar/95 backdrop-blur-3xl border-r border-sidebar-border flex flex-col shadow-2xl">
            <div className="p-5 border-b border-sidebar-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/30">
                  <Banknote className="text-primary" size={20} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground tracking-tight">PrestaPro</h1>
                  <p className="text-[10px] text-primary uppercase font-bold tracking-wider">{role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X size={20} className="text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
              {nav.map(item => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                    location.pathname === item.path
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
            
            <div className="p-4 border-t border-sidebar-border/50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors border border-transparent hover:border-destructive/20"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
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
