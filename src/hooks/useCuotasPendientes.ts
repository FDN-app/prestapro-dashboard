import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useCuotasPendientes() {
  const query = useQuery({
    queryKey: ['cuotas_pendientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cuotas')
        .select(`
          *,
          prestamos (
            id,
            estado,
            clientes (
              id,
              nombre_completo
            )
          )
        `)
        .in('estado', ['pendiente', 'parcial', 'vencida'])
        .order('fecha_vencimiento', { ascending: true });

      if (error) {
        toast.error('Error al cargar cobros pendientes');
        throw error;
      }
      return data;
    }
  });

  return {
    ...query,
    pendientes: query.data || []
  };
}
