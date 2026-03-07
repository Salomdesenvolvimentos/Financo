// ============================================
// FINACO - Componente: IA Financeira ChatBot
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  TrendingUp,
  PiggyBank,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { aiChatBot } from '@/services/ai-chatbot-openai';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tipos
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type AIInsight = {
  id: string;
  type: 'warning' | 'success' | 'info' | 'tip' | 'analysis' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  timestamp: Date;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Renderizador de Markdown leve
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        // Linha vazia
        if (!line.trim()) return <div key={i} className="h-2" />;

        // Renderiza **negrito** inline
        const renderInline = (raw: string) => {
          const parts = raw.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          );
        };

        // Item de lista
        if (/^[-•]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(line.replace(/^[-•]\s/, ''))}</span>
            </div>
          );
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Indicador de digitação
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sugestões rápidas
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const QUICK_ACTIONS = [
  { icon: TrendingUp, label: 'Saúde financeira',  text: 'Como está minha saúde financeira este mês?' },
  { icon: PiggyBank,  label: 'Economizar',         text: 'Onde posso economizar mais?' },
  { icon: BarChart3,  label: 'Análise do mês',     text: 'Faça uma análise completa do meu mês.' },
  { icon: Zap,        label: 'Dica rápida',        text: 'Me dê uma dica financeira personalizada.' },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Componente principal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen]           = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [hasHighInsight, setHasHighInsight] = useState(false);
  const [apiReady, setApiReady]       = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const currentDate    = useRef(new Date());

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Inicializar ao abrir
  const initialize = useCallback(async () => {
    if (!user || messages.length > 0) return;

    const { success } = await aiChatBot.testConnection();
    setApiReady(success);

    try {
      const context = await aiChatBot.getFinancialContext(
        user.id,
        currentDate.current.getFullYear(),
        currentDate.current.getMonth() + 1
      );
      const insights = await aiChatBot.generateInsights(context);
      setHasHighInsight(insights.some(i => i.priority === 'high'));

      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const monthName = monthNames[context.month - 1];

      let welcome = `Olá! 👋 Sou o **Financo AI**, seu assistente financeiro.\n\n`;
      if (insights.length > 0) {
        welcome += `📊 **Destaques de ${monthName}:**\n`;
        insights.forEach(i => { welcome += `${i.title}: ${i.content}\n`; });
        welcome += `\nComo posso ajudar você hoje?`;
      } else {
        welcome += `Estou pronto para analisar suas finanças de ${monthName}. Pergunte o que quiser!`;
      }

      setMessages([{ id: 'welcome', role: 'assistant', content: welcome, timestamp: new Date() }]);
    } catch {
      setMessages([{
        id: 'welcome', role: 'assistant',
        content: 'Olá! 👋 Sou o **Financo AI**. Estou pronto para ajudar com suas finanças. O que deseja saber?',
        timestamp: new Date()
      }]);
    }
  }, [user, messages.length]);

  useEffect(() => {
    if (isOpen) initialize();
  }, [isOpen, initialize]);

  // Enviar mensagem
  const handleSend = async (text?: string) => {
    const msg = (text ?? inputMessage).trim();
    if (!msg || !user || isLoading) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date()
    }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const context = await aiChatBot.getFinancialContext(
        user.id,
        currentDate.current.getFullYear(),
        currentDate.current.getMonth() + 1
      );
      const response = await aiChatBot.processMessage(user.id, msg, context);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Não consegui processar sua mensagem. Tente novamente em instantes.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // â”€â”€ Botão flutuante â”€â”€
  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-5 z-50 flex flex-col items-center gap-2">
        {/* Tooltip */}
        <div className="bg-[#0f172a] text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none select-none"
          style={{ animation: 'fadeInUp 0.5s ease 1s both' }}>
          Financo AI
        </div>

        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Financo AI"
          className="relative group w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
        >
          {/* Anel pulsante */}
          <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" style={{ animationDuration: '2s' }} />
          <Sparkles className="w-6 h-6 text-white relative z-10" />

          {/* Badge alerta */}
          {hasHighInsight && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0f1e] flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
            </span>
          )}
        </button>
      </div>
    );
  }

  // â”€â”€ Painel do chat â”€â”€
  return (
    <div
      className="fixed bottom-6 right-5 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      style={{
        width: '26rem',
        maxWidth: 'calc(100vw - 1.5rem)',
        height: isMinimized ? 'auto' : '600px',
        maxHeight: 'calc(100vh - 2rem)',
        background: '#0e1525',
      }}
    >
      {/* â”€â”€ Header â”€â”€ */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #312e81 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar IA */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Financo AI</p>
            <p className="text-[10px] text-blue-300 mt-0.5 leading-none flex items-center gap-1">
              {apiReady === null && <><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block animate-pulse" /> verificando...</>}
              {apiReady === true  && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> gpt-4o-mini · online</>}
              {apiReady === false && <><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> sem conexão</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* â”€â”€ Mensagens â”€â”€ */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a8a transparent' }}>

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* Avatar IA */}
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'text-white rounded-tr-sm'
                    : 'text-slate-100 rounded-tl-sm'
                  }`}
                  style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }
                    : { background: '#172033', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  {msg.role === 'assistant'
                    ? <MarkdownText text={msg.content} />
                    : <p className="text-sm leading-relaxed">{msg.content}</p>
                  }
                  <p className="text-[10px] opacity-40 mt-1.5 text-right">
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Indicador digitando */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3"
                  style={{ background: '#172033', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* â”€â”€ Quick actions â”€â”€ */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0"
            style={{ scrollbarWidth: 'none' }}>
            {QUICK_ACTIONS.map(({ icon: Icon, label, text }) => (
              <button
                key={label}
                onClick={() => handleSend(text)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150 disabled:opacity-40"
                style={{
                  background: 'rgba(37,99,235,0.12)',
                  border: '1px solid rgba(37,99,235,0.3)',
                  color: '#93c5fd',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.12)')}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* â”€â”€ Input â”€â”€ */}
          <div className="px-4 pb-4 pt-2 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-2 items-center rounded-xl px-3 py-1.5"
              style={{ background: '#172033', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pergunte sobre suas finanças..."
                disabled={isLoading}
                className="flex-1 border-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-9"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || isLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
                aria-label="Enviar"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 text-center">Enter para enviar · gpt-4o-mini</p>
          </div>
        </>
      )}
    </div>
  );
}

