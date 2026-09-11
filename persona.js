/* ============================================================
   캐릭터 — 올해 연애 시기, 연애 스타일, 만나는 사람, 건강운,
            이미지, 옷 스타일, 닮은 동물
   모두 원국과 세운·월운에서 뽑는다. 재미로 보는 영역이다.
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Saju;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
  // 받침 유무로 조사를 고른다. "편재이다"가 아니라 "편재다"가 맞다.
  function jong(w) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && (c % 28) > 0; }
  function ida(w) { return w + (jong(w) ? '이다' : '다'); }
  function ira(w) { return w + (jong(w) ? '이라' : '라'); }
  function ika(w) { return w + (jong(w) ? '이' : '가'); }
  function spouseGroup(R) { return R.input.gender === 'M' ? '재성' : '관성'; }
  function has(R, n) { return (R.shinsalAll || []).some(function (s) { return s.name === n; }); }
  function god(R, n) {
    return R.active.some(function (p, i) { return (i !== 2 && p.stemGod === n) || p.branchGod === n; });
  }
  function pct(R, e) {
    var t = R.scores.reduce(function (a, b) { return a + b; }, 0) || 1;
    return Math.round(R.scores[e] / t * 100);
  }
  function maxEl(R) { var m = 0; for (var i = 1; i < 5; i++) if (R.scores[i] > R.scores[m]) m = i; return m; }
  function minEl(R) { var m = 0; for (var i = 1; i < 5; i++) if (R.scores[i] < R.scores[m]) m = i; return m; }
  var YUK = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  function samGroup(b) {
    if ([8, 0, 4].indexOf(b) >= 0) return 0;
    if ([2, 6, 10].indexOf(b) >= 0) return 1;
    if ([5, 9, 1].indexOf(b) >= 0) return 2;
    return 3;
  }
  var DOHWA_OF = [9, 3, 0, 6]; // 신자진→酉, 인오술→卯, 사유축→午, 해묘미→子

  /* ============================================================
     올해 연애 시기 — 세운과 월운에서 배우자성·합·도화가 드는 달
     ============================================================ */
  var MONTH_LABEL = ['12월', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월'];
  function thisYearLove(R) {
    var Y = new Date().getFullYear();
    var yIdx = ((Y - 1984) % 60 + 60) % 60;
    var yStem = yIdx % 10, yBranch = yIdx % 12;
    var sg = spouseGroup(R), dayB = R.pillars[2].b;
    var dohwa = DOHWA_OF[samGroup(R.pillars[0].b)];

    var yearNote = [];
    var yg = S.GOD_GROUP[S.tenGod(R.dm, yStem)];
    var hid = S.HIDDEN[yBranch];
    var ybg = S.GOD_GROUP[S.tenGod(R.dm, hid[hid.length - 1][0])];
    if (yg === sg || ybg === sg) yearNote.push('올해 세운 ' + S.STEM_H[yStem] + S.BRANCH_H[yBranch] + '에 ' + sg + '이 들어온다. 인연이 움직이는 해다');
    if (YUK[yBranch] === dayB) yearNote.push('세운 지지가 일지와 육합한다. 관계가 묶이는 해다');
    if ((yBranch - dayB + 12) % 12 === 6) yearNote.push('세운이 일지를 충한다. 만남도 이별도 크게 움직인다');
    if (yBranch === dohwa) yearNote.push('올해 도화가 든다. 눈에 띄고 제안이 들어온다');
    if (!yearNote.length) yearNote.push('올해 세운은 ' + S.STEM_H[yStem] + S.BRANCH_H[yBranch] + '. 인연 쪽으로 크게 흔들지는 않는다');

    // 월운 — 寅월(2월)부터 열두 달
    var months = [];
    for (var off = 0; off < 12; off++) {
      var mb = (2 + off) % 12;
      var ms = ((yStem % 5) * 2 + 2 + off) % 10;
      var sc = 0, why = [];
      if (S.GOD_GROUP[S.tenGod(R.dm, ms)] === sg) { sc += 3; why.push('월간 ' + sg); }
      var mh = S.HIDDEN[mb];
      if (S.GOD_GROUP[S.tenGod(R.dm, mh[mh.length - 1][0])] === sg) { sc += 3; why.push('월지 ' + sg); }
      if (YUK[mb] === dayB) { sc += 3; why.push('일지와 육합'); }
      if (mb !== dayB && samGroup(mb) === samGroup(dayB)) { sc += 2; why.push('일지와 삼합'); }
      if (mb === dohwa) { sc += 2; why.push('도화'); }
      if ((mb - dayB + 12) % 12 === 6) { sc += 1; why.push('일지 충 — 변동'); }
      months.push({
        m: MONTH_LABEL[(2 + off) % 12], gz: S.STEM_H[ms] + S.BRANCH_H[mb],
        score: sc, why: why
      });
    }
    var best = months.slice().sort(function (a, b) { return b.score - a.score; }).filter(function (m) { return m.score >= 3; }).slice(0, 4);
    best.sort(function (a, b) { return months.indexOf(a) - months.indexOf(b); });
    return { year: Y, gz: S.STEM_H[yStem] + S.BRANCH_H[yBranch], note: yearNote, months: best, all: months };
  }

  /* ============================================================
     연애 스타일 · 만나는 사람
     ============================================================ */
  var DAY_STYLE = {
    비견: '대등한 관계를 원한다. 상대가 기대려 들면 부담스러워하고, 자기 시간을 반드시 지킨다.',
    겁재: '주도권을 놓지 않는다. 밀당이 자연스럽게 나오고, 뺏길 것 같으면 그제야 달려든다.',
    식신: '편하게 먹고 쉬는 연애를 한다. 잘 챙겨 주고 잘 얻어먹는다. 분위기 좋은 데를 안다.',
    상관: '말로 사랑하고 말로 싸운다. 재치로 사람을 끌지만, 한마디로 상처를 준다.',
    편재: '넓고 화려하게 만난다. 잘 쓰고 잘 베푼다. 한 사람에게 오래 묶이는 걸 답답해한다.',
    정재: '알뜰하고 현실적이다. 미래 계획부터 세우고, 연애도 관리하듯 한다.',
    편관: '강한 상대에게 끌리고 긴장 속에서 불이 붙는다. 편안해지면 식는다.',
    정관: '바르고 예의 있게 만난다. 공식적인 관계가 되어야 마음을 연다. 절차를 중시한다.',
    편인: '속을 잘 안 보인다. 깊게 파고들지만 어느 순간 혼자만의 방으로 들어간다.',
    정인: '보살피고 보살핌받는다. 모성·부성이 섞인 연애를 하고, 의존이 생기기 쉽다.'
  };
  var EL_PARTNER = [
    '키가 크고 곧은 인상. 자기 일이 분명하고 고집이 있다. 교육·기획·디자인 쪽에 많다.',
    '표정이 밝고 말이 많다. 사람을 몰고 다니며 분위기를 띄운다. 방송·영업·요식 쪽에 많다.',
    '체격이 듬직하고 말수가 적다. 약속을 지키고 잘 참는다. 부동산·건설·공직 쪽에 많다.',
    '이목구비가 또렷하고 깔끔하다. 기준이 분명하고 뒤끝이 없다. 금융·의료·법조 쪽에 많다.',
    '조용하고 속을 알 수 없다. 머리가 빠르고 눈치가 좋다. IT·연구·무역 쪽에 많다.'
  ];
  function loveStyle(R) {
    var dg = R.pillars[2].branchGod, sg = spouseGroup(R), add = [];
    if (has(R, '도화살')) add.push('도화살이 있어 가만있어도 제안이 들어온다');
    if (has(R, '홍염살')) add.push('홍염살로 은근하게 스며드는 매력이 있다');
    if (R.godCount[sg] === 0) add.push(sg + '이 없어 상대의 신호를 늦게 알아챈다');
    if (R.godCount[sg] >= 3) add.push(sg + '이 많아 동시에 여러 신호를 받는다');
    if (R.relations.some(function (r) { return (r.a === '일지' || r.b === '일지') && r.good < 0; }))
      add.push('일지에 충·형이 있어 가까워질수록 부딪힌다');
    return { main: DAY_STYLE[dg] || '', god: dg, extra: add };
  }
  function partner(R) {
    var sg = spouseGroup(R);
    var el = -1, where = [];
    R.active.forEach(function (p, i) {
      if (i !== 2 && S.GOD_GROUP[p.stemGod] === sg) { el = S.STEM_EL[p.s]; where.push(['년', '월', '일', '시'][i] + '간'); }
      if (S.GOD_GROUP[p.branchGod] === sg) {
        var h = S.HIDDEN[p.b];
        if (el < 0) el = S.STEM_EL[h[h.length - 1][0]];
        where.push(['년', '월', '일', '시'][i] + '지');
      }
    });
    var lines = [];
    if (el < 0) {
      el = R.yongsin.main;
      lines.push(sg + '이 원국에 없다. 대신 나에게 필요한 ' + S.EL[el] + ' 기운을 가진 사람이 인연이 된다.');
    } else {
      lines.push('배우자성(' + sg + ')이 ' + S.EL[el] + ' 기운이다. ' + (where.length ? where.join('·') + '에 있다.' : ''));
    }
    lines.push(EL_PARTNER[el]);
    var dg = R.pillars[2].branchGod;
    lines.push('일지가 ' + ira(dg) + ' ' + ({
      비견: '나와 비슷한 사람', 겁재: '기가 센 사람', 식신: '먹이고 챙겨 주는 사람', 상관: '재치 있고 말 잘하는 사람',
      편재: '활동적이고 돈 감각 있는 사람', 정재: '성실하고 알뜰한 사람', 편관: '강하게 끌고 가는 사람',
      정관: '바르고 책임감 있는 사람', 편인: '독특하고 속 깊은 사람', 정인: '돌봐 주는 사람'
    })[dg] + '이 옆자리에 온다.');
    if (has(R, '천을귀인')) lines.push('천을귀인이 있어 상대가 위기에서 나를 건져 준다.');
    return { el: el, lines: lines };
  }

  /* ============================================================
     건강운
     ============================================================ */
  var ORGAN = [
    { name: '간·담, 눈, 근육', weak: '피로가 눈과 근육으로 온다. 술과 밤샘이 제일 나쁘다.', over: '화를 눌러 담으면 간이 상한다. 스트레스성 증상이 잦다.' },
    { name: '심장·소장, 혈압, 정신', weak: '순환이 약해 손발이 차고 의욕이 떨어진다.', over: '열이 위로 뜬다. 불면·두통·혈압을 조심해야 한다.' },
    { name: '비위·소화기, 피부', weak: '소화가 약하고 잘 체한다. 불규칙한 식사에 바로 무너진다.', over: '습이 쌓여 잘 붓고 살이 찐다. 단것과 밀가루가 독이다.' },
    { name: '폐·대장, 호흡기, 피부', weak: '환절기마다 기관지가 먼저 상한다. 피부도 건조하다.', over: '기가 뭉쳐 어깨와 목이 굳는다. 변비와 알레르기가 잦다.' },
    { name: '신장·방광, 허리, 귀', weak: '허리와 무릎이 약하고 쉽게 지친다. 찬 데 오래 있으면 안 된다.', over: '몸이 차고 잘 붓는다. 밤에 활동하면 더 나빠진다.' }
  ];
  function health(R) {
    // 여덟 글자로 다섯 기운을 채우니 한쪽이 치우치는 게 보통이다.
    // 웬만한 사주가 "보통"에 오도록 잡고, 정말 극단일 때만 크게 깎는다.
    var score = 88, notes = [], care = [];
    var mx = maxEl(R), mn = minEl(R);
    var pmx = pct(R, mx), pmn = pct(R, mn);

    if (pmx >= 45) { score -= 11; notes.push(S.EL[mx] + '이 ' + pmx + '%로 크게 넘친다'); care.push({ organ: ORGAN[mx].name, why: ORGAN[mx].over }); }
    else if (pmx >= 36) { score -= 6; notes.push(S.EL[mx] + '이 ' + pmx + '%로 치우친다'); care.push({ organ: ORGAN[mx].name, why: ORGAN[mx].over }); }
    if (pmn <= 3) { score -= 10; notes.push(S.EL[mn] + '이 ' + pmn + '%로 거의 없다'); care.push({ organ: ORGAN[mn].name, why: ORGAN[mn].weak }); }
    else if (pmn <= 7) { score -= 5; notes.push(S.EL[mn] + '이 ' + pmn + '%로 약하다'); care.push({ organ: ORGAN[mn].name, why: ORGAN[mn].weak }); }
    if (pmx < 36 && pmn > 7) { score += 6; notes.push('오행이 고르게 퍼져 큰 구멍이 없다'); }

    var bad = R.relations.filter(function (r) { return r.good < 0; }).length;
    if (bad) { score -= Math.min(9, bad * 3); notes.push('원국에 충·형·해가 ' + bad + '개라 몸이 자주 신호를 보낸다'); }

    // 흉살은 "조심할 곳"을 알려 주는 쪽이 본질이다. 감점은 가볍게, 총량도 묶는다.
    var hit = 0;
    [['급각살', '뼈·관절·다리를 다치기 쉽다. 운동 전 준비를 꼭 하라.'],
     ['단교관살', '넘어지고 삐끗하는 일이 반복된다.'],
     ['백호대살', '사고·수술·출혈수를 조심해야 한다. 정기 검진을 거르지 마라.'],
     ['탕화살', '화상·중독·약물 사고를 조심하라. 극단적 생각이 들 때는 사람을 만나라.'],
     ['귀문관살', '신경이 예민해 불면·강박으로 간다. 잠을 지키는 게 치료다.'],
     ['양인살', '무리하다 한 번에 크게 다친다. 몸이 보내는 경고를 무시하지 마라.'],
     ['현침살', '눈·치아·바늘처럼 날카로운 것에 다치기 쉽다.']
    ].forEach(function (p) {
      if (!has(R, p[0])) return;
      care.push({ organ: p[0], why: p[1] });
      if (p[0] !== '현침살') hit++;   // 현침살은 중립이라 점수는 깎지 않는다
    });
    score -= Math.min(10, hit * 3);

    if (has(R, '천을귀인')) { score += 6; notes.push('천을귀인이 있어 큰일도 넘어간다'); }
    if (has(R, '천의성')) { score += 4; notes.push('천의성이 있어 좋은 의사를 만난다'); }
    if (has(R, '천덕귀인') || has(R, '월덕귀인')) { score += 3; notes.push('천덕·월덕이 큰 사고를 비껴가게 한다'); }
    if (R.strength.label === '중화') { score += 6; notes.push('일간이 중화라 회복이 빠르다'); }
    if (R.strength.label === '극신약') { score -= 7; notes.push('극신약이라 체력이 밑천이다'); }
    if (R.strength.label === '극신강') { score -= 4; notes.push('극신강이라 무리하다 탈이 난다'); }

    score = clamp(score, 20, 98);
    var grade = score >= 78 ? '튼튼함' : score >= 62 ? '보통' : score >= 48 ? '관리 필요' : '주의';
    // 중복 제거
    var seen = {}, uniq = [];
    care.forEach(function (c) { if (!seen[c.organ]) { seen[c.organ] = 1; uniq.push(c); } });
    return { score: score, grade: grade, notes: notes, care: uniq, best: S.EL[R.yongsin.main] };
  }

  /* ============================================================
     첫인상 — 처음 3초에 읽히는 것. 일간이 뼈대고 강약이 온도다.
     ============================================================ */
  var FIRST_STEM = [
    { key: '곧게 선 사람', d: '자세가 먼저 보인다. 말수가 적어도 굽히지 않을 사람이라는 게 읽히고, 초면에 반말을 걸기 어렵다.' },
    { key: '부드럽게 스며드는 사람', d: '경계심을 낮춘다. 처음부터 말을 걸기 쉽고, 어느새 옆자리에 앉아 있다.' },
    { key: '밝게 퍼지는 사람', d: '들어서는 순간 시선이 한 번 돌아간다. 표정이 크고 첫마디가 시원하다.' },
    { key: '조용히 데우는 사람', d: '처음엔 눈에 안 띈다. 두세 마디 나누고 나서야 호감이 생기는 쪽이다.' },
    { key: '묵직하게 버티는 사람', d: '말이 없어도 자리를 차지하는 무게가 있다. 급해 보이지 않는 게 신뢰로 읽힌다.' },
    { key: '무해해 보이는 사람', d: '낯을 안 가리게 만든다. 처음 보는 사람도 부탁을 꺼내기 쉬운 인상이다.' },
    { key: '각이 남는 사람', d: '웃어도 어딘가 단단함이 남는다. 솔직해 보이지만 만만해 보이지는 않는다.' },
    { key: '정돈된 사람', d: '옷매무새와 말끝이 깔끔하다. 함부로 대하기 어렵고, 차가워 보인다는 말을 듣는다.' },
    { key: '속이 안 보이는 사람', d: '넉넉한데 깊이를 모르겠다. 불편하진 않은데 파악이 안 돼 궁금해진다.' },
    { key: '조용히 다 보는 사람', d: '눈에 안 띄게 앉아 있다가 한마디로 존재를 알린다. 티 안 내고 관찰하는 인상이다.' }
  ];
  // 실제와의 간극 — 일지(속마음 자리)의 십신이 첫인상을 배반하는 지점
  var GAP_BY_DAYGOD = {
    비견: '실제로는 남에게 기대지 않는다. 친해져도 자기 선은 절대 안 넘게 한다.',
    겁재: '실제로는 승부욕이 세다. 양보하는 줄 알았다가 결정적인 순간에 놀란다.',
    식신: '실제로는 훨씬 순하고 잘 먹인다. 겉보다 같이 있기 편한 사람이다.',
    상관: '실제로는 할 말을 다 한다. 조용한 사람인 줄 알았다면 오래 못 간다.',
    편재: '실제로는 활동 반경이 넓다. 아는 사람이 얼마나 많은지 알면 놀란다.',
    정재: '실제로는 계산이 정확하다. 무르게 봤다면 그건 오해다.',
    편관: '실제로는 자기를 끝까지 몰아붙인다. 편해 보여도 안은 늘 팽팽하다.',
    정관: '실제로는 규칙을 지킨다. 자유로워 보여도 선을 안 넘는다.',
    편인: '실제로는 혼자 있는 시간을 반드시 챙긴다. 사람 좋아 보여도 거기까지다.',
    정인: '실제로는 잘 챙긴다. 차가워 보여도 먼저 걱정하는 쪽이다.'
  };
  var SEASON_AIR = [
    '봄에 태어나 분위기에 생기가 돈다. 처음 봐도 뭔가 시작할 것 같은 사람으로 읽힌다.',
    '여름에 태어나 온도가 높다. 표정과 말이 빨라 적극적인 사람으로 읽힌다.',
    '가을에 태어나 공기가 서늘하다. 정리된 사람으로 읽히고 쉽게 들뜨지 않아 보인다.',
    '겨울에 태어나 차분하게 가라앉아 있다. 조용하고 속이 깊은 사람으로 읽힌다.'
  ];
  function seasonOf(b) { return (b >= 2 && b <= 4) ? 0 : (b >= 5 && b <= 7) ? 1 : (b >= 8 && b <= 10) ? 2 : 3; }

  function firstLook(R) {
    var f = FIRST_STEM[R.dm], lines = [f.d];
    lines.push(SEASON_AIR[seasonOf(R.pillars[1].b)]);
    lines.push(R.strength.pct >= 57 ? '기가 강해 처음엔 세 보인다. 실제보다 차갑게 읽히고, 먼저 말 걸기 어렵다는 소리를 듣는다.'
      : R.strength.pct < 45 ? '기가 여려 처음엔 순해 보인다. 실제보다 만만하게 읽혀 선을 넘는 사람이 붙는다.'
        : '기가 중간이라 무난하게 읽힌다. 첫인상으로 크게 오해받는 일은 적다.');
    if (has(R, '도화살')) lines.push('도화살이 있어 처음부터 눈에 띈다. 기억에 남고 사진이 잘 받는다.');
    if (has(R, '홍염살')) lines.push('홍염살이 있어 은근히 스며든다. 처음엔 몰랐는데 자꾸 생각난다는 말을 듣는다.');
    if (has(R, '괴강살')) lines.push('괴강살이 있어 눈빛이 강하다. 초면에 압도한다.');
    if (has(R, '양인살')) lines.push('양인살이 있어 기세가 앞선다. 순한 자리에서는 튀어 보인다.');
    if (has(R, '천을귀인')) lines.push('천을귀인이 있어 인상이 맑다. 처음 본 사람도 도와주고 싶어 한다.');
    if (has(R, '화개살')) lines.push('화개살이 있어 어딘가 예술 하는 사람 같다는 인상을 준다.');
    if (has(R, '역마살')) lines.push('역마살이 있어 앉아 있어도 움직임이 있다. 바쁜 사람으로 읽힌다.');
    return { key: f.key, lines: lines, gap: GAP_BY_DAYGOD[R.pillars[2].branchGod] || '', dayGod: R.pillars[2].branchGod };
  }

  /* ============================================================
     외모 특징 — 일간 오행이 골격, 계절이 피부, 신살이 디테일
     ============================================================ */
  var BODY_EL = [
    ['뼈대가 곧고 길다. 키에 비해 마른 편이고 손발이 길다. 자세가 반듯하다.', '가늘고 유연하다. 살이 잘 안 붙고 몸놀림이 부드럽다.'],
    ['상체가 발달하고 어깨가 넓다. 움직임이 빠르고 가만히 못 있는다.', '체구가 크지 않고 선이 섬세하다. 몸이 따뜻하고 손이 곱다.'],
    ['체격이 두텁고 중심이 낮다. 밀어도 안 밀리는 몸이다.', '아담하고 부드럽다. 살이 고르게 붙고 자세가 편안하다.'],
    ['골격이 굵고 단단하다. 어깨와 턱선에 힘이 있다.', '군살 없이 정돈됐다. 말랐어도 약해 보이지는 않는다.'],
    ['체구가 넉넉하고 선이 둥글다. 살이 잘 붙고 잘 빠진다.', '작고 조용한 체형. 체중이 잘 오르내린다.']
  ];
  var FACE_EL = [
    ['얼굴이 길쭉하고 이마가 넓다. 머리숱이 많고 눈썹이 짙다.', '얼굴선이 갸름하고 눈매가 순하다. 웃으면 인상이 확 풀린다.'],
    ['이마가 넓고 턱이 좁은 역삼각형. 눈에 빛이 있고 표정이 많다.', '이목구비가 오밀조밀하다. 웃을 때 얼굴이 확 바뀐다.'],
    ['얼굴이 둥글고 넓다. 코가 두툼하고 인중이 뚜렷하다.', '동그랗고 순한 얼굴. 볼에 살이 있어 어려 보인다.'],
    ['각이 살아 있고 이목구비가 또렷하다. 코가 곧고 턱선이 분명하다.', '피부가 희고 이목구비가 곱다. 인상이 깔끔하게 떨어진다.'],
    ['얼굴이 크고 이목구비가 시원하다. 눈이 크고 검다.', '얼굴선이 둥글고 눈이 촉촉하다. 표정 변화가 크지 않다.']
  ];
  var VOICE_EL = [
    '목소리가 곧고 또박또박하다. 말이 길어져도 흐트러지지 않는다.',
    '목소리가 밝고 톤이 높다. 말이 빠르고 웃음이 섞인다.',
    '목소리가 낮고 느리다. 한 번 말하면 무게가 실린다.',
    '목소리가 맑고 울린다. 발음이 정확하고 말끝이 딱 끊긴다.',
    '목소리가 낮게 깔린다. 조곤조곤 말해 귀를 기울이게 만든다.'
  ];
  var SKIN_SEASON = [
    '봄생이라 안색 변화가 크다. 컨디션이 얼굴에 바로 뜨고 환절기에 트러블이 온다.',
    '여름생이라 열이 위로 뜬다. 잘 붉어지고 땀이 많으며 피부가 쉽게 건조해진다.',
    '가을생이라 피부가 건조하고 결이 곱다. 인상이 정리돼 보인다.',
    '겨울생이라 몸이 차다. 손발이 차고 아침에 잘 붓는다. 안색이 흰 편이다.'
  ];
  function looks(R) {
    var el = R.dmEl, yin = R.dmYin, items = [];
    items.push({ part: '체형', d: BODY_EL[el][yin] });
    items.push({ part: '얼굴', d: FACE_EL[el][yin] });
    items.push({ part: '피부·안색', d: SKIN_SEASON[seasonOf(R.pillars[1].b)] });
    items.push({ part: '목소리', d: VOICE_EL[el] });

    // 가장 강한 오행이 일간과 다르면 체형·인상이 그쪽으로 끌려간다
    var mx = maxEl(R);
    if (mx !== el && pct(R, mx) >= 32) {
      items.push({
        part: '보정', d: S.EL[mx] + ' 기운이 ' + pct(R, mx) + '%로 강해 ' + ({
          목: '키와 팔다리가 더 길어 보이고 마른 쪽으로 간다',
          화: '표정과 움직임이 커져 실제보다 활달해 보인다',
          토: '살집이 붙고 인상이 더 두툼해진다',
          금: '골격이 도드라지고 인상이 더 또렷해진다',
          수: '선이 둥글어지고 살이 무르게 붙는다'
        })[S.EL[mx]] + '.'
      });
    }
    // 동안·노안
    var softP = pct(R, 4) + pct(R, 0), hardP = pct(R, 2) + pct(R, 3);
    var ageLook = (softP - hardP >= 14 || R.strength.pct < 45)
      ? '나이보다 어려 본다. 얼굴에 물기와 살이 남아 있어 첫 만남에서 나이를 낮게 잡힌다.'
      : (hardP - softP >= 14 || R.strength.pct >= 60)
        ? '나이보다 위로 본다. 골격과 분위기가 일찍 잡혀 학생 때부터 어른 대접을 받았다.'
        : '대체로 나이대로 본다. 얼굴이 크게 변하지 않아 오래 같은 인상으로 남는다.';
    items.push({ part: '나이 인상', d: ageLook });

    var marks = [];
    if (has(R, '도화살')) marks.push('도화살 — 이목구비가 또렷하고 눈이 잘 웃는다. 실물보다 사진이 잘 나온다.');
    if (has(R, '홍염살')) marks.push('홍염살 — 웃을 때 분위기가 확 달라진다. 은근한 매력이 늦게 터진다.');
    if (has(R, '현침살')) marks.push('현침살 — 마른 편에 이목구비가 날카롭다. 손가락이 길고 눈매가 가늘다.');
    if (has(R, '괴강살')) marks.push('괴강살 — 눈빛이 강하고 인상에 힘이 있다. 사진에서 세게 나온다.');
    if (has(R, '양인살')) marks.push('양인살 — 골격이 굵고 어깨가 발달한다. 힘쓰는 일에 몸이 맞다.');
    if (has(R, '백호대살')) marks.push('백호대살 — 흉터나 점이 남기 쉽다. 몸에 표시가 하나쯤 있다.');
    if (has(R, '화개살')) marks.push('화개살 — 수수하게 입어도 티가 난다. 어딘가 예술가 분위기가 돈다.');
    if (has(R, '역마살')) marks.push('역마살 — 가만히 있지 못해 몸이 잘 그을리고 자세가 늘 출발 직전이다.');
    if (has(R, '문창귀인')) marks.push('문창귀인 — 눈매가 총명하다. 책 읽는 사람 같다는 말을 듣는다.');
    if (has(R, '천을귀인')) marks.push('천을귀인 — 인상이 맑다. 귀티 난다는 말을 듣는다.');
    return { items: items, marks: marks, el: el };
  }

  /* ============================================================
     이미지 · 옷 · 동물
     ============================================================ */
  var FASHION = [
    { color: '초록·카키·베이지', item: '리넨과 면 같은 자연 소재, 헐렁한 실루엣, 로퍼', avoid: '지나치게 반짝이는 금속 장식' },
    { color: '빨강·주황·코랄', item: '포인트 한 곳이 확실한 옷, 밝은 아우터, 액세서리 하나', avoid: '온통 검정으로 덮는 것' },
    { color: '베이지·황토·브라운', item: '편안한 니트, 무난한 재단, 두꺼운 소재', avoid: '몸에 딱 붙는 옷' },
    { color: '흰색·회색·실버', item: '각 잡힌 셔츠, 깔끔한 재단, 미니멀한 액세서리', avoid: '패턴이 요란한 옷' },
    { color: '검정·네이비·짙은 남색', item: '드레이프 있는 옷, 롱 코트, 광택 없는 소재', avoid: '지나치게 밝은 파스텔' }
  ];
  var ANIMAL = [
    { a: '곰', e: '🐻', d: '곧고 묵직하다. 한번 정하면 안 바꾸고, 느리지만 끝까지 간다. 건드리면 무섭다.' },
    { a: '고양이', e: '🐱', d: '유연하고 자존심이 세다. 좁은 데서도 살아남고, 내킬 때만 다가온다.' },
    { a: '사자', e: '🦁', d: '있으면 티가 난다. 앞에 나서는 걸 두려워하지 않고, 무시당하는 걸 못 견딘다.' },
    { a: '여우', e: '🦊', d: '영리하고 눈치가 빠르다. 작은 것을 놓치지 않고, 필요한 순간에 정확히 움직인다.' },
    { a: '코끼리', e: '🐘', d: '무겁고 흔들리지 않는다. 기억력이 좋고 은혜도 원한도 오래 간다.' },
    { a: '사슴', e: '🦌', d: '온순하고 잘 받아 준다. 경계심이 있어 쉽게 마음을 열지 않는다.' },
    { a: '늑대', e: '🐺', d: '결단이 빠르고 무리를 이끈다. 의리가 있고 배신에 가차 없다.' },
    { a: '표범', e: '🐆', d: '예민하고 세련됐다. 조용히 기다리다 한순간에 끝낸다.' },
    { a: '고래', e: '🐋', d: '스케일이 크고 깊다. 혼자 먼 길을 가고, 속을 좀처럼 보이지 않는다.' },
    { a: '수달', e: '🦦', d: '영리하고 손재주가 좋다. 물처럼 스며들어 어느새 자리를 잡는다.' }
  ];
  // 남에게 보이는 이미지 — 첫인상이 3초라면 이건 몇 달 뒤에 굳는 평판이다.
  var GYEOK_IMAGE = {
    건록격: { role: '혼자 서는 사람', d: '조직 안에서도 자기 몫을 따로 들고 있는 사람으로 본다. 기대려 들지 않으니 믿고 맡기지만, 챙겨 줘야 할 사람으로는 안 본다.' },
    양인격: { role: '세고 만만치 않은 사람', d: '붙으면 이긴다고 본다. 어려운 일이 생기면 제일 먼저 찾으면서도, 평소에는 한 걸음 떨어져 대한다.' },
    식신격: { role: '사람 좋은 사람', d: '같이 있으면 편하다는 평이 붙는다. 분위기를 맡기고, 먹는 자리에서 늘 중심에 놓는다.' },
    상관격: { role: '똑똑하고 할 말 하는 사람', d: '말이 되는 사람으로 본다. 회의에서 정리해 주길 기대하면서도, 윗사람은 불편해한다.' },
    편재격: { role: '발 넓고 통 큰 사람', d: '아는 사람이 많고 돈 쓸 줄 안다고 본다. 사람을 소개해 달라는 부탁이 자주 들어온다.' },
    정재격: { role: '성실하고 계산이 선 사람', d: '맡기면 끝까지 한다고 본다. 숫자와 돈이 걸린 일을 믿고 넘긴다.' },
    편관격: { role: '카리스마 있고 어려운 사람', d: '위기에 강한 사람으로 본다. 평판은 높은데 사적으로 다가오는 사람은 적다.' },
    정관격: { role: '반듯하고 믿을 만한 사람', d: '규칙을 지키는 사람으로 본다. 대표로 내세우기 좋은 얼굴이라 자꾸 앞에 세운다.' },
    편인격: { role: '독특하고 속 모를 사람', d: '아이디어가 남다르다고 보면서도 파악이 안 된다고 한다. 오래 본 사람도 잘 모르겠다고 말한다.' },
    정인격: { role: '배운 티 나는 사람', d: '생각이 깊고 점잖다고 본다. 조언을 구하러 오는 사람이 꾸준히 있다.' }
  };
  var HEARD_STEM = [
    '고집 있어 보인다', '편하게 해 준다', '에너지가 좋다', '은근히 정이 많다', '믿음직하다',
    '무난하다', '딱 부러진다', '깔끔하다', '속을 모르겠다', '조용한데 다 알고 있더라'
  ];
  function image(R) {
    var g = GYEOK_IMAGE[R.gyeok] || { role: R.gyeok, d: '' };
    var lines = [], heard = [HEARD_STEM[R.dm]], misread = [];

    if (g.d) lines.push('격국이 ' + R.gyeok + '이라 ' + g.d);

    // 사회궁 — 년·월주가 밖에서 보이는 자리다
    var soc = R.active.slice(0, 2), socGods = {};
    soc.forEach(function (p, i) {
      if (i !== 2) socGods[S.GOD_GROUP[p.stemGod]] = 1;
      socGods[S.GOD_GROUP[p.branchGod]] = 1;
    });
    var socList = Object.keys(socGods);
    lines.push('년·월주는 남이 보는 자리다. 여기에 ' + ika(socList.join('·')) + ' 앉아 ' + ({
      비겁: '자기 이름으로 움직이는 사람', 식상: '말하고 만들어 내는 사람', 재성: '일 벌이고 굴리는 사람',
      관성: '자리와 책임을 지는 사람', 인성: '알고 가르치는 사람'
    })[socList[0]] + '으로 먼저 읽힌다.');

    if (R.godCount.관성 >= 2) { heard.push('책임감 있다'); heard.push('일 맡겨도 되겠다'); }
    if (R.godCount.관성 === 0) { heard.push('자유롭다'); misread.push('조직 체질이 아니라고 미리 단정당한다. 실제로는 납득만 되면 누구보다 오래 버틴다.'); }
    if (R.godCount.식상 >= 2) { heard.push('말을 잘한다'); heard.push('재밌다'); }
    if (R.godCount.식상 === 0) { heard.push('무슨 생각인지 모르겠다'); misread.push('표현을 안 하니 관심이 없다고 오해받는다. 속으로는 다 챙기고 있다.'); }
    if (R.godCount.재성 >= 2) heard.push('발이 넓다');
    if (R.godCount.인성 >= 2) heard.push('생각이 깊다');
    if (R.godCount.비겁 >= 3) { heard.push('자기 세계가 있다'); misread.push('안 굽힌다고 보니 부탁을 아예 안 한다. 말만 하면 해 줄 사람인데 기회가 안 온다.'); }
    if (has(R, '도화살')) heard.push('분위기 있다');
    if (has(R, '화개살')) heard.push('예술 하는 줄 알았다');
    if (has(R, '괴강살')) heard.push('눈빛이 세다');
    if (has(R, '역마살')) heard.push('가만히 못 있는다');
    if (has(R, '천을귀인')) heard.push('복이 있어 보인다');

    if (R.strength.pct >= 57) misread.push('강해 보여서 아무도 안 물어본다. 힘들다고 먼저 말하지 않으면 끝까지 모른다.');
    else if (R.strength.pct < 45) misread.push('순해 보여서 자꾸 떠넘긴다. 한 번 세게 자르지 않으면 계속 들어온다.');
    if (R.relations.some(function (r) { return (r.a === '월지' || r.b === '월지') && r.good < 0; }))
      misread.push('월지에 충·형이 있어 사회적 자리에서 기복이 보인다. 변덕스럽다는 말이 붙기 쉽다.');

    // 겉과 속의 차이 한 줄
    var inner = R.pillars[2].branchGod;
    lines.push('밖에서는 ' + g.role + '으로 통하는데, 일지는 ' + ida(inner) + '. ' +
      (GAP_BY_DAYGOD[inner] || '') + ' 이 간극이 오해의 출발점이다.');

    return { role: g.role, lines: lines, heard: heard.slice(0, 6), misread: misread };
  }
  function fashion(R) {
    var y = R.yongsin.main, g = R.yongsin.gi;
    return {
      color: FASHION[y].color, item: FASHION[y].item,
      avoidColor: FASHION[g].color, avoid: FASHION[g].avoid,
      why: '용신이 ' + S.EL[y] + '이라 ' + FASHION[y].color + ' 계열이 기운을 올린다. 기신 ' + S.EL[g] + ' 색(' + FASHION[g].color + ')은 중요한 날에는 피하라.'
    };
  }
  function animal(R) {
    var a = ANIMAL[R.dm];
    var mx = maxEl(R);
    var extra = mx === R.dmEl ? '타고난 성질이 그대로 드러난다.'
      : S.EL[mx] + ' 기운이 강해 ' + ({
        목: '뻗어 나가려는', 화: '드러내고 싶어 하는', 토: '버티려는', 금: '자르려는', 수: '물러나 보려는'
      })[S.EL[mx]] + ' 면이 섞인다.';
    return { name: a.a, emoji: a.e, desc: a.d, extra: extra, zodiac: R.zodiac };
  }

  function of(R) {
    return {
      name: R.input.name,
      thisYear: thisYearLove(R),
      loveStyle: loveStyle(R),
      partner: partner(R),
      health: health(R),
      firstLook: firstLook(R),
      looks: looks(R),
      image: image(R),
      fashion: fashion(R),
      animal: animal(R)
    };
  }

  global.Persona = { of: of, health: health, ANIMAL: ANIMAL };
})(typeof window !== 'undefined' ? window : this);
