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

  const navItems = [
    { section: '📊 운영 현황' },
    { href: 'hub.html',      icon: '🏠', label: '대시보드' },
    { href: 'todo.html',     icon: '✅', label: '업무 Todo' },
    { href: 'dispatch.html', icon: '🚚', label: '차량 배차' },
    { href: 'claims.html',   icon: '⚠️', label: '클레임 트래커' },
    { href: 'calendar.html', icon: '📅', label: '캘린더' },
    { href: 'notes.html',    icon: '📝', label: '메모장' },
    { href: 'vendors.html',  icon: '🏢', label: '업체 관리' },
    { section: '📋 일일 업무' },
    { href: 'journal_mettler.html', icon: '⚖️', label: '메틀러 업무일지' },
    { href: 'journal_chanel.html',  icon: '💄', label: '샤넬 업무일지' },
    { href: 'bonded.html',          icon: '🚢', label: '보세 반입/출' },
    { href: 'ot.html',              icon: '⏰', label: 'OT 내역 관리' },
    { section: '📦 오더 시스템' },
    { href: 'admin.html',   icon: '🗂️', label: '오더 관리' },
    { href: 'list.html',    icon: '🔍', label: '조회/출력' },
    { href: 'billing.html',      icon: '💰', label: '운송 청구서' },
    { href: 'profit-calc.html', icon: '📊', label: '수익율 계산기' },
  ];

  // 추가 CSS: 홈버튼
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
  `;

  navItems.forEach(item => {
    if (item.section) {
      navHTML += `<div class="hub-section">${item.section}</div>`;
    } else {
      const isActive = currentPage === item.href ? 'active' : '';
      navHTML += `
        <a href="${item.href}" class="hub-nav-item ${isActive}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `;
    }
  });

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
    renderHubFileShortcuts();
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
    if (!res.ok) alert('파일 열기 실패: ' + (data.error || '알 수 없는 오류'));
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
