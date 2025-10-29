import React, { useState } from 'react';
import { Rule, RuleState } from '@/types/rule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar } from 'lucide-react';
import { parseISO, isBefore, isAfter } from 'date-fns';

interface SchedulePreviewProps {
  rules: Rule[];
}

export const SchedulePreview: React.FC<SchedulePreviewProps> = ({ rules }) => {
  const [previewDate, setPreviewDate] = useState<string>(new Date().toISOString().slice(0, 16));

  const getStateAtTime = (rule: Rule, targetDate: Date): RuleState => {
    if (!rule.schedule?.enabled) return rule.state;

    const { activationDate, deactivationDate } = rule.schedule;

    if (activationDate && deactivationDate) {
      const activationTime = parseISO(activationDate);
      const deactivationTime = parseISO(deactivationDate);

      if (isBefore(targetDate, activationTime)) {
        return 'draft';
      } else if (isAfter(targetDate, deactivationTime)) {
        return 'archived';
      } else {
        return 'prod';
      }
    } else if (activationDate) {
      const activationTime = parseISO(activationDate);
      return isBefore(targetDate, activationTime) ? 'draft' : 'prod';
    } else if (deactivationDate) {
      const deactivationTime = parseISO(deactivationDate);
      return isAfter(targetDate, deactivationTime) ? 'archived' : rule.state;
    }

    return rule.state;
  };

  const previewDateTime = new Date(previewDate);
  const activeRules = rules.filter(rule => {
    const stateAtTime = getStateAtTime(rule, previewDateTime);
    return stateAtTime === 'prod' || stateAtTime === 'staging';
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Preview Active Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Preview Date/Time
          </Label>
          <Input
            type="datetime-local"
            value={previewDate}
            onChange={(e) => setPreviewDate(e.target.value)}
          />
        </div>

        <div>
          <h3 className="font-semibold mb-3">Active Rules at Selected Time</h3>
          {activeRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules will be active at this time</p>
          ) : (
            <div className="space-y-2">
              {activeRules.map(rule => {
                const stateAtTime = getStateAtTime(rule, previewDateTime);
                return (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.kind}</p>
                    </div>
                    <Badge variant={stateAtTime === 'prod' ? 'default' : 'secondary'}>
                      {stateAtTime}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
