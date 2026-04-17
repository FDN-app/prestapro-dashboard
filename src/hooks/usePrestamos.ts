import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Prestamo {
  id: string;
  cliente_id: string;
  monto_original: number;
  saldo_pendiente: number;
  tasa_interes: number;
  tipo_interes: string;
  comision: number;
  cantidad_cuotas: number;
  frecuencia_pago: string;
  frecuencia_dias: number;
  fecha_inicio: string;
  cantidad_renovaciones: number;
  estado: string;
  clientes?: {
    nombre_completo: string;
    dni: string;
  };
}

export function usePrestamos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['prestamos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          clientes (
            nombre_completo,
            dni
          )
        `)
        .order('fecha_inicio', { ascending: false });

      if (error) {
        toast.error('Error al cargar préstamos');
        throw error;
      }
      return data as Prestamo[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Prestamo> }) => {
      const { data, error } = await supabase
        .from('prestamos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Préstamo actualizado');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
    },
    onError: (error) => {
      toast.error('Error al actualizar el préstamo: ' + error.message);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (nuevoPrestamo: any) => {
      const { data, error } = await supabase.rpc('crear_prestamo_con_cuotas', nuevoPrestamo);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Préstamo creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      toast.error('Error al crear el préstamo: ' + error.message);
    }
  });

  const liquidarMutation = useMutation({
    mutationFn: async ({ prestamo_id, monto_pago }: { prestamo_id: string, monto_pago: number }) => {
      const { data, error } = await supabase.rpc('liquidar_prestamo', { p_prestamo_id: prestamo_id, p_monto_pago: monto_pago });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Préstamo liquidado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      toast.error('Error al liquidar el préstamo: ' + error.message);
    }
  });

  const refinanciarMutation = useMutation({
    mutationFn: async (params: any) => {
      const { data, error } = await supabase.rpc('refinanciar_prestamo', params);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Préstamo refinanciado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      toast.error('Error al refinanciar el préstamo: ' + error.message);
    }
  });

  const extenderMutation = useMutation({
    mutationFn: async ({ prestamo_id, nueva_tasa, nuevas_cuotas, frecuencia_pago, frecuencia_dias }: any) => {
      const { data, error } = await supabase.rpc('extender_prestamo', { 
        p_prestamo_id: prestamo_id, 
        p_nueva_tasa: nueva_tasa,
        p_nuevas_cuotas: nuevas_cuotas,
        p_frecuencia_pago: frecuencia_pago,
        p_frecuencia_dias: frecuencia_dias
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Préstamo refinanciado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      toast.error('Error al refinanciar: ' + error.message);
    }
  });

  const diferirCuotaMutation = useMutation({
    mutationFn: async ({ cuota_id, dias_atraso }: { cuota_id: string, dias_atraso: number }) => {
      const { data, error } = await supabase.rpc('diferir_vencimiento_cuota', { 
        p_cuota_id: cuota_id, 
        p_dias_atraso: dias_atraso 
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Cronograma actualizado');
      queryClient.invalidateQueries({ queryKey: ['prestamos'] });
      queryClient.invalidateQueries({ queryKey: ['cuotas'] });
    },
    onError: (error) => {
      toast.error('Error al diferir cuota: ' + error.message);
    }
  });

  return {
    ...query,
    prestamos: query.data || [],
    updatePrestamo: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    createPrestamo: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    liquidarPrestamo: liquidarMutation.mutateAsync,
    isLiquidando: liquidarMutation.isPending,
    refinanciarPrestamo: refinanciarMutation.mutateAsync,
    isRefinanciando: refinanciarMutation.isPending,
    extenderPrestamo: extenderMutation.mutateAsync,
    isExtendiendo: extenderMutation.isPending,
    diferirCuota: diferirCuotaMutation.mutateAsync,
    isDiriendo: diferirCuotaMutation.isPending,
  };
}
