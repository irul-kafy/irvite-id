export interface OfflineGuestRecord {
  guestId: string;
  name: string;
  category: string;
  isVip: boolean;
  tableNumber: string | null;
  maxPax: number;
  invitationId: string | null;
  uniqueCode: string | null;
  status: 'CHECKED_IN' | 'PARTIAL' | 'NOT_CHECKED_IN';
  scannedPax: number;
  lastScannedAt: string | null;
}

export interface OfflineSyncOpRecord {
  opId: string;
  type: 'CHECK_IN' | 'WALK_IN' | 'UNDO';
  code?: string;
  pax?: number;
  guestId?: string;
  invitationId?: string;
  walkInData?: {
    name: string;
    pax?: number;
    category?: string;
    tableNumber?: string;
  };
  clientTimestamp: string;
  deviceId?: string;
}

export interface OfflineEventMeta {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  generatedAt: string;
  expiresAt: string;
  totalGuests: number;
}

const DB_VERSION = 1;

function getDBName(eventId: string): string {
  return `irvite_scanner_${eventId}`;
}

export function openScannerDB(eventId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment'));
    }

    const request = window.indexedDB.open(getDBName(eventId), DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // 1. Guests Store
      if (!db.objectStoreNames.contains('guests')) {
        const guestsStore = db.createObjectStore('guests', { keyPath: 'guestId' });
        guestsStore.createIndex('uniqueCode', 'uniqueCode', { unique: false });
        guestsStore.createIndex('name', 'name', { unique: false });
      }

      // 2. Pending Sync Ops Store
      if (!db.objectStoreNames.contains('pendingOps')) {
        db.createObjectStore('pendingOps', { keyPath: 'opId' });
      }

      // 3. Metadata Store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSnapshot(
  eventId: string,
  snapshot: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    generatedAt: string;
    expiresAt: string;
    totalGuests: number;
    guests: OfflineGuestRecord[];
  }
): Promise<void> {
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['guests', 'meta'], 'readwrite');
    const guestsStore = tx.objectStore('guests');
    const metaStore = tx.objectStore('meta');

    // Clear old guests to prevent stale data
    guestsStore.clear();

    for (const guest of snapshot.guests) {
      guestsStore.put(guest);
    }

    const meta: OfflineEventMeta = {
      eventId: snapshot.eventId,
      eventTitle: snapshot.eventTitle,
      eventDate: snapshot.eventDate,
      generatedAt: snapshot.generatedAt,
      expiresAt: snapshot.expiresAt,
      totalGuests: snapshot.totalGuests,
    };

    metaStore.put({ key: 'event_meta', value: meta });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getOfflineSnapshotMeta(
  eventId: string
): Promise<OfflineEventMeta | null> {
  try {
    const db = await openScannerDB(eventId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get('event_meta');

      req.onsuccess = () => {
        db.close();
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function findGuestByCode(
  eventId: string,
  code: string
): Promise<OfflineGuestRecord | null> {
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('guests', 'readonly');
    const store = tx.objectStore('guests');
    const index = store.index('uniqueCode');
    const req = index.get(code.trim());

    req.onsuccess = () => {
      db.close();
      resolve(req.result || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function searchOfflineGuests(
  eventId: string,
  query: string
): Promise<OfflineGuestRecord[]> {
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('guests', 'readonly');
    const store = tx.objectStore('guests');
    const req = store.getAll();

    req.onsuccess = () => {
      db.close();
      const all: OfflineGuestRecord[] = req.result || [];
      if (!query || !query.trim()) {
        resolve(all.slice(0, 50));
        return;
      }
      const q = query.toLowerCase().trim();
      const matches = all.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        (g.tableNumber && g.tableNumber.toLowerCase().includes(q)) ||
        (g.category && g.category.toLowerCase().includes(q))
      );
      resolve(matches.slice(0, 50));
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function enqueueOfflineOp(
  eventId: string,
  op: OfflineSyncOpRecord
): Promise<void> {
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingOps', 'readwrite');
    const store = tx.objectStore('pendingOps');
    store.put(op);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getPendingOps(
  eventId: string
): Promise<OfflineSyncOpRecord[]> {
  try {
    const db = await openScannerDB(eventId);
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingOps', 'readonly');
      const store = tx.objectStore('pendingOps');
      const req = store.getAll();

      req.onsuccess = () => {
        db.close();
        resolve(req.result || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function clearPendingOps(
  eventId: string,
  opIds: string[]
): Promise<void> {
  if (!opIds || opIds.length === 0) return;
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingOps', 'readwrite');
    const store = tx.objectStore('pendingOps');

    for (const opId of opIds) {
      store.delete(opId);
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function updateLocalGuestStatus(
  eventId: string,
  guestId: string,
  status: 'CHECKED_IN' | 'PARTIAL' | 'NOT_CHECKED_IN',
  scannedPax: number
): Promise<void> {
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('guests', 'readwrite');
    const store = tx.objectStore('guests');
    const req = store.get(guestId);

    req.onsuccess = () => {
      const guest: OfflineGuestRecord = req.result;
      if (guest) {
        guest.status = status;
        guest.scannedPax = scannedPax;
        guest.lastScannedAt = new Date().toISOString();
        store.put(guest);
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function addLocalWalkInGuest(
  eventId: string,
  guest: OfflineGuestRecord
): Promise<void> {
  const db = await openScannerDB(eventId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('guests', 'readwrite');
    const store = tx.objectStore('guests');
    store.put(guest);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

