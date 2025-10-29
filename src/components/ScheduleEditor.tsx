import React from 'react';
import { RuleSchedule, RecurrencePattern } from '@/types/rule';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Bell } from 'lucide-react';

interface ScheduleEditorProps {
  schedule: RuleSchedule;
  onChange: (schedule: RuleSchedule) => void;
}

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ schedule, onChange }) => {
  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Enable Scheduling</Label>
        <Switch
          checked={schedule.enabled}
          onCheckedChange={(enabled) => onChange({ ...schedule, enabled })}
        />
      </div>

      {schedule.enabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Activation Date/Time
              </Label>
              <Input
                type="datetime-local"
                value={schedule.activationDate?.slice(0, 16) || ''}
                onChange={(e) => onChange({ ...schedule, activationDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Deactivation Date/Time
              </Label>
              <Input
                type="datetime-local"
                value={schedule.deactivationDate?.slice(0, 16) || ''}
                onChange={(e) => onChange({ ...schedule, deactivationDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recurrence Pattern
            </Label>
            <Select value={schedule.recurrence || 'none'} onValueChange={(value) => onChange({ ...schedule, recurrence: value as RecurrencePattern })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Recurrence</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Timezone</Label>
            <Select value={schedule.timezone || 'UTC'} onValueChange={(value) => onChange({ ...schedule, timezone: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notify Before (minutes)
            </Label>
            <Input
              type="number"
              min="0"
              value={schedule.notifyBefore || 0}
              onChange={(e) => onChange({ ...schedule, notifyBefore: parseInt(e.target.value) || 0 })}
            />
          </div>
        </>
      )}
    </div>
  );
};
