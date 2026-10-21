// =====================================================================================
//  Almacén de datos del servidor: cuentas (Discord), sesiones, mundos en la nube y vetos.
//   · Con DATABASE_URL (Railway u otro Postgres) y el paquete «pg»: PostgreSQL.
//   · Sin eso (jugar.bat en tu ordenador): un archivo JSON en la carpeta oculta .datos/
//  Las dos formas tienen las mismas funciones, así que servidor.js no sabe cuál usa.
// =====================================================================================
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const DAY = 86400000, SESSION_DAYS = 30;
const token = () => crypto.randomBytes(24).toString('base64url');
// ---------- PostgreSQL ----------
async function pgStore(url) {
  const { Pool } = require('pg');
  // Red interna del alojamiento (Render: «dpg-…-a» sin puntos; Railway: «.railway.internal») o local: sin SSL
  let host = ''; try { host = new URL(url).hostname; } catch (e) { }
  const internal = !host.includes('.') || /localhost|127\.0\.0\.1|\.railway\.internal$/.test(host);
  const pool = new Pool({ connectionString: url, ssl: internal ? false : { rejectUnauthorized: false }, max: 5 });
  const q = (t, v) => pool.query(t, v);
  await q(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, username TEXT, avatar TEXT, created TIMESTAMPTZ DEFAULT now(), seen TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created TIMESTAMPTZ DEFAULT now(), expires TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, id TEXT NOT NULL, name TEXT, data TEXT NOT NULL, meta JSONB, updated TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (user_id, id));
    CREATE TABLE IF NOT EXISTS bans (host TEXT NOT NULL, banned TEXT NOT NULL, created TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (host, banned));`);
  await q('DELETE FROM sessions WHERE expires < now()');
  return {
    kind: 'postgres',
    async upsertUser(u) { await q(`INSERT INTO users (id, name, username, avatar) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=$2, username=$3, avatar=$4, seen=now()`, [u.id, u.name, u.username, u.avatar]); },
    async newSession(uid) { const t = token(); await q('INSERT INTO sessions (token, user_id, expires) VALUES ($1,$2,$3)', [t, uid, new Date(Date.now() + SESSION_DAYS * DAY)]); return t; },
    async sessionUser(t) { const r = await q('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires > now()', [t]); if (r.rows[0]) q('UPDATE users SET seen=now() WHERE id=$1', [r.rows[0].id]); return r.rows[0] || null; },
    async endSession(t) { await q('DELETE FROM sessions WHERE token=$1', [t]); },
    async listSaves(uid) { return (await q('SELECT id, name, meta, updated, length(data) AS size FROM saves WHERE user_id=$1 ORDER BY updated DESC', [uid])).rows; },
    async getSave(uid, id) { return (await q('SELECT id, name, data, meta, updated FROM saves WHERE user_id=$1 AND id=$2', [uid, id])).rows[0] || null; },
    async putSave(uid, id, name, data, meta) { await q(`INSERT INTO saves (user_id, id, name, data, meta, updated) VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT (user_id, id) DO UPDATE SET name=$3, data=$4, meta=$5, updated=now()`, [uid, id, name, data, meta || {}]); },
    async delSave(uid, id) { await q('DELETE FROM saves WHERE user_id=$1 AND id=$2', [uid, id]); },
    async bans(host) { return new Set((await q('SELECT banned FROM bans WHERE host=$1', [host])).rows.map(r => r.banned)); },
    async addBan(host, who) { await q('INSERT INTO bans (host, banned) VALUES ($1,$2) ON CONFLICT DO NOTHING', [host, who]); },
    async delBan(host, who) { await q('DELETE FROM bans WHERE host=$1 AND banned=$2', [host, who]); },
  };
}
// ---------- Archivo JSON (local) ----------
function fileStore(dir) {
  fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, 'datos.json');
  let D = { users: {}, sessions: {}, saves: {}, bans: {} }; try { D = { ...D, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { }
  let tm = 0; const save = () => { clearTimeout(tm); tm = setTimeout(() => { try { fs.writeFileSync(file + '.tmp', JSON.stringify(D)); fs.renameSync(file + '.tmp', file); } catch (e) { console.error('No se pudo guardar', e.message); } }, 300); };
  for (const t in D.sessions) if (D.sessions[t].expires < Date.now()) delete D.sessions[t];
  return {
    kind: 'archivo',
    async upsertUser(u) { D.users[u.id] = { ...(D.users[u.id] || { created: Date.now() }), ...u, seen: Date.now() }; save(); },
    async newSession(uid) { const t = token(); D.sessions[t] = { user_id: uid, expires: Date.now() + SESSION_DAYS * DAY }; save(); return t; },
    async sessionUser(t) { const s = D.sessions[t]; return s && s.expires > Date.now() ? D.users[s.user_id] || null : null; },
    async endSession(t) { delete D.sessions[t]; save(); },
    async listSaves(uid) { return Object.values(D.saves[uid] || {}).map(s => ({ id: s.id, name: s.name, meta: s.meta, updated: s.updated, size: s.data.length })).sort((a, b) => b.updated - a.updated); },
    async getSave(uid, id) { return (D.saves[uid] || {})[id] || null; },
    async putSave(uid, id, name, data, meta) { (D.saves[uid] || (D.saves[uid] = {}))[id] = { id, name, data, meta: meta || {}, updated: Date.now() }; save(); },
    async delSave(uid, id) { if (D.saves[uid]) delete D.saves[uid][id]; save(); },
    async bans(host) { return new Set(D.bans[host] || []); },
    async addBan(host, who) { const b = new Set(D.bans[host] || []); b.add(who); D.bans[host] = [...b]; save(); },
    async delBan(host, who) { D.bans[host] = (D.bans[host] || []).filter(x => x !== who); save(); },
  };
}
async function openStore(root) {
  if (process.env.DATABASE_URL) {
    try { return await pgStore(process.env.DATABASE_URL); }
    catch (e) { console.error('  No se pudo usar PostgreSQL (' + e.message + '); se usará un archivo local.'); }
  }
  return fileStore(path.join(root, '.datos'));
}
module.exports = { openStore };
