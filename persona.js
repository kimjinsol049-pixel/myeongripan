/* ============================================================
   캐릭터 — 올해 연애 시기, 연애 스타일, 만나는 사람, 건강운,
            이미지, 옷 스타일, 닮은 동물
   모두 원국과 세운·월운에서 뽑는다. 재미로 보는 영역이다.
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Saju;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
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
    lines.push('일지가 ' + dg + '이라 ' + ({
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
    var score = 84, notes = [], care = [];
    var mx = maxEl(R), mn = minEl(R);
    var pmx = pct(R, mx), pmn = pct(R, mn);

    if (pmx >= 42) { score -= 11; notes.push(S.EL[mx] + '이 ' + pmx + '%로 크게 넘친다'); care.push({ organ: ORGAN[mx].name, why: ORGAN[mx].over }); }
    else if (pmx >= 33) { score -= 6; notes.push(S.EL[mx] + '이 ' + pmx + '%로 치우친다'); care.push({ organ: ORGAN[mx].name, why: ORGAN[mx].over }); }
    if (pmn <= 4) { score -= 10; notes.push(S.EL[mn] + '이 ' + pmn + '%로 거의 없다'); care.push({ organ: ORGAN[mn].name, why: ORGAN[mn].weak }); }
    else if (pmn <= 9) { score -= 5; notes.push(S.EL[mn] + '이 ' + pmn + '%로 약하다'); care.push({ organ: ORGAN[mn].name, why: ORGAN[mn].weak }); }
    if (pmx < 33 && pmn > 9) { score += 7; notes.push('오행이 고르게 퍼져 큰 구멍이 없다'); }

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
     이미지 · 옷 · 동물
     ============================================================ */
  var IMAGE_EL = [
    ['곧고 반듯한 인상. 자세가 바르고 시선이 앞을 향한다.', '부드럽고 유연한 인상. 사람을 편하게 하고 잘 스며든다.'],
    ['밝고 눈에 띈다. 들어서면 공기가 달라진다.', '따뜻하고 섬세하다. 가까이 가야 보이는 온기가 있다.'],
    ['묵직하고 믿음직하다. 말이 적고 자리를 지킨다.', '푸근하고 받아 준다. 누구든 편하게 다가온다.'],
    ['단단하고 또렷하다. 말이 직선이고 군더더기가 없다.', '깔끔하고 세련됐다. 디테일이 살아 있고 예민하다.'],
    ['깊고 스케일이 크다. 속을 알 수 없어 궁금해진다.', '조용하고 총명하다. 티 안 내고 다 보고 있다.']
  ];
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
  function image(R) {
    var lines = [IMAGE_EL[R.dmEl][R.dmYin]];
    lines.push('격국이 ' + R.gyeok + '이라 ' + ({
      건록격: '혼자 서 있는 사람으로 보인다', 양인격: '세고 만만치 않은 사람으로 보인다',
      식신격: '여유 있고 사람 좋은 인상이다', 상관격: '똑똑하고 할 말은 하는 인상이다',
      편재격: '활동적이고 통이 큰 인상이다', 정재격: '성실하고 계산이 선 인상이다',
      편관격: '카리스마가 있고 어려운 인상이다', 정관격: '반듯하고 믿을 만한 인상이다',
      편인격: '독특하고 속을 모를 인상이다', 정인격: '배운 사람 같고 온화한 인상이다'
    })[R.gyeok] + '.');
    lines.push(R.strength.pct >= 57 ? '기가 강해 처음 보면 세 보인다. 실제보다 차갑게 읽힌다.'
      : R.strength.pct < 45 ? '기가 여려 처음 보면 순해 보인다. 실제보다 만만하게 읽힌다.'
        : '기가 중간이라 무난하게 읽힌다. 첫인상으로 오해받는 일이 적다.');
    if (has(R, '도화살')) lines.push('도화살이 있어 사진이 잘 받고 시선을 끈다.');
    if (has(R, '괴강살')) lines.push('괴강살이 있어 눈빛이 강하다. 만만치 않다는 말을 듣는다.');
    return lines;
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
      image: image(R),
      fashion: fashion(R),
      animal: animal(R)
    };
  }

  global.Persona = { of: of, health: health, ANIMAL: ANIMAL };
})(typeof window !== 'undefined' ? window : this);
