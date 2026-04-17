import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Suscripcion {
  id: string;
  estado: 'activo' | 'pausado' | 'cancelado';
  fecha_inicio: string;
  fecha_vencimiento: string;
}

export interface PagoSuscripcion {
  id: string;
  monto: number;
  fecha_reporte: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  reportado_por: string;
}

export function useSuscripcion() {
  const queryClient = useQueryClient();

  const { data: suscripcion, isLoading } = useQuery({
    queryKey: ['suscripcion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suscripciones')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as Suscripcion;
    }
  });

  const { data: pagos, isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-suscripcion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagos_suscripcion')
        .select('*')
        .order('fecha_reporte', { ascending: false });
      
      if (error) throw error;
      return data as PagoSuscripcion[];
    }
  });

  const reportarPago = useMutation({
    mutationFn: async () => {
      if (!suscripcion) return;
      const { error } = await supabase.rpc('reportar_pago_suscripcion', {
        p_suscripcion_id: suscripcion.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pago reportado. Pendiente de validación por el administrador.');
      queryClient.invalidateQueries({ queryKey: ['pagos-suscripcion'] });
    },
    onError: (e: any) => toast.error('Error: ' + e.message)
  });

  const validarPago = useMutation({
    mutationFn: async (pagoId: string) => {
      const { error } = await supabase.rpc('validar_pago_suscripcion', {
        p_pago_id: pagoId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pago validado. Suscripción extendida.');
      queryClient.invalidateQueries({ queryKey: ['suscripcion'] });
      queryClient.invalidateQueries({ queryKey: ['pagos-suscripcion'] });
    },
    onError: (e: any) => toast.error('Error al validar: ' + e.message)
  });

  const cambiarEstado = useMutation({
    mutationFn: async (nuevoEstado: string) => {
      if (!suscripcion) return;
      const { error } = await supabase
        .from('suscripciones')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', suscripcion.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estado de suscripción actualizado');
      queryClient.invalidateQueries({ queryKey: ['suscripcion'] });
    }
  });

  return {
    suscripcion,
    isLoading,
    pagos: pagos || [],
    loadingPagos,
    reportarPago: reportarPago.mutateAsync,
    isReporting: reportarPago.isPending,
    validarPago: validarPago.mutateAsync,
    isValidating: validarPago.isPending,
    cambiarEstado: cambiarEstado.mutateAsync,
    isUpdatingStatus: cambiarEstado.isPending
  };
}
