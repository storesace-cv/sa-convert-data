import React, { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onShortcut: (action: string) => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onShortcut }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'i':
            e.preventDefault();
            onShortcut('import');
            break;
          case 's':
            e.preventDefault();
            onShortcut('save');
            break;
          case 'e':
            e.preventDefault();
            onShortcut('export');
            break;
          case 'f':
            e.preventDefault();
            onShortcut('search');
            break;
          case 'k':
            e.preventDefault();
            onShortcut('command');
            break;
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              onShortcut('redo');
            } else {
              e.preventDefault();
              onShortcut('undo');
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShortcut]);
  
  return null;
};
