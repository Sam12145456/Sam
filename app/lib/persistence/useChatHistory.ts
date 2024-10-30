import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import type { Message } from 'ai';
import { workbenchStore } from '~/lib/stores/workbench';
import { getMessages, getNextId, getUrlId, openDatabase, setMessages } from './db';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ChatHistory');

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

// Initialize database lazily when needed
let db: IDBDatabase | undefined;
let dbInitialized = false;
let dbInitializing = false;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

async function initializeDb() {
  if (dbInitialized || dbInitializing) {
    return db;
  }

  dbInitializing = true;
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      logger.debug('Not in browser environment');
      return undefined;
    }

    // Check if IndexedDB is available
    if (!window.indexedDB) {
      logger.debug('IndexedDB not available');
      return undefined;
    }

    db = await openDatabase();
    if (db) {
      dbInitialized = true;
      logger.debug('Database initialized successfully');
    }
  } catch (error) {
    logger.error('Failed to initialize database:', error);
  } finally {
    dbInitializing = false;
  }
  return db;
}

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  // Initialize database when component mounts
  useEffect(() => {
    const init = async () => {
      try {
        const database = await initializeDb();

        if (mixedId && database) {
          const storedMessages = await getMessages(database, mixedId);
          if (storedMessages && storedMessages.messages.length > 0) {
            setInitialMessages(storedMessages.messages);
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
          } else {
            navigate('/', { replace: true });
          }
        }
      } catch (error) {
        logger.error('Failed to initialize:', error);
      }
      setReady(true);
    };

    init();
  }, [mixedId, navigate]);

  return {
    ready: !mixedId || ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      if (!db || messages.length === 0) {
        return;
      }

      try {
        const { firstArtifact } = workbenchStore;

        if (!urlId && firstArtifact?.id) {
          const newUrlId = await getUrlId(db, firstArtifact.id);
          navigateChat(newUrlId);
          setUrlId(newUrlId);
        }

        if (!description.get() && firstArtifact?.title) {
          description.set(firstArtifact?.title);
        }

        if (initialMessages.length === 0 && !chatId.get()) {
          const nextId = await getNextId(db);
          chatId.set(nextId);

          if (!urlId) {
            navigateChat(nextId);
          }
        }

        await setMessages(db, chatId.get() as string, messages, urlId, description.get());
      } catch (error) {
        logger.error('Failed to store messages:', error);
      }
    },
  };
}

function navigateChat(nextId: string) {
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;
  window.history.replaceState({}, '', url);
}
