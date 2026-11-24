import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Read the existing server-contoh/.env even when invoked from another folder.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

export function databaseConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL belum diatur pada server-contoh/.env.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Format DATABASE_URL tidak valid. Periksa URL-encoding password.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.hostname || url.pathname !== '/bnr_academy') {
    throw new Error('DATABASE_URL harus menunjuk ke PostgreSQL database bnr_academy.');
  }
  return { raw, url };
}
export function authConfig() {
  const secret = process.env.JWT_SECRET || '';
  if (Buffer.byteLength(secret) < 32 || /ganti|placeholder|isi_dengan/i.test(secret)) {
    throw new Error('JWT_SECRET wajib berupa secret acak minimal 32 byte.');
  }
  return { secret, issuer: 'bnr-academy', audience: 'bnr-academy-api', expiresIn: '30m' };
}
export function serverConfig() {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT tidak valid.');
  return { port, host: '127.0.0.1', origins: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean) };
}
