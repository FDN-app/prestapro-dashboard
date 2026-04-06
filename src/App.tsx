import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/contexts/RoleContext";
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
import SettingsPage from "./pages/Settings";
import CollectorPending from "./pages/CollectorPending";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
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
            <Route path="/auditoria" element={<AppLayout><AuditLog /></AppLayout>} />
            <Route path="/configuracion" element={<AppLayout><SettingsPage /></AppLayout>} />
            <Route path="/cobros-pendientes" element={<AppLayout><CollectorPending /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
