import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

interface SyncQueueItem {
  id: string;
  type: 'answer' | 'quiz' | 'media';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface SyncContextType {
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeFromQueue: (id: string) => void;
  processQueue: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);

  // Load queue from IndexedDB
  useEffect(() => {
    async function loadQueue() {
      try {
        const db = await import('../db').then(m => m.default);
        const queue = await db.syncQueue.toArray();
        setSyncQueue(queue);
      } catch (error) {
        console.error('Failed to load sync queue:', error);
      }
    }
    loadQueue();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queue when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, syncQueue.length]);

  const addToQueue = useCallback(async (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    setSyncQueue(prev => [...prev, newItem]);

    // Save to IndexedDB
    try {
      const db = await import('../db').then(m => m.default);
      await db.syncQueue.add(newItem);
    } catch (error) {
      console.error('Failed to save to sync queue:', error);
    }
  }, []);

  const removeFromQueue = useCallback(async (id: string) => {
    setSyncQueue(prev => prev.filter(item => item.id !== id));

    // Remove from IndexedDB
    try {
      const db = await import('../db').then(m => m.default);
      await db.syncQueue.delete(id);
    } catch (error) {
      console.error('Failed to remove from sync queue:', error);
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || syncQueue.length === 0) return;

    const queueToProcess = [...syncQueue];
    const failedItems: SyncQueueItem[] = [];

    for (const item of queueToProcess) {
      try {
        switch (item.type) {
          case 'answer':
            await apiClient.submitAnswer(item.data);
            break;
          case 'quiz':
            await apiClient.createQuiz(item.data);
            break;
          case 'media':
            await apiClient.uploadMedia(item.data.file, item.data.altText);
            break;
        }
        await removeFromQueue(item.id);
      } catch (error) {
        console.error(`Failed to sync ${item.type}:`, error);
        failedItems.push({
          ...item,
          retryCount: item.retryCount + 1
        });
      }
    }

    // If there are failed items, retry after delay
    if (failedItems.length > 0) {
      const retryDelay = Math.min(1000 * Math.pow(2, failedItems[0].retryCount), 30000);
      setTimeout(() => {
        setSyncQueue(prev => [...prev, ...failedItems]);
      }, retryDelay);
    }
  }, [isOnline, syncQueue, removeFromQueue]);

  const value: SyncContextType = {
    isOnline,
    syncQueue,
    addToQueue,
    removeFromQueue,
    processQueue
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync doit être utilisé dans un SyncProvider');
  }
  return context;
}
