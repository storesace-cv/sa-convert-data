import React, { useState } from 'react';
import { Rule } from '@/types/rule';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';

interface ScheduleCalendarProps {
  rules: Rule[];
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ rules }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const scheduledRules = rules.filter(rule => rule.schedule?.enabled);

  const getScheduledEventsForDate = (date: Date) => {
    return scheduledRules.filter(rule => {
      if (!rule.schedule) return false;
      
      const events = [];
      if (rule.schedule.activationDate && isSameDay(parseISO(rule.schedule.activationDate), date)) {
        events.push({ type: 'activation', rule });
      }
      if (rule.schedule.deactivationDate && isSameDay(parseISO(rule.schedule.deactivationDate), date)) {
        events.push({ type: 'deactivation', rule });
      }
      return events.length > 0;
    });
  };

  const selectedDateEvents = scheduledRules.flatMap(rule => {
    const events = [];
    if (rule.schedule?.activationDate && isSameDay(parseISO(rule.schedule.activationDate), selectedDate)) {
      events.push({ type: 'activation', rule, time: rule.schedule.activationDate });
    }
    if (rule.schedule?.deactivationDate && isSameDay(parseISO(rule.schedule.deactivationDate), selectedDate)) {
      events.push({ type: 'deactivation', rule, time: rule.schedule.deactivationDate });
    }
    return events;
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const modifiers = {
    scheduled: (date: Date) => getScheduledEventsForDate(date).length > 0
  };

  const modifiersStyles = {
    scheduled: { backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold' }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Schedule Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Events on {format(selectedDate, 'MMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled events on this date</p>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge variant={event.type === 'activation' ? 'default' : 'secondary'}>
                    {event.type === 'activation' ? 'Activate' : 'Deactivate'}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{event.rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(event.time), 'h:mm a')} ({event.rule.schedule?.timezone || 'UTC'})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
