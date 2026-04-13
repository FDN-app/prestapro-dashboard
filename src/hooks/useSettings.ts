import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Settings {
  id: string;
  nombre_negocio: string;
  telefono: string;
  mora_porcentaje_default: number;
  dias_recordatorio: number;
  moneda: string;
  telegram_bot_token?: string;
  telegram_alertas_activas?: boolean;
  telegram_dias_recordatorio?: number;
  telegram_chat_id?: string;
}

export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings_empresa')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as Settings;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      if (!query.data?.id) throw new Error('No setting ID found');
      const { data, error } = await supabase
        .from('settings_empresa')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', query.data.id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Configuración guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => {
      toast.error('Error al guardar: ' + e.message);
    }
  });

  return {
    ...query,
    settings: query.data,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
}
