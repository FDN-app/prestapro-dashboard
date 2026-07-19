import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function NewClient() {
  const navigate = useNavigate();
  const { createCliente, isCreating } = useClientes();
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    dni: '',
    telefono: '',
    direccion: '',
    notas: ''
  });

  const handleSubmit = async () => {
    if (!formData.nombre_completo || !formData.telefono) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }
    
    setCheckingDuplicate(true);
    try {
      // Verificar si ya existe un cliente con el mismo nombre (case-insensitive)
      const { data, error } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nombre_completo', formData.nombre_completo);

      if (error) throw error;

      if (data && data.length > 0) {
        setShowDuplicateDialog(true);
        setCheckingDuplicate(false);
      } else {
        await proceedWithCreation();
      }
    } catch (e: any) {
      toast.error('Error al verificar clientes duplicados: ' + e.message);
      setCheckingDuplicate(false);
    }
  };

  const proceedWithCreation = async () => {
    try {
      await createCliente(formData);
      navigate('/clientes');
    } catch (e) {
      // toast is handled in the hook
    } finally {
      setCheckingDuplicate(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </button>
      <h2 className="text-xl font-bold">Nuevo Cliente</h2>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4 max-w-lg">
        <div className="space-y-2">
          <Label>Nombre completo *</Label>
          <Input 
            value={formData.nombre_completo} 
            onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })} 
            placeholder="Nombre y apellido" 
          />
        </div>
        <div className="space-y-2">
          <Label>DNI / Documento</Label>
          <Input 
            value={formData.dni} 
            onChange={e => setFormData({ ...formData, dni: e.target.value })} 
            placeholder="30.000.000" 
          />
        </div>
        <div className="space-y-2">
          <Label>Teléfono *</Label>
          <Input 
            value={formData.telefono} 
            onChange={e => setFormData({ ...formData, telefono: e.target.value })} 
            placeholder="+54 11 5555-0000" 
          />
        </div>
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Input 
            value={formData.direccion} 
            onChange={e => setFormData({ ...formData, direccion: e.target.value })} 
            placeholder="Dirección completa" 
          />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea 
            value={formData.notas} 
            onChange={e => setFormData({ ...formData, notas: e.target.value })} 
            placeholder="Notas opcionales..." 
          />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={isCreating || checkingDuplicate}>
          {isCreating || checkingDuplicate ? 'Guardando...' : 'Guardar Cliente'}
        </Button>
      </div>

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advertencia: Nombre duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe un cliente con el nombre <span className="font-semibold text-foreground">"{formData.nombre_completo}"</span>. ¿Querés crearlo igual o cancelar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDuplicateDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              setShowDuplicateDialog(false);
              setCheckingDuplicate(true);
              await proceedWithCreation();
            }}>
              Crear igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
