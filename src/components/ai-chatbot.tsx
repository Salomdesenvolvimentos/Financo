// ============================================
// FINACO - Componente: IA Financeira ChatBot
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Minus, 
  Send, 
  MessageCircle, 
  X, 
  Bot, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Brain, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { aiChatBot } from '@/services/ai-chatbot-openai';
import Image from 'next/image';

// Tipos importados do serviço
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

export function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar insights iniciais
  useEffect(() => {
    if (user && isOpen) {
      testAPIConnection();
      loadInitialInsights();
    }
  }, [user, isOpen]);

  // Testar conexão com API
  const testAPIConnection = async () => {
    setApiStatus('checking');
    const result = await aiChatBot.testConnection();
    setApiStatus(result.success ? 'connected' : 'error');
    
    if (!result.success) {
      console.error('Erro na API:', result.error);
    }
  };

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Carregar insights iniciais
  const loadInitialInsights = async () => {
    if (!user) return;

    try {
      const context = await aiChatBot.getFinancialContext(
        user.id,
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
      
      const newInsights = await aiChatBot.generateInsights(context);
      setInsights(newInsights);

      // Adicionar mensagem de boas-vindas com insights
      if (newInsights.length > 0) {
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant' as const,
          content: `Olá! 👋 Sou o Financo AI, seu assistente financeiro pessoal.\n\n📊 **Análise Rápida de ${context.month}:**\n\n${newInsights.map(insight => 
            `**${insight.title}**\n${insight.content}\n`
          ).join('\n')}\n\nComo posso ajudar você hoje?`,
          timestamp: new Date()
        };
        
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
    }
  };

  // Enviar mensagem
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const context = await aiChatBot.getFinancialContext(
        user.id,
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );

      const response = await aiChatBot.processMessage(user.id, inputMessage, context);

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Desculpe, estou com dificuldades para processar sua solicitação. Tente novamente.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Lidar com Enter no input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Obter ícone do insight
  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4" />;
      case 'analysis':
        return <TrendingUp className="h-4 w-4" />;
      case 'recommendation':
        return <Brain className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  // Obter cor do insight
  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-danger/10 text-danger border-danger';
      case 'tip':
        return 'bg-warning/10 text-warning border-warning';
      case 'analysis':
        return 'bg-success/10 text-success border-success';
      case 'recommendation':
        return 'bg-primary/10 text-primary border-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!isOpen) {
    // Botão flutuante
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 p-0"
        >
          <div className="relative w-10 h-10">
            <Image
              src="/Financo_chat.png"
              alt="Financo AI"
              fill
              className="rounded-full object-cover"
            />
          </div>
        </Button>
        
        {/* Badge com insights */}
        {insights.filter(i => i.priority === 'high').length > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-xl border-2">
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-primary to-primary/80 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/Financo_chat.png"
                  alt="Financo AI"
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <CardTitle className="text-lg">Financo AI</CardTitle>
              
              {/* Status da API */}
              <div className="flex items-center gap-1">
                {apiStatus === 'checking' && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
                {apiStatus === 'connected' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
                {apiStatus === 'error' && (
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              
              {insights.filter(i => i.priority === 'high').length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full animate-pulse flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {insights.filter(i => i.priority === 'high').length}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0">
            {/* Insights */}
            {insights.length > 0 && (
              <div className="p-3 border-b bg-muted/30">
                <div className="text-sm font-medium mb-2">Insights Rápidos</div>
                <div className="space-y-2">
                  {insights.slice(0, 2).map((insight, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg border text-xs ${getInsightColor(insight.type)}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {getInsightIcon(insight.type)}
                        <span className="font-medium">{insight.title}</span>
                      </div>
                      <div>{insight.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagens */}
            <div className="h-96 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="relative w-8 h-8 flex-shrink-0">
                        <Image
                          src="/Financo_chat.png"
                          alt="Financo AI"
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image
                        src="/Financo_chat.png"
                        alt="Financo AI"
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span className="text-sm">Analisando...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pergunte sobre suas finanças..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Sugestões rápidas */}
              <div className="flex flex-wrap gap-1 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Como está minha saúde financeira?')}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  Saúde Financeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Onde posso economizar?')}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  Dicas de Economia
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage('Análise do mês')}
                  disabled={isLoading}
                  className="text-xs h-7"
                >
                  Análise Mensal
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
