import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface PagoComleto {
  id: string;
  fecha_pago: string;
  monto_pagado: number;
  destino_caja: string;
  cobrador_id: string;
  prestamo_id: string;
  cuota_id: string;
  prestamos: {
    tasa_interes: number;
    clientes: {
      nombre_completo: string;
    }
  };
  cobrador: {
    email: string;
    nombre: string;
    comision_porcentaje: number;
  };
}

export function usePagosAdmin() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pagos_admin'],
    queryFn: async () => {
      // Necesitamos asegurar que funcione la relacion con perfiles (cobrador_id)
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          prestamos (
            tasa_interes,
            clientes (
              nombre_completo
            )
          ),
          cobrador:perfiles!cobrador_id (
            email,
            nombre,
            comision_porcentaje
          )
        `)
        .order('fecha_pago', { ascending: false });

      if (error) {
        toast.error('Error cargando historial de pagos: ' + error.message);
        throw error;
      }
      return data as PagoComleto[];
    }
  });

  const marcarRendido = useMutation({
    mutationFn: async (cobradorId: string) => {
      // Usar la rpc procesar_recaudacion que acepta array de IDs.
      // O hacer update directo si somos admin.
      const pagosPendientes = query.data?.filter(p => p.destino_caja === 'en_caja' && p.cobrador_id === cobradorId) || [];
      const ids = pagosPendientes.map(p => p.id);
      
      if (ids.length === 0) return;

      const { error } = await supabase.rpc('procesar_recaudacion', {
        p_pagos_ids: ids,
        p_accion: 'capitalizar'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rendición procesada');
      queryClient.invalidateQueries({ queryKey: ['pagos_admin'] });
      queryClient.invalidateQueries({ queryKey: ['cashbox'] });
      queryClient.invalidateQueries({ queryKey: ['capital'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => {
      toast.error('Error al procesar rendición: ' + e.message);
    }
  });

  return {
    ...query,
    pagos: query.data || [],
    marcarRendido: marcarRendido.mutateAsync,
    isMarcando: marcarRendido.isPending
  };
}
