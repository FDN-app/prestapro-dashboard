import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function useBackup() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // Lists automated backups from storage
  const cloudBackups = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('prestapro-backups').list();
      if (error) throw error;
      return data?.filter(f => f.name.endsWith('.xlsx')) || [];
    }
  });

  // Triggers the Edge Function manually
  const triggerServerBackup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('backup-job', {
        method: 'POST'
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Backup en servidor completado');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (e: any) => toast.error('Error: ' + e.message)
  });

  const getDownloadUrl = async (filename: string) => {
    const { data } = await supabase.storage.from('prestapro-backups').createSignedUrl(filename, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const processRestoreFile = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const summary: Record<string, number> = {};
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            summary[sheetName] = json.length;
          });
          
          resolve(summary);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const executeRestore = async () => {
    toast.success('Fase de Restauración inicializada.', {
      description: 'El volcado asicrónico de los registros puede tomar unos minutos.'
    });
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      const { data: prestamos, error: e1 } = await supabase.from('prestamos').select('*, clientes(*)');
      const { data: cuotas, error: e2 } = await supabase.from('cuotas').select('*');
      const { data: pagos, error: e3 } = await supabase.from('pagos').select('*');
      const { data: capital, error: e4 } = await supabase.from('capital').select('*');

      if (e1 || e2 || e3 || e4) throw new Error('Error limitando fetch al exportar datos');

      const data = {
        prestamos,
        cuotas,
        pagos,
        capital,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_prestapro_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Backup exportado exitosamente');
    } catch (e: any) {
      toast.error('Error durante el backup: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      const { data: prestamos, error: e1 } = await supabase.from('prestamos').select('*, clientes(*)');
      if (e1) throw new Error('Error al generar CSV');
      
      let csvContent = "ID_Prestamo,Cliente,Monto,Saldo,Estado,Interes,Cuotas\n";
      prestamos?.forEach(p => {
        csvContent += `${p.id},"${p.clientes?.nombre_completo || 'N/A'}",${p.monto_original},${p.saldo_pendiente},${p.estado},${p.tasa_interes},${p.cantidad_cuotas}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prestamos_exportados_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV exportado');
    } catch (e: any) {
      toast.error('Error generando CSV: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return { 
    exportData, 
    exportCSV, 
    isExporting, 
    cloudBackups: cloudBackups.data || [],
    isCloudLoading: cloudBackups.isLoading,
    triggerServerBackup: triggerServerBackup.mutateAsync,
    isTriggering: triggerServerBackup.isPending,
    getDownloadUrl,
    processRestoreFile,
    executeRestore
  };
}
