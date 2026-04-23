const express = require('express');
const { Database } = require('node-sqlite3-wasm');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════
//  관리자 비밀번호 (여기서 변경하세요!)
// ══════════════════════════════════════════
const ADMIN_PASSWORD = 'admin1234';
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

// ──────────────────────────────────────────
//  인증 토큰 관리 (메모리)
// ──────────────────────────────────────────
const validTokens = new Set();

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (token && validTokens.has(token)) return next();
  res.status(401).json({ error: '관리자 인증이 필요합니다.' });
}

// ──────────────────────────────────────────
//  미들웨어
// ──────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ──────────────────────────────────────────
//  인증
// ──────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    validTokens.add(token);
    setTimeout(() => validTokens.delete(token), 8 * 60 * 60 * 1000); // 8시간 유효
    res.json({ token });
  } else {
    res.status(401).json({ error: '비밀번호가 틀렸습니다.' });
  }
});

app.get('/api/auth/check', requireAdmin, (req, res) => {
  res.json({ ok: true });
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
app.get('/api/records', requireAdmin, (req, res) => {
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
app.get('/api/records/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM delivery_records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// 오더 등록
app.post('/api/records', requireAdmin, (req, res) => {
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
app.patch('/api/records/:id', requireAdmin, (req, res) => {
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
//  서버 시작
// ──────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const interfaces = require('os').networkInterfaces();
  let localIP = 'localhost';
  Object.values(interfaces).flat().forEach(i => {
    if (i.family === 'IPv4' && !i.internal) localIP = i.address;
  });
  console.log('══════════════════════════════════════════');
  console.log('  배송 인수증명 시스템 가동 중');
  console.log('══════════════════════════════════════════');
  console.log(`  PC 접속:     http://localhost:${PORT}`);
  console.log(`  모바일 접속: http://${localIP}:${PORT}`);
  console.log(`  관리자 비밀번호: ${ADMIN_PASSWORD}`);
  console.log('  (비밀번호는 server.js 상단에서 변경 가능)');
  console.log('══════════════════════════════════════════');
});
