/**
 * clients.js — 화주(3PL 위탁사) 공통 관리 모듈
 * 모든 페이지(admin, list, billing, profit-calc)에서 공유
 */
(function (global) {
  const STORE_KEY = 'shipper_clients_v2';

  const DEFAULT_CLIENTS = [
    { code: 'mettler', name: '메틀러토레도',        color: '#6366f1', icon: '⚖️' },
    { code: 'chanel',  name: '샤넬코리아',           color: '#ec4899', icon: '💄' },
    { code: 'canon',   name: '캐논메디칼시스템즈',    color: '#f59e0b', icon: '🖨️' },
  ];

  function getClients() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CLIENTS));
  }

  function saveClients(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }

  function getClient(code) {
    return getClients().find(c => c.code === code) || null;
  }

  function addClient(code, name, color, icon) {
    code = code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!code || !name) return { ok: false, msg: '코드와 이름을 입력하세요.' };
    const list = getClients();
    if (list.find(c => c.code === code)) return { ok: false, msg: '이미 존재하는 코드입니다.' };
    list.push({ code, name: name.trim(), color: color || '#667eea', icon: icon || '🏢' });
    saveClients(list);
    return { ok: true };
  }

  function removeClient(code) {
    const list = getClients().filter(c => c.code !== code);
    saveClients(list);
  }

  function updateClient(code, name, color, icon) {
    const list = getClients();
    const idx = list.findIndex(c => c.code === code);
    if (idx === -1) return false;
    list[idx] = { code, name: name || list[idx].name, color: color || list[idx].color, icon: icon || list[idx].icon };
    saveClients(list);
    return true;
  }

  /** <option> HTML 생성 */
  function buildOptions(selectedCode, { includeAll = false, allLabel = '전체 화주', placeholder = '-- 화주 선택 --' } = {}) {
    const clients = getClients();
    let html = includeAll
      ? `<option value="">${allLabel}</option>`
      : `<option value="">${placeholder}</option>`;
    clients.forEach(c => {
      const sel = c.code === selectedCode ? 'selected' : '';
      html += `<option value="${c.code}" ${sel}>${c.icon} ${c.name}</option>`;
    });
    return html;
  }

  /** 화주 칩 HTML (클릭 선택) */
  function buildChips(selectedCode, onClickFn, extraCss = '') {
    return getClients().map(c => {
      const active = c.code === selectedCode;
      const bg = active ? c.color : '#f0f4f8';
      const fg = active ? '#fff' : '#4a5568';
      const border = active ? c.color : '#e2e8f0';
      return `<button type="button" onclick="${onClickFn}('${c.code}')" style="
        padding:6px 14px;border-radius:20px;border:1.5px solid ${border};
        background:${bg};color:${fg};cursor:pointer;font-size:12px;font-weight:700;
        font-family:inherit;transition:all .15s;${extraCss}"
        data-client="${c.code}">${c.icon} ${c.name}</button>`;
    }).join('');
  }

  /** localStorage에서 현재 선택된 화주 코드 */
  function getCurrentCode() {
    return localStorage.getItem('selectedClient') || '';
  }
  function setCurrentCode(code) {
    localStorage.setItem('selectedClient', code);
  }

  /** 화주 관리 모달 HTML (공통 컴포넌트) */
  function buildManageModal() {
    return `
<div id="clientsModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;">
  <div style="background:#fff;border-radius:16px;padding:28px;width:460px;max-width:95vw;box-shadow:0 8px 40px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;">
    <div style="font-size:16px;font-weight:800;color:#1a202c;margin-bottom:16px;">🏢 화주(3PL) 관리</div>
    <div id="clientsList" style="margin-bottom:16px;"></div>
    <div style="background:#f8fafc;border-radius:10px;padding:14px;">
      <div style="font-size:12px;font-weight:700;color:#4a5568;margin-bottom:10px;">➕ 화주 추가</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <input id="nc-code"  placeholder="코드 (영문소문자)" style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;">
        <input id="nc-name"  placeholder="회사명" style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;">
        <input id="nc-icon"  placeholder="아이콘 이모지 (예: 🏢)" style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;">
        <input id="nc-color" type="color" value="#667eea" style="padding:4px;border:1.5px solid #e2e8f0;border-radius:8px;height:36px;width:100%;">
      </div>
      <button onclick="ClientsLib._addFromModal()" style="padding:8px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">추가</button>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:14px;">
      <button onclick="ClientsLib.closeManageModal()" style="padding:8px 18px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;font-size:13px;font-family:inherit;">닫기</button>
    </div>
  </div>
</div>`;
  }

  function openManageModal() {
    let modal = document.getElementById('clientsModal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', buildManageModal());
      modal = document.getElementById('clientsModal');
    }
    _renderClientsList();
    modal.style.display = 'flex';
  }

  function closeManageModal() {
    const modal = document.getElementById('clientsModal');
    if (modal) modal.style.display = 'none';
  }

  function _renderClientsList() {
    const el = document.getElementById('clientsList');
    if (!el) return;
    const clients = getClients();
    el.innerHTML = clients.map(c => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;border-radius:8px;margin-bottom:6px;">
        <span style="font-size:18px;">${c.icon}</span>
        <span style="flex:1;font-size:13px;font-weight:700;">${c.name}</span>
        <span style="font-size:11px;color:#a0aec0;background:#e2e8f0;padding:2px 8px;border-radius:10px;">${c.code}</span>
        <span style="width:14px;height:14px;border-radius:50%;background:${c.color};display:inline-block;"></span>
        <button onclick="ClientsLib._deleteClient('${c.code}')" style="border:none;background:#fff;color:#dc2626;cursor:pointer;font-size:14px;border-radius:6px;padding:2px 6px;border:1.5px solid #fca5a5;">✕</button>
      </div>`).join('') || '<div style="color:#a0aec0;font-size:13px;text-align:center;padding:12px;">등록된 화주가 없습니다.</div>';
  }

  function _addFromModal() {
    const code  = document.getElementById('nc-code').value;
    const name  = document.getElementById('nc-name').value;
    const icon  = document.getElementById('nc-icon').value || '🏢';
    const color = document.getElementById('nc-color').value;
    const result = addClient(code, name, color, icon);
    if (!result.ok) { alert(result.msg); return; }
    document.getElementById('nc-code').value = '';
    document.getElementById('nc-name').value = '';
    document.getElementById('nc-icon').value = '';
    _renderClientsList();
    // 부모 페이지에 갱신 알림
    if (typeof window.onClientsUpdated === 'function') window.onClientsUpdated();
  }

  function _deleteClient(code) {
    if (!confirm(`"${getClient(code)?.name}" 화주를 삭제하시겠습니까?`)) return;
    removeClient(code);
    _renderClientsList();
    if (typeof window.onClientsUpdated === 'function') window.onClientsUpdated();
  }

  global.ClientsLib = {
    getClients, saveClients, getClient, addClient, removeClient, updateClient,
    buildOptions, buildChips, getCurrentCode, setCurrentCode,
    openManageModal, closeManageModal, buildManageModal,
    _addFromModal, _deleteClient, _renderClientsList,
    DEFAULT_CLIENTS,
  };

})(window);
