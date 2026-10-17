import { apiRequest } from './api.js';
import {
  clearLegacySession,
  getLegacySession,
  getLegacyUserById,
  getLegacyUserData,
} from './legacyDb.js';
import { DEFAULT_DATA, STORAGE_KEY } from '../utils/constants.js';
import { normalizeData } from '../data/storage.js';

const LEGACY_MIGRATION_KEY = 'fittrack_legacy_migration_complete';

export function evaluatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'transparent' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Fraca', color: 'var(--danger)' };
  if (score <= 2) return { score: 2, label: 'Média', color: 'var(--warning)' };
  return { score: 3, label: 'Forte', color: 'var(--success)' };
}

async function getLegacyData() {
  if (localStorage.getItem(LEGACY_MIGRATION_KEY) === '1') {
    return normalizeData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  }

  const legacyLocalStorage = localStorage.getItem(STORAGE_KEY);
  if (legacyLocalStorage) {
    return normalizeData(JSON.parse(legacyLocalStorage));
  }

  if (!globalThis.indexedDB) {
    return normalizeData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
  }

  const localSession = await getLegacySession();
  if (localSession?.userId) {
    const localUser = await getLegacyUserById(localSession.userId);
    if (localUser) {
      const data = await getLegacyUserData(localUser.id);
      if (data) return normalizeData(data);
    }
  }

  return normalizeData(JSON.parse(JSON.stringify(DEFAULT_DATA)));
}

export async function registerUser({ name, email, password }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (cleanName.length < 2 || cleanName.length > 70) {
    throw new Error('Informe seu nome completo (entre 2 e 70 caracteres).');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
    throw new Error('Informe um endereço de e-mail válido.');
  }
  if (typeof password !== 'string' || password.length < 8 || new TextEncoder().encode(password).length > 256) {
    throw new Error('A senha deve ter pelo menos 8 caracteres e no máximo 256 bytes.');
  }

  const initialData = await getLegacyData();
  const result = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: cleanName, email: cleanEmail, password, initialData }),
  });

  try {
    localStorage.setItem(LEGACY_MIGRATION_KEY, '1');
  } catch (error) {
    console.warn('A conta foi criada, mas o estado da migração local não pôde ser atualizado:', error);
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('A conta foi criada, mas os dados locais antigos não puderam ser removidos:', error);
  }
  try {
    await clearLegacySession();
  } catch (error) {
    console.warn('A conta foi criada, mas a sessão local antiga não pôde ser encerrada:', error);
  }
  return result.user;
}

export async function loginUser({ email, password }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!cleanEmail || typeof password !== 'string' || !password) {
    throw new Error('Preencha seu e-mail e senha para entrar.');
  }
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: cleanEmail, password }),
  });
  return result.user;
}

export async function logoutUser() {
  await apiRequest('/auth/logout', { method: 'POST' });
}

export async function checkAuthenticatedUser() {
  const result = await apiRequest('/auth/session');
  return result.user;
}
