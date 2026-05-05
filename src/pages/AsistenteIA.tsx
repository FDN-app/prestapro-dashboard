import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Message = {
  role: 'assistant',
  content:
    'Hola, soy tu asistente de PrestaPro. Podés preguntarme sobre tu cartera: quién debe más, cuotas vencidas, estado de un cliente, riesgos, cobranzas de la semana... ¿En qué te ayudo?',
};

async function buildCarteraContext(): Promise<string> {
  const today = new Date();
  const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split('T')[0];
  const weekLaterStr = weekLater.toISOString().split('T')[0];

  const [{ data: prestamos }, { data: cuotasVencidas }, { data: cuotasSemana }, { data: topDeudores }] =
    await Promise.all([
      supabase.from('prestamos').select('saldo_pendiente').eq('estado', 'activo'),
      supabase
        .from('cuotas')
        .select('monto_cuota, monto_cobrado, prestamos(clientes(nombre_completo))')
        .eq('estado', 'vencida'),
      supabase
        .from('cuotas')
        .select('monto_cuota')
        .eq('estado', 'pendiente')
        .gte('fecha_vencimiento', todayStr)
        .lte('fecha_vencimiento', weekLaterStr),
      supabase
        .from('prestamos')
        .select('saldo_pendiente, clientes(nombre_completo)')
        .eq('estado', 'activo')
        .order('saldo_pendiente', { ascending: false })
        .limit(5),
    ]);

  const totalPrestamos = prestamos?.length ?? 0;
  const totalSaldo = prestamos?.reduce((s, p) => s + (p.saldo_pendiente ?? 0), 0) ?? 0;
  const totalVencidas = cuotasVencidas?.length ?? 0;
  const montoVencido =
    cuotasVencidas?.reduce((s, c) => s + ((c.monto_cuota ?? 0) - (c.monto_cobrado ?? 0)), 0) ?? 0;
  const totalSemana = cuotasSemana?.length ?? 0;
  const montoSemana = cuotasSemana?.reduce((s, c) => s + (c.monto_cuota ?? 0), 0) ?? 0;

  const topText =
    (topDeudores as any[])
      ?.map(
        (p, i) =>
          `  ${i + 1}. ${(p.clientes as any)?.nombre_completo ?? 'N/A'}: $${Number(p.saldo_pendiente).toLocaleString('es-AR')}`
      )
      .join('\n') ?? '  (sin datos)';

  return `RESUMEN DE CARTERA (${today.toLocaleDateString('es-AR')}):
- Préstamos activos: ${totalPrestamos}
- Saldo total pendiente: $${totalSaldo.toLocaleString('es-AR')}
- Cuotas vencidas sin pagar: ${totalVencidas} (monto acumulado: $${montoVencido.toLocaleString('es-AR')})
- Cuotas a cobrar próximos 7 días: ${totalSemana} (monto esperado: $${montoSemana.toLocaleString('es-AR')})
- Top 5 mayores deudores por saldo pendiente:
${topText}`;
}

export default function AsistenteIA() {
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isAdmin) return <Navigate to="/cobros-pendientes" replace />;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const context = await buildCarteraContext();

      // Skip the initial hardcoded greeting (index 0) when building API history
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const apiMessages = [...history, { role: userMsg.role, content: userMsg.content }];

      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: 1024,
          messages: [
            {
              role: 'system',
              content: `Sos el asistente financiero de PrestaPro, una app de gestión de préstamos en Argentina. Respondé en español rioplatense, de forma concisa y útil. Usá el siguiente resumen actualizado de la cartera para dar respuestas precisas:\n\n${context}`,
            },
            ...apiMessages,
          ],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? 'No pude generar una respuesta.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('AsistenteIA error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Ocurrió un error al consultar el asistente. Verificá tu conexión o la configuración de la API key.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 max-w-3xl mx-auto w-full h-[calc(100dvh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Asistente IA 🤖</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Consultá sobre tu cartera de préstamos</p>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card/40 backdrop-blur-sm p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                msg.role === 'assistant'
                  ? 'bg-primary/20 border-primary/30 text-primary'
                  : 'bg-secondary border-border text-muted-foreground'
              }`}
            >
              {msg.role === 'assistant' ? <Bot size={15} /> : <User size={15} />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-secondary/50 text-foreground border border-border/40 rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Bot size={15} />
            </div>
            <div className="bg-secondary/50 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) sendMessage();
          }}
          placeholder="Escribí tu consulta..."
          disabled={isTyping}
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={isTyping || !input.trim()}
          className="shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-all"
        >
          <Send size={15} />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>
    </div>
  );
}
