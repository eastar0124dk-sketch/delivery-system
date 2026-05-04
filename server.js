const express = require('express');
const { Database } = require('node-sqlite3-wasm');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════
//  관리자/직원 비밀번호 (여기서 변경하세요!)
// ══════════════════════════════════════════
const ADMIN_PASSWORD       = 'Liam#0801!';  // 관리자 비밀번호 (모든 권한)
const METTLER_STAFF_PASSWORD = 'staff1234'; // 메틀러 직원 공통 비밀번호
// 회사명 (인수증명서에 표시)
const COMPANY_NAME = '출고 인수증명 시스템';

// ──────────────────────────────────────────
//  DB 설정
// ──────────────────────────────────────────
const db = new Database(path.join(__dirname, 'delivery.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS delivery_records (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no     TEXT    UNIQUE NOT NULL,
    delivery_date TEXT,
    arrival_time  TEXT,
    product_name  TEXT,
    quantity      TEXT,
    customer_company TEXT,
    customer_address TEXT,
    receiver_name    TEXT,
    receiver_phone   TEXT,
    driver_name      TEXT,
    driver_phone     TEXT,
    vehicle_no       TEXT,
    wait_time        TEXT,
    work_time        TEXT,
    waste_collection TEXT,
    extra_locations  TEXT,
    notes            TEXT,
    driver_signature   TEXT,
    receiver_signature TEXT,
    signed_at TEXT,
    status    TEXT DEFAULT 'draft',
    client_code TEXT DEFAULT 'mettler',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
// 기존 DB에 client_code 컬럼이 없으면 추가 (마이그레이션)
try {
  db.exec("ALTER TABLE delivery_records ADD COLUMN client_code TEXT DEFAULT 'mettler'");
  db.exec("UPDATE delivery_records SET client_code='mettler' WHERE client_code IS NULL");
} catch(e) { /* 이미 존재하면 무시 */ }

// 캐논 청구 데이터 (월별 JSON 저장) - PC 간 공유용
db.exec(`
  CREATE TABLE IF NOT EXISTS canon_billing (
    month      TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS canon_billing_meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  )
`);

// 캐논 직원 사용자 (관리자가 생성/관리)
db.exec(`
  CREATE TABLE IF NOT EXISTS canon_staff_users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    name       TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
// 캐논 직원 시드 (jmshin / staff1234)
try {
  const exists = db.prepare('SELECT 1 FROM canon_staff_users WHERE username = ?').get(['jmshin']);
  if (!exists) {
    db.prepare('INSERT INTO canon_staff_users(username, password, name) VALUES (?, ?, ?)')
      .run(['jmshin', 'staff1234', '신재민']);
  }
} catch(e) { /* 무시 */ }

// 메틀러토레도 운송비 청구서 (월별 1개)
db.exec(`
  CREATE TABLE IF NOT EXISTS mettler_transport_billing (
    period_key TEXT PRIMARY KEY,   -- 예: '2026-04' 또는 '2026-04-16~2026-05-15'
    data       TEXT NOT NULL,       -- JSON 배열 (행 데이터)
    meta       TEXT,                -- JSON (기간/운송업체 등 메타)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ──────────────────────────────────────────
//  인증 토큰 관리 (메모리)
//  validTokens: Map<token, { role: 'admin'|'mettler_staff'|'canon_staff', username?, expires }>
// ──────────────────────────────────────────
const validTokens = new Map();

function getTokenInfo(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const info = validTokens.get(token);
  if (!info) return null;
  if (info.expires && Date.now() > info.expires) {
    validTokens.delete(token);
    return null;
  }
  return { ...info, token };
}

// 모든 인증된 사용자 (관리자 + 직원 모두 통과)
function requireAuth(req, res, next) {
  const info = getTokenInfo(req);
  if (!info) return res.status(401).json({ error: '인증이 필요합니다.' });
  req.auth = info;
  next();
}

// 관리자 전용
function requireAdmin(req, res, next) {
  const info = getTokenInfo(req);
  if (!info) return res.status(401).json({ error: '인증이 필요합니다.' });
  if (info.role !== 'admin') return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  req.auth = info;
  next();
}

// ──────────────────────────────────────────
//  미들웨어
// ──────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ──────────────────────────────────────────
//  인증
// ──────────────────────────────────────────
// 통합 로그인 — role 자동 판별
//   { mode: 'admin',          password }
//   { mode: 'mettler_staff',  password }
//   { mode: 'canon_staff',    username, password }
app.post('/api/auth', (req, res) => {
  const { mode, username, password } = req.body || {};
  const TTL = 8 * 60 * 60 * 1000;
  const issue = (info) => {
    const token = crypto.randomBytes(32).toString('hex');
    validTokens.set(token, { ...info, expires: Date.now() + TTL });
    return token;
  };

  // 관리자
  if (mode === 'admin') {
    if (password === ADMIN_PASSWORD) {
      return res.json({ token: issue({ role: 'admin' }), role: 'admin' });
    }
    return res.status(401).json({ error: '관리자 비밀번호가 틀렸습니다.' });
  }

  // 메틀러 직원 (공통 PW)
  if (mode === 'mettler_staff') {
    if (password === METTLER_STAFF_PASSWORD) {
      return res.json({ token: issue({ role: 'mettler_staff' }), role: 'mettler_staff' });
    }
    return res.status(401).json({ error: '직원 비밀번호가 틀렸습니다.' });
  }

  // 캐논 직원 (사용자명 + PW)
  if (mode === 'canon_staff') {
    if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });
    const user = db.prepare('SELECT * FROM canon_staff_users WHERE username = ?').get(username.trim());
    if (!user || user.password !== password) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
    }
    return res.json({
      token: issue({ role: 'canon_staff', username: user.username, name: user.name }),
      role: 'canon_staff', username: user.username, name: user.name
    });
  }

  // 구버전 호환 (mode 없이 password만 보내는 경우 → 관리자 시도)
  if (password === ADMIN_PASSWORD) {
    return res.json({ token: issue({ role: 'admin' }), role: 'admin' });
  }
  if (password === METTLER_STAFF_PASSWORD) {
    return res.json({ token: issue({ role: 'mettler_staff' }), role: 'mettler_staff' });
  }
  res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
});

app.get('/api/auth/check', requireAuth, (req, res) => {
  res.json({ ok: true, role: req.auth.role, username: req.auth.username, name: req.auth.name });
});

// ──────────────────────────────────────────
//  캐논 직원 사용자 관리 (관리자 전용)
// ──────────────────────────────────────────
app.get('/api/canon-users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, name, created_at FROM canon_staff_users ORDER BY id').all();
  res.json({ data: rows });
});

