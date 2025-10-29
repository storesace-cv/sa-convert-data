import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface TopBarProps {
  isOnline: boolean;
  pendingOps: number;
  currentUser: string;
  onCommandPalette: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isOnline, pendingOps, currentUser, onCommandPalette }) => {
  const { signOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onCommandPalette}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
        >
          <span>🔍</span>
          <span className="text-sm text-gray-600">Pesquisar (⌘K)</span>
        </button>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        {pendingOps > 0 && (
          <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
            {pendingOps} pendentes
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {currentUser[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium">{currentUser}</span>
          <Button onClick={handleLogout} variant="ghost" size="sm">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
