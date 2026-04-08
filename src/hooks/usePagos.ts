import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface RegistrarPagoPayload {
  p_prestamo_id: string;
  p_cuota_id: string;
  p_monto: number;
  p_metodo: string;
  p_notas: string;
}

export function usePagos() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: RegistrarPagoPayload) => {
      const { data, error } = await supabase.rpc('registrar_pago', payload);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pago registrado correctamente');
      // Invalidar todas las queries afectadas para que la UI se refresque sola
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['cuotas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['capital'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
    },
    onError: (error) => {
      toast.error('Error al registrar el pago: ' + error.message);
    }
  });

  return {
    registrarPago: createMutation.mutateAsync,
    isRegistrando: createMutation.isPending
  };
}
