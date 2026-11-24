import pg from 'pg';
import { databaseConfig } from './env.js';
const { Pool } = pg;
let pool;
export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: databaseConfig().raw, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    pool.on('error', error => console.error('Koneksi pool PostgreSQL terputus:', error.code || error.name));
  }
  return pool;
}
export async function verifyDatabase(db = getPool()) {
  const r = await db.query(`SELECT current_database() AS name,
    to_regclass('public.users') IS NOT NULL AS users_ready,
    to_regclass('public.players') IS NOT NULL AS players_ready,
    to_regclass('public.coach_profiles') IS NOT NULL AS coaches_ready,
    to_regclass('public.public_media') IS NOT NULL AS media_ready,
    to_regclass('public.registrations') IS NOT NULL AS registrations_ready,
    to_regclass('public.audit_logs') IS NOT NULL AS audit_ready`);
  const row = r.rows[0];
  if (row.name !== 'bnr_academy' || !row.users_ready || !row.players_ready || !row.coaches_ready || !row.media_ready || !row.registrations_ready || !row.audit_ready) {
    throw new Error('Database/skema belum sesuai. Verifikasi schema v1 yang sudah diimpor.');
  }
  return row.name;
}
export async function closePool() { if (pool) { const current = pool; pool = undefined; await current.end(); } }
