import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInline, setErrorInline] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInline('');

    if (password !== confirmPassword) {
      setErrorInline('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setErrorInline('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error('Error al actualizar la contraseña', { description: error.message });
      setLoading(false);
    } else {
      // Cerrar la sesión temporal de recuperación para forzar el re-login seguro
      await supabase.auth.signOut();
      toast.success('Contraseña actualizada correctamente');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">💰 PrestaPro</h1>
          <p className="text-muted-foreground mt-2">Restablecer contraseña</p>
        </div>
        <form onSubmit={handleReset} className="bg-card rounded-lg p-6 border border-border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword} 
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (errorInline) setErrorInline('');
              }} 
              required 
            />
            {errorInline && (
              <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50 duration-200">
                {errorInline}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
}
