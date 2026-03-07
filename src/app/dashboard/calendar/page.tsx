// ============================================
// FINACO - Página: Calendário Financeiro
// Visualização de vencimentos e recebimentos mensais
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateMonthCalendar } from '@/services/forecast.local';
import type { CalendarEvent } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  DollarSign,
  CreditCard,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Carregar dados do calendário
  useEffect(() => {
    if (!user) return;

    async function loadCalendar() {
      setLoading(true);
      
      const result = await generateMonthCalendar(
        user?.id || '',
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
      
      if (result.data) {
        setEvents(result.data);
      }

      setLoading(false);
    }

    loadCalendar();
  }, [user, currentDate]);

  // Navegação entre meses
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Obter dias do mês
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias vazios antes do início do mês
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  // Obter eventos de um dia específico
  const getEventsForDay = (day: number) => {
    return events.filter(event => event.dia === day);
  };

  // Obter cor do evento
  const getEventColor = (event: CalendarEvent) => {
    switch (event.tipo) {
      case 'receita_fixa':
      case 'receita_realizada':
        return 'bg-success text-white';
      case 'despesa_fixa':
      case 'despesa_realizada':
        return 'bg-danger text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Obter ícone do evento
  const getEventIcon = (event: CalendarEvent) => {
    switch (event.tipo) {
      case 'receita_fixa':
      case 'receita_realizada':
        return <DollarSign className="h-3 w-3" />;
      case 'despesa_fixa':
      case 'despesa_realizada':
        return <CreditCard className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  // Nomes dos meses
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Nomes dos dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const today = new Date();
  const isCurrentMonth = 
    currentDate.getMonth() === today.getMonth() && 
    currentDate.getFullYear() === today.getFullYear();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendário Financeiro</h1>
          <p className="text-muted-foreground">
            Visualização de vencimentos e recebimentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center">
            <div className="font-semibold">
              {monthNames[currentDate.getMonth()]}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentDate.getFullYear()}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resumo do Mês */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(
                events
                  .filter(e => e.tipo.includes('receita'))
                  .reduce((sum, e) => sum + e.valor, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {events.filter(e => e.tipo.includes('receita')).length} eventos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-danger" />
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">
              {formatCurrency(
                events
                  .filter(e => e.tipo.includes('despesa'))
                  .reduce((sum, e) => sum + e.valor, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {events.filter(e => e.tipo.includes('despesa')).length} eventos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                events
                  .filter(e => e.tipo.includes('receita'))
                  .reduce((sum, e) => sum + e.valor, 0) -
                events
                  .filter(e => e.tipo.includes('despesa'))
                  .reduce((sum, e) => sum + e.valor, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Previsto para o mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
          </CardTitle>
          <CardDescription>
            Clique nos dias para ver detalhes dos eventos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {/* Dias da semana */}
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-semibold p-2 text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Dias do mês */}
            {days.map((day, index) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday = isCurrentMonth && day === today.getDate();
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[80px] border rounded-lg p-1
                    ${!day ? 'bg-muted/20' : 'bg-background'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${day && dayEvents.length > 0 ? 'border-primary' : 'border-border'}
                  `}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-primary' : 'text-foreground'
                      }`}>
                        {day}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`
                              text-xs p-1 rounded flex items-center gap-1
                              ${getEventColor(event)}
                            `}
                            title={event.descricao}
                          >
                            {getEventIcon(event)}
                            <span className="truncate">
                              {event.descricao.length > 8 
                                ? event.descricao.substring(0, 8) + '...'
                                : event.descricao
                              }
                            </span>
                          </div>
                        ))}
                        
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayEvents.length - 2} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded"></div>
              <span className="text-sm">Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-danger rounded"></div>
              <span className="text-sm">Despesas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted rounded"></div>
              <span className="text-sm">Realizadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 ring-2 ring-primary rounded"></div>
              <span className="text-sm">Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
