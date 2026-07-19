import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('Error al iniciar sesión', { description: error.message });
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, ingresá tu email');
      return;
    }
    setIsSendingReset(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://prestapro-dashboard.vercel.app/reset-password',
    });

    if (error) {
      toast.error('Error al enviar el email de recuperación', { description: error.message });
    } else {
      toast.success('Te enviamos un link a tu email. Revisá también la carpeta de spam.');
      setIsRecovering(false);
    }
    setIsSendingReset(false);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">💰 PrestaPro</h1>
          <p className="text-muted-foreground mt-2">
            {isRecovering ? 'Recuperar contraseña' : 'Tu cartera bajo control'}
          </p>
        </div>

        {isRecovering ? (
          <form onSubmit={handleResetPassword} className="bg-card rounded-lg p-6 border border-border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@prestapro.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSendingReset}>
              {isSendingReset ? 'Enviando...' : 'Enviar link de recuperación'}
            </Button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setIsRecovering(false)}
                className="text-sm text-muted-foreground hover:underline"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="bg-card rounded-lg p-6 border border-border space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@prestapro.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setIsRecovering(true)}
                className="text-sm text-muted-foreground hover:underline text-xs"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Crear cuenta nueva
          </Link>
        </p>
      </div>
    </div>
  );
}
