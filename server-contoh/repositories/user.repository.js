const SELECT_ACCOUNT = `SELECT u.id,u.full_name,u.email,u.password_hash,u.role,u.status,u.email_verified_at,
  EXISTS(SELECT 1 FROM public.players p WHERE p.user_id=u.id AND p.status='aktif'
    AND EXISTS(SELECT 1 FROM public.registrations r WHERE r.player_id=p.id AND r.status='diterima')) AS player_ready,
  EXISTS(SELECT 1 FROM public.coach_profiles c WHERE c.user_id=u.id) AS coach_ready
  FROM public.users u`;
export function createUserRepository(pool) {
  return {
    async findByEmail(email) { return (await pool.query(`${SELECT_ACCOUNT} WHERE lower(btrim(u.email))=$1`, [email])).rows[0] || null; },
    async findById(id) { return (await pool.query(`${SELECT_ACCOUNT} WHERE u.id=$1`, [id])).rows[0] || null; },
    async recordLogin(row) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const r = await client.query(`UPDATE public.users SET last_login_at=now()
          WHERE id=$1 AND role=$2 AND status='aktif' AND email_verified_at IS NOT NULL AND password_hash=$3 RETURNING id`, [row.id,row.role,row.password_hash]);
        if (!r.rowCount) { await client.query('ROLLBACK'); return false; }
        await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
          VALUES($1,'auth.login','users',$1,jsonb_build_object('role',$2::text))`, [row.id,row.role]);
        await client.query('COMMIT'); return true;
      } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
      finally { client.release(); }
    }
  };
}
