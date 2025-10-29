import { useState, useEffect } from 'react';

const DB_NAME = 'StoresAceDB';
const DB_VERSION = 1;

export const useIndexedDB = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  
  useEffect(() => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB error');
    };
    
    request.onsuccess = () => {
      setDb(request.result);
    };
    
    request.onupgradeneeded = (event: any) => {
      const database = event.target.result;
      
      if (!database.objectStoreNames.contains('items')) {
        database.createObjectStore('items', { keyPath: 'id' });
      }
      
      if (!database.objectStoreNames.contains('audit')) {
        database.createObjectStore('audit', { keyPath: 'id', autoIncrement: true });
      }
    };
  }, []);
  
  const saveItems = async (items: any[]) => {
    if (!db) return;
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    items.forEach(item => store.put(item));
    await tx.complete;
  };
  
  const loadItems = async (): Promise<any[]> => {
    if (!db) return [];
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  };
  
  return { db, saveItems, loadItems };
};
