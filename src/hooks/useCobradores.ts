import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Perfil {
  id: string;
  email: string;
  rol: 'admin' | 'cobrador';
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

  const createCobrador = useMutation({
    mutationFn: async ({ email, password }: any) => {
      // Registrar usuario. Nota: en Supabase normal esto autologuea al cobrador destituyendo al admin.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            rol: 'cobrador'
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
      // Forzamos un deslogueo en 3 seg para que el admin no interactue como cobrador
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
    isCreating: createCobrador.isPending
  };
}
