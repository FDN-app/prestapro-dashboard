import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Cliente {
  id: string;
  nombre_completo: string;
  dni: string;
  telefono: string;
  direccion: string | null;
  notas: string | null;
  telegram_chat_id?: string | null;
  estado: 'activo' | 'inactivo';
  creado_en: string;
}

export interface ClienteConSaldos extends Cliente {
  activeLoans: number;
  totalBalance: number;
  status: 'al_dia' | 'atraso' | 'pagado'; // computed
  name: string; // Helper for legacy UI
  phone: string; // Helper for legacy UI
  prestamos?: any[];
}

export function useClientes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      // Fetch clients and their loans
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          prestamos ( 
            *, 
            cuotas ( estado ) 
          )
        `)
        .order('nombre_completo');

      if (error) {
        toast.error('Error al cargar clientes');
        throw error;
      }

      // Map to add computed fields
      return (data || []).map((c: any): ClienteConSaldos => {
        const prestamos: any[] = c.prestamos || [];
        const activeLoansCount = prestamos.filter(p => !['pagado', 'liquidado'].includes(p.estado)).length;
        const totalPending = prestamos.reduce((sum, p) => sum + Number(p.saldo_pendiente), 0);
        
        let generalStatus: 'al_dia' | 'atraso' | 'pagado' = 'pagado';
        if (activeLoansCount > 0) {
           // Si algún préstamo está en mora o alguna de las cuotas de algún prestamo activo está atrasada (mora)
           // For simplicity, just use the loan's state if it's explicitly 'mora'.
          generalStatus = prestamos.some(p => p.estado === 'mora') ? 'atraso' : 'al_dia';
        }

        return {
          ...c,
          name: c.nombre_completo,
          phone: c.telefono,
          activeLoans: activeLoansCount,
          totalBalance: totalPending,
          status: generalStatus,
        };
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (nuevoCliente: Omit<Cliente, 'id' | 'creado_en' | 'estado'>) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          ...nuevoCliente,
          estado: 'activo'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Cliente creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      toast.error('Error al crear el cliente: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Cliente> }) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Cliente actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error) => {
      toast.error('Error al actualizar el cliente: ' + error.message);
    }
  });

  return {
    ...query,
    clientes: query.data || [],
    createCliente: createMutation.mutateAsync,
    updateCliente: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending
  };
}
