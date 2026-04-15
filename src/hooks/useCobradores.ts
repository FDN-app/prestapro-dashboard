import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Perfil {
  id: string;
  email: string;
  rol: 'admin' | 'cobrador';
  nombre_completo?: string;
  comision_porcentaje?: number;
  creado_en: string;
}

export function useCobradores() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cobradores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('rol', 'cobrador')
        .order('creado_en', { ascending: false });

      if (error) {
        toast.error('Error al cargar cobradores');
        throw error;
      }
      return data as Perfil[];
    }
  });

  const updateCobrador = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { data, error } = await supabase
        .from('perfiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Perfil actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['cobradores'] });
      queryClient.invalidateQueries({ queryKey: ['pagos_admin'] }); // Por si cambia la comision
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    }
  });

  const createCobrador = useMutation({
    mutationFn: async ({ email, password, nombre, comision }: any) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            rol: 'cobrador',
            nombre_completo: nombre,
            comision_porcentaje: comision
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Cobrador creado. Serás desconectado en 3 segundos por seguridad.', {
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['cobradores'] });
      setTimeout(() => {
        window.location.reload(); 
      }, 3000);
    },
    onError: (error) => {
      toast.error('Error al crear: ' + error.message);
    }
  });

  return {
    ...query,
    cobradores: query.data || [],
    createCobrador: createCobrador.mutateAsync,
    isCreating: createCobrador.isPending,
    updateCobrador: updateCobrador.mutateAsync,
    isUpdating: updateCobrador.isPending
  };
}
