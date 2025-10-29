import { useEffect, useState } from 'react';
import { Rule, RuleState } from '@/types/rule';
import { parseISO, isBefore, isAfter, differenceInMinutes } from 'date-fns';

interface ScheduleNotification {
  ruleId: string;
  ruleName: string;
  type: 'activation' | 'deactivation';
  scheduledTime: string;
  minutesUntil: number;
}

export const useScheduledRules = (rules: Rule[], onStateChange: (ruleId: string, newState: RuleState) => void) => {
  const [notifications, setNotifications] = useState<ScheduleNotification[]>([]);

  useEffect(() => {
    const checkSchedules = () => {
      const now = new Date();
      const upcomingNotifications: ScheduleNotification[] = [];

      rules.forEach(rule => {
        if (!rule.schedule?.enabled) return;

        const { activationDate, deactivationDate, notifyBefore } = rule.schedule;

        // Check activation
        if (activationDate) {
          const activationTime = parseISO(activationDate);
          const minutesUntil = differenceInMinutes(activationTime, now);

          if (minutesUntil <= 0 && minutesUntil > -1 && rule.state !== 'prod') {
            onStateChange(rule.id, 'prod');
          } else if (notifyBefore && minutesUntil <= notifyBefore && minutesUntil > 0) {
            upcomingNotifications.push({
              ruleId: rule.id,
              ruleName: rule.name,
              type: 'activation',
              scheduledTime: activationDate,
              minutesUntil
            });
          }
        }

        // Check deactivation
        if (deactivationDate) {
          const deactivationTime = parseISO(deactivationDate);
          const minutesUntil = differenceInMinutes(deactivationTime, now);

          if (minutesUntil <= 0 && minutesUntil > -1 && rule.state !== 'archived') {
            onStateChange(rule.id, 'archived');
          } else if (notifyBefore && minutesUntil <= notifyBefore && minutesUntil > 0) {
            upcomingNotifications.push({
              ruleId: rule.id,
              ruleName: rule.name,
              type: 'deactivation',
              scheduledTime: deactivationDate,
              minutesUntil
            });
          }
        }
      });

      setNotifications(upcomingNotifications);
    };

    checkSchedules();
    const interval = setInterval(checkSchedules, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [rules, onStateChange]);

  return { notifications };
};
