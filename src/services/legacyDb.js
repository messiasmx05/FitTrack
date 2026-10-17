const LEGACY_DB_NAME = 'fittrack_db';
const LEGACY_DB_VERSION = 1;

let databasePromise;

function openLegacyDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME, LEGACY_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        const users = db.createObjectStore('users', { keyPath: 'id' });
        users.createIndex('email', 'email', { unique: true });
      }
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível ler a conta local antiga.'));
  }).catch(error => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

async function readLegacyRecord(storeName, key) {
  const db = await openLegacyDatabase();
  if (!db.objectStoreNames.contains(storeName)) return null;

  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Não foi possível ler os dados da conta local antiga.'));
  });
}

export function getLegacySession() {
  return readLegacyRecord('session', 'current_user');
}

export async function clearLegacySession() {
  if (!globalThis.indexedDB) return;

  const db = await openLegacyDatabase();
  if (!db.objectStoreNames.contains('session')) return;

  await new Promise((resolve, reject) => {
    const request = db.transaction('session', 'readwrite')
      .objectStore('session')
      .delete('current_user');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Não foi possível encerrar a sessão local antiga.'));
  });
}

export function getLegacyUserById(id) {
  return readLegacyRecord('users', id);
}

export async function getLegacyUserData(id) {
  const record = await readLegacyRecord('userData', id);
  return record?.data || null;
}
