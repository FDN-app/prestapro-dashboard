import React from 'react';
import { useSuscripcion } from '@/hooks/useSuscripcion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, CreditCard, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export default function Subscriptions() {
  const { 
    suscripcion, 
    pagos, 
    isLoading, 
    reportarPago, 
    isReporting, 
    validarPago, 
    isValidating,
    cambiarEstado
  } = useSuscripcion();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
      return data;
    }
  });

  const isAdmin = userProfile?.rol === 'admin';

  if (isLoading) return <div className="p-8 text-center animate-pulse">Cargando información de suscripción...</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo': return <Badge className="bg-status-green hover:bg-status-green">Activo</Badge>;
      case 'pausado': return <Badge variant="warning" className="bg-amber-500">Pausado</Badge>;
      case 'cancelado': return <Badge variant="destructive">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Suscripción</h1>
          <p className="text-muted-foreground">Administra tu plan y reporta tus pagos de licencia.</p>
        </div>
        {suscripcion && getStatusBadge(suscripcion.estado)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card de Estado Actual */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-md border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary h-5 w-5" />
              Estado del Plan
            </CardTitle>
            <CardDescription>Resumen de tu licencia actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase font-semibold text-[10px] tracking-widest">Vencimiento</p>
              <p className="text-xl font-bold">
                {suscripcion?.fecha_vencimiento 
                  ? format(new Date(suscripcion.fecha_vencimiento), "dd 'de' MMMM", { locale: es })
                  : 'N/A'}
              </p>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4 italic text-xs">
                Recuerda reportar tu pago antes de la fecha de vencimiento para evitar la suspensión del servicio.
              </p>
              <Button 
                className="w-full font-bold py-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                onClick={() => reportarPago()}
                disabled={isReporting || (pagos.length > 0 && pagos[0].estado === 'pendiente')}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {pagos.length > 0 && pagos[0].estado === 'pendiente' ? 'Pago en Revisión' : 'Ya pagué mi licencia'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historial de Pagos / Panel Admin */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-md border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-primary h-5 w-5" />
              {isAdmin ? 'Solicitudes de Validación (Admin)' : 'Historial de Reportes'}
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'Aprobación de pagos realizados por los usuarios' : 'Tus últimos reportes de pago'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pagos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                  No hay reportes de pago registrados.
                </div>
              ) : (
                pagos.map((p) => (
                  <div 
                    key={p.id} 
                    className="flex items-center justify-between p-4 bg-background/40 rounded-xl border border-border/40 hover:bg-background/60 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${p.estado === 'aprobado' ? 'bg-status-green/10 text-status-green' : 'bg-amber-500/10 text-amber-500'}`}>
                        {p.estado === 'aprobado' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">Pago de Licencia Mensual</p>
                        <p className="text-xs text-muted-foreground">
                          Reportado el {format(new Date(p.fecha_reporte), "dd/MM 'a las' HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant={p.estado === 'aprobado' ? 'secondary' : 'outline'} className="capitalize">
                        {p.estado}
                      </Badge>
                      
                      {isAdmin && p.estado === 'pendiente' && (
                        <Button 
                          size="sm" 
                          className="bg-status-green hover:bg-status-green/90"
                          onClick={() => validarPago(p.id)}
                          disabled={isValidating}
                        >
                          Aprobar
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          {isAdmin && (
             <CardFooter className="border-t border-border/50 pt-6 mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => cambiarEstado('pausado')}>Pausar Suscripción</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => cambiarEstado('cancelado')}>Cancelar Licencia</Button>
             </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
