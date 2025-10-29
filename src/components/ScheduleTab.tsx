import { useState, useMemo } from 'react';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScheduleCalendar } from './ScheduleCalendar';
import { SchedulePreview } from './SchedulePreview';
import { Bell, Calendar, Clock, TrendingUp } from 'lucide-react';
import { Rule } from '@/types/rule';

export function ScheduleTab() {
  const { rules } = useRuleRegistry();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get all scheduled rules
  const scheduledRules = useMemo(() => {
    return rules.filter(rule => rule.schedule?.enabled);
  }, [rules]);

  // Get upcoming events (next hour)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const events: Array<{ rule: Rule; type: 'activate' | 'deactivate'; time: Date }> = [];

    scheduledRules.forEach(rule => {
      if (!rule.schedule) return;

      if (rule.schedule.activateAt) {
        const activateTime = new Date(rule.schedule.activateAt);
        if (activateTime >= now && activateTime <= oneHourLater) {
          events.push({ rule, type: 'activate', time: activateTime });
        }
      }

      if (rule.schedule.deactivateAt) {
        const deactivateTime = new Date(rule.schedule.deactivateAt);
        if (deactivateTime >= now && deactivateTime <= oneHourLater) {
          events.push({ rule, type: 'deactivate', time: deactivateTime });
        }
      }
    });

    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [scheduledRules]);

  // Get timeline for next 30 days
  const timeline = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events: Array<{ rule: Rule; type: 'activate' | 'deactivate'; time: Date }> = [];

    scheduledRules.forEach(rule => {
      if (!rule.schedule) return;

      if (rule.schedule.activateAt) {
        const activateTime = new Date(rule.schedule.activateAt);
        if (activateTime >= now && activateTime <= thirtyDaysLater) {
          events.push({ rule, type: 'activate', time: activateTime });
        }
      }

      if (rule.schedule.deactivateAt) {
        const deactivateTime = new Date(rule.schedule.deactivateAt);
        if (deactivateTime >= now && deactivateTime <= thirtyDaysLater) {
          events.push({ rule, type: 'deactivate', time: deactivateTime });
        }
      }
    });

    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [scheduledRules]);

  return (
    <div className="space-y-6">
      {/* Upcoming Events Alert */}
      {upcomingEvents.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-600" />
              Upcoming Events (Next Hour)
              <Badge className="bg-yellow-500">{upcomingEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{event.rule.name}</span>
                    <Badge variant={event.type === 'activate' ? 'default' : 'secondary'}>
                      {event.type === 'activate' ? 'Activating' : 'Deactivating'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {event.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar and Preview Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleCalendar rules={scheduledRules} />
        <SchedulePreview rules={scheduledRules} selectedDate={selectedDate} />
      </div>

      {/* 30-Day Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Scheduled Changes (Next 30 Days)
          </CardTitle>
          <CardDescription>
            {timeline.length} scheduled events in the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No scheduled changes in the next 30 days
            </p>
          ) : (
            <div className="space-y-3">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{event.rule.name}</span>
                      <Badge variant={event.type === 'activate' ? 'default' : 'secondary'}>
                        {event.type === 'activate' ? 'Activate' : 'Deactivate'}
                      </Badge>
                      <Badge variant="outline">{event.rule.kind}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.time.toLocaleDateString()} at {event.time.toLocaleTimeString()}
                    </p>
                    {event.rule.schedule?.recurrence && (
                      <Badge variant="outline" className="mt-1">
                        Recurring: {event.rule.schedule.recurrence.frequency}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
