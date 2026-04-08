import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface CapitalMovimiento {
  id: string;
  tipo: 'ingreso_por_pago' | 'egreso_por_prestamo' | 'aporte_inicial' | 'retiro' | 'ingreso_por_recaudacion';
  monto: number;
  fecha: string;
  referencia_id: string | null;
  descripcion: string | null;
  perfiles?: {
    email: string;
  };
}

export function useCapital() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['capital'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital')
        .select(`
          *,
          perfiles (
            email
          )
        `)
        .order('fecha', { ascending: false });

      if (error) {
        toast.error('Error al cargar flujo de capital');
        throw error;
      }
      return data as CapitalMovimiento[];
    }
  });

  const registrarMovimiento = useMutation({
    mutationFn: async ({ tipo, monto, descripcion }: { tipo: string, monto: number, descripcion: string }) => {
      const { error } = await supabase.from('capital').insert({
        tipo,
        monto,
        descripcion,
        usuario_id: (await supabase.auth.getUser()).data.user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Movimiento registrado');
      queryClient.invalidateQueries({ queryKey: ['capital'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: any) => {
      toast.error('Error registrando movimiento: ' + e.message);
    }
  });

  return {
    ...query,
    movimientos: query.data || [],
    registrarMovimiento: registrarMovimiento.mutateAsync,
    isRegistering: registrarMovimiento.isPending
  };
}