app.post('/api/canon-users', requireAdmin, (req, res) => {
  const { username, password, name } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '아이디와 비밀번호는 필수입니다.' });
  try {
    const r = db.prepare('INSERT INTO canon_staff_users(username, password, name) VALUES (?,?,?)')
      .run([username.trim(), password, name || '']);
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/canon-users/:id', requireAdmin, (req, res) => {
  const { username, password, name } = req.body || {};
  const fields = []; const params = [];
  if (username) { fields.push('username = ?'); params.push(username.trim()); }
  if (password) { fields.push('password = ?'); params.push(password); }
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (!fields.length) return res.status(400).json({ error: '수정할 항목이 없습니다.' });
  params.push(req.params.id);
  try {
    db.prepare(`UPDATE canon_staff_users SET ${fields.join(', ')} WHERE id = ?`).run(params);
    res.json({ success: true });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/canon-users/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM canon_staff_users WHERE id = ?').run([req.params.id]);
  res.json({ success: true });
});

// ──────────────────────────────────────────
//  메틀러토레도 운송비 청구서
// ──────────────────────────────────────────
app.get('/api/mettler-transport/:periodKey', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM mettler_transport_billing WHERE period_key = ?')
    .get(req.params.periodKey);
  if (!row) return res.json({ data: [], meta: null });
  try {
    res.json({
      data: JSON.parse(row.data || '[]'),
      meta: row.meta ? JSON.parse(row.meta) : null,
      updated_at: row.updated_at
    });
  } catch(e) {
    res.json({ data: [], meta: null });
  }
});

app.put('/api/mettler-transport/:periodKey', requireAuth, (req, res) => {
  const { data, meta } = req.body || {};
  if (!Array.isArray(data)) return res.status(400).json({ error: 'data 배열이 필요합니다.' });
  const dataJson = JSON.stringify(data);
  const metaJson = meta ? JSON.stringify(meta) : null;
  db.prepare(`
    INSERT INTO mettler_transport_billing(period_key, data, meta, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(period_key) DO UPDATE SET
      data = excluded.data, meta = excluded.meta, updated_at = CURRENT_TIMESTAMP
  `).run([req.params.periodKey, dataJson, metaJson]);
  res.json({ success: true });
});

app.delete('/api/mettler-transport/:periodKey', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM mettler_transport_billing WHERE period_key = ?').run([req.params.periodKey]);
  res.json({ success: true });
});

// 모든 청구서 기간 목록 조회 (관리자용)
app.get('/api/mettler-transport', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT period_key, updated_at FROM mettler_transport_billing ORDER BY period_key DESC').all();
  res.json({ data: rows });
});

