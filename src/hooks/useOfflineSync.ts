import { useState, useEffect } from 'react';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const queueOperation = (operation: any) => {
    setPendingOps(prev => [...prev, operation]);
    if (!isOnline) {
      localStorage.setItem('pendingOps', JSON.stringify([...pendingOps, operation]));
    }
  };
  
  const syncPending = async () => {
    if (isOnline && pendingOps.length > 0) {
      // Simulate sync
      console.log('Syncing', pendingOps.length, 'operations');
      setPendingOps([]);
      localStorage.removeItem('pendingOps');
    }
  };
  
  useEffect(() => {
    if (isOnline) {
      syncPending();
    }
  }, [isOnline]);
  
  return { isOnline, pendingOps, queueOperation };
};
