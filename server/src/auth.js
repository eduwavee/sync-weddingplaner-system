import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q } from './db.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('Falta JWT_SECRET en el entorno');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

/** JWT HS256 a mano: son 30 líneas y evita una dependencia más. */
export function issueToken(user, days = 7) {
  const payload = {
    sub: user.id, role: user.role, wid: user.wedding_id || null,
    exp: Math.floor(Date.now() / 1000) + days * 86400,
  };
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  return `${head}.${body}.${sign(`${head}.${body}`)}`;
}

export function verifyToken(token) {
  const [head, body, mac] = String(token || '').split('.');
  if (!head || !body || !mac) return null;
  const expected = sign(`${head}.${body}`);
  // comparación de tiempo constante
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export const hash = (plain) => bcrypt.hash(plain, 12);
export const check = (plain, stored) => bcrypt.compare(plain, stored);

export async function login(email, password) {
  const { rows } = await q('select * from users where email = $1', [String(email).toLowerCase().trim()]);
  const user = rows[0];
  // se compara igual cuando no existe el usuario, para no delatar qué mails están registrados
  const ok = await check(password || '', user?.password_hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduO');
  if (!user || !ok) return null;
  return user;
}

/** Middleware: deja req.user o responde 401. */
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Sesión vencida o inválida' });
  req.user = payload;
  next();
}

export function requireRole(role) {
  return (req, res, next) =>
    req.user?.role === role ? next() : res.status(403).json({ error: 'No tenés permiso para esto' });
}

/** Los novios sólo pueden tocar su propia boda. */
export function canSee(user, weddingId) {
  return user.role === 'planner' || user.wid === weddingId;
}
