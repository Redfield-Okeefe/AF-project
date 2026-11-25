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
    to_regclass('public.programs') IS NOT NULL AS programs_ready,
    to_regclass('public.auth_challenges') IS NOT NULL AS challenges_ready,
    to_regclass('public.account_activation_tokens') IS NOT NULL AS activation_ready,
    to_regclass('public.audit_logs') IS NOT NULL AS audit_ready,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='session_version') AS sessions_ready,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coach_profiles' AND column_name='registration_review_status') AS coach_review_ready`);
  const row = r.rows[0];
  if (row.name !== 'bnr_academy' || !row.users_ready || !row.players_ready || !row.coaches_ready || !row.media_ready || !row.registrations_ready || !row.programs_ready || !row.challenges_ready || !row.activation_ready || !row.audit_ready || !row.sessions_ready || !row.coach_review_ready) {
    throw new Error('Database/skema belum sesuai. Jalankan migrasi revisi 003c dan 003d sesuai panduan.');
  }
  return row.name;
}
export async function closePool() { if (pool) { const current = pool; pool = undefined; await current.end(); } }
