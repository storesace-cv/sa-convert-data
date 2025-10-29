import React, { useState } from 'react';
import { ConflictResolutionHistoryEntry } from '@/types/conflictHistory';
import { exportToCSV, exportToPDF, calculateStatistics, ExportOptions } from '@/utils/conflictHistoryExport';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ConflictHistoryExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ConflictResolutionHistoryEntry[];
}

export const ConflictHistoryExportDialog: React.FC<ConflictHistoryExportDialogProps> = ({
  isOpen,
  onClose,
  entries
}) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [includeDetails, setIncludeDetails] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resolutionType, setResolutionType] = useState('all');
  const [userName, setUserName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    let filteredEntries = [...entries];

    if (dateFrom) {
      filteredEntries = filteredEntries.filter(e => new Date(e.timestamp) >= new Date(dateFrom));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filteredEntries = filteredEntries.filter(e => new Date(e.timestamp) <= toDate);
    }
    if (resolutionType !== 'all') {
      filteredEntries = filteredEntries.filter(e => e.strategy === resolutionType);
    }
    if (userName) {
      filteredEntries = filteredEntries.filter(e => 
        e.userName.toLowerCase().includes(userName.toLowerCase())
      );
    }

    const stats = calculateStatistics(filteredEntries);
    const options: ExportOptions = {
      format,
      includeDetails,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      resolutionType: resolutionType !== 'all' ? resolutionType : undefined,
      userName: userName || undefined
    };

    try {
      if (format === 'csv') {
        exportToCSV(filteredEntries, options, stats);
      } else if (format === 'pdf') {
        await exportToPDF(filteredEntries, options, stats);
      }
    } finally {
      setIsExporting(false);
      onClose();
    }
  };



  const uniqueStrategies = Array.from(new Set(entries.map(e => e.strategy)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Conflict Resolution History</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'pdf')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>

                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Resolution Strategy</Label>
              <Select value={resolutionType} onValueChange={setResolutionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {uniqueStrategies.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Filter by User</Label>
            <Input 
              placeholder="Enter user name..." 
              value={userName} 
              onChange={(e) => setUserName(e.target.value)} 
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeDetails" 
              checked={includeDetails} 
              onCheckedChange={(checked) => setIncludeDetails(checked as boolean)} 
            />
            <Label htmlFor="includeDetails" className="cursor-pointer">
              Include detailed before/after rule comparisons
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
