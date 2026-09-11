/* ============================================================
   만세력 · 사주 계산 엔진
   - 천문 계산으로 절기(태양황경)와 삭(신월)을 구해 음/양력을 변환하고
     년·월·일·시주를 세운다.
   - 한국 표준시 변천(UTC+8:30 ↔ +9)과 역대 서머타임을 반영한다.
   ============================================================ */
(function (global) {
  'use strict';

  var D2R = Math.PI / 180;

  /* ---------- 기본 상수 ---------- */
  var STEM = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var STEM_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCH = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var BRANCH_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  // 일간 물상 — 사람을 대표하는 이모지와 그 뜻
  var STEM_EMOJI = ['🌳', '🌿', '☀️', '🕯️', '⛰️', '🌾', '⚔️', '💎', '🌊', '💧'];
  var STEM_OBJ = ['큰 나무', '덩굴과 풀', '태양', '등불', '큰 산', '논밭의 흙', '원석과 무기', '보석과 칼날', '큰 강과 바다', '빗물과 샘'];

  // 오행 0목 1화 2토 3금 4수
  var EL = ['목', '화', '토', '금', '수'];
  var EL_H = ['木', '火', '土', '金', '水'];
  var STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var STEM_YIN = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]; // 0 양, 1 음
  var BRANCH_YIN = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];

  // 지장간 [천간, 일수]
  var HIDDEN = [
    [[8, 10], [9, 20]],
    [[9, 9], [7, 3], [5, 18]],
    [[4, 7], [2, 7], [0, 16]],
    [[0, 10], [1, 20]],
    [[1, 9], [9, 3], [4, 18]],
    [[4, 7], [6, 7], [2, 16]],
    [[2, 10], [5, 9], [3, 11]],
    [[3, 9], [1, 3], [5, 18]],
    [[4, 7], [8, 7], [6, 16]],
    [[6, 10], [7, 20]],
    [[7, 9], [3, 3], [4, 18]],
    [[4, 7], [0, 7], [8, 16]]
  ];

  var TERM_NAME = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만',
    '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강',
    '입동', '소설', '대설', '동지'];
  // 12절(월의 시작) 이름 — 인월부터
  var JEOL_NAME = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];

  var TWELVE_STAGE = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
  // 일간별 장생지
  var BIRTH_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];

  function mod(n, m) { return ((n % m) + m) % m; }
  function norm360(x) { return mod(x, 360); }

  /* ---------- 율리우스일 ---------- */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) -
      Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function fromJDN(j) {
    var a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
    var d2 = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d2 / 4), m2 = Math.floor((5 * e + 2) / 153);
    return {
      y: 100 * b + d2 - 4800 + Math.floor(m2 / 10),
      m: m2 + 3 - 12 * Math.floor(m2 / 10),
      d: e - Math.floor((153 * m2 + 2) / 5) + 1
    };
  }
  function jdToYear(jd) { return (jd - 2451545.0) / 365.25 + 2000; }

  /* ---------- ΔT (TT − UT), 초 ---------- */
  function deltaT(y) {
    var t, u;
    if (y < 1900) { u = (y - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - y); }
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (y < 2005) {
      t = y - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t +
        0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5);
    }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    u = (y - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }

  /* ---------- 태양 겉보기 황경 (도) ---------- */
  function sunLongitude(jdUT) {
    var jde = jdUT + deltaT(jdToYear(jdUT)) / 86400;
    var T = (jde - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
      0.000289 * Math.sin(3 * M);
    var Om = (125.04 - 1934.136 * T) * D2R;
    return norm360(L0 + C - 0.00569 - 0.00478 * Math.sin(Om));
  }

  /* ---------- 균시차 (분) ---------- */
  function equationOfTime(jdUT) {
    var jde = jdUT + deltaT(jdToYear(jdUT)) / 86400;
    var T = (jde - 2451545.0) / 36525;
    var L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    var lam = sunLongitude(jdUT) * D2R;
    var eps0 = 23.4392911 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;
    var Om = (125.04 - 1934.136 * T) * D2R;
    var eps = (eps0 + 0.00256 * Math.cos(Om)) * D2R;
    var alpha = norm360(Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / D2R);
    var E = L0 - 0.0057183 - alpha;
    E = mod(E + 180, 360) - 180;
    return E * 4;
  }

  /* ---------- 특정 황경이 되는 순간 (UT 율리우스일) ---------- */
  function lambdaToJD(startJD, targetDeg) {
    var jd = startJD, i, d;
    for (i = 0; i < 12; i++) {
      d = mod(targetDeg - sunLongitude(jd) + 180, 360) - 180;
      jd += d * 365.2422 / 360;
      if (Math.abs(d) < 1e-7) break;
    }
    return jd;
  }
  // 해당 연도 안에서 목표 황경이 되는 순간 (1월 1일 이후 첫 시점)
  function solarTermJD(year, deg) {
    var jd = jdn(year, 1, 1) - 0.5;
    jd += norm360(deg - sunLongitude(jd)) * 365.2422 / 360;
    return lambdaToJD(jd, deg);
  }

  /* ---------- 삭(신월) 시각 — Meeus 49장 ---------- */
  function newMoonJD(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
    var E = 1 - 0.002516 * T - 0.0000074 * T2;
    var M = (2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * D2R;
    var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * D2R;
    var F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * D2R;
    var Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * D2R;
    var s = Math.sin;

    jde += -0.40720 * s(Mp)
      + 0.17241 * E * s(M)
      + 0.01608 * s(2 * Mp)
      + 0.01039 * s(2 * F)
      + 0.00739 * E * s(Mp - M)
      - 0.00514 * E * s(Mp + M)
      + 0.00208 * E * E * s(2 * M)
      - 0.00111 * s(Mp - 2 * F)
      - 0.00057 * s(Mp + 2 * F)
      + 0.00056 * E * s(2 * Mp + M)
      - 0.00042 * s(3 * Mp)
      + 0.00042 * E * s(M + 2 * F)
      + 0.00038 * E * s(M - 2 * F)
      - 0.00024 * E * s(2 * Mp - M)
      - 0.00017 * s(Om)
      - 0.00007 * s(Mp + 2 * M)
      + 0.00004 * s(2 * Mp - 2 * F)
      + 0.00004 * s(3 * M)
      + 0.00003 * s(Mp + M - 2 * F)
      + 0.00003 * s(2 * Mp + 2 * F)
      - 0.00003 * s(Mp + M + 2 * F)
      + 0.00003 * s(Mp - M + 2 * F)
      - 0.00002 * s(Mp - M - 2 * F)
      - 0.00002 * s(3 * Mp + M)
      + 0.00002 * s(4 * Mp);

    var A = [
      [299.77 + 0.107408 * k - 0.009173 * T2, 0.000325],
      [251.88 + 0.016321 * k, 0.000165],
      [251.83 + 26.651886 * k, 0.000164],
      [349.42 + 36.412478 * k, 0.000126],
      [84.66 + 18.206239 * k, 0.000110],
      [141.74 + 53.303771 * k, 0.000062],
      [207.14 + 2.453732 * k, 0.000060],
      [154.84 + 7.306860 * k, 0.000056],
      [34.52 + 27.261239 * k, 0.000047],
      [207.19 + 0.121824 * k, 0.000042],
      [291.34 + 1.844379 * k, 0.000040],
      [161.72 + 24.198154 * k, 0.000037],
      [239.56 + 25.513099 * k, 0.000035],
      [331.55 + 3.592518 * k, 0.000023]
    ];
    for (var i = 0; i < A.length; i++) jde += A[i][1] * Math.sin(A[i][0] * D2R);

    return jde - deltaT(jdToYear(jde)) / 86400; // UT
  }

  /* ---------- 한국 표준시 변천 · 서머타임 ---------- */
  // 반환: 그 날짜의 표준시 UTC 오프셋(시간)
  function kstOffset(y, m, d) {
    var n = y * 10000 + m * 100 + d;
    if (n < 19080401) return 8.5;            // 그 이전은 지방시에 가까움 — 편의상 8.5
    if (n < 19120101) return 8.5;            // 1908-04-01 ~ 1911: UTC+8:30
    if (n < 19540321) return 9;              // 1912-01-01 ~ 1954-03-20: UTC+9
    if (n < 19610810) return 8.5;            // 1954-03-21 ~ 1961-08-09: UTC+8:30
    return 9;                                // 1961-08-10 ~ : UTC+9
  }
  var DST_RANGES = [
    [19480601, 19480912], [19490403, 19490910], [19500401, 19500910],
    [19510506, 19510908], [19550505, 19550908], [19560520, 19560929],
    [19570505, 19570921], [19580504, 19580920], [19590503, 19590919],
    [19600501, 19600917], [19870510, 19871011], [19880508, 19881009]
  ];
  function isDST(y, m, d) {
    var n = y * 10000 + m * 100 + d;
    for (var i = 0; i < DST_RANGES.length; i++) {
      if (n >= DST_RANGES[i][0] && n <= DST_RANGES[i][1]) return true;
    }
    return false;
  }

  /* ============================================================
     음력 ↔ 양력
     동지를 품은 삭망월을 11월로 삼고, 중기가 없는 달을 윤달로 둔다.
     ============================================================ */
  var suiCache = {};

  function civilDayKST(jdUT) { return Math.floor(jdUT + 0.5 + 9 / 24); }

  function buildSui(Y) {
    if (suiCache[Y]) return suiCache[Y];
    var ws0 = solarTermJD(Y - 1, 270);
    var ws1 = solarTermJD(Y, 270);
    var d0 = civilDayKST(ws0), d1 = civilDayKST(ws1);

    var k0 = Math.floor((Y - 1 - 2000) * 12.3685) - 2;
    var nm = [], k = k0, day;
    while (true) {
      day = civilDayKST(newMoonJD(k));
      nm.push(day);
      if (day > d1 + 40) break;
      k++;
      if (nm.length > 40) break;
    }
    var i0 = -1, i1 = -1, i;
    for (i = 0; i < nm.length; i++) {
      if (nm[i] <= d0) i0 = i;
      if (nm[i] <= d1) i1 = i;
    }
    var n = i1 - i0;
    var leapNeeded = (n === 13);

    // 중기(30° 배수 황경) 시각들을 범위 안에서 모은다
    var major = [];
    for (var t = 0; t < 25; t++) {
      var deg = norm360(270 + t * 30);
      var yy = (t * 30 < 90) ? Y - 1 : Y; // 대략적 초기 연도
      var guess = jdn(yy, 1, 1) - 0.5;
      guess += norm360(deg - sunLongitude(guess)) * 365.2422 / 360;
      var jdv = lambdaToJD(guess, deg);
      var dd = civilDayKST(jdv);
      if (dd >= nm[i0] - 5 && dd <= nm[Math.min(i1, nm.length - 1)] + 40) major.push(dd);
    }
    function hasMajor(a, b) {
      for (var j = 0; j < major.length; j++) if (major[j] >= a && major[j] < b) return true;
      return false;
    }

    var months = [], num = 11, prevNum = 11, leapDone = false, ly = Y - 1;
    for (i = i0; i < i1; i++) {
      var start = nm[i], end = nm[i + 1];
      var isLeap = false, thisNum;
      if (leapNeeded && !leapDone && i > i0 && !hasMajor(start, end)) {
        isLeap = true; leapDone = true; thisNum = prevNum;
      } else {
        thisNum = num;
        prevNum = num;
        num = (num === 12) ? 1 : num + 1;
      }
      if (!isLeap && thisNum === 1) ly = Y;
      months.push({ ly: ly, num: thisNum, leap: isLeap, start: start, end: end, days: end - start });
    }
    suiCache[Y] = months;
    return months;
  }

  function lunarMonths(lunarYear) {
    var out = buildSui(lunarYear).concat(buildSui(lunarYear + 1));
    return out.filter(function (mo) { return mo.ly === lunarYear; });
  }

  function solarToLunar(y, m, d) {
    var j = jdn(y, m, d);
    var pool = buildSui(y).concat(buildSui(y + 1));
    for (var i = 0; i < pool.length; i++) {
      if (j >= pool[i].start && j < pool[i].end) {
        return { y: pool[i].ly, m: pool[i].num, d: j - pool[i].start + 1, leap: pool[i].leap, size: pool[i].days };
      }
    }
    return null;
  }

  function lunarToSolar(ly, lm, ld, leap) {
    var months = lunarMonths(ly);
    for (var i = 0; i < months.length; i++) {
      if (months[i].num === lm && !!months[i].leap === !!leap) {
        if (ld < 1 || ld > months[i].days) return null;
        return fromJDN(months[i].start + ld - 1);
      }
    }
    return null;
  }

  function leapMonthsOf(lunarYear) {
    return lunarMonths(lunarYear).filter(function (mo) { return mo.leap; }).map(function (mo) { return mo.num; });
  }
  function lunarMonthSize(ly, lm, leap) {
    var months = lunarMonths(ly);
    for (var i = 0; i < months.length; i++) {
      if (months[i].num === lm && !!months[i].leap === !!leap) return months[i].days;
    }
    return 30;
  }

  /* ============================================================
     사주 산출
     ============================================================ */
  function ganzhiIndex(stem, branch) {
    for (var i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
    return 0;
  }

  function tenGod(dm, other) {
    var de = STEM_EL[dm], oe = STEM_EL[other];
    var same = STEM_YIN[dm] === STEM_YIN[other];
    if (oe === de) return same ? '비견' : '겁재';
    if (oe === (de + 1) % 5) return same ? '식신' : '상관';
    if (oe === (de + 2) % 5) return same ? '편재' : '정재';
    if ((oe + 2) % 5 === de) return same ? '편관' : '정관';
    return same ? '편인' : '정인';
  }
  var GOD_GROUP = {
    비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상',
    편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성'
  };

  function twelveStage(dm, branch) {
    var start = BIRTH_BRANCH[dm];
    var step = STEM_YIN[dm] === 0 ? 1 : -1;
    return TWELVE_STAGE[mod((branch - start) * step, 12)];
  }

  /* ---------- 관계: 합·충·형·해·파 ---------- */
  var STEM_HAP = { '0-5': 2, '1-6': 3, '2-7': 4, '3-8': 0, '4-9': 1 }; // 합화 오행
  function stemHap(a, b) {
    var k = Math.min(a, b) + '-' + Math.max(a, b);
    return STEM_HAP.hasOwnProperty(k) ? STEM_HAP[k] : -1;
  }
  function stemChung(a, b) {
    var d = Math.abs(a - b);
    if (d !== 6) return false;
    return (a % 10) < 8 && (b % 10) < 8 && STEM_EL[a] !== 2 && STEM_EL[b] !== 2;
  }
  var YUKHAP = { '0-1': 2, '2-11': 0, '3-10': 1, '4-9': 3, '5-8': 4, '6-7': 2 };
  function yukhap(a, b) {
    var k = Math.min(a, b) + '-' + Math.max(a, b);
    return YUKHAP.hasOwnProperty(k) ? YUKHAP[k] : -1;
  }
  var SAMHAP = [[8, 0, 4, 4], [11, 3, 7, 0], [2, 6, 10, 1], [5, 9, 1, 3]]; // [지지3, 오행]
  function samhapInfo(a, b) {
    for (var i = 0; i < SAMHAP.length; i++) {
      var g = SAMHAP[i];
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b) {
        var wang = g[1];
        var half = (a === wang || b === wang);
        return { el: g[3], full: false, half: half, trio: g.slice(0, 3) };
      }
    }
    return null;
  }
  var BANGHAP = [[2, 3, 4, 0], [5, 6, 7, 1], [8, 9, 10, 3], [11, 0, 1, 4]];
  function banghap(a, b) {
    for (var i = 0; i < BANGHAP.length; i++) {
      var g = BANGHAP[i];
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b) return g[3];
    }
    return -1;
  }
  function branchChung(a, b) { return mod(a - b, 12) === 6; }
  var HYEONG_TRIO = [[2, 5, 8], [1, 10, 7]];
  function branchHyeong(a, b) {
    if (a === b && [4, 6, 9, 11].indexOf(a) >= 0) return '자형';
    for (var i = 0; i < HYEONG_TRIO.length; i++) {
      var g = HYEONG_TRIO[i];
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b) return '삼형';
    }
    if ((a === 0 && b === 3) || (a === 3 && b === 0)) return '상형';
    return null;
  }
  var HAE = { '0-7': 1, '1-6': 1, '2-5': 1, '3-4': 1, '8-11': 1, '9-10': 1 };
  function branchHae(a, b) { return HAE.hasOwnProperty(Math.min(a, b) + '-' + Math.max(a, b)); }
  var PA = { '0-9': 1, '1-4': 1, '2-11': 1, '3-6': 1, '5-8': 1, '7-10': 1 };
  function branchPa(a, b) { return PA.hasOwnProperty(Math.min(a, b) + '-' + Math.max(a, b)); }

  /* ---------- 신살 ---------- */
  var CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
  var MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
  var YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
  var GWAEGANG = [[6, 4], [6, 10], [8, 4], [4, 10]];
  var BAEKHO = [[0, 4], [1, 7], [2, 10], [3, 1], [4, 4], [8, 10], [9, 1]];

  function samhapGroupOf(branch) {
    for (var i = 0; i < SAMHAP.length; i++) if (SAMHAP[i].indexOf(branch) >= 0 && SAMHAP[i].slice(0, 3).indexOf(branch) >= 0) return i;
    return -1;
  }
  var DOHWA = [9, 3, 6, 0];   // 신자진→유, 해묘미→자? (아래 매핑으로 보정)
  function shinsalFor(pillars, dm) {
    var out = [];
    var branches = pillars.map(function (p) { return p.b; });
    var dayB = pillars[2].b, yearB = pillars[0].b;
    function groupIdx(b) {
      if ([8, 0, 4].indexOf(b) >= 0) return 0; // 신자진
      if ([11, 3, 7].indexOf(b) >= 0) return 1; // 해묘미
      if ([2, 6, 10].indexOf(b) >= 0) return 2; // 인오술
      return 3; // 사유축
    }
    var DO = [9, 0, 3, 6];   // 신자진→酉, 해묘미→子, 인오술→卯, 사유축→午
    var YEOK = [2, 5, 8, 11]; // 신자진→寅, 해묘미→巳, 인오술→申, 사유축→亥
    var HWA = [4, 7, 10, 1];  // 신자진→辰, 해묘미→未, 인오술→戌, 사유축→丑

    [yearB, dayB].forEach(function (base) {
      var g = groupIdx(base);
      branches.forEach(function (b, i) {
        if (b === DO[g] && out.indexOf('도화') < 0) out.push('도화');
        if (b === YEOK[g] && out.indexOf('역마') < 0) out.push('역마');
        if (b === HWA[g] && out.indexOf('화개') < 0) out.push('화개');
      });
    });
    branches.forEach(function (b) {
      if (CHEONEUL[dm].indexOf(b) >= 0 && out.indexOf('천을귀인') < 0) out.push('천을귀인');
      if (MUNCHANG[dm] === b && out.indexOf('문창귀인') < 0) out.push('문창귀인');
      if (YANGIN[dm] === b && out.indexOf('양인') < 0) out.push('양인');
    });
    GWAEGANG.forEach(function (g) {
      if (pillars[2].s === g[0] && pillars[2].b === g[1] && out.indexOf('괴강') < 0) out.push('괴강');
    });
    BAEKHO.forEach(function (g) {
      pillars.forEach(function (p) {
        if (p.s === g[0] && p.b === g[1] && out.indexOf('백호') < 0) out.push('백호');
      });
    });
    return out;
  }

  /* ---------- 오행 세력 ---------- */
  function elementScores(pillars) {
    var sc = [0, 0, 0, 0, 0];
    var stemW = [1.0, 1.1, 1.0, 1.0];   // 년 월 일 시 천간
    var branchW = [1.1, 1.9, 1.4, 1.1]; // 년 월 일 시 지지
    pillars.forEach(function (p, i) {
      sc[STEM_EL[p.s]] += stemW[i];
      var hid = HIDDEN[p.b], total = 0, j;
      for (j = 0; j < hid.length; j++) total += hid[j][1];
      for (j = 0; j < hid.length; j++) sc[STEM_EL[hid[j][0]]] += branchW[i] * hid[j][1] / total;
    });
    return sc;
  }

  function strengthOf(pillars, sc) {
    var dm = pillars[2].s, de = STEM_EL[dm];
    var self = sc[de];
    var res = sc[(de + 4) % 5];          // 인성 (나를 생)
    var out = sc[(de + 1) % 5];          // 식상
    var wealth = sc[(de + 2) % 5];       // 재성
    var off = sc[(de + 3) % 5];          // 관성
    var monthMain = HIDDEN[pillars[1].b][HIDDEN[pillars[1].b].length - 1][0];
    var me = STEM_EL[monthMain];
    var deukryeong = (me === de || me === (de + 4) % 5);
    var mine = self + res * 0.95 + (deukryeong ? 1.6 : 0);
    var theirs = out + wealth + off;
    var pct = 100 * mine / (mine + theirs);
    var label;
    if (pct < 34) label = '극신약';
    else if (pct < 45) label = '신약';
    else if (pct <= 56) label = '중화';
    else if (pct <= 67) label = '신강';
    else label = '극신강';
    return {
      pct: pct, label: label, deukryeong: deukryeong,
      groups: { 비겁: self, 인성: res, 식상: out, 재성: wealth, 관성: off }
    };
  }

  function pickYongsin(pillars, sc, st) {
    var de = STEM_EL[pillars[2].s];
    var monthB = pillars[1].b;
    var cold = [11, 0, 1].indexOf(monthB) >= 0;
    var hot = [5, 6, 7].indexOf(monthB) >= 0;
    var weak = st.pct < 47;
    var cand;
    if (weak) cand = [(de + 4) % 5, de];                         // 인성, 비겁
    else cand = [(de + 1) % 5, (de + 2) % 5, (de + 3) % 5];      // 식상, 재성, 관성

    var best = cand[0], bestScore = -1;
    cand.forEach(function (e) {
      var v = weak ? sc[e] * 1.0 : sc[e] * 1.0;
      if (cold && e === 1) v += 2.2;
      if (hot && e === 4) v += 2.2;
      if (v > bestScore) { bestScore = v; best = e; }
    });
    var second = cand.filter(function (e) { return e !== best; })
      .sort(function (a, b) { return sc[b] - sc[a]; })[0];

    var johu = -1;
    if (cold && sc[1] < 1.2) johu = 1;
    if (hot && sc[4] < 1.2) johu = 4;

    // 기신: 용신을 극하는 오행
    var giSin = mod(best + 3, 5);
    return { main: best, sub: (second === undefined ? -1 : second), johu: johu, gi: giSin, weak: weak };
  }

  /* ---------- 대운 ---------- */
  function buildDaewoon(pillars, jdUT, lam, yearStem, isMale, birthYear) {
    var forward = (STEM_YIN[yearStem] === 0) === !!isMale;
    var off = Math.floor(norm360(lam - 315) / 30);
    var curJeol = norm360(315 + off * 30);
    var nextJeol = norm360(315 + (off + 1) * 30);
    var jdNext = lambdaToJD(jdUT + 15, nextJeol);
    var jdPrev = lambdaToJD(jdUT - 15, curJeol);
    var days = forward ? (jdNext - jdUT) : (jdUT - jdPrev);
    var startAge = days / 3;
    var num = Math.max(1, Math.round(startAge * 10) / 10);

    var m60 = ganzhiIndex(pillars[1].s, pillars[1].b);
    var list = [];
    for (var i = 1; i <= 9; i++) {
      var idx = mod(m60 + (forward ? i : -i), 60);
      list.push({
        s: idx % 10, b: idx % 12,
        age: Math.round((num + (i - 1) * 10) * 10) / 10,
        year: birthYear + Math.floor(num + (i - 1) * 10)
      });
    }
    return { forward: forward, num: Math.round(num * 10) / 10, list: list };
  }

  /* ---------- 메인 ---------- */
  /**
   * @param {Object} inp {name, gender:'M'|'F', calType:'solar'|'lunar', leap, y, m, d, hour, minute,
   *                      unknownTime, lon, trueSolar, lateZi}
   */
  function compute(inp) {
    var cal = { y: inp.y, m: inp.m, d: inp.d };
    var lunarInfo = null;
    if (inp.calType === 'lunar') {
      var s = lunarToSolar(inp.y, inp.m, inp.d, inp.leap);
      if (!s) throw new Error('없는 음력 날짜입니다. 윤달 여부와 날짜를 확인하세요.');
      cal = s;
    }
    if (cal.y < 1900 || cal.y > 2100) throw new Error('1900년 ~ 2100년 사이만 계산합니다.');

    var lunar = solarToLunar(cal.y, cal.m, cal.d);
    lunarInfo = lunar;

    var unknown = !!inp.unknownTime;
    var hh = unknown ? 12 : inp.hour;
    var mi = unknown ? 0 : (inp.minute || 0);

    var tz = kstOffset(cal.y, cal.m, cal.d);
    var dst = isDST(cal.y, cal.m, cal.d) ? 1 : 0;
    var jdUT = jdn(cal.y, cal.m, cal.d) - 0.5 + (hh + mi / 60 - dst - tz) / 24;

    var lam = sunLongitude(jdUT);
    var lon = (inp.lon === undefined || inp.lon === null) ? 126.9784 : inp.lon;
    var eot = equationOfTime(jdUT);
    // 시간 보정 방식
    //  std30 : 표준시에서 동경 127.5° 기준으로 되돌림 (UTC+9 시기엔 −30분, UTC+8:30 시기엔 0분).
    //          국내 만세력 대부분이 쓰는 방식 — 기본값
    //  true  : 출생지 경도 + 균시차 (진태양시)
    //  none  : 표준시 그대로
    var mode = inp.timeMode || (inp.trueSolar === false ? 'none' : 'std30');
    var lst;
    if (mode === 'true') lst = jdUT + (lon / 15) / 24 + eot / 1440;
    else if (mode === 'none') lst = jdUT + tz / 24;
    else lst = jdUT + tz / 24 - ((tz * 15 - 127.5) * 4) / 1440;

    var dayNum = Math.floor(lst + 0.5);
    var hourFrac = (lst + 0.5 - dayNum) * 24;
    // 큰 율리우스일에서 소수부를 뽑으면 double 오차(약 4.7e-10일)가 남아 정각이 12.9999…로 나온다.
    // 시각을 분 단위로 반올림해 정각 경계에서 시지가 한 칸 밀리는 것을 막고, 24시가 되면 다음 날로 넘긴다.
    hourFrac = Math.round(hourFrac * 60) / 60;
    if (hourFrac >= 24) { hourFrac -= 24; dayNum += 1; }
    var hourBranch = Math.floor(mod(hourFrac + 1, 24) / 2);
    var lateZi = inp.lateZi !== false; // 23시 이후 일진을 다음날로
    var dayNumForPillar = (lateZi && hourFrac >= 23) ? dayNum + 1 : dayNum;

    // 년주
    var ipchun = solarTermJD(cal.y, 315);
    var sajuYear = (jdUT < ipchun) ? cal.y - 1 : cal.y;
    var yIdx = mod(sajuYear - 1984, 60);
    var yearS = yIdx % 10, yearB = yIdx % 12;

    // 월주
    var mOff = Math.floor(norm360(lam - 315) / 30);
    var monthB = mod(2 + mOff, 12);
    var monthS = mod((yearS % 5) * 2 + 2 + mOff, 10);

    // 일주 — 율리우스일 기준 (JDN + 49) mod 60 이 甲子=0.
    // 검산: 1900-01-01 甲戌, 1949-10-01 甲子, 2000-01-01 戊午, 2024-01-01 甲子
    var dIdx = mod(dayNumForPillar + 49, 60);
    var dayS = dIdx % 10, dayB = dIdx % 12;

    // 시주
    var hourS = mod((dayS % 5) * 2 + hourBranch, 10);

    var pillars = [
      { s: yearS, b: yearB, tag: '년주' },
      { s: monthS, b: monthB, tag: '월주' },
      { s: dayS, b: dayB, tag: '일주' },
      { s: hourS, b: hourBranch, tag: '시주' }
    ];

    var dm = dayS;
    pillars.forEach(function (p, i) {
      p.stemGod = (i === 2) ? '일간' : tenGod(dm, p.s);
      var hid = HIDDEN[p.b];
      p.main = hid[hid.length - 1][0];
      p.branchGod = tenGod(dm, p.main);
      p.hidden = hid.map(function (h) { return h[0]; });
      p.hiddenGods = p.hidden.map(function (h) { return tenGod(dm, h); });
      p.stage = twelveStage(dm, p.b);
    });

    // 출생 시각을 모르면 시주는 임시값이므로 분석에서 제외한다
    var active = unknown ? pillars.slice(0, 3) : pillars;

    var sc = elementScores(active);
    var st = strengthOf(active, sc);
    var yong = pickYongsin(active, sc, st);

    // 공망 (일주 기준)
    var xun = Math.floor(dIdx / 10);
    var gongB = [mod(10 - 2 * xun, 12), mod(11 - 2 * xun, 12)];

    // 시각을 모르면 일주가 야자시(23시 이후) 때문에 하루 달라질 수 있다.
    // 그 경우 일주·시주 전체가 바뀌므로 어느 정도 확실한지 알려 준다.
    var dayAmbiguous = unknown;

    // 격국 (월지 본기 십신, 월지가 비겁이면 일지/투간 보조)
    var monthGod = pillars[1].branchGod;
    var gyeokMap = {
      비견: '건록격', 겁재: '양인격', 식신: '식신격', 상관: '상관격',
      편재: '편재격', 정재: '정재격', 편관: '편관격', 정관: '정관격', 편인: '편인격', 정인: '정인격'
    };

    var daewoon = buildDaewoon(pillars, jdUT, lam, yearS, inp.gender === 'M', cal.y);

    // 절기 경계까지의 여유 (분)
    var nextJeolJD = lambdaToJD(jdUT + 15, norm360(315 + (mOff + 1) * 30));
    var prevJeolJD = lambdaToJD(jdUT - 15, norm360(315 + mOff * 30));
    var edgeMin = Math.min(nextJeolJD - jdUT, jdUT - prevJeolJD) * 1440;

    // 십신 집계
    var godCount = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    active.forEach(function (p, i) {
      if (i !== 2) godCount[GOD_GROUP[p.stemGod]]++;
      godCount[GOD_GROUP[p.branchGod]]++;
    });

    // 원국 내부 관계
    var rel = internalRelations(active);

    return {
      input: inp,
      solar: cal,
      lunar: lunarInfo,
      dst: !!dst, tzOffset: tz, eot: eot, timeMode: mode, lon: lon,
      unknownTime: unknown,
      dayAmbiguous: dayAmbiguous,
      hourFrac: hourFrac,
      lam: lam,
      edgeMinutes: edgeMin,
      sajuYear: sajuYear,
      pillars: pillars,
      active: active,
      dm: dm,
      dmEl: STEM_EL[dm],
      dmYin: STEM_YIN[dm],
      zodiac: ZODIAC[yearB],
      scores: sc,
      strength: st,
      yongsin: yong,
      gongmang: gongB,
      gyeok: gyeokMap[monthGod] || (monthGod + '격'),
      godCount: godCount,
      shinsal: shinsalFor(active, dm),
      // 길성·흉살 상세 (shinsal.js). 없으면 빈 배열
      shinsalAll: (global.Shinsal ? global.Shinsal.detect(active, gongB) : []),
      daewoon: daewoon,
      relations: rel
    };
  }

  function internalRelations(pillars) {
    var out = [];
    var tags = ['년', '월', '일', '시'];
    var n = pillars.length, i, j;   // 출생 시각을 모르면 세 기둥만 온다
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var a = pillars[i], b = pillars[j];
      var h = stemHap(a.s, b.s);
      if (h >= 0) out.push({ kind: '천간합', a: tags[i] + '간', b: tags[j] + '간', text: STEM_H[a.s] + STEM_H[b.s] + ' 합 → ' + EL_H[h], good: 1 });
      if (stemChung(a.s, b.s)) out.push({ kind: '천간충', a: tags[i] + '간', b: tags[j] + '간', text: STEM_H[a.s] + STEM_H[b.s] + ' 충', good: -1 });
      var y = yukhap(a.b, b.b);
      if (y >= 0) out.push({ kind: '육합', a: tags[i] + '지', b: tags[j] + '지', text: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 육합 → ' + EL_H[y], good: 1 });
      var sh = samhapInfo(a.b, b.b);
      if (sh) out.push({ kind: sh.half ? '반합' : '삼합기운', a: tags[i] + '지', b: tags[j] + '지', text: BRANCH_H[a.b] + BRANCH_H[b.b] + ' ' + (sh.half ? '반합' : '삼합') + ' → ' + EL_H[sh.el], good: 1 });
      if (branchChung(a.b, b.b)) out.push({ kind: '충', a: tags[i] + '지', b: tags[j] + '지', text: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 충', good: -1 });
      var hy = branchHyeong(a.b, b.b);
      if (hy) out.push({ kind: hy, a: tags[i] + '지', b: tags[j] + '지', text: BRANCH_H[a.b] + BRANCH_H[b.b] + ' ' + hy, good: -1 });
      if (branchHae(a.b, b.b)) out.push({ kind: '해', a: tags[i] + '지', b: tags[j] + '지', text: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 해', good: -1 });
      if (branchPa(a.b, b.b)) out.push({ kind: '파', a: tags[i] + '지', b: tags[j] + '지', text: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 파', good: -1 });
    }
    return out;
  }

  /* ============================================================
     궁합
     ============================================================ */
  function pairRelations(A, B) {
    var out = [];
    var tags = ['년', '월', '일', '시'];
    var PA2 = A.active || A.pillars, PB = B.active || B.pillars;
    for (var i = 0; i < PA2.length; i++) for (var j = 0; j < PB.length; j++) {
      var a = PA2[i], b = PB[j];
      var h = stemHap(a.s, b.s);
      if (h >= 0) out.push({ k: '천간합', w: 1, p: tags[i] + '간↔' + tags[j] + '간', t: STEM_H[a.s] + STEM_H[b.s] + ' 합 → ' + EL_H[h] });
      if (stemChung(a.s, b.s)) out.push({ k: '천간충', w: -1, p: tags[i] + '간↔' + tags[j] + '간', t: STEM_H[a.s] + STEM_H[b.s] + ' 충' });
      var y = yukhap(a.b, b.b);
      if (y >= 0) out.push({ k: '육합', w: 1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 육합 → ' + EL_H[y] });
      var sh = samhapInfo(a.b, b.b);
      if (sh) out.push({ k: sh.half ? '반합' : '삼합', w: 1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' → ' + EL_H[sh.el] });
      var bh = banghap(a.b, b.b);
      if (bh >= 0 && !sh && y < 0) out.push({ k: '방합', w: 1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 방합 → ' + EL_H[bh] });
      if (branchChung(a.b, b.b)) out.push({ k: '충', w: -1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 충' });
      var hy = branchHyeong(a.b, b.b);
      if (hy) out.push({ k: hy, w: -1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' ' + hy });
      if (branchHae(a.b, b.b)) out.push({ k: '해', w: -1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 해' });
      if (branchPa(a.b, b.b)) out.push({ k: '파', w: -1, p: tags[i] + '지↔' + tags[j] + '지', t: BRANCH_H[a.b] + BRANCH_H[b.b] + ' 파' });
    }
    return out;
  }

  function dmRelation(A, B) {
    var a = A.dm, b = B.dm, ae = STEM_EL[a], be = STEM_EL[b];
    if (stemHap(a, b) >= 0) return { score: 27, label: '천간합', desc: STEM_H[a] + '·' + STEM_H[b] + ' 합 — 서로를 끌어당기는 구조' };
    if (ae === be) {
      return STEM_YIN[a] !== STEM_YIN[b]
        ? { score: 20, label: '같은 오행 음양 다름', desc: '같은 기운이되 결이 달라 경쟁보다 분업이 된다' }
        : { score: 15, label: '같은 오행 같은 음양', desc: '똑같은 기운이라 편하지만 부딪히면 양보가 없다' };
    }
    if (be === (ae + 1) % 5) return { score: 23, label: 'A→B 생', desc: A.nameRef + '이(가) ' + B.nameRef + '을(를) 키워주는 방향' };
    if (ae === (be + 1) % 5) return { score: 23, label: 'B→A 생', desc: B.nameRef + '이(가) ' + A.nameRef + '을(를) 키워주는 방향' };
    if (be === (ae + 2) % 5) return { score: 12, label: 'A→B 극', desc: A.nameRef + '이(가) ' + B.nameRef + '을(를) 누르는 방향' };
    return { score: 12, label: 'B→A 극', desc: B.nameRef + '이(가) ' + A.nameRef + '을(를) 누르는 방향' };
  }

  function dayBranchRelation(A, B) {
    var a = A.pillars[2].b, b = B.pillars[2].b;
    if (yukhap(a, b) >= 0) return { score: 27, label: '일지 육합', desc: '잠자리·생활 리듬이 맞는다' };
    var sh = samhapInfo(a, b);
    if (sh) return { score: sh.half ? 24 : 22, label: '일지 ' + (sh.half ? '반합' : '삼합'), desc: '목표가 같은 방향으로 묶인다' };
    if (banghap(a, b) >= 0) return { score: 20, label: '일지 방합', desc: '같은 계절의 기운, 정서가 비슷하다' };
    if (a === b) return { score: 18, label: '일지 동일', desc: '거울 같아서 편하지만 단점도 똑같다' };
    if (branchChung(a, b)) return { score: 8, label: '일지 충', desc: '가장 강한 충돌 자리. 끌리지만 오래 부딪힌다' };
    var hy = branchHyeong(a, b);
    if (hy) return { score: 10, label: '일지 ' + hy, desc: '말이 가시로 꽂히는 구조' };
    if (branchHae(a, b)) return { score: 12, label: '일지 해', desc: '사소한 서운함이 쌓인다' };
    if (branchPa(a, b)) return { score: 13, label: '일지 파', desc: '한쪽이 판을 깨는 일이 반복된다' };
    return { score: 17, label: '일지 무관', desc: '특별한 끌림도 충돌도 없다' };
  }

  function yongsinFit(A, B) {
    var total = 0, detail = [];
    [[A, B], [B, A]].forEach(function (pair) {
      var me = pair[0], you = pair[1];
      var sum = you.scores.reduce(function (x, y) { return x + y; }, 0) || 1;
      var need = me.yongsin.main;
      var ratio = you.scores[need] / sum;
      var gi = me.yongsin.gi;
      var giRatio = you.scores[gi] / sum;
      var s = Math.max(0, Math.min(10, ratio * 32 - giRatio * 10 + 2));
      total += s;
      detail.push({
        who: me.nameRef, need: EL[need], have: Math.round(ratio * 100),
        gi: EL[gi], giHave: Math.round(giRatio * 100), score: Math.round(s * 10) / 10
      });
    });
    return { score: total, detail: detail };
  }

  function balanceFit(A, B) {
    var s = [0, 0, 0, 0, 0], i;
    for (i = 0; i < 5; i++) s[i] = A.scores[i] + B.scores[i];
    var tot = s.reduce(function (x, y) { return x + y; }, 0) || 1;
    var dev = 0;
    for (i = 0; i < 5; i++) dev += Math.abs(s[i] / tot - 0.2);
    var solo = 0;
    for (i = 0; i < 5; i++) solo += Math.abs(A.scores[i] / (A.scores.reduce(function (x, y) { return x + y; }, 0) || 1) - 0.2);
    var score = Math.max(0, Math.min(10, (0.9 - dev) * 14));
    return { score: score, merged: s, dev: dev, improved: dev < solo };
  }

  function compat(A, B) {
    A.nameRef = A.input.name || 'A';
    B.nameRef = B.input.name || 'B';
    var rels = pairRelations(A, B);
    var dmR = dmRelation(A, B);
    var dbR = dayBranchRelation(A, B);
    var yf = yongsinFit(A, B);
    var bf = balanceFit(A, B);

    var plus = 0, minus = 0;
    rels.forEach(function (r) {
      var w = (r.p.indexOf('일') >= 0) ? 1.6 : (r.p.indexOf('월') >= 0 ? 1.2 : 0.8);
      if (r.w > 0) plus += w; else minus += w;
    });
    var relScore = Math.max(0, Math.min(16, 8 + (plus - minus) * 1.5));

    var total = dmR.score + dbR.score + yf.score + bf.score + relScore;
    total = Math.max(8, Math.min(99, Math.round(total)));

    // 분야별 점수
    var loveBase = dbR.score * 1.5 + dmR.score * 0.9;
    var dohwa = (A.shinsal.indexOf('도화') >= 0 ? 3 : 0) + (B.shinsal.indexOf('도화') >= 0 ? 3 : 0);
    var love = clamp(Math.round(loveBase + dohwa + (bf.improved ? 4 : 0) - countKind(rels, ['충', '삼형', '자형', '상형']) * 2.5), 5, 99);

    var wealth = clamp(Math.round(
      40 + yf.score * 2.4 +
      (A.godCount.재성 + B.godCount.재성) * 3 +
      (bf.improved ? 6 : -2) - countKind(rels, ['파', '해']) * 2), 5, 99);

    var work = clamp(Math.round(
      38 + relScore * 1.8 + (A.godCount.관성 + B.godCount.관성) * 2.5 +
      (A.godCount.식상 + B.godCount.식상) * 2 + (bf.improved ? 8 : 0) -
      countKind(rels, ['천간충']) * 3), 5, 99);

    var mind = clamp(Math.round(
      42 + dmR.score * 1.1 + countKind(rels, ['육합', '삼합', '반합', '방합', '천간합']) * 3 -
      countKind(rels, ['충', '삼형', '자형', '상형', '해']) * 4), 5, 99);

    var endure = clamp(Math.round(
      (total * 0.55) + (bf.score * 2) + (dbR.score * 0.8) -
      countKind(rels, ['충']) * 3), 5, 99);

    return {
      a: A.nameRef, b: B.nameRef,
      total: total,
      dm: dmR, dayBranch: dbR, yongsin: yf, balance: bf,
      relations: rels, relScore: relScore,
      sub: { 애정: love, 재물: wealth, 협업: work, 소통: mind, 지속력: endure },
      merged: bf.merged
    };
  }

  function countKind(rels, kinds) {
    var n = 0;
    rels.forEach(function (r) { if (kinds.indexOf(r.k) >= 0) n++; });
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- 그룹 ---------- */
  var ROLE_BY_EL = [
    { name: '기획·추진', desc: '새 판을 벌이고 방향을 정하는 자리' },
    { name: '동력·홍보', desc: '사람을 모으고 열을 올리는 자리' },
    { name: '조율·관리', desc: '판을 붙들고 사고를 수습하는 자리' },
    { name: '결단·품질', desc: '자르고 마감하고 기준을 세우는 자리' },
    { name: '전략·정보', desc: '한발 물러나 흐름을 읽고 수를 내는 자리' }
  ];

  function groupAnalyze(list) {
    var n = list.length, i, j;
    var pairs = [];
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var c = compat(list[i], list[j]);
      c.i = i; c.j = j;
      pairs.push(c);
    }
    var sum = [0, 0, 0, 0, 0];
    list.forEach(function (p) { for (i = 0; i < 5; i++) sum[i] += p.scores[i]; });
    var tot = sum.reduce(function (a, b) { return a + b; }, 0) || 1;
    var pct = sum.map(function (v) { return v / tot; });
    var missing = [], over = [];
    pct.forEach(function (v, k) {
      if (v < 0.11) missing.push(EL[k]);
      if (v > 0.32) over.push(EL[k]);
    });
    var roles = list.map(function (p) {
      var strongest = 0;
      for (i = 1; i < 5; i++) if (p.scores[i] > p.scores[strongest]) strongest = i;
      var uniqueness = p.scores[p.dmEl] / (sum[p.dmEl] || 1);
      return {
        name: p.input.name, el: p.dmEl, role: ROLE_BY_EL[p.dmEl],
        strongestEl: EL[strongest], strength: p.strength.label, gyeok: p.gyeok,
        share: Math.round(uniqueness * 100)
      };
    });
    var sorted = pairs.slice().sort(function (a, b) { return b.total - a.total; });
    var loveSorted = pairs.slice().sort(function (a, b) { return b.sub.애정 - a.sub.애정; });
    var workSorted = pairs.slice().sort(function (a, b) { return b.sub.협업 - a.sub.협업; });
    var avg = pairs.reduce(function (a, c) { return a + c.total; }, 0) / (pairs.length || 1);

    return {
      pairs: pairs, avg: Math.round(avg), merged: sum, pct: pct,
      missing: missing, over: over, roles: roles,
      best: sorted[0], worst: sorted[sorted.length - 1],
      loveRank: loveSorted, workRank: workSorted
    };
  }

  /* ---------- 표시용 헬퍼 ---------- */
  function gz(s, b) { return STEM_H[s] + BRANCH_H[b]; }
  function gzKo(s, b) { return STEM[s] + BRANCH[b]; }

  global.Saju = {
    STEM: STEM, STEM_H: STEM_H, BRANCH: BRANCH, BRANCH_H: BRANCH_H,
    EL: EL, EL_H: EL_H, STEM_EL: STEM_EL, BRANCH_EL: BRANCH_EL,
    STEM_YIN: STEM_YIN, BRANCH_YIN: BRANCH_YIN, ZODIAC: ZODIAC,
    STEM_EMOJI: STEM_EMOJI, STEM_OBJ: STEM_OBJ,
    HIDDEN: HIDDEN, TERM_NAME: TERM_NAME, JEOL_NAME: JEOL_NAME,
    GOD_GROUP: GOD_GROUP, ROLE_BY_EL: ROLE_BY_EL,
    compute: compute, compat: compat, groupAnalyze: groupAnalyze,
    solarToLunar: solarToLunar, lunarToSolar: lunarToSolar,
    leapMonthsOf: leapMonthsOf, lunarMonthSize: lunarMonthSize,
    solarTermJD: solarTermJD, sunLongitude: sunLongitude, newMoonJD: newMoonJD,
    jdn: jdn, fromJDN: fromJDN, tenGod: tenGod, gz: gz, gzKo: gzKo,
    isDST: isDST, kstOffset: kstOffset
  };
})(typeof window !== 'undefined' ? window : this);
