import { useBackup } from '@/hooks/useBackup';
import { Button } from '@/components/ui/button';
import { DownloadCloud, FileSpreadsheet, HardDriveUpload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef } from 'react';

export default function Backup() {
  const { 
    exportData, exportCSV, isExporting, 
    cloudBackups, isCloudLoading, triggerServerBackup, isTriggering,
    getDownloadUrl, processRestoreFile, executeRestore 
  } = useBackup();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const summary = await processRestoreFile(file) as Record<string, number>;
      setRestoreSummary(summary);
    } catch (e: any) {
      toast.error('Error leyendo Excel: ' + e.message);
    }
    // reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmRestore = () => {
    executeRestore();
    setRestoreSummary(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold">Resguardo y Auditoría (Backups)</h2>
        <p className="text-muted-foreground text-sm">Política de retención remota de los últimos 7 volcados en Excel o extracción manual JSON/CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* AUTOMATIC SERVER EXCEL BACKUPS */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4 items-start md:col-span-2 shadow-sm">
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

          <div className="w-full mt-4 bg-background border border-border rounded-md p-2">
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
        </div>

        {/* Export JSON Full */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4 items-start">
          <div className="p-3 bg-secondary rounded-full text-muted-foreground">
            <DownloadCloud size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Respaldo Técnico (JSON Crudo)</h3>
            <p className="text-sm text-muted-foreground mt-1">Descarga un volcado completo ideal para migraciones técnicas opcionales.</p>
          </div>
          <Button onClick={exportData} disabled={isExporting} variant="secondary" className="mt-auto w-full md:w-auto">
            Descargar Crudo JSON
          </Button>
        </div>

        {/* RESTAURACION Y CARGA */}
        <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4 items-start">
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

      </div>
    </div>
  );
}
