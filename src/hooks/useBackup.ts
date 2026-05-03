import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function useBackup() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingSebas, setIsDownloadingSebas] = useState(false);

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
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        method: 'POST'
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Backup en servidor completado');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (e: any) => toast.error('Error: ' + (e?.message || String(e)))
  });

  const getDownloadUrl = async (filename: string) => {
    try {
      const { data, error } = await supabase.storage.from('backups').createSignedUrl(`xlsx/${filename}`, 60);
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
      toast.error('Error de descarga: ' + (e?.message || String(e)));
    }
  };

  const downloadSebastianFormat = async () => {
    setIsDownloadingSebas(true);
    const loadingId = toast.loading('Generando Excel Formato Sebastián...');
    try {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        method: 'POST',
        query: { mode: 'download', formato: 'sebastian' }
      });
      
      if (error) throw error;
      
      // If it returned a blob (when using functions-js, sometimes we need to handle it differently)
      // But we can just use the public URL or signed url if it's already saved, but the edge function returns the file
      // Supabase invoke might not handle binary response cleanly. Let's do a direct fetch if needed, 
      // or we can use the signed URL since the edge function saves it!
      // Actually, if mode=download, edge function returns binary. `supabase.functions.invoke` parses JSON by default.
      // We can use a direct fetch or signed url.
      // Let's use direct fetch with the auth header.
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-manager?mode=download&formato=sebastian`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error en la descarga del Excel');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Formato_Sebastian_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      
      toast.success('Excel descargado correctamente', { id: loadingId });
    } catch (e: any) {
      toast.error('Error generando Excel: ' + (e?.message || String(e)), { id: loadingId });
    } finally {
      setIsDownloadingSebas(false);
    }
  };

  const processRestoreFile = async (file: File): Promise<Record<string, any[]>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const result: Record<string, any[]> = {};
          const expectedSheets = ['Clientes', 'Préstamos', 'Cuotas', 'Pagos'];
          
          expectedSheets.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
              throw new Error(`La hoja "${sheetName}" es obligatoria y no se encontró en el archivo.`);
            }
            result[sheetName] = XLSX.utils.sheet_to_json(worksheet);
          });
          
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const executeRestore = async (file: File) => {
    const loadingId = toast.loading('Iniciando restauración crítica...', {
      description: 'Validando integridad referencial...'
    });
    
    try {
      // 1. Parsear y obtener datos del Excel
      const data = await processRestoreFile(file);

      // 2. Llamada RPC atómica al motor de base de datos
      const { error } = await supabase.rpc('restaurar_ecosistema_completo', {
        p_clientes: data['Clientes'],
        p_prestamos: data['Préstamos'],
        p_cuotas: data['Cuotas'],
        p_pagos: data['Pagos']
      });

      if (error) throw new Error(error.message);

      toast.success('Restauración exitosa', {
        id: loadingId,
        description: 'El sistema ha sido restablecido al estado del backup.'
      });
      
      queryClient.invalidateQueries();
    } catch (e: any) {
      toast.error('Fallo en la restauración', {
        id: loadingId,
        description: e?.message || String(e)
      });
    }
  };

  const uploadSebastianExcel = async (file: File, accion: 'preview' | 'reemplazar' | 'agregar'): Promise<any> => {
    const loadingId = toast.loading(accion === 'preview' ? 'Analizando archivo...' : 'Importando archivo original...');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accion', accion);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/importar-excel-sebastian`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error en la petición');

      if (accion !== 'preview') {
        toast.success(accion === 'reemplazar' ? 'Base reemplazada con éxito' : 'Datos agregados con éxito', { id: loadingId });
        queryClient.invalidateQueries();
      } else {
        toast.dismiss(loadingId);
      }

      return result;
    } catch (e: any) {
      toast.error('Error procesando Excel: ' + (e?.message || String(e)), { id: loadingId });
      throw e;
    }
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
      toast.error('Error durante el backup: ' + (e?.message || String(e)));
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
        { data: pagos },
        { data: capital },
        { data: auditoria }
      ] = await Promise.all([
        supabase.from('clientes').select('nombre_completo, dni, telefono, direccion, estado, creado_en').order('nombre_completo'),
        supabase.from('prestamos').select('id, cliente_id, clientes(nombre_completo), monto_original, tasa_interes, cantidad_cuotas, frecuencia_pago, fecha_inicio, estado').order('fecha_inicio'),
        supabase.from('cuotas').select('id, prestamo_id, prestamos(clientes(nombre_completo)), numero_cuota, monto_cuota, fecha_vencimiento, estado, monto_cobrado, fecha_pago').order('fecha_vencimiento'),
        supabase.from('pagos').select('id, prestamo_id, cuota_id, prestamos(clientes(nombre_completo)), fecha_pago, monto_pagado, cobrador:perfiles(email)').order('fecha_pago'),
        supabase.from('capital').select('fecha, tipo, monto, descripcion').order('fecha', { ascending: false }),
        supabase.from('auditoria').select('created_at, usuario:perfiles(email), tabla_afectada, accion, detalle').order('created_at', { ascending: false })
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
        'Préstamo ID': p.prestamo_id?.split('-')[0] || '-',
        'Fecha Pago': new Date(p.fecha_pago).toLocaleString(),
        'Monto': Number(p.monto_pagado),
        'Registrado Por': (p.cobrador as any)?.email || 'Admin'
      })) || [];

      const capitalSheet = capital?.map(c => ({
        'Fecha': new Date(c.fecha).toLocaleString(),
        'Tipo': c.tipo,
        'Monto': Number(c.monto),
        'Descripción': c.descripcion || '-'
      })) || [];

      const auditSheet = auditoria?.map(a => ({
        'Fecha': new Date(a.created_at).toLocaleString(),
        'Usuario': (a.usuario as any)?.email || 'Sistema',
        'Módulo': a.tabla_afectada,
        'Acción': a.accion,
        'Detalle': a.detalle
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
      addSheet(capitalSheet, 'Flujo Capital');
      addSheet(auditSheet, 'Auditoría');

      XLSX.writeFile(wb, `Planilla_PrestaPro_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel profesional exportado');
    } catch (e: any) {
      toast.error('Error exportando Excel: ' + (e?.message || String(e)));
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
    downloadSebastianFormat,
    isDownloadingSebas,
    processRestoreFile,
    executeRestore,
    uploadSebastianExcel
  };
}
