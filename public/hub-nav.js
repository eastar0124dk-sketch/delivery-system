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
      margin-left: 220px; padding: 24px; min-height: 100vh; background: #f0f4f8;
    }
    .hub-page-title {
      font-size: 22px; font-weight: 700; color: #1a202c;
      margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
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
    { section: '📦 오더 시스템' },
    { href: 'admin.html',   icon: '🗂️', label: '오더 관리' },
    { href: 'list.html',    icon: '🔍', label: '조회/출력' },
    { href: 'billing.html', icon: '💰', label: '운송 청구서' },
  ];

  let navHTML = `
    <div class="hub-logo">
      <div class="hub-logo-icon">🚛</div>
      <div class="hub-logo-title">토탈 물류</div>
      <div class="hub-logo-sub">Total Logistics</div>
    </div>
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

  navHTML += `
    <div class="hub-logout">
      <button class="hub-logout-btn" onclick="hubLogout()">🚪 로그아웃</button>
    </div>
  `;

  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    sidebarEl.innerHTML = `<nav class="hub-sidebar">${navHTML}</nav>`;
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
}

function hubLogout() {
  sessionStorage.clear();
  location.href = 'index.html';
}
