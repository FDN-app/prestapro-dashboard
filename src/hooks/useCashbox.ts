import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useCashbox() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cashbox'],
    queryFn: async () => {
      // Find all payments that are 'en_caja'
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          prestamos (
            clientes (nombre_completo)
          )
        `)
        .eq('destino_caja', 'en_caja')
        .order('fecha_pago', { ascending: false });

      if (error) {
        toast.error('Error cargando caja: ' + error.message);
        throw error;
      }
      return data;
    }
  });

  const processCashbox = useMutation({
    mutationFn: async ({ pagosIds, accion }: { pagosIds: string[], accion: 'capitalizar' | 'retirar' }) => {
      const { error } = await supabase.rpc('procesar_recaudacion', {
        p_pagos_ids: pagosIds,
        p_accion: accion
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Caja procesada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['cashbox'] });
      queryClient.invalidateQueries({ queryKey: ['capital'] }); // because capital was affected
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => {
      toast.error('Error al procesar: ' + e.message);
    }
  });

  return {
    ...query,
    pendientes: query.data || [],
    totalEnCaja: (query.data || []).reduce((acc: number, val: any) => acc + Number(val.monto_pagado), 0),
    processCashbox: processCashbox.mutateAsync,
    isProcessing: processCashbox.isPending
  };
}
