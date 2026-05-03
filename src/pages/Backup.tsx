import { useBackup } from '@/hooks/useBackup';
import { Button } from '@/components/ui/button';
import { DownloadCloud, FileSpreadsheet, HardDriveUpload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef } from 'react';

export default function Backup() {
  const { 
    exportData, exportProfessionalExcel, isExporting, 
    cloudBackups, isCloudLoading, triggerServerBackup, isTriggering,
    getDownloadUrl, processRestoreFile, executeRestore,
    downloadSebastianFormat, isDownloadingSebas, uploadSebastianExcel
  } = useBackup();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await processRestoreFile(file);
      const summary: Record<string, number> = {};
      Object.entries(data).forEach(([key, arr]) => {
        summary[key] = Array.isArray(arr) ? arr.length : 0;
      });
      setRestoreSummary(summary);
      setSelectedFile(file);
    } catch (e: any) {
      toast.error('Error leyendo Excel: ' + (e?.message || String(e)));
      setRestoreSummary(null);
      setSelectedFile(null);
    }
    // reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmRestore = () => {
    if (selectedFile) {
      executeRestore(selectedFile);
    }
    setRestoreSummary(null);
    setSelectedFile(null);
  };

  const sebasInputRef = useRef<HTMLInputElement>(null);
  const [sebasSummary, setSebasSummary] = useState<any>(null);
  const [sebasFile, setSebasFile] = useState<File | null>(null);

  const handleSebasUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadSebastianExcel(file, 'preview');
      setSebasSummary(data);
      setSebasFile(file);
    } catch (e) {
      setSebasSummary(null);
      setSebasFile(null);
    }
    if (sebasInputRef.current) sebasInputRef.current.value = '';
  };

  const confirmSebas = async (accion: 'reemplazar' | 'agregar') => {
    if (sebasFile) {
      try {
        await uploadSebastianExcel(sebasFile, accion);
      } catch (e) {
        // Error is handled in hook
      }
    }
    setSebasSummary(null);
    setSebasFile(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold">Resguardo y Auditoría (Backups)</h2>
        <p className="text-muted-foreground text-sm">Política de retención remota de los últimos 7 volcados en Excel o extracción manual JSON/CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* AUTOMATIC SERVER EXCEL BACKUPS */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-6 items-start md:col-span-2 shadow-sm">
          <div className="flex w-full justify-between items-start">
            <div className="flex gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Copias de Seguridad (Excel Centralizado)</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Automáticamente generamos un fichero robusto Excel (.xlsx) con hojas separadas para toda la operatoria. 
                </p>
              </div>
            </div>
            <Button onClick={() => triggerServerBackup()} disabled={isTriggering} className="gap-2">
              <RefreshCw size={16} className={isTriggering ? 'animate-spin' : ''} />
              Forzar Backup Ahora
            </Button>
          </div>

          <div className="w-full bg-background border border-border rounded-md p-2">
            {isCloudLoading ? (
              <p className="text-center text-sm p-4 text-muted-foreground">Sincronizando bucket...</p>
            ) : cloudBackups.length === 0 ? (
              <p className="text-center text-sm p-4 text-muted-foreground">Aún no hay backups remotos.</p>
            ) : (
              <div className="divide-y divide-border">
                {cloudBackups.map(file => (
                  <div key={file.id} className="flex justify-between items-center p-3 text-sm hover:bg-secondary/20">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleString()}</span>
                    <Button variant="ghost" size="sm" onClick={() => getDownloadUrl(file.name)}>Descargar</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full flex flex-col lg:flex-row gap-4 pt-4 border-t border-border/50 items-start lg:items-center">
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Exportación Especial</p>
              <p className="text-xs text-muted-foreground">Genera una planilla completa lista para trabajar, con hojas para Clientes, Préstamos, Cuotas y Pagos.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Button onClick={exportProfessionalExcel} disabled={isExporting} className="gap-2 bg-status-green hover:bg-status-green/90 text-white font-bold px-6">
                <FileSpreadsheet size={18} />
                {isExporting ? 'Generando...' : 'DESCARGAR PLANILLA INTEGRAL (EXCEL)'}
              </Button>
              <Button onClick={downloadSebastianFormat} disabled={isDownloadingSebas} variant="secondary" className="gap-2 px-6">
                {isDownloadingSebas ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                {isDownloadingSebas ? 'Descargando...' : 'Descargar Formato Sebastián'}
              </Button>
            </div>
          </div>
        </div>

        {/* Export JSON Full */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4 items-start shadow-sm">
          <div className="p-3 bg-secondary rounded-full text-muted-foreground">
            <DownloadCloud size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Respaldo Técnico (JSON Crudo)</h3>
            <p className="text-sm text-muted-foreground mt-1">Descarga un volcado completo ideal para migraciones técnicas opcionales.</p>
          </div>
          <Button onClick={exportData} disabled={isExporting} variant="secondary" className="mt-auto w-full">
            Descargar Crudo JSON
          </Button>
        </div>

        {/* RESTAURACION Y CARGA */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4 items-start shadow-sm">
          <div className="p-3 bg-status-red/10 rounded-full text-status-red">
            <HardDriveUpload size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Restaurar Base Temprana</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sube el archivo Excel oficial para iniciar la sobreescritura condicional de la base de datos entera.
            </p>
          </div>

          {!restoreSummary ? (
            <div className="w-full mt-auto">
              <input type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full border-status-red text-status-red hover:bg-status-red hover:text-white">
                Subir Backup a Restaurar
              </Button>
            </div>
          ) : (
            <div className="w-full mt-auto space-y-3 p-4 bg-status-red/5 border border-status-red/20 rounded-lg">
              <p className="text-sm font-semibold text-status-red">Resumen de Importación (Riesgo Crítico):</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {Object.entries(restoreSummary).map(([sheet, count]) => (
                  <li key={sheet}>• Se van a restaurar <strong>{count}</strong> {sheet.toLowerCase()}.</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button className="flex-1 bg-status-red hover:bg-status-red/90 text-white" onClick={confirmRestore}>Ratificar</Button>
                <Button className="flex-1" variant="ghost" onClick={() => setRestoreSummary(null)}>Abortar</Button>
              </div>
            </div>
          )}
        </div>

        {/* IMPORTAR ORIGINAL SEBASTIAN */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4 items-start shadow-sm md:col-span-2">
          <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
            <HardDriveUpload size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Importar Excel Original de Sebastián</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sube la matriz "RC Jorge" original para poblar la base de datos de PrestaPro automáticamente.
            </p>
          </div>

          {!sebasSummary ? (
            <div className="w-full mt-auto flex">
              <input type="file" accept=".xlsx" ref={sebasInputRef} onChange={handleSebasUpload} className="hidden" />
              <Button onClick={() => sebasInputRef.current?.click()} variant="outline" className="w-full lg:w-1/2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">
                Subir Excel de Sebastián
              </Button>
            </div>
          ) : (
            <div className="w-full mt-auto space-y-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <p className="text-sm font-semibold text-blue-600">Resumen de Importación:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Clientes detectados: <strong>{sebasSummary.clientes}</strong></li>
                <li>• Préstamos detectados: <strong>{sebasSummary.prestamos}</strong></li>
                <li>• Pagos detectados: <strong>{sebasSummary.pagos}</strong></li>
                <li>• Cuotas generadas: <strong>{sebasSummary.cuotas}</strong></li>
              </ul>
              <p className="text-xs font-semibold mt-2">¿Qué querés hacer con estos datos?</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Button className="flex-1 bg-status-red hover:bg-status-red/90 text-white" onClick={() => confirmSebas('reemplazar')}>
                  Reemplazar Todo
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => confirmSebas('agregar')}>
                  Agregar a lo Existente
                </Button>
                <Button className="flex-1" variant="ghost" onClick={() => { setSebasSummary(null); setSebasFile(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
