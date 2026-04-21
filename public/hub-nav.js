function initNav(currentPage) {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', sans-serif; margin: 0; }
    .hub-sidebar {
      position: fixed; left: 0; top: 0; width: 220px; height: 100vh;
      background: #1a202c; overflow-y: auto; z-index: 100;
      display: flex; flex-direction: column;
    }
    .hub-logo {
      padding: 20px 16px 12px; border-bottom: 1px solid #2d3748;
    }
    .hub-logo-icon { font-size: 22px; margin-bottom: 6px; }
    .hub-logo-title { color: #fff; font-size: 14px; font-weight: 700; }
    .hub-logo-sub { color: #718096; font-size: 11px; margin-top: 2px; }
    .hub-section {
      padding: 8px 12px 4px; color: #718096; font-size: 10px;
      font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-top: 8px;
    }
    .hub-nav-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 16px;
      color: #a0aec0; text-decoration: none; font-size: 13px;
      transition: all .15s; cursor: pointer; border: none;
      background: none; width: 100%; text-align: left; font-family: inherit;
    }
    .hub-nav-item:hover { background: #2d3748; color: #e2e8f0; }
    .hub-nav-item.active { background: #374151; color: #fff; }
    .hub-nav-item .nav-icon { width: 16px; text-align: center; flex-shrink: 0; }
    .hub-logout { margin-top: auto; padding: 12px 16px; border-top: 1px solid #2d3748; }
    .hub-logout-btn {
      width: 100%; padding: 8px; background: #e53e3e; color: #fff;
      border: none; border-radius: 8px; font-size: 12px; cursor: pointer;
      font-family: inherit; font-weight: 600;
    }
    .hub-logout-btn:hover { background: #c53030; }
    .hub-main {
      margin-left: 220px; padding: 24px 28px; min-height: 100vh; background: #f0f4f8;
      flex: 1; min-width: 0; width: calc(100% - 220px);
    }
    .hub-page-title {
      font-size: 22px; font-weight: 700; color: #1a202c;
      margin-bottom: 0; display: flex; align-items: center; gap: 10px;
    }
    /* ── 상단 시계 바 ── */
    .hub-topbar {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
      border-radius: 14px; padding: 14px 22px; margin-bottom: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,.15);
    }
    .hub-topbar-title {
      font-size: 20px; font-weight: 800; color: #fff;
      display: flex; align-items: center; gap: 10px;
    }
    .hub-clock-wrap {
      display: flex; align-items: center; gap: 18px;
    }
    .hub-clock-date {
      text-align: right;
    }
    .hub-clock-date-str {
      font-size: 14px; color: #a0aec0; font-weight: 600; letter-spacing: .03em;
    }
    .hub-clock-day {
      font-size: 15px; color: #e2e8f0; font-weight: 700; margin-top: 2px;
    }
    .hub-clock-time {
      font-size: 36px; font-weight: 900; color: #fff;
      font-variant-numeric: tabular-nums; letter-spacing: .05em;
      background: rgba(255,255,255,.07); padding: 8px 18px;
      border-radius: 12px; border: 1px solid rgba(255,255,255,.1);
    }
    .hub-clock-sec {
      font-size: 24px; color: #a0aec0; font-weight: 700;
    }
    @media (max-width: 768px) {
      .hub-sidebar { transform: translateX(-220px); transition: transform .3s; }
      .hub-sidebar.open { transform: translateX(0); }
      .hub-main { margin-left: 0; padding: 16px; padding-top: 60px; }
      .hub-mobile-toggle {
        display: flex !important; position: fixed; top: 12px; left: 12px;
        z-index: 200; background: #1a202c; color: #fff; border: none;
        border-radius: 8px; padding: 8px 10px; font-size: 16px; cursor: pointer;
      }
      .hub-mobile-overlay {
        display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5);
        z-index: 99;
      }
      .hub-mobile-overlay.show { display: block; }
    }
    @media (min-width: 769px) {
      .hub-mobile-toggle { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  const token = sessionStorage.getItem('adminToken');
  if (!token) { location.href = 'index.html'; return; }

  // 접이식 그룹에 속하는 페이지 목록 (그룹 자동 열기 판단용)
  const COLLAPSIBLE_GROUPS = {
    daily:   ['journal_mettler.html','journal_chanel.html','bonded.html'],
    billing: ['billing.html','profit-calc.html','ot_fee.html'],
  };

  const navItems = [
    { section: '📊 운영 현황' },
    { href: 'hub.html',      icon: '🏠', label: '대시보드' },
    { href: 'todo.html',     icon: '✅', label: '업무 Todo' },
    { href: 'dispatch.html', icon: '🚚', label: '차량 배차' },
    { href: 'claims.html',   icon: '⚠️', label: '클레임 트래커' },
    { href: 'calendar.html', icon: '📅', label: '캘린더' },
    { href: 'notes.html',    icon: '📝', label: '메모장' },
    { href: 'vendors.html',  icon: '🏢', label: '업체 관리' },
    // ── 접이식: 일일 업무 ──
    { section: '📋 일일 업무', collapsible: true, key: 'daily' },
    { href: 'journal_mettler.html', icon: '⚖️', label: '메틀러 업무일지' },
    { href: 'journal_chanel.html',  icon: '💄', label: '샤넬 업무일지' },
    { href: 'bonded.html',          icon: '🚢', label: '보세 반입/출' },
    { groupEnd: true },
    // ── OT (독립 메뉴) ──
    { href: 'ot.html', icon: '⏰', label: 'OT 내역 관리' },
    // ── 오더 시스템 ──
    { section: '📦 오더 시스템' },
    { href: 'admin.html', icon: '🗂️', label: '오더 관리' },
    { href: 'list.html',  icon: '🔍', label: '조회/출력' },
    // ── 접이식: 청구 ──
    { section: '💰 청구', collapsible: true, key: 'billing' },
    { href: 'billing.html',      icon: '💰', label: '운송 청구서' },
    { href: 'profit-calc.html',  icon: '📊', label: '수익율 계산기' },
    { href: 'ot_fee.html',       icon: '⏱️', label: 'OT Fee (메틀러)' },
    { groupEnd: true },
  ];

  // 추가 CSS: 홈버튼 + WMS + 파일 바로가기
  const style2 = document.createElement('style');
  style2.textContent = `
    .hub-home-btn {
      display: flex; align-items: center; gap: 8px; margin: 10px 12px 4px;
      padding: 9px 14px; background: linear-gradient(135deg,#667eea,#764ba2);
      color: #fff; border-radius: 10px; text-decoration: none;
      font-size: 13px; font-weight: 700; transition: opacity .15s;
    }
    .hub-home-btn:hover { opacity: .88; }
    .hub-home-btn.active { background: linear-gradient(135deg,#4c51bf,#553c9a); }
    /* ── WMS 런처 ── */
    .hub-wms-wrap {
      margin: 4px 12px 6px; position: relative;
    }
    .hub-wms-btn {
      display: flex; align-items: center; gap: 9px; width: 100%;
      padding: 10px 14px; background: linear-gradient(135deg,#2f855a,#276749);
      color: #fff; border-radius: 10px; border: none; font-family: inherit;
      font-size: 13px; font-weight: 700; cursor: pointer;
      transition: all .15s; text-align: left; position: relative;
      box-shadow: 0 2px 8px rgba(47,133,90,.35);
    }
    .hub-wms-btn:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(47,133,90,.45); }
    .hub-wms-btn:active { transform: translateY(0); }
    .hub-wms-btn-icon {
      width: 28px; height: 28px; background: rgba(255,255,255,.18);
      border-radius: 7px; display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .hub-wms-btn-text { flex: 1; min-width: 0; }
    .hub-wms-btn-label { font-size: 13px; font-weight: 700; line-height: 1.2; }
    .hub-wms-btn-sub { font-size: 10px; color: rgba(255,255,255,.65); margin-top: 1px; font-weight: 400; }
    .hub-wms-cfg-btn {
      opacity: 0; position: absolute; top: 6px; right: 8px;
      background: rgba(255,255,255,.15); border: none; border-radius: 5px;
      color: #fff; font-size: 11px; padding: 2px 6px; cursor: pointer;
      font-family: inherit; transition: opacity .15s, background .15s;
    }
    .hub-wms-wrap:hover .hub-wms-cfg-btn { opacity: 1; }
    .hub-wms-cfg-btn:hover { background: rgba(255,255,255,.3); }
    .hub-wms-add-btn {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      width: 100%; padding: 9px 14px; background: rgba(47,133,90,.15);
      border: 1px dashed #2f855a; color: #68d391; border-radius: 10px;
      font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all .15s;
    }
    .hub-wms-add-btn:hover { background: rgba(47,133,90,.3); border-style: solid; }
    /* 파일 바로가기 */
    .hub-file-item {
      display: flex; align-items: center; gap: 8px; padding: 7px 16px;
      color: #9ae6b4; font-size: 12px; cursor: pointer;
      transition: all .15s; border: none; background: none;
      width: 100%; text-align: left; font-family: inherit;
    }
    .hub-file-item:hover { background: #2d3748; color: #68d391; }
    .hub-file-item .file-name {
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .hub-file-edit-btn {
      opacity: 0; font-size: 10px; color: #718096; padding: 1px 5px;
      border: none; background: none; cursor: pointer; border-radius: 4px;
    }
    .hub-file-item:hover .hub-file-edit-btn { opacity: 1; }
    .hub-file-edit-btn:hover { color: #fc8181; }
    /* ── 접이식 섹션 ── */
    .hub-section-collapsible {
      display: flex !important; align-items: center; justify-content: space-between;
      padding-right: 14px; cursor: pointer; user-select: none;
    }
    .hub-section-collapsible:hover { color: #a0aec0; }
    .hub-group-arrow { font-size: 10px; transition: transform .22s ease; flex-shrink: 0; }
    .hub-group-arrow.open { transform: rotate(90deg); }
    .hub-group-wrap {
      overflow: hidden; transition: max-height .25s ease, opacity .2s;
    }
    .hub-group-open  { max-height: 400px; opacity: 1; }
    .hub-group-closed { max-height: 0;    opacity: 0; }
  `;
  document.head.appendChild(style2);

  let navHTML = `
    <div class="hub-logo">
      <div class="hub-logo-icon">🚛</div>
      <div class="hub-logo-title">토탈 물류</div>
      <div class="hub-logo-sub">Total Logistics</div>
    </div>
    <a href="hub.html" class="hub-home-btn ${currentPage === 'hub.html' ? 'active' : ''}">
      🏠 <span>대시보드 홈</span>
    </a>
    <div class="hub-wms-wrap" id="hub-wms-wrap"></div>
  `;

  let inGroup = false;
  const collapsibleKeys = []; // 나중에 addEventListener 등록용
  navItems.forEach(item => {
    if (item.groupEnd) {
      if (inGroup) { navHTML += `</div>`; inGroup = false; }
      return;
    }
    if (item.section) {
      if (inGroup) { navHTML += `</div>`; inGroup = false; }
      if (item.collapsible) {
        const isOpen = sidebarGroupIsOpen(item.key, currentPage, COLLAPSIBLE_GROUPS);
        collapsibleKeys.push(item.key);
        navHTML += `
          <div class="hub-section hub-section-collapsible" data-group-key="${item.key}">
            <span>${item.section}</span>
            <span class="hub-group-arrow ${isOpen ? 'open' : ''}" id="hub-arrow-${item.key}">▶</span>
          </div>
          <div class="hub-group-wrap ${isOpen ? 'hub-group-open' : 'hub-group-closed'}" id="hub-group-${item.key}">
        `;
        inGroup = true;
      } else {
        navHTML += `<div class="hub-section">${item.section}</div>`;
      }
    } else if (item.href) {
      const isActive = currentPage === item.href ? 'active' : '';
      navHTML += `
        <a href="${item.href}" class="hub-nav-item ${isActive}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `;
    }
  });
  if (inGroup) { navHTML += `</div>`; inGroup = false; }

  // ── 파일 바로가기 섹션 ──
  navHTML += `<div class="hub-section">📁 파일 바로가기</div>`;
  navHTML += `<div id="hub-file-shortcuts"></div>`;
  navHTML += `
    <button class="hub-nav-item" onclick="hubFileAdd()" style="color:#68d391;font-size:12px;">
      <span class="nav-icon">＋</span><span>파일 추가</span>
    </button>
  `;

  navHTML += `
    <div class="hub-logout">
      <button class="hub-logout-btn" onclick="hubLogout()">🚪 로그아웃</button>
    </div>
  `;

  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    sidebarEl.innerHTML = `<nav class="hub-sidebar">${navHTML}</nav>`;
    renderWmsButton();
    renderHubFileShortcuts();

    // ── 접이식 섹션 클릭 이벤트 (innerHTML 후 등록)
    sidebarEl.querySelectorAll('[data-group-key]').forEach(el => {
      el.addEventListener('click', () => {
        toggleSidebarGroup(el.getAttribute('data-group-key'));
      });
    });
  }

  // Mobile toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'hub-mobile-toggle';
  toggleBtn.innerHTML = '☰';
  toggleBtn.style.display = 'none';

  const overlay = document.createElement('div');
  overlay.className = 'hub-mobile-overlay';

  document.body.appendChild(toggleBtn);
  document.body.appendChild(overlay);

  toggleBtn.addEventListener('click', () => {
    const sidebar = document.querySelector('.hub-sidebar');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    const sidebar = document.querySelector('.hub-sidebar');
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });

  // ── 상단 시계 바 주입 ──
  function injectClockBar() {
    const pageTitleEl = document.querySelector('.hub-page-title');
    if (!pageTitleEl) return;

    // 기존 페이지 타이틀 내용 가져오기
    const titleContent = pageTitleEl.innerHTML;

    // 상단 바로 교체
    const bar = document.createElement('div');
    bar.className = 'hub-topbar';
    bar.innerHTML = `
      <div class="hub-topbar-title">${titleContent}</div>
      <div class="hub-clock-wrap">
        <div class="hub-clock-date">
          <div class="hub-clock-date-str" id="nav-clock-date">—</div>
          <div class="hub-clock-day" id="nav-clock-day">—</div>
        </div>
        <div class="hub-clock-time">
          <span id="nav-clock-hm">--:--</span><span class="hub-clock-sec">:<span id="nav-clock-s">--</span></span>
        </div>
      </div>
    `;

    // 페이지 타이틀을 바로 교체
    pageTitleEl.replaceWith(bar);

    // 시계 시작
    const DAYS = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
    function tick() {
      const n = new Date();
      const pad = v => String(v).padStart(2,'0');
      const hmEl = document.getElementById('nav-clock-hm');
      const sEl  = document.getElementById('nav-clock-s');
      const dtEl = document.getElementById('nav-clock-date');
      const dyEl = document.getElementById('nav-clock-day');
      if (!hmEl) return;
      hmEl.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
      sEl.textContent  = pad(n.getSeconds());
      dtEl.textContent = `${n.getFullYear()}.${pad(n.getMonth()+1)}.${pad(n.getDate())}`;
      dyEl.textContent = DAYS[n.getDay()];
    }
    tick();
    setInterval(tick, 1000);
  }

  // DOM 준비 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectClockBar);
  } else {
    // 약간 지연 — 각 페이지의 hub-page-title이 렌더링된 후
    setTimeout(injectClockBar, 0);
  }
}

function hubLogout() {
  sessionStorage.clear();
  location.href = 'index.html';
}

/* ════════════════════════════════════════
   파일 바로가기 (로컬 파일 열기)
════════════════════════════════════════ */
const FILE_SHORTCUTS_KEY = 'hub_file_shortcuts_v1';

function getFileShortcuts() {
  try { return JSON.parse(localStorage.getItem(FILE_SHORTCUTS_KEY) || '[]'); } catch { return []; }
}
function saveFileShortcuts(list) {
  localStorage.setItem(FILE_SHORTCUTS_KEY, JSON.stringify(list));
}

function renderHubFileShortcuts() {
  const wrap = document.getElementById('hub-file-shortcuts');
  if (!wrap) return;
  const list = getFileShortcuts();
  if (!list.length) {
    wrap.innerHTML = `<div style="padding:6px 16px;font-size:11px;color:#4a5568;">등록된 파일이 없습니다</div>`;
    return;
  }
  wrap.innerHTML = list.map((f, i) => `
    <button class="hub-file-item" onclick="hubFileOpen(${i})" title="${f.path}">
      <span style="font-size:14px;">📊</span>
      <span class="file-name">${f.name}</span>
      <button class="hub-file-edit-btn" onclick="event.stopPropagation();hubFileDelete(${i})" title="삭제">✕</button>
    </button>
  `).join('');
}

async function hubFileOpen(idx) {
  const list = getFileShortcuts();
  const f = list[idx];
  if (!f) return;
  const token = sessionStorage.getItem('adminToken');
  try {
    const res = await fetch(`/api/open-file?path=${encodeURIComponent(f.path)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === 'LOCAL_ONLY') {
        alert('⚠️ 파일 열기는 로컬 서버에서만 가능합니다.\n\n시작_Python.bat 으로 서버를 실행한 후\n브라우저에서 localhost:3000 으로 접속해 주세요.');
      } else if (res.status === 404) {
        alert('❌ 파일을 찾을 수 없습니다.\n\n경로를 확인해 주세요:\n' + f.path);
      } else {
        alert('파일 열기 실패: ' + (data.error || '알 수 없는 오류'));
      }
    }
    // 성공 시 별도 알림 없음 (파일이 그냥 열림)
  } catch (e) {
    alert('서버 연결 오류: ' + e.message);
  }
}

function hubFileAdd() {
  const name = prompt('표시 이름 (예: 보세 반출입 내역)');
  if (!name) return;
  const path = prompt('파일 전체 경로\n예: C:\\Users\\dkchoi\\Desktop\\업무\\bonded.xlsx');
  if (!path) return;
  const list = getFileShortcuts();
  list.push({ name: name.trim(), path: path.trim() });
  saveFileShortcuts(list);
  renderHubFileShortcuts();
}

function hubFileDelete(idx) {
  const list = getFileShortcuts();
  const f = list[idx];
  if (!confirm(`"${f.name}" 바로가기를 삭제하시겠습니까?`)) return;
  list.splice(idx, 1);
  saveFileShortcuts(list);
  renderHubFileShortcuts();
}

/* ════════════════════════════════════════
   WMS 런처
════════════════════════════════════════ */
const WMS_CONFIG_KEY = 'hub_wms_config_v1';

function getWmsConfig() {
  try { return JSON.parse(localStorage.getItem(WMS_CONFIG_KEY) || 'null'); } catch { return null; }
}
function saveWmsConfig(cfg) {
  if (cfg) localStorage.setItem(WMS_CONFIG_KEY, JSON.stringify(cfg));
  else localStorage.removeItem(WMS_CONFIG_KEY);
}

function renderWmsButton() {
  const wrap = document.getElementById('hub-wms-wrap');
  if (!wrap) return;
  const cfg = getWmsConfig();
  if (!cfg) {
    wrap.innerHTML = `
      <button class="hub-wms-add-btn" onclick="hubWmsSetup()">
        <span style="font-size:16px;">🖥️</span>
        <span>WMS 프로그램 등록</span>
      </button>`;
    return;
  }
  const isUrl = cfg.path.startsWith('http://') || cfg.path.startsWith('https://');
  const subLabel = isUrl ? '🌐 웹 브라우저로 열기' : '🖥️ 클릭 한 번으로 실행';
  wrap.innerHTML = `
    <button class="hub-wms-btn" onclick="hubWmsOpen()">
      <div class="hub-wms-btn-icon">🖥️</div>
      <div class="hub-wms-btn-text">
        <div class="hub-wms-btn-label">${cfg.name}</div>
        <div class="hub-wms-btn-sub">${subLabel}</div>
      </div>
    </button>
    <button class="hub-wms-cfg-btn" onclick="event.stopPropagation();hubWmsSetup()" title="WMS 설정 변경">⚙️ 설정</button>`;
}

function hubWmsOpen() {
  const cfg = getWmsConfig();
  if (!cfg) { hubWmsSetup(); return; }

  // 웹 URL 이면 새 탭으로 열기
  if (cfg.path.startsWith('http://') || cfg.path.startsWith('https://')) {
    window.open(cfg.path, '_blank');
    return;
  }

  // 로컬 프로그램 → wms:// 커스텀 프로토콜로 실행 (어디서든 동작)
  window.location.href = 'wms://launch';
}

function hubWmsSetup() {
  const cfg = getWmsConfig();
  const defaultName = cfg ? cfg.name : 'WMS';
  const name = prompt(
    'WMS 표시 이름을 입력하세요\n(예: 우리WMS, CJ WMS, 이카운트ERP)',
    defaultName
  );
  if (name === null) return;  // 취소
  if (!name.trim()) { alert('이름을 입력해주세요.'); return; }

  const defaultPath = cfg ? cfg.path : '';
  const path = prompt(
    'WMS 경로를 입력하세요\n\n' +
    '【웹 주소】 http://192.168.1.100:8080/wms\n' +
    '【실행파일】 C:\\WMS\\launcher.exe\n\n' +
    '웹 주소(http://)를 입력하면 브라우저에서 열립니다.\n' +
    '실행파일 경로를 입력하면 로컬 서버에서 프로그램을 실행합니다.',
    defaultPath
  );
  if (path === null) return;  // 취소
  if (!path.trim()) { alert('경로를 입력해주세요.'); return; }

  saveWmsConfig({ name: name.trim(), path: path.trim() });
  renderWmsButton();
}

function hubWmsRemove() {
  if (!confirm('WMS 설정을 삭제하시겠습니까?')) return;
  saveWmsConfig(null);
  renderWmsButton();
}

/* ════════════════════════════════════════
   사이드바 접이식 그룹
════════════════════════════════════════ */
const SIDEBAR_COLLAPSE_KEY = 'hub_sidebar_collapse_v1';

function _getSidebarCollapseStates() {
  try { return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) || '{}'); } catch { return {}; }
}

function sidebarGroupIsOpen(key, currentPage, groups) {
  const states = _getSidebarCollapseStates();
  // 직접 저장된 상태 우선
  if (key in states) return states[key];
  // 현재 페이지가 이 그룹 소속이면 자동으로 열기
  if (groups && groups[key] && groups[key].includes(currentPage)) return true;
  return false; // 기본: 접힌 상태
}

function toggleSidebarGroup(key) {
  const groupEl = document.getElementById(`hub-group-${key}`);
  const arrowEl = document.getElementById(`hub-arrow-${key}`);
  if (!groupEl) return;
  const isOpen = groupEl.classList.contains('hub-group-open');
  const newState = !isOpen;
  const states = _getSidebarCollapseStates();
  states[key] = newState;
  localStorage.setItem(SIDEBAR_COLLAPSE_KEY, JSON.stringify(states));
  groupEl.classList.toggle('hub-group-open',  newState);
  groupEl.classList.toggle('hub-group-closed', !newState);
  if (arrowEl) arrowEl.classList.toggle('open', newState);
}