// ──────────────────────────────────────────
//  대시보드 통계 (오늘 기준)
// ──────────────────────────────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    // 한국 시간 기준 오늘 날짜 (서버가 UTC일 수 있으므로 KST 변환)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kst = new Date(now.getTime() + kstOffset);
    const ymd = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth()+1).padStart(2,'0')}-${String(kst.getUTCDate()).padStart(2,'0')}`;

    // 오늘 등록 오더 (delivery_date = today)
    const totalRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM delivery_records WHERE delivery_date = ?"
    ).get([ymd]);
    const total_today = totalRow ? totalRow.cnt : 0;

    // 오늘 서명 완료 (signed_at에 today가 들어있음 — 한국 형식 가능성 대응)
    const signedRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM delivery_records WHERE status = 'signed' AND signed_at LIKE ?"
    ).get([`%${ymd}%`]);
    let signed_today = signedRow ? signedRow.cnt : 0;
    // 보조: signed_at이 ko-KR 형식("2026. 5. 2.")일 수 있으므로 더 관대하게 매칭
    if (signed_today === 0) {
      const yr = String(kst.getUTCFullYear());
      const mo = String(kst.getUTCMonth()+1);
      const da = String(kst.getUTCDate());
      const altPattern = `${yr}. ${mo}. ${da}.`;
      const altRow = db.prepare(
        "SELECT COUNT(*) as cnt FROM delivery_records WHERE status = 'signed' AND signed_at LIKE ?"
      ).get([`%${altPattern}%`]);
      signed_today = altRow ? altRow.cnt : 0;
    }

    // 오늘 미서명 대기
    const pendingRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM delivery_records WHERE delivery_date = ? AND (status IS NULL OR status != 'signed')"
    ).get([ymd]);
    const pending_today = pendingRow ? pendingRow.cnt : 0;

    // 처리중 클레임 (claims 테이블 있으면 카운트, 없으면 0)
    let open_claims = 0;
    try {
      const cr = db.prepare(
        "SELECT COUNT(*) as cnt FROM claims WHERE status IN ('접수','처리중','대기')"
      ).get();
      open_claims = cr ? cr.cnt : 0;
    } catch(_) { open_claims = 0; }

    // 최근 서명 완료 목록 (최신 20건)
    const recent_signed = db.prepare(`
      SELECT id, order_no, customer_company, signed_at, delivery_date, status
      FROM delivery_records
      WHERE status = 'signed'
      ORDER BY id DESC LIMIT 20
    `).all();

    res.json({
      total_today, signed_today, pending_today, open_claims,
      recent_signed
    });
  } catch(e) {
    console.error('[/api/stats]', e);
    res.json({ total_today:0, signed_today:0, pending_today:0, open_claims:0, recent_signed:[] });
  }
});

// ──────────────────────────────────────────
//  공개 API (배송기사용)
// ──────────────────────────────────────────

// 기사가 DN번호로 오더 검색
app.get('/api/sign/search', (req, res) => {
  const { order_no } = req.query;
  if (!order_no) return res.json({ data: [] });
  const row = db.prepare(
    'SELECT id, order_no, delivery_date, product_name, quantity, customer_company, customer_address, receiver_name, driver_name, driver_phone, vehicle_no, status, extra_locations, wait_time, work_time, notes FROM delivery_records WHERE order_no = ?'
  ).get(order_no.trim());
  res.json({ data: row ? [row] : [] });
});

// 기사 서명 제출 (draft 상태에서만 허용)
app.post('/api/sign/:id', (req, res) => {
  const record = db.prepare('SELECT id, status FROM delivery_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: '오더를 찾을 수 없습니다.' });
  if (record.status === 'signed') return res.status(400).json({ error: '이미 서명이 완료된 오더입니다.' });

  const { driver_name, driver_phone, vehicle_no, receiver_name, driver_signature, receiver_signature } = req.body;
  if (!driver_signature || !receiver_signature) return res.status(400).json({ error: '서명 데이터가 없습니다.' });

  db.prepare(`
    UPDATE delivery_records SET
      driver_name = ?, driver_phone = ?, vehicle_no = ?,
      receiver_name = ?, driver_signature = ?, receiver_signature = ?,
      signed_at = ?, status = 'signed'
    WHERE id = ?
  `).run([driver_name, driver_phone, vehicle_no, receiver_name,
    driver_signature, receiver_signature,
    new Date().toLocaleString('ko-KR'), req.params.id]);

  res.json({ success: true });
});

// ──────────────────────────────────────────
//  관리자 API
// ──────────────────────────────────────────

// 목록 조회 (검색/필터)
app.get('/api/records', requireAuth, (req, res) => {
  const { search, dateFrom, dateTo, status, dn, company, client_code, limit = 1000 } = req.query;
  let query = 'SELECT * FROM delivery_records WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (order_no LIKE ? OR customer_company LIKE ? OR receiver_name LIKE ? OR product_name LIKE ? OR driver_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  if (dn) { query += ' AND order_no LIKE ?'; params.push(`%${dn}%`); }
  if (company) { query += ' AND customer_company LIKE ?'; params.push(`%${company}%`); }
  if (dateFrom) { query += ' AND delivery_date >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND delivery_date <= ?'; params.push(dateTo); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (client_code) { query += ' AND (client_code = ? OR client_code IS NULL)'; params.push(client_code); }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const rows = db.prepare(query).all(params);
  res.json({ data: rows });
});

// 단건 조회
app.get('/api/records/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM delivery_records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// 오더 등록
app.post('/api/records', requireAuth, (req, res) => {
  const d = req.body;
  const dup = db.prepare('SELECT id FROM delivery_records WHERE order_no = ?').get(d.order_no);
  if (dup) return res.status(400).json({ error: `DN번호 [${d.order_no}]이 이미 등록되어 있습니다.` });

  const result = db.prepare(`
    INSERT INTO delivery_records
      (order_no, delivery_date, arrival_time, product_name, quantity,
       customer_company, customer_address, receiver_name, receiver_phone,
       driver_name, driver_phone, vehicle_no, wait_time, work_time,
       waste_collection, extra_locations, notes, status, client_code)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?)
  `).run([
    d.order_no, d.delivery_date, d.arrival_time, d.product_name, d.quantity,
    d.customer_company, d.customer_address, d.receiver_name, d.receiver_phone,
    d.driver_name, d.driver_phone, d.vehicle_no, d.wait_time, d.work_time,
    d.waste_collection, d.extra_locations, d.notes,
    d.client_code || 'mettler'
  ]);
  res.json({ id: result.lastInsertRowid, ...d });
});

// 오더 수정 (관리자)
app.patch('/api/records/:id', requireAuth, (req, res) => {
  const d = req.body;
  const fields = Object.keys(d).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(d), req.params.id];
  db.prepare(`UPDATE delivery_records SET ${fields} WHERE id = ?`).run(values);
  res.json({ success: true });
});

// 오더 삭제
app.delete('/api/records/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM delivery_records WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 회사명 제공 (프론트엔드용)
app.get('/api/config', (req, res) => {
  res.json({ companyName: COMPANY_NAME });
});

// ──────────────────────────────────────────
//  캐논 청구 데이터 (서버 저장 - PC 간 공유)
// ──────────────────────────────────────────
// 전체 월 데이터 조회
app.get('/api/canon/billing', (req, res) => {
  const rows = db.prepare('SELECT month, data FROM canon_billing').all();
  const out = {};
  for (const r of rows) {
    try { out[r.month] = JSON.parse(r.data); } catch(e) { out[r.month] = []; }
  }
  const meta = db.prepare('SELECT value FROM canon_billing_meta WHERE key=?').get('manualSort');
  res.json({ data: out, manualSort: meta ? JSON.parse(meta.value) : [] });
});

// 특정 월 저장 (덮어쓰기)
app.post('/api/canon/billing', (req, res) => {
  const { month, rows, manualSort } = req.body || {};
  if (!month || !Array.isArray(rows)) return res.status(400).json({ error: 'month와 rows 필수' });
  const payload = JSON.stringify(rows);
  db.prepare(`
    INSERT INTO canon_billing (month, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(month) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
  `).run([month, payload]);
  if (Array.isArray(manualSort)) {
    db.prepare(`
      INSERT INTO canon_billing_meta (key, value) VALUES ('manualSort', ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).run([JSON.stringify(manualSort)]);
  }
  res.json({ success: true });
});

// 특정 월 삭제
app.delete('/api/canon/billing/:month', (req, res) => {
  db.prepare('DELETE FROM canon_billing WHERE month=?').run(req.params.month);
  res.json({ success: true });
});

// ──────────────────────────────────────────
//  서버 시작
// ──────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const interfaces = require('os').networkInterfaces();
  let localIP = 'localhost';
  Object.values(interfaces).flat().forEach(i => {
    if (i.family === 'IPv4' && !i.internal) localIP = i.address;
  });
  console.log('══════════════════════════════════════════');
  console.log('  통합 화주관리 시스템 가동 중');
  console.log('══════════════════════════════════════════');
  console.log(`  PC 접속:     http://localhost:${PORT}`);
  console.log(`  모바일 접속: http://${localIP}:${PORT}`);
  console.log(`  관리자 비밀번호: ${ADMIN_PASSWORD}`);
  console.log(`  메틀러 직원 비밀번호: ${METTLER_STAFF_PASSWORD}`);
  console.log('  (비밀번호는 server.js 상단에서 변경 가능)');
  console.log('══════════════════════════════════════════');
});
