import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AuditLogEntry {
  id: string;
  usuario_id: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalles: any;
  fecha: string;
  perfiles?: {
    email: string;
  };
}

export function useAuditoria() {
  const query = useQuery({
    queryKey: ['auditoria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('log_auditoria')
        .select(`
          *,
          perfiles (
            email
          )
        `)
        .order('fecha', { ascending: false })
        .limit(200);

      if (error) {
        toast.error('Error al cargar auditoría');
        throw error;
      }
      return data as AuditLogEntry[];
    }
  });

  return {
    ...query,
    logs: query.data || []
  };
}
