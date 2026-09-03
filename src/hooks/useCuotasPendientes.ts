import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface CuotaPendiente {
  id: string;
  numero_cuota: number;
  monto_cuota: number;
  monto_cobrado: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'parcial' | 'vencida';
  prestamos: {
    id: string;
    estado: string;
    clientes: {
      id: string;
      nombre_completo: string;
    } | null;
  } | null;
}

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
      return data as CuotaPendiente[];
    }
  });

  return {
    ...query,
    pendientes: query.data || []
  };
}
