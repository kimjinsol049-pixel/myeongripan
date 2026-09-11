/* ============================================================
   재미로 보는 순위 — 첫 연애·결혼·취직 시기, 연애 횟수와 기간
   대운에서 해당 십신이 들어오는 구간을 잡고, 원국의 구조로 보정한다.
   명리에서 시기를 잡는 흔한 방식이지만 어디까지나 재미다.
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Saju;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
  function spouseGroup(R) { return R.input.gender === 'M' ? '재성' : '관성'; }
  function has(R, name) { return (R.shinsalAll || []).some(function (s) { return s.name === name; }); }
  function god(R, name) {
    return R.active.some(function (p, i) {
      return (i !== 2 && p.stemGod === name) || p.branchGod === name;
    });
  }
  function dayRel(R, kinds) {
    return R.relations.filter(function (r) {
      return (r.a === '일지' || r.b === '일지') && kinds.indexOf(r.kind) >= 0;
    }).length;
  }
  /** 대운 하나가 품은 십신 무리 */
  function dwGroups(R, d) {
    var hid = S.HIDDEN[d.b];
    return [
      S.GOD_GROUP[S.tenGod(R.dm, d.s)],
      S.GOD_GROUP[S.tenGod(R.dm, hid[hid.length - 1][0])]
    ];
  }
  /** lo~hi 나이 구간에서 해당 십신이 처음 들어오는 대운.
      대운은 10년을 덮으므로, 구간에 걸치기만 해도 잡되 시작 나이는 lo 아래로 내려가지 않게 한다. */
  function firstDw(R, groups, lo, hi) {
    var list = R.daewoon.list;
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (d.age + 9 < lo || d.age > hi) continue;
      var gs = dwGroups(R, d);
      for (var k = 0; k < gs.length; k++) {
        if (groups.indexOf(gs[k]) >= 0) return { d: d, from: Math.max(d.age, lo) };
      }
    }
    return null;
  }
  function yearOf(R, age) { return R.solar.y + Math.round(age); }
  var THIS_YEAR = new Date().getFullYear();

  /* ---------- 첫 연애 ---------- */
  function firstLove(R) {
    var sg = spouseGroup(R), why = [];
    var f = firstDw(R, [sg, '식상'], 15, 30);
    var age = f ? f.from + 1.5 : 21;
    if (f) why.push(Math.round(f.d.age) + '세 ' + S.STEM_H[f.d.s] + S.BRANCH_H[f.d.b] + ' 대운에 ' + sg + '·식상이 들어온다');
    else why.push('20대 초반까지 ' + sg + ' 대운이 없다');

    if (has(R, '도화살')) { age -= 2.5; why.push('도화살이 있어 일찍 눈에 띈다'); }
    if (has(R, '홍염살')) { age -= 1.5; why.push('홍염살로 은근한 매력이 있다'); }
    if (R.godCount.인성 >= 3) { age += 2.5; why.push('인성이 ' + R.godCount.인성 + '개라 사람보다 책이 먼저다'); }
    if (R.godCount[sg] === 0) { age += 2; why.push(sg + '이 없어 상대를 늦게 알아본다'); }
    if (R.godCount.비겁 >= 3) { age -= 1; why.push('비겁이 많아 무리 속에서 일찍 엮인다'); }
    if (has(R, '고신살') || has(R, '과숙살')) { age += 1.5; why.push('고신·과숙이 있어 혼자 있는 시간이 길다'); }

    age = clamp(age, 15, 33);
    var y = yearOf(R, age);
    return { age: age, year: y, past: y < THIS_YEAR, why: why };
  }

  /* ---------- 결혼 ---------- */
  function marriage(R, fl) {
    var sg = spouseGroup(R), why = [];
    var f = firstDw(R, [sg], 24, 42) || firstDw(R, ['관성', '재성'], 24, 42);
    var age = f ? f.from + 2.5 : 32;
    if (f) why.push(Math.round(f.d.age) + '세 ' + S.STEM_H[f.d.s] + S.BRANCH_H[f.d.b] + ' 대운이 배우자 자리를 건드린다');
    else why.push('40대 전까지 배우자성 대운이 뚜렷하지 않다');

    var c = R.godCount[sg];
    if (c === 0) { age += 4; why.push(sg + '이 원국에 없어 인연이 늦다'); }
    else if (c >= 3) { age -= 1.5; why.push(sg + '이 ' + c + '개로 많아 기회가 일찍 온다'); }
    if (god(R, '정재') || god(R, '정관')) { age -= 1.5; why.push('정재·정관이 있어 제도권 결혼으로 간다'); }
    if (god(R, '편재') || god(R, '편관')) { age += 1; why.push('편재·편관이라 자유로운 관계를 오래 끈다'); }
    if (dayRel(R, ['육합', '반합', '삼합기운'])) { age -= 2; why.push('일지에 합이 있어 한 번 맺으면 묶인다'); }
    if (dayRel(R, ['충', '삼형', '자형', '상형', '해'])) { age += 2.5; why.push('일지에 충·형이 있어 배우자 자리가 흔들린다'); }
    if (R.gongmang.indexOf(R.pillars[2].b) >= 0) { age += 2; why.push('일지가 공망이라 채워도 허전하다'); }
    if (has(R, '고신살') || has(R, '과숙살')) { age += 2; why.push('고신·과숙이 결혼을 미룬다'); }
    if (has(R, '고란살')) { age += 1.5; why.push('고란살이 있어 혼자서도 잘 산다'); }
    if (R.godCount.인성 >= 3) { age += 1.5; why.push('인성 과다로 독립이 늦다'); }

    age = Math.max(age, fl.age + 3);
    age = clamp(age, 23, 46);

    // 결혼 의지 점수 — 낮으면 비혼 쪽
    var will = 60;
    if (c === 0) will -= 22; if (c >= 3) will += 6;
    if (god(R, '정재') || god(R, '정관')) will += 16;
    if (dayRel(R, ['육합', '반합', '삼합기운'])) will += 12;
    if (dayRel(R, ['충', '삼형', '자형', '상형', '해'])) will -= 14;
    if (has(R, '고란살')) will -= 12;
    if (has(R, '고신살') || has(R, '과숙살')) will -= 8;
    if (R.godCount.비겁 >= 4) will -= 6;
    will = clamp(will, 5, 97);

    var y = yearOf(R, age);
    return { age: age, year: y, past: y < THIS_YEAR, why: why, will: will };
  }

  /* ---------- 연애 횟수 ---------- */
  function loveCount(R) {
    var sg = spouseGroup(R), why = [], n = 2.5;
    n += R.godCount[sg] * 0.9;
    if (R.godCount[sg]) why.push(sg + ' ' + R.godCount[sg] + '개');
    if (has(R, '도화살')) { n += 1.8; why.push('도화살'); }
    if (has(R, '홍염살')) { n += 1.2; why.push('홍염살'); }
    if (god(R, '편재') || god(R, '편관')) { n += 1.5; why.push('편재·편관은 인연이 넓다'); }
    if (god(R, '정재') || god(R, '정관')) { n -= 1; why.push('정재·정관은 한 사람에 오래'); }
    if (R.godCount.비겁 >= 3) { n += 1.2; why.push('비겁이 많아 뺏기고 겹친다'); }
    if (dayRel(R, ['충'])) { n += 1; why.push('일지 충'); }
    if (R.godCount.인성 >= 3) { n -= 1; why.push('인성 과다로 신중하다'); }
    if (has(R, '고신살') || has(R, '과숙살')) { n -= 0.8; }
    n = clamp(n, 1, 12);
    return { n: n, why: why };
  }

  /* ---------- 평균 연애 기간 ---------- */
  function loveDuration(R) {
    var why = [], m = 17;
    if (dayRel(R, ['육합', '반합', '삼합기운'])) { m *= 2.0; why.push('일지 합으로 오래 간다'); }
    if (dayRel(R, ['충', '삼형', '자형', '상형', '해'])) { m *= 0.55; why.push('일지 충·형으로 짧게 끊긴다'); }
    if (god(R, '정재') || god(R, '정관')) { m *= 1.5; why.push('정재·정관은 길게 본다'); }
    if (god(R, '편재') || god(R, '상관')) { m *= 0.75; why.push('편재·상관은 빨리 식는다'); }
    if (R.godCount.인성 >= 3) { m *= 1.25; why.push('인성이 관계를 붙든다'); }
    if (has(R, '도화살')) m *= 0.9;
    m = clamp(m, 3, 72);
    var label = m >= 36 ? Math.round(m / 12) + '년 이상' : m >= 12 ? Math.floor(m / 12) + '년 ' + (m % 12 ? (m % 12) + '개월' : '') : m + '개월';
    return { months: m, label: label.trim(), why: why };
  }

  /* ---------- 취직 ---------- */
  function job(R) {
    var why = [];
    var f = firstDw(R, ['관성'], 22, 34) || firstDw(R, ['식상', '재성'], 22, 34);
    var age = f ? f.from + 1.5 : 27;
    if (f) {
      var gs = dwGroups(R, f.d).filter(function (g) { return ['관성', '식상', '재성'].indexOf(g) >= 0; })[0];
      why.push(Math.round(f.d.age) + '세 ' + S.STEM_H[f.d.s] + S.BRANCH_H[f.d.b] + ' 대운에 ' + gs + '이 들어온다');
    } else why.push('30대 전까지 관성·재성 대운이 약하다');

    var path;
    if (R.godCount.관성 === 0) { age += 1.5; path = '조직보다 프리랜서·전문직'; why.push('관성이 없어 직장에 오래 못 붙는다'); }
    else if (R.godCount.관성 >= 3) { age -= 1; path = '큰 조직·공직'; why.push('관성 ' + R.godCount.관성 + '개로 틀이 있는 곳이 편하다'); }
    else path = '중간 규모 조직';
    if (R.godCount.인성 >= 3) { age += 2; why.push('인성이 많아 공부가 길어진다'); }
    if (R.godCount.식상 >= 3) { age -= 1; path = '재능으로 먹는 일'; why.push('식상이 많아 일찍 자기 것을 판다'); }
    if (has(R, '역마살')) why.push('역마살이 있어 이동이 잦은 일이 맞는다');
    if (has(R, '문창귀인') || has(R, '학당귀인')) { why.push('문창·학당이 있어 시험 운이 따른다'); }

    age = clamp(age, 20, 40);
    var y = yearOf(R, age);
    return { age: age, year: y, past: y < THIS_YEAR, path: path, why: why };
  }

  /** 한 사람의 예측 묶음 */
  function profile(R) {
    var fl = firstLove(R);
    var mg = marriage(R, fl);
    return {
      name: R.input.name,
      unknownTime: !!R.unknownTime,
      firstLove: fl,
      marriage: mg,
      count: loveCount(R),
      duration: loveDuration(R),
      job: job(R)
    };
  }

  var CATS = [
    { id: 'marriage', title: '가장 먼저 결혼', unit: '세', get: function (p) { return p.marriage.age; }, asc: true,
      sub: function (p) { return p.marriage.year + '년' + (p.marriage.past ? '(지남)' : '') + ' · 결혼 의지 ' + p.marriage.will; } },
    { id: 'firstLove', title: '가장 먼저 연애', unit: '세', get: function (p) { return p.firstLove.age; }, asc: true,
      sub: function (p) { return p.firstLove.year + '년' + (p.firstLove.past ? '쯤 이미 지남' : '쯤 첫 인연'); } },
    { id: 'count', title: '연애를 많이 하는 순', unit: '번', get: function (p) { return p.count.n; }, asc: false,
      sub: function (p) { return '결혼 전까지 약 ' + p.count.n + '번'; } },
    { id: 'duration', title: '한 사람을 오래 만나는 순', unit: '', get: function (p) { return p.duration.months; }, asc: false,
      fmt: function (p) { return p.duration.label; }, sub: function (p) { return '평균 ' + p.duration.label; } },
    { id: 'job', title: '가장 먼저 취직', unit: '세', get: function (p) { return p.job.age; }, asc: true,
      sub: function (p) { return p.job.year + '년' + (p.job.past ? '(지남)' : '') + ' · ' + p.job.path; } }
  ];

  /** 여러 사람을 항목별로 순위 매긴다 */
  function rank(Rs) {
    var profiles = Rs.map(profile);
    var cats = CATS.map(function (c) {
      var rows = profiles.map(function (p, i) { return { i: i, p: p, v: c.get(p) }; });
      rows.sort(function (a, b) { return c.asc ? a.v - b.v : b.v - a.v; });
      var place = 0, prev = null;
      rows.forEach(function (r, k) {
        if (prev === null || r.v !== prev) { place = k + 1; prev = r.v; }
        r.place = place;
        r.label = c.fmt ? c.fmt(r.p) : (r.v + c.unit);
        r.sub = c.sub(r.p);
      });
      return { id: c.id, title: c.title, rows: rows };
    });
    return { profiles: profiles, cats: cats };
  }

  global.Fortune = { profile: profile, rank: rank, CATS: CATS };
})(typeof window !== 'undefined' ? window : this);
