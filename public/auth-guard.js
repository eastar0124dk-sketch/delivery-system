/**
 * 한국 시간(KST) 기준 날짜 헬퍼 — 전역 사용
 * toISOString()은 UTC라 KST와 하루 차이가 날 수 있어 로컬 시간 기준으로 직접 포맷
 */
window.todayKST = function(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
window.toYmdKST = window.todayKST;

/**
 * 권한 가드 — 페이지 진입 시 즉시 권한 체크
 *
 * 사용법: HTML <head> 최상단에 다음 중 하나 포함
 *   <script>window.AUTH_REQUIRE='admin';</script>      // 관리자만
 *   <script>window.AUTH_REQUIRE='auth';</script>       // 관리자+직원 모두 (로그인만 필요)
 *   <script>window.AUTH_REQUIRE='canon_billing';</script>  // 캐논 직원 또는 관리자
 *   <script>window.AUTH_REQUIRE='mettler_staff';</script>  // 메틀러 직원 또는 관리자
 * 그리고 <script src="auth-guard.js"></script> 추가
 *
 * 통과 못하면 자동으로 index.html로 리다이렉트.
 */
(function() {
  const need = window.AUTH_REQUIRE || 'admin';

  // 새 탭/브라우저 재시작 시 localStorage 미러에서 세션 복원 (index.html 로그인 시 저장됨)
  try {
    ['adminToken','staffToken','userRole','userClient','userName'].forEach(k => {
      if (!sessionStorage.getItem(k)) {
        const v = localStorage.getItem('ls_' + k);
        if (v) sessionStorage.setItem(k, v);
      }
    });
  } catch(_) {}

  const adminToken = sessionStorage.getItem('adminToken');
  const staffToken = sessionStorage.getItem('staffToken');
  const role       = sessionStorage.getItem('userRole');     // 'admin' | 'staff'
  const client     = sessionStorage.getItem('userClient');   // 'mettler' | 'canon' | 'chanel'

  function reject(msg) {
    alert(msg || '접근 권한이 없습니다.');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('staffToken');
    sessionStorage.removeItem('userRole');
    try { ['adminToken','staffToken','userRole','userClient','userName'].forEach(k => localStorage.removeItem('ls_' + k)); } catch(_) {}
    location.replace('index.html');
  }

  // 토큰 자체가 없음 → 미로그인
  if (!adminToken && !staffToken) {
    reject('로그인이 필요합니다.');
    return;
  }

  switch (need) {
    case 'admin':
      // 관리자 토큰 + role==='admin' 확인
      if (!adminToken || role !== 'admin') return reject('관리자 권한이 필요합니다.');
      break;

    case 'auth':
      // 토큰 하나라도 있으면 통과
      break;

    case 'canon_billing':
      // 관리자 OR 캐논 직원
      if (role === 'admin') break;
      if (staffToken && client === 'canon') break;
      return reject('캐논 직원 또는 관리자 권한이 필요합니다.');

    case 'mettler_staff':
      // 관리자 OR 메틀러 직원
      if (role === 'admin') break;
      if (staffToken && client === 'mettler') break;
      return reject('메틀러 직원 또는 관리자 권한이 필요합니다.');

    default:
      // 알 수 없는 요구사항 → 관리자 기본
      if (!adminToken || role !== 'admin') return reject('관리자 권한이 필요합니다.');
  }

  // 서버 검증 (비동기, 실패 시 리다이렉트)
  const token = adminToken || staffToken;
  fetch('/api/auth/check', { headers: { Authorization: 'Bearer ' + token } })
    .then(r => {
      if (r.status === 401 || r.status === 403) reject('세션이 만료되었습니다. 다시 로그인해주세요.');
    })
    .catch(() => { /* 네트워크 오류는 무시 (오프라인 등) */ });
})();
