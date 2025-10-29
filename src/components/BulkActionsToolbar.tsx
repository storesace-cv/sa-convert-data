import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Send, Trash2, Archive, Download, ArrowRight, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onRequestApproval: () => void;
  onBulkDelete: () => void;
  onBulkArchive: () => void;
  onBulkExport: () => void;
  onBulkStateChange: () => void;
  onClearSelection: () => void;
  currentState: string;
}

export function BulkActionsToolbar({
  selectedCount,
  onRequestApproval,
  onBulkDelete,
  onBulkArchive,
  onBulkExport,
  onBulkStateChange,
  onClearSelection,
  currentState
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground shadow-2xl rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <Badge variant="secondary" className="text-lg px-3 py-1">
        {selectedCount} selected
      </Badge>
      
      <div className="flex gap-2">
        {(currentState === 'draft' || currentState === 'staging') && (
          <Button size="sm" variant="secondary" onClick={onRequestApproval}>
            <Send className="w-4 h-4 mr-2" />
            Request Approval
          </Button>
        )}
        
        {currentState !== 'archived' && (
          <Button size="sm" variant="secondary" onClick={onBulkStateChange}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Change State
          </Button>
        )}
        
        <Button size="sm" variant="secondary" onClick={onBulkExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        
        {currentState !== 'archived' && (
          <Button size="sm" variant="secondary" onClick={onBulkArchive}>
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </Button>
        )}
        
        <Button size="sm" variant="destructive" onClick={onBulkDelete}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
      
      <Button size="sm" variant="ghost" onClick={onClearSelection} className="ml-2">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
