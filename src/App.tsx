import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import NewClient from "./pages/NewClient";
import NewLoan from "./pages/NewLoan";
import LoanDetail from "./pages/LoanDetail";
import RegisterPayment from "./pages/RegisterPayment";
import Collectors from "./pages/Collectors";
import AuditLog from "./pages/AuditLog";
import CapitalFlow from "./pages/CapitalFlow";
import SettingsPage from "./pages/Settings";
import Backup from "./pages/Backup";
import CollectorPending from "./pages/CollectorPending";
import Subscriptions from "./pages/Subscriptions";
import AsistenteIA from "./pages/AsistenteIA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/clientes" element={<AppLayout><Clients /></AppLayout>} />
            <Route path="/cliente/:id" element={<AppLayout><ClientDetail /></AppLayout>} />
            <Route path="/nuevo-cliente" element={<AppLayout><NewClient /></AppLayout>} />
            <Route path="/nuevo-prestamo" element={<AppLayout><NewLoan /></AppLayout>} />
            <Route path="/prestamo/:id" element={<AppLayout><LoanDetail /></AppLayout>} />
            <Route path="/registrar-pago" element={<AppLayout><RegisterPayment /></AppLayout>} />
            <Route path="/cobradores" element={<AppLayout><Collectors /></AppLayout>} />
            <Route path="/capital" element={<AppLayout><CapitalFlow /></AppLayout>} />
            <Route path="/auditoria" element={<AppLayout><AuditLog /></AppLayout>} />
            <Route path="/configuracion" element={<AppLayout><SettingsPage /></AppLayout>} />
            <Route path="/backups" element={<AppLayout><Backup /></AppLayout>} />
            <Route path="/cobros-pendientes" element={<AppLayout><CollectorPending /></AppLayout>} />
            <Route path="/suscripcion" element={<AppLayout><Subscriptions /></AppLayout>} />
            <Route path="/asistente" element={<AppLayout><AsistenteIA /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
