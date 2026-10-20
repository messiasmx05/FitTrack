import 'dotenv/config';

import argon2 from 'argon2';
import compression from 'compression';
import connectPgSimple from 'connect-pg-simple';
import express from 'express';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeData } from '../src/data/storage.js';
import { initializeDatabase, pool } from './db.js';

const filename = fileURLToPath(import.meta.url);
const directory = dirname(filename);
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3001);
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters.');
}

if (isProduction && !process.env.APP_ORIGIN && !process.env.RENDER_EXTERNAL_URL) {
  throw new Error('APP_ORIGIN is required in production, e.g. https://fittrack.example.com.');
}

if (isProduction) app.set('trust proxy', 1);

const PgSession = connectPgSimple(session);
app.disable('x-powered-by');
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '256kb', strict: true }));
app.use(session({
  name: 'fittrack.sid',
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
    pruneSessionInterval: 15 * 60,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) {
    res.status(403).json({ error: 'Origem da requisição não permitida.' });
    return;
  }

  const productionOrigin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
  const allowedOrigins = isProduction
    ? [productionOrigin]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (!allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Origem da requisição não permitida.' });
    return;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Faça login para continuar.' });
    return;
  }
  next();
}

function validateCredentials({ name, email, password }, includeName) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (includeName && (cleanName.length < 2 || cleanName.length > 70)) {
    return { error: 'Informe seu nome completo (entre 2 e 70 caracteres).' };
  }
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { error: 'Informe um endereço de e-mail válido.' };
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 256) {
    return { error: 'A senha deve ter pelo menos 8 caracteres e no máximo 256 bytes.' };
  }
  return { name: cleanName, email: cleanEmail, password };
}

function parseWorkoutData(data) {
  try {
    return normalizeData(data, { strict: true });
  } catch (error) {
    const validationError = new Error(error.message);
    validationError.status = 400;
    throw validationError;
  }
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check database error:', error);
    res.status(503).json({ status: 'unavailable' });
  }
});

app.post('/api/auth/register', requireSameOrigin, authLimiter, async (req, res, next) => {
  const credentials = validateCredentials(req.body || {}, true);
  if (credentials.error) {
    res.status(400).json({ error: credentials.error });
    return;
  }

  let initialData;
  try {
    initialData = req.body.initialData
      ? parseWorkoutData(req.body.initialData)
      : normalizeData({ routine: {}, history: [] });
  } catch (error) {
    next(error);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = randomUUID();
    const passwordHash = await argon2.hash(credentials.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const result = await client.query(
      'INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [id, credentials.name, credentials.email, passwordHash]
    );
    await client.query(
      'INSERT INTO user_data (user_id, data) VALUES ($1, $2::jsonb)',
      [id, JSON.stringify(initialData)]
    );
    await client.query('COMMIT');

    await regenerateSession(req);
    req.session.userId = result.rows[0].id;
    await saveSession(req);
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
      return;
    }
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', requireSameOrigin, authLimiter, async (req, res, next) => {
  const credentials = validateCredentials(req.body || {}, false);
  if (credentials.error) {
    res.status(400).json({ error: credentials.error });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [credentials.email]
    );
    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, credentials.password))) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/session', async (req, res, next) => {
  if (!req.session.userId) {
    res.json({ user: null });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!result.rows[0]) {
      req.session.destroy(() => {});
      res.clearCookie('fittrack.sid', { path: '/' });
      res.json({ user: null });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireSameOrigin, async (req, res, next) => {
  if (!req.session.userId) {
    res.clearCookie('fittrack.sid', { path: '/' });
    res.status(204).end();
    return;
  }
  req.session.destroy(error => {
    if (error) {
      next(error);
      return;
    }
    res.clearCookie('fittrack.sid', { path: '/' });
    res.status(204).end();
  });
});

app.get('/api/data', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT data FROM user_data WHERE user_id = $1',
      [req.session.userId]
    );
    res.json({ data: result.rows[0]?.data || null });
  } catch (error) {
    next(error);
  }
});

app.put('/api/data', requireSameOrigin, requireAuth, async (req, res, next) => {
  let data;
  try {
    data = parseWorkoutData(req.body?.data);
  } catch (error) {
    next(error);
    return;
  }
  try {
    await pool.query(
      `INSERT INTO user_data (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [req.session.userId, JSON.stringify(data)]
    );
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota da API não encontrada.' });
});

const distDirectory = resolve(directory, '../dist');
app.use(express.static(distDirectory, {
  index: false,
  maxAge: isProduction ? '1y' : 0,
  immutable: isProduction,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('manifest.json') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
app.get(/.*/, (_req, res) => {
  res.sendFile(resolve(distDirectory, 'index.html'));
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('Request failed:', error);
  res.status(status).json({
    error: status === 500 ? 'Erro interno. Tente novamente mais tarde.' : error.message,
  });
});

await initializeDatabase();
app.listen(port, () => {
  console.log(`FitTrack server listening on port ${port}`);
});
