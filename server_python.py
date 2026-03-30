#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
os.environ.setdefault('PYTHONUTF8', '1')

import json, secrets, re, mimetypes, socket
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# ── 환경변수 ───────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get('DATABASE_URL', '')   # Render/Supabase 클라우드용
STATIC       = os.path.join(os.path.dirname(__file__), 'public')
ADMIN_PW     = os.environ.get('ADMIN_PW', 'admin1234')
STAFF_PW     = os.environ.get('STAFF_PW', 'staff1234')
COMPANY      = os.environ.get('COMPANY',  '출고 인수증명 시스템')
PORT         = int(os.environ.get('PORT', 3000))

valid_tokens       = set()   # 관리자 토큰
valid_staff_tokens = set()   # 직원 토큰

# ── DB 레이어 (PostgreSQL 또는 SQLite 자동 선택) ──────────────────────
if DATABASE_URL:
    # ── PostgreSQL (클라우드 배포) ──
    import psycopg2, psycopg2.extras

    def _conn():
        return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor,
                                sslmode='require')

    def init_db():
        c = _conn()
        cur = c.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS delivery_records (
            id SERIAL PRIMARY KEY,
            order_no TEXT UNIQUE NOT NULL,
            delivery_date TEXT, arrival_time TEXT, product_name TEXT,
            quantity TEXT, customer_company TEXT, customer_address TEXT,
            receiver_name TEXT, receiver_phone TEXT, driver_name TEXT,
            driver_phone TEXT, vehicle_no TEXT, wait_time TEXT, work_time TEXT,
            waste_collection TEXT, extra_locations TEXT, notes TEXT,
            driver_signature TEXT, receiver_signature TEXT, signed_at TEXT,
            status TEXT DEFAULT \'draft\',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
        c.commit(); c.close()

    def db_fetch(sql, params=()):
        sql = sql.replace('?','%s')
        c = _conn(); cur = c.cursor(); cur.execute(sql, params)
        row = cur.fetchone(); c.close()
        return dict(row) if row else None

    def db_fetchall(sql, params=()):
        sql = sql.replace('?','%s')
        c = _conn(); cur = c.cursor(); cur.execute(sql, params)
        rows = cur.fetchall(); c.close()
        return [dict(r) for r in rows]

    def db_exec(sql, params=(), returning=False):
        sql = sql.replace('?','%s')
        c = _conn(); cur = c.cursor(); cur.execute(sql, params)
        result = None
        if returning:
            row = cur.fetchone()
            result = dict(row)['id'] if row else None
        c.commit(); c.close()
        return result

    def db_insert(sql, params=()):
        sql = sql.replace('?','%s')
        if 'RETURNING' not in sql.upper():
            sql = sql.strip() + ' RETURNING id'
        c = _conn(); cur = c.cursor(); cur.execute(sql, params)
        row = cur.fetchone()
        c.commit(); c.close()
        return dict(row)['id'] if row else None

    INTEGRITY_EXC = psycopg2.IntegrityError

else:
    # ── SQLite (로컬 실행) ──
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), 'delivery.db')

    def _conn():
        c = sqlite3.connect(DB_PATH); c.row_factory = sqlite3.Row; return c

    def init_db():
        c = _conn()
        c.execute('''CREATE TABLE IF NOT EXISTS delivery_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE NOT NULL,
            delivery_date TEXT, arrival_time TEXT, product_name TEXT,
            quantity TEXT, customer_company TEXT, customer_address TEXT,
            receiver_name TEXT, receiver_phone TEXT, driver_name TEXT,
            driver_phone TEXT, vehicle_no TEXT, wait_time TEXT, work_time TEXT,
            waste_collection TEXT, extra_locations TEXT, notes TEXT,
            driver_signature TEXT, receiver_signature TEXT, signed_at TEXT,
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        c.commit(); c.close()

    def db_fetch(sql, params=()):
        c = _conn(); row = c.execute(sql, params).fetchone(); c.close()
        return dict(row) if row else None

    def db_fetchall(sql, params=()):
        c = _conn(); rows = c.execute(sql, params).fetchall(); c.close()
        return [dict(r) for r in rows]

    def db_exec(sql, params=(), returning=False):
        c = _conn(); cur = c.execute(sql, params)
        result = cur.lastrowid if returning else None
        c.commit(); c.close()
        return result

    def db_insert(sql, params=()):
        c = _conn(); cur = c.execute(sql, params)
        new_id = cur.lastrowid; c.commit(); c.close()
        return new_id

    INTEGRITY_EXC = sqlite3.IntegrityError


# ── 핸들러 ───────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args): pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def get_token(self):
        return self.headers.get('Authorization','').replace('Bearer ','').strip()

    def token_ok(self, admin_only=False):
        t = self.get_token()
        if t and t in valid_tokens: return True
        if not admin_only and t and t in valid_staff_tokens: return True
        return False

    def _serve_static(self, req_path):
        safe = req_path.lstrip('/')
        if not safe: safe = 'index.html'
        file_path = os.path.normpath(os.path.join(STATIC, safe))
        if not file_path.startswith(os.path.normpath(STATIC)):
            self.send_response(403); self.end_headers(); return
        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, 'index.html')
        if not os.path.isfile(file_path):
            self.send_response(404)
            self.send_header('Content-Type','text/plain')
            self.end_headers()
            self.wfile.write(b'404 Not Found')
            return
        mime, _ = mimetypes.guess_type(file_path)
        if not mime: mime = 'application/octet-stream'
        with open(file_path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        self.end_headers()

    def do_GET(self):
      try:
        p  = urlparse(self.path)
        path = p.path.rstrip('/')
        qs = parse_qs(p.query)
        g  = lambda k, d='': (qs.get(k, [''])[0] or d)

        if path == '/api/config':
            return self.send_json({'companyName': COMPANY})

        if path == '/api/auth/check':
            if self.token_ok(): return self.send_json({'ok': True})
            return self.send_json({'error':'Unauthorized'}, 401)

        # 기사 검색 (공개)
        if path == '/api/sign/search':
            order_no = g('order_no').strip()
            if not order_no: return self.send_json({'data': []})
            row = db_fetch(
                'SELECT id,order_no,delivery_date,product_name,quantity,customer_company,'
                'customer_address,receiver_name,driver_name,driver_phone,vehicle_no,'
                'status,extra_locations,wait_time,work_time,notes '
                'FROM delivery_records WHERE order_no=?', (order_no,))
            return self.send_json({'data': [row] if row else []})

        # 관리자: 목록
        if path == '/api/records':
            if not self.token_ok(admin_only=True): return self.send_json({'error':'Unauthorized'}, 401)
            search    = g('search'); dn = g('dn'); company = g('company')
            date_from = g('dateFrom'); date_to = g('dateTo'); status = g('status')
            limit     = int(g('limit','1000') or 1000)
            sql = 'SELECT * FROM delivery_records WHERE 1=1'; params = []
            if search:
                sql += ' AND (order_no LIKE ? OR customer_company LIKE ? OR receiver_name LIKE ? OR product_name LIKE ?)'
                s = f'%{search}%'; params += [s,s,s,s]
            if dn:        sql += ' AND order_no LIKE ?';          params.append(f'%{dn}%')
            if company:   sql += ' AND customer_company LIKE ?';  params.append(f'%{company}%')
            if date_from: sql += ' AND delivery_date >= ?';       params.append(date_from)
            if date_to:   sql += ' AND delivery_date <= ?';       params.append(date_to)
            if status:    sql += ' AND status=?';                 params.append(status)
            sql += ' ORDER BY created_at DESC LIMIT ?'; params.append(limit)
            rows = db_fetchall(sql, params)
            return self.send_json({'data': rows})

        # 관리자: 단건
        m = re.match(r'^/api/records/(\d+)$', path)
        if m:
            if not self.token_ok(): return self.send_json({'error':'Unauthorized'}, 401)
            row = db_fetch('SELECT * FROM delivery_records WHERE id=?', (m.group(1),))
            if not row: return self.send_json({'error':'Not found'}, 404)
            return self.send_json(row)

        self._serve_static(p.path)
      except Exception as e:
        try: self.send_response(500); self.end_headers()
        except: pass

    def do_POST(self):
      try:
        p    = urlparse(self.path).path.rstrip('/')
        body = self.read_body()

        # 인증
        if p == '/api/auth':
            if body.get('password') == ADMIN_PW:
                t = secrets.token_hex(32)
                valid_tokens.add(t)
                return self.send_json({'token': t, 'role': 'admin'})
            elif body.get('password') == STAFF_PW:
                t = secrets.token_hex(32)
                valid_staff_tokens.add(t)
                return self.send_json({'token': t, 'role': 'staff'})
            return self.send_json({'error':'비밀번호가 틀렸습니다.'}, 401)

        # 기사 서명 제출 (공개)
        m = re.match(r'^/api/sign/(\d+)$', p)
        if m:
            rid = m.group(1)
            rec = db_fetch('SELECT id,status FROM delivery_records WHERE id=?', (rid,))
            if not rec: return self.send_json({'error':'오더를 찾을 수 없습니다.'}, 404)
            if rec['status'] == 'signed': return self.send_json({'error':'이미 서명 완료된 오더입니다.'}, 400)
            if not body.get('driver_signature') or not body.get('receiver_signature'):
                return self.send_json({'error':'서명 데이터가 없습니다.'}, 400)
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            db_exec('''UPDATE delivery_records SET
                driver_name=?,driver_phone=?,vehicle_no=?,receiver_name=?,
                driver_signature=?,receiver_signature=?,signed_at=?,status='signed'
                WHERE id=?''',
                (body.get('driver_name'), body.get('driver_phone'), body.get('vehicle_no'),
                 body.get('receiver_name'), body['driver_signature'], body['receiver_signature'], now, rid))
            return self.send_json({'success': True})

        # 오더 등록 (관리자)
        if p == '/api/records':
            if not self.token_ok(): return self.send_json({'error':'Unauthorized'}, 401)
            try:
                new_id = db_insert(
                    '''INSERT INTO delivery_records
                        (order_no,delivery_date,arrival_time,product_name,quantity,
                         customer_company,customer_address,receiver_name,receiver_phone,
                         driver_name,driver_phone,vehicle_no,wait_time,work_time,
                         waste_collection,extra_locations,notes)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (body['order_no'], body.get('delivery_date'), body.get('arrival_time'),
                     body.get('product_name'), body.get('quantity'), body.get('customer_company'),
                     body.get('customer_address'), body.get('receiver_name'), body.get('receiver_phone'),
                     body.get('driver_name'), body.get('driver_phone'), body.get('vehicle_no'),
                     body.get('wait_time'), body.get('work_time'), body.get('waste_collection'),
                     body.get('extra_locations'), body.get('notes')))
                return self.send_json({'id': new_id, **body})
            except INTEGRITY_EXC:
                return self.send_json({'error': f"DN번호 [{body.get('order_no')}]이 이미 등록되어 있습니다."}, 400)

        self.send_json({'error':'Not found'}, 404)
      except Exception as e:
        try:
            self.send_json({'error': str(e)}, 500)
        except Exception:
            pass

    def do_PATCH(self):
      try:
        p = urlparse(self.path).path.rstrip('/')
        if not self.token_ok(): return self.send_json({'error':'Unauthorized'}, 401)
        m = re.match(r'^/api/records/(\d+)$', p)
        if m:
            body = self.read_body()
            if DATABASE_URL:
                sets = ', '.join(f'{k}=%s' for k in body.keys())
            else:
                sets = ', '.join(f'{k}=?' for k in body.keys())
            vals = list(body.values()) + [m.group(1)]
            db_exec(f'UPDATE delivery_records SET {sets} WHERE id=?', vals)
            return self.send_json({'success': True})
        self.send_json({'error':'Not found'}, 404)
      except Exception:
        except Exception:
            try:
                self.send_response(500)
                self.end_headers()
            except Exception:
                pass

    def do_DELETE(self):
      try:
        p = urlparse(self.path).path.rstrip('/')
        if not self.token_ok(): return self.send_json({'error':'Unauthorized'}, 401)
        m = re.match(r'^/api/records/(\d+)$', p)
        if m:
            db_exec('DELETE FROM delivery_records WHERE id=?', (m.group(1),))
            return self.send_json({'success': True})
        self.send_json({'error':'Not found'}, 404)
      except Exception:
        try: self.send_response(500); self.end_headers()
        except: pass


# ── 실행 ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    local_ip = '127.0.0.1'
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80)); local_ip = s.getsockname()[0]; s.close()
    except Exception: pass

    server = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    server.allow_reuse_address = True
    sep = '=' * 44
    print(sep)
    print('  [배송 인수증명 시스템] 가동 중')
    print(sep)
    print(f'  PC  : http://localhost:{PORT}')
    print(f'  LAN : http://{local_ip}:{PORT}')
    print(f'  DB  : {"PostgreSQL (Cloud)" if DATABASE_URL else "SQLite (Local)"}')
    print('  Ctrl+C 로 종료')
    print(sep)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Server stopped.')
