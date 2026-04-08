import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Cuota {
  id: string;
  prestamo_id: string;
  numero_cuota: number;
  monto_cuota: number;
  monto_cobrado: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'parcial' | 'pagada' | 'vencida';
  fecha_pago: string | null;
}

export function useCuotas(prestamoId: string | null) {
  const query = useQuery({
    queryKey: ['cuotas', prestamoId],
    queryFn: async () => {
      if (!prestamoId) return [];
      
      const { data, error } = await supabase
        .from('cuotas')
        .select('*')
        .eq('prestamo_id', prestamoId)
        .order('numero_cuota', { ascending: true });

      if (error) {
        toast.error('Error al cargar cuotas');
        throw error;
      }
      return data as Cuota[];
    },
    enabled: !!prestamoId
  });

  return {
    ...query,
    cuotas: query.data || []
  };
}
