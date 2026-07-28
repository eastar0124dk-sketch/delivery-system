/* ============================================================
   도착지 글자 → 운임표 지역 이름 찾기

   원칙 하나만 지킨다.
     확실할 때만 값을 낸다. 애매하면 아무 값도 내지 않는다.

   빈 칸은 사람이 채우면 되지만, 조용히 틀린 값은 그대로 청구서가 된다.
   실제로 이런 사고가 두 번 났다.
     · '서구'(대전 150,000) 를 서울 강서 35,000 으로 잡아 115,000원 덜 청구
     · '유성구'(대전 150,000) 를 서울 성동 55,000 으로 잡아  95,000원 덜 청구

   두 번 다 원인은 같다. 지역 이름에서 시·도·구·군·읍·면·동 을 전부 지운 뒤
   글자가 겹치면 같은 곳으로 본 것이다. 그러면 '성동' 이 '성' 한 글자가 되어
   '유성' 안에 들어가 버린다. 그 방식은 여기서 쓰지 않는다.
   ============================================================ */
(function (global) {
  'use strict';

  var SIDO_SUF = /(특별자치시|특별자치도|특별시|광역시|도)$/;

  /* 광역시는 운임표에 시 하나로만 있다 (광주는 경기 광주와 겹쳐 이름이 다르다) */
  var METRO_ONE = { 인천: '인천', 대전: '대전', 대구: '대구', 부산: '부산', 울산: '울산', 광주: '광주광역시' };

  /* 같은 이름의 구가 여러 광역시에 있다 → 시·도 없이는 절대 못 정한다.
     서울 중구·강서구도 부산·대구 등과 겹치므로 여기 포함한다. */
  var AMBIGUOUS = { 중구: 1, 동구: 1, 서구: 1, 남구: 1, 북구: 1, 강서구: 1 };

  /* 이름만으로 한 곳이 확정되는 자치구 → 운임표 이름
     (대구 군위군은 경상북도 군위와 겹쳐 일부러 뺐다) */
  var GU_ONE = {
    종로구: '종로', 용산구: '용산', 성동구: '성동', 광진구: '광진', 동대문구: '동대',
    중랑구: '중랑', 성북구: '성북', 강북구: '강북', 도봉구: '도봉', 노원구: '노원',
    은평구: '은평', 서대문구: '서대문', 마포구: '마포', 양천구: '양천', 구로구: '구로',
    금천구: '금천', 영등포구: '영등포', 동작구: '동작', 관악구: '관악', 서초구: '서초',
    강남구: '강남', 송파구: '송파', 강동구: '강동',
    영도구: '부산', 부산진구: '부산', 동래구: '부산', 해운대구: '부산', 사하구: '부산',
    금정구: '부산', 연제구: '부산', 수영구: '부산', 사상구: '부산', 기장군: '부산',
    수성구: '대구', 달서구: '대구', 달성군: '대구',
    미추홀구: '인천', 연수구: '인천', 남동구: '인천', 부평구: '인천', 계양구: '인천',
    강화군: '강화', 옹진군: '옹진',
    광산구: '광주광역시', 유성구: '대전', 대덕구: '대전', 울주군: '울산',
  };

  /* 시 안의 일반구·읍 → 그 시 */
  var GU_IN_CITY = {
    처인구: '용인', 기흥구: '용인', 수지구: '용인',
    향남읍: '화성', 봉담읍: '화성', 남양읍: '화성', 동탄: '화성', 우정읍: '화성', 정남면: '화성', 매송면: '화성',
    서북구: '천안', 동남구: '천안',
    단원구: '안산', 상록구: '안산', 만안구: '안양', 동안구: '안양',
    분당구: '성남', 수정구: '성남', 중원구: '성남',
    권선구: '수원', 영통구: '수원', 장안구: '수원', 팔달구: '수원',
    덕양구: '고양', 일산동구: '고양', 일산서구: '고양',
    소사구: '부천', 오정구: '부천', 원미구: '부천',
    상당구: '청주', 서원구: '청주', 청원구: '청주', 흥덕구: '청주',
    의창구: '창원', 성산구: '창원', 마산합포구: '창원', 마산회원구: '창원', 진해구: '창원',
  };

  var SIDO_NAME = { 서울: 1, 부산: 1, 대구: 1, 인천: 1, 광주: 1, 대전: 1, 울산: 1, 세종: 1,
    경기: 1, 강원: 1, 충북: 1, 충남: 1, 전북: 1, 전남: 1, 경북: 1, 경남: 1, 제주: 1 };

  function isSido(t) { return SIDO_SUF.test(t) || SIDO_NAME[t] === 1; }

  /* 운임표에서 지역 이름 목록을 만든다 (rates.js 가 먼저 읽혀 있어야 한다).

     한 이름이 여러 곳일 수 있다 — 실제로 '고성' 이 강원도(220,000) 와
     경상남도(250,000) 두 곳에 있다. 그래서 이름 하나에 키를 여러 개 담아 두고,
     시·도를 모르면 답하지 않는다. */
  var _byName = null;
  function build() {
    if (_byName) return true;
    if (typeof global.RATE_TABLE === 'undefined') return false;
    _byName = {};
    for (var k in global.RATE_TABLE) {
      var e = global.RATE_TABLE[k];
      if (!e || !e.sigun) continue;
      (_byName[e.sigun] = _byName[e.sigun] || []).push({ key: k, sido: e.sido || '' });
    }
    return true;
  }

  /* 이름(+시·도)으로 운임표 항목 하나를 고른다. 하나로 좁혀지지 않으면 null */
  function pick(name, sd) {
    if (!name) return null;
    var list = _byName[name];
    if (!list) return null;
    if (sd) {
      /* 시·도를 알면 그 안에서만 찾는다. 못 찾으면 여기서 끝낸다.
         예전에는 못 찾으면 이름이 같은 다른 시·도 것을 그냥 썼다. 그래서
         '부산광역시 강서구' 가 서울 강서구(35,000)로 잡혔다 — 부산은 220,000이다. */
      var m = list.filter(function (x) { return x.sido.replace(SIDO_SUF, '') === sd; });
      return m.length === 1 ? { name: name, key: m[0].key } : null;
    }
    if (list.length === 1) return { name: name, key: list[0].key };
    return null;                       // '고성' 처럼 같은 이름이 두 곳인 경우
  }

  /** 시·도 없이는 확정할 수 없는 이름인가 — 운임표를 직접 보고 판단한다 */
  function regionAmbiguous(input) {
    if (!build()) return false;
    var t = String(input == null ? '' : input).trim().split(/\s+/).filter(Boolean);
    for (var i = 0; i < t.length; i++) {
      if (AMBIGUOUS[t[i]]) return true;                       // 여러 광역시에 있는 구
      var l = _byName[t[i]] || _byName[t[i].replace(/(시|군)$/, '')];
      if (l && l.length > 1) return true;                     // 운임표에 같은 이름이 둘 이상
    }
    return false;
  }

  /**
   * 도착지 글자에서 운임표 지역 이름을 찾는다.
   * @returns {string|null} 확신이 없으면 null — 화면에 '지역 확인 필요' 를 띄운다
   */
  function resolveHit(input) {
    if (!build()) return null;
    var t = String(input == null ? '' : input).trim().split(/\s+/).filter(Boolean);
    if (!t.length) return null;
    var i, x, bare, hit;

    /* 1. 시·도가 앞에 붙어 있으면 그것으로 확정한다 — 가장 믿을 수 있다 */
    if (t.length >= 2 && isSido(t[0])) {
      var sd = t[0].replace(SIDO_SUF, '');
      var rest = t.slice(1);

      /* 광역시 안에도 따로 요율이 있는 곳 (인천 강화·옹진·인천공항) 을 먼저 본다 */
      for (i = 0; i < rest.length; i++) {
        x = rest[i];
        hit = pick(x, sd) || pick(x.replace(/(시|군)$/, ''), sd);
        if (hit) return hit;
      }
      if (sd === '서울') {
        var gu = null;
        for (i = 0; i < rest.length; i++) if (rest[i].slice(-1) === '구') { gu = rest[i]; break; }
        if (!gu) gu = rest[0];
        return pick(gu, sd) || pick(GU_ONE[gu], sd) || pick(gu.replace(/구$/, ''), sd);
      }
      if (METRO_ONE[sd]) { hit = pick(METRO_ONE[sd], null); if (hit) return hit; }
      if (sd === '세종') return pick('세종', null);

      /* 도 단위 → 시·군. 같은 도 안의 것을 먼저 본다 ('고성' 이 두 도에 있다) */
      for (i = 0; i < rest.length; i++) {
        hit = pick(rest[i].replace(/(시|군)$/, ''), sd);
        if (hit) return hit;
      }
      for (i = 0; i < rest.length; i++) {
        x = rest[i];
        hit = pick(x.replace(/(시|군)$/, ''), null) || pick(GU_IN_CITY[x], null);
        if (hit) return hit;
      }
      return null;
    }

    /* 2. 시·도가 없다 — 이름만으로 한 곳이 확정될 때만 답한다 */
    for (i = 0; i < t.length; i++) if (AMBIGUOUS[t[i]]) return null;

    for (i = 0; i < t.length; i++) {
      x = t[i];
      hit = pick(x, null) || pick(x.replace(/(시|군)$/, ''), null);
      if (hit) return hit;
    }
    for (i = 0; i < t.length; i++) {
      hit = pick(GU_ONE[t[i]], null) || pick(GU_IN_CITY[t[i]], null);
      if (hit) return hit;
    }
    if (t.length === 1 && isSido(t[0])) {
      var s1 = t[0].replace(SIDO_SUF, '');
      if (METRO_ONE[s1]) return pick(METRO_ONE[s1], null);
      if (s1 === '세종') return pick('세종', null);
      return null;                                 // '경기도' 만으로는 시·군을 못 정한다
    }
    return null;
  }

  /** 운임표 지역 이름. 확신이 없으면 null */
  function resolveRegion(input) { var h = resolveHit(input); return h ? h.name : null; }
  /** 운임표 키(RATE_TABLE 의 키). 같은 이름이 두 곳이어도 한 곳으로 확정된다 */
  function resolveRegionKey(input) { var h = resolveHit(input); return h ? h.key : null; }

  global.regionAmbiguous = regionAmbiguous;
  global.resolveRegion = resolveRegion;
  global.resolveRegionKey = resolveRegionKey;
})(typeof window !== 'undefined' ? window : globalThis);
