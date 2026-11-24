import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const ROLES = Object.freeze(['owner', 'pelatih', 'pemain']);
export function normalizeRole(value) { return value === 'player' ? 'pemain' : ROLES.includes(value) ? value : null; }
export function parseLogin(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = normalizeRole(body?.role ?? body?.peran);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || !password || Buffer.byteLength(password, 'utf8') > 72 || !role || (body?.role != null && body?.peran != null && normalizeRole(body.role) !== normalizeRole(body.peran))) {
    throw new ApiError(400, 'Email, password, atau pilihan portal tidak valid.');
  }
  return { email, password, role };
}
export function publicUser(row) { return { id: row.id, email: row.email, full_name: row.full_name, nama: row.full_name, role: row.role, status: row.status }; }
export function checkAccount(row) {
  if (!row || !ROLES.includes(row.role) || row.status !== 'aktif' || !row.email_verified_at || (row.role === 'pemain' && !row.player_ready) || (row.role === 'pelatih' && !row.coach_ready)) {
    throw new ApiError(403, 'Akun belum aktif, belum diverifikasi, atau profil belum siap.');
  }
  return row;
}
export function createAuthService({ repo, config }) {
  // Same bcrypt cost for nonexistent accounts to reduce obvious timing differences.
  const fallbackHash = bcrypt.hashSync(randomUUID(), 12);
  function sign(user) {
    return jwt.sign({ role: user.role }, config.secret, { algorithm: 'HS256', subject: user.id, issuer: config.issuer, audience: config.audience, expiresIn: config.expiresIn, jwtid: randomUUID() });
  }
  function verify(token) {
    try {
      const payload = jwt.verify(token, config.secret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience });
      if (typeof payload !== 'object' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(payload.sub || '') || !ROLES.includes(payload.role) || typeof payload.exp !== 'number') throw new Error('invalid');
      return payload;
    } catch { throw new ApiError(401, 'Token tidak valid atau kedaluwarsa.'); }
  }
  async function login(body) {
    const input = parseLogin(body);
    const row = await repo.findByEmail(input.email);
    const ok = await bcrypt.compare(input.password, row?.password_hash || fallbackHash);
    if (!row || !ok) throw new ApiError(401, 'Email atau password salah.');
    if (row.role !== input.role) throw new ApiError(403, 'Akun tidak memiliki akses ke portal ini.');
    checkAccount(row);
    // Repository rechecks role/status/password when writing last-login + audit.
    if (!await repo.recordLogin(row)) throw new ApiError(403, 'Status akun berubah. Silakan login kembali.');
    const user = publicUser(row);
    return { ok: true, token: sign(user), token_type: 'Bearer', expires_in: 1800, role: user.role, user };
  }
  async function authenticate(token) {
    const claims = verify(token);
    const row = await repo.findById(claims.sub);
    if (!row || row.role !== claims.role) throw new ApiError(401, 'Sesi tidak berlaku. Silakan login kembali.');
    return publicUser(checkAccount(row));
  }
  return { login, authenticate };
}
