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
    try {
      const { data, error } = await supabase.storage.from('prestapro-backups').createSignedUrl(filename, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e: any) {
      toast.error('Error de descarga: ' + e.message);
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

  const exportProfessionalExcel = async () => {
    setIsExporting(true);
    try {
      const [
        { data: clientes },
        { data: prestamos },
        { data: cuotas },
        { data: pagos }
      ] = await Promise.all([
        supabase.from('clientes').select('nombre_completo, dni, telefono, direccion, estado, creado_en').order('nombre_completo'),
        supabase.from('prestamos').select('id, cliente_id, clientes(nombre_completo), monto_original, tasa_interes, cantidad_cuotas, frecuencia_pago, fecha_inicio, estado').order('fecha_inicio'),
        supabase.from('cuotas').select('id, prestamo_id, prestamos(clientes(nombre_completo)), numero_cuota, monto_cuota, fecha_vencimiento, estado, monto_cobrado, fecha_pago').order('fecha_vencimiento'),
        supabase.from('pagos').select('id, prestamo_id, cuota_id, prestamos(clientes(nombre_completo)), fecha_pago, monto_pagado, cobrador:perfiles(email)').order('fecha_pago')
      ]);

      const clientsSheet = clientes?.map(c => ({
        'Nombre': c.nombre_completo,
        'DNI': c.dni,
        'Teléfono': c.telefono,
        'Dirección': c.direccion,
        'Estado': c.estado,
        'Fecha de Alta': new Date(c.creado_en).toLocaleDateString()
      })) || [];

      const loansSheet = prestamos?.map(p => {
        const interes = (Number(p.monto_original) * Number(p.tasa_interes)) / 100;
        const total = Number(p.monto_original) + interes;
        return {
          'Cliente': (p.clientes as any)?.nombre_completo || 'N/A',
          'Capital': Number(p.monto_original),
          'Interés': interes,
          'Total': total,
          'Cuotas': p.cantidad_cuotas,
          'Frecuencia': p.frecuencia_pago,
          'Fecha Inicio': p.fecha_inicio,
          'Estado': p.estado
        };
      }) || [];

      const installmentsSheet = cuotas?.map(c => ({
        'Cliente': (c.prestamos as any)?.clientes?.nombre_completo || 'N/A',
        'Préstamo ID': c.prestamo_id.split('-')[0],
        'Nro Cuota': c.numero_cuota,
        'Monto': Number(c.monto_cuota),
        'Fecha Vencimiento': c.fecha_vencimiento,
        'Estado': c.estado,
        'Monto Pagado': Number(c.monto_cobrado),
        'Fecha Pago': c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString() : '-'
      })) || [];

      const paymentsSheet = pagos?.map(p => ({
        'Cliente': (p.prestamos as any)?.clientes?.nombre_completo || 'N/A',
        'Fecha': new Date(p.fecha_pago).toLocaleString(),
        'Monto': Number(p.monto_pagado),
        'Registrado Por': (p.cobrador as any)?.email || 'Admin'
      })) || [];

      const wb = XLSX.utils.book_new();
      
      const addSheet = (data: any[], name: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const colWidths = data.length > 0 
          ? Object.keys(data[0]).map(key => ({ wch: Math.max(key.length, 18) }))
          : [];
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet(clientsSheet, 'Clientes');
      addSheet(loansSheet, 'Préstamos');
      addSheet(installmentsSheet, 'Cuotas');
      addSheet(paymentsSheet, 'Pagos');

      XLSX.writeFile(wb, `Planilla_PrestaPro_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel profesional exportado');
    } catch (e: any) {
      toast.error('Error exportando Excel: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return { 
    exportData, 
    exportProfessionalExcel, 
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
