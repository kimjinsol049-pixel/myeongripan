/* ============================================================
   핵심 판정 — 계산값에서 바로 뽑는 짧은 해석
   AI 해석이 없거나 아직 안 왔을 때 각 항목을 채운다.
   말투는 AI 해석과 같게: 단정, 쿠션어 없음, "~다" 체.
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Saju;
  var EL = S.EL;

  /* ---------- 사전 ---------- */
  var STEM_IMG = [
    '하늘로 곧게 뻗는 큰 나무다. 굽히지 않고 앞으로만 가고, 시작에 강하고 마무리에 약하다.',
    '바위 틈에서도 뻗는 덩굴이다. 유연하고 끈질기며 살아남는 데 강하지만, 의존과 자립 사이에서 흔들린다.',
    '하늘의 태양이다. 숨기는 게 없고 열을 뿜는다. 사람을 끌어당기지만 밤이 없어 스스로 탄다.',
    '등불이다. 가까운 것을 밝히고 데운다. 섬세하고 집요하며 한 곳에 오래 붙는다.',
    '큰 산이다. 묵직하고 잘 움직이지 않는다. 신뢰를 주지만 융통성이 없다.',
    '논밭의 흙이다. 무엇이든 받아 키운다. 포용력이 크고 속을 안 보인다.',
    '원석이자 무기다. 단단하고 결단이 빠르고 말이 직선이다. 부러지기 전까지 안 굽힌다.',
    '다듬어진 칼날이다. 예민하고 깔끔하고 자존심이 세다. 상처를 오래 기억한다.',
    '큰 강이다. 흐르며 모든 것을 삼킨다. 스케일이 크고 속을 알 수 없다.',
    '빗물이고 샘물이다. 조용히 스며들어 적신다. 직관이 날카롭고 잘 드러내지 않는다.'
  ];
  var GYEOK_DESC = {
    건록격: '스스로 서는 격이다. 남에게 기대지 않고 제 힘으로 자리를 만든다.',
    양인격: '칼을 쥔 격이다. 추진력은 최고지만 그 칼에 자기가 베인다.',
    식신격: '먹고 표현하고 만드는 격이다. 여유와 재능과 식복이 있고 느긋하다.',
    상관격: '말과 재능으로 판을 뒤집는 격이다. 총명하지만 윗사람과 부딪힌다.',
    편재격: '큰 돈이 드나드는 격이다. 사업·투자·스케일에 강하고 안정과는 멀다.',
    정재격: '꼼꼼히 모으는 격이다. 성실·근검·계산이 몸에 붙어 있다.',
    편관격: '칠살을 쥔 격이다. 압박 속에서 강해지고 위기에서 능력이 나온다.',
    정관격: '질서와 명예의 격이다. 조직 안에서 인정받고 바른길을 간다. 틀 밖에 서면 약하다.',
    편인격: '비주류 지식과 직관의 격이다. 남들이 안 보는 걸 본다. 의심이 많고 외롭다.',
    정인격: '학문과 자격의 격이다. 배움으로 올라가고 보호받는다. 실행이 느리다.'
  };
  var STAGE_IMG = {
    장생: '귀하게 태어나 보호받으며 자란 사람', 목욕: '화려하고 흔들렸던 젊음을 산 사람',
    관대: '관복을 입고 자리를 얻은 사람', 건록: '제 밥벌이로 당당했던 사람',
    제왕: '정점에 서서 사람을 부린 사람', 쇠: '물러나 뒤에서 조언하던 원로',
    병: '병상에서 오래 사색한 사람', 사: '큰 상실을 겪고 다시 일어선 사람',
    묘: '창고와 무덤을 지키며 비밀을 품은 사람', 절: '모든 것이 끊겨 떠돌던 사람',
    태: '다시 태어나기를 기다리던 혼', 양: '남의 손에 길러진 사람'
  };
  var EL_PERSON = [
    '기획하고 밀어붙이는 木 기운 사람', '분위기를 띄우고 열을 내는 火 기운 사람',
    '묵묵히 판을 붙드는 土 기운 사람', '자르고 정리하는 金 기운 사람', '흐름을 읽고 뒤에서 수를 내는 水 기운 사람'
  ];
  var EL_BIZ = [
    '교육·출판·기획·섬유·목재·디자인', '미디어·요식·뷰티·에너지·조명·공연',
    '부동산·건설·중개·농축산·유통·종교', '금융·기계·법률·의료기기·정밀공업·군경',
    'IT·물류·무역·수산·컨설팅·야간업·주류'
  ];
  var EL_JOB = [
    ['교사·강사', '기획자', '작가·편집자', '디자이너', '사회복지·상담', '건축설계'],
    ['마케터·PR', '방송·유튜버', '요리사', '뷰티·패션', '영업 리더', '공연·이벤트'],
    ['부동산·자산관리', '건설·시공 관리', '공무원·행정', '농업·식품', '중개·유통', '종교·명상 지도'],
    ['금융·회계', '엔지니어', '외과·치과·정형', '법조·감사', '군·경찰·보안', '품질관리'],
    ['개발자·데이터', '무역·물류', '전략 컨설턴트', '연구원', '심리·정신과', '유통·이커머스']
  ];

  /* ---------- 헬퍼 ---------- */
  function nm(R) { return (R.input && R.input.name) || '이 사람'; }
  function pct(R, e) { var t = R.scores.reduce(function (a, b) { return a + b; }, 0) || 1; return Math.round(R.scores[e] / t * 100); }
  function maxEl(R) { var m = 0; for (var i = 1; i < 5; i++) if (R.scores[i] > R.scores[m]) m = i; return m; }
  function minEl(R) { var m = 0; for (var i = 1; i < 5; i++) if (R.scores[i] < R.scores[m]) m = i; return m; }
  function gods(R) {
    var out = [];
    R.active.forEach(function (p, i) { if (i !== 2) out.push(p.stemGod); out.push(p.branchGod); });
    return out;
  }
  function hasGod(R, g) { return gods(R).indexOf(g) >= 0; }
  function whereGroup(R, group) {
    var tags = ['년주', '월주', '일주', '시주'], out = [];
    R.active.forEach(function (p, i) {
      if (i !== 2 && S.GOD_GROUP[p.stemGod] === group) out.push(tags[i] + ' 천간');
      if (S.GOD_GROUP[p.branchGod] === group) out.push(tags[i] + ' 지지');
    });
    return out;
  }
  function daewoonOf(R, groups) {
    return R.daewoon.list.filter(function (d) {
      return groups.indexOf(S.GOD_GROUP[S.tenGod(R.dm, d.s)]) >= 0;
    }).slice(0, 3).map(function (d) { return d.age + '세(' + S.STEM_H[d.s] + S.BRANCH_H[d.b] + ')'; });
  }
  function currentDaewoon(R) {
    var y = new Date().getFullYear(), cur = null;
    for (var k = R.daewoon.list.length - 1; k >= 0; k--) if (y >= R.daewoon.list[k].year) { cur = R.daewoon.list[k]; break; }
    return cur;
  }
  function spouseGroup(R) { return R.input.gender === 'M' ? '재성' : '관성'; }
  function dayRel(R, kinds) {
    return R.relations.filter(function (r) { return (r.a === '일지' || r.b === '일지') && kinds.indexOf(r.kind) >= 0; });
  }
  function relCount(R, good) { return R.relations.filter(function (r) { return good ? r.good > 0 : r.good < 0; }).length; }
  function topGroup(R) {
    var best = null; Object.keys(R.godCount).forEach(function (k) { if (!best || R.godCount[k] > R.godCount[best]) best = k; });
    return best;
  }
  function zeroGroups(R) { return Object.keys(R.godCount).filter(function (k) { return R.godCount[k] === 0; }); }
  function join(a) { return a.join(' '); }

  /* ============================================================
     개인
     ============================================================ */
  var SOLO = {};

  SOLO.overall = function (R) {
    var n = nm(R), st = R.strength, top = topGroup(R), zero = zeroGroups(R), cur = currentDaewoon(R);
    var weapon = {
      비겁: '버티는 힘이다. 남이 다 떨어져 나가도 혼자 서 있다.', 식상: '표현력과 재능이다. 만들고 말하고 보여주는 걸로 먹고산다.',
      재성: '현실 감각이다. 돈이 어디로 흐르는지 몸으로 안다.', 관성: '책임감과 규율이다. 맡기면 끝까지 한다.',
      인성: '학습력과 직관이다. 배운 걸 남보다 빨리 자기 것으로 만든다.'
    }[top];
    var hole = zero.length ? zero.map(function (g) {
      return { 비겁: '버팀목 없이 혼자 감당한다', 식상: '속을 표현하는 출구가 없다', 재성: '돈이 손에 잡히는 구조가 아니다',
        관성: '자기를 통제하는 틀이 없다', 인성: '받아주는 뒷배가 없다' }[g];
    }).join(', ') : '오행이 고르게 퍼져 특별히 빈 자리는 없다. 대신 뾰족한 무기도 없다';
    var lines = [
      '**골격**',
      n + '의 일간은 ' + S.STEM_H[R.dm] + '(' + EL[R.dmEl] + '). ' + STEM_IMG[R.dm],
      R.gyeok + ' — ' + (GYEOK_DESC[R.gyeok] || '') + ' ' + (st.deukryeong ? '태어난 달이 나를 돕는 득령이라 기본 체력이 있다.' : '태어난 달이 나를 돕지 않는 실령이라 스스로 기운을 만들어야 한다.'),
      '일간 강약은 ' + st.label + '(' + Math.round(st.pct) + '/100). ' + (st.pct >= 57
        ? '기운이 넘친다. 누르고 빼주는 ' + EL[R.yongsin.main] + ' 기운이 용신이고, 이걸 안 쓰면 자기 힘에 자기가 다친다.'
        : st.pct < 45 ? '기운이 모자란다. 받쳐주는 ' + EL[R.yongsin.main] + ' 기운이 용신이고, 이 기운이 없는 환경에서는 소모만 된다.'
          : '균형이 잡혀 있다. 무엇을 해도 극단으로 안 가지만, 판을 뒤집는 힘도 크지 않다. 용신은 ' + EL[R.yongsin.main] + '.'),
      '',
      '**무기와 구멍**',
      '가장 큰 무기는 ' + top + '. ' + weapon,
      '가장 큰 구멍: ' + hole + '.'
    ];
    if (cur) {
      var g = S.GOD_GROUP[S.tenGod(R.dm, cur.s)];
      lines.push('', '**지금 대운**',
        cur.age + '세부터 ' + S.STEM_H[cur.s] + S.BRANCH_H[cur.b] + ' 대운. 천간이 ' + g + ' 기운이라 ' + {
          비겁: '경쟁자와 동료가 동시에 늘고, 내 것을 지키는 싸움이 주제가 된다',
          식상: '표현하고 벌이고 만드는 시기다. 아이디어가 돈이 되기 시작한다',
          재성: '돈과 현실이 주제다. 벌 기회가 오지만 그만큼 나간다',
          관성: '책임과 자리가 주제다. 승진·자격·결혼 같은 틀이 들어온다',
          인성: '배우고 준비하는 시기다. 성과는 늦고 안으로 쌓인다'
        }[g] + '.');
    }
    return join(lines.map(function (l) { return l + '\n'; }));
  };

  SOLO.mind = function (R) {
    var n = nm(R), mx = maxEl(R), mn = minEl(R), top = topGroup(R);
    var outer = R.dmYin ? '겉은 부드럽고 조용하다. 속에서는 계산과 관찰이 쉬지 않는다.' : '겉은 밝고 시원하다. 속은 인정받고 싶은 욕구가 늘 켜져 있다.';
    var lines = ['**겉과 속**', n + '은(는) ' + outer];
    if (pct(R, mx) >= 35) lines.push(EL[mx] + ' 기운이 ' + pct(R, mx) + '%로 쏠려 있다. ' + [
      '생각보다 먼저 몸이 나간다. 밀어붙이다 부러진다.', '감정이 먼저 올라오고 말이 앞선다. 열이 식으면 후회한다.',
      '움직이지 않는 게 방어다. 고집이 안정으로 보이지만 정체다.', '기준이 날카롭고 남의 실수를 못 넘긴다. 스스로에게도 그렇다.',
      '생각이 너무 많아 결정이 늦다. 머릿속에서 이미 열 번 산다.'][mx]);
    if (pct(R, mn) <= 6) lines.push(EL[mn] + ' 기운이 거의 없다. ' + [
      '새 판을 벌이는 힘이 약하다. 시작은 남이 해줘야 한다.', '열정이 늦게 켜진다. 남들이 보기엔 차갑다.',
      '중심이 약해 주변에 쉽게 흔들린다.', '끊고 마무리하는 힘이 없다. 관계도 일도 질질 끈다.',
      '쉬는 법을 모른다. 유연함이 없어 상황이 바뀌면 당황한다.'][mn]);
    lines.push('', '**감정의 방아쇠**');
    lines.push({
      비겁: '자기 영역이 침범당하면 터진다. 조언도 침범으로 듣는다.',
      식상: '하고 싶은 말을 못 하게 막히면 터진다. 규칙보다 표현이 우선이다.',
      재성: '손해 보는 느낌이 방아쇠다. 감정보다 계산이 먼저 돈다.',
      관성: '무시당했다고 느끼면 무너진다. 겉으로는 참고 속으로 쌓는다.',
      인성: '이해받지 못하면 문을 닫는다. 설명하는 대신 물러난다.'
    }[top]);
    if (relCount(R, false) >= 2) lines.push('원국 안에 충·형·해가 ' + relCount(R, false) + '개다. 스스로 자기와 싸운다. 결정을 뒤집는 일이 잦고, 남이 보기엔 변덕이다.');
    lines.push('', '**착각 하나**');
    lines.push(R.strength.pct >= 57 ? '"내가 옳다"는 감각이 근거보다 앞선다. 실제로는 반대 의견을 들을 기회를 스스로 없애고 있다.'
      : R.strength.pct < 45 ? '"내가 부족하다"고 느끼지만, 실제 문제는 능력이 아니라 기운을 빼가는 환경을 못 끊는 데 있다.'
        : '"나는 무난하다"고 생각하지만, 무난함이 곧 존재감 부족으로 읽히는 순간이 온다.');
    return lines.join('\n');
  };

  SOLO.wealth = function (R) {
    var n = nm(R), c = R.godCount.재성, where = whereGroup(R, '재성'), gm = [];
    R.active.forEach(function (p, i) { if (R.gongmang.indexOf(p.b) >= 0 && S.GOD_GROUP[p.branchGod] === '재성') gm.push(['년', '월', '일', '시'][i] + '지'); });
    var lines = ['**그릇**'];
    if (c === 0) {
      lines.push(n + '의 원국에 재성이 없다. 돈이 목표가 되는 구조가 아니다. 돈을 좇으면 오히려 빠져나간다.');
      lines.push(R.godCount.식상 > 0 ? '대신 식상이 있다. 재능과 표현을 먼저 팔면 돈은 뒤따라온다. 순서를 바꾸면 안 된다.'
        : R.godCount.인성 > 0 ? '인성으로 쌓은 지식·자격이 자산이다. 현금이 아니라 무형자산으로 부를 만든다.'
          : '식상도 재성도 없다. 남이 만든 판에 들어가 월급으로 사는 게 가장 안전하다.');
    } else {
      lines.push(n + '의 재성은 ' + c + '개(' + where.join(', ') + '). ' + (hasGod(R, '편재') ? '편재가 있어 큰 돈이 드나든다. 한 번에 벌고 한 번에 잃는 그릇이다.' : '정재 위주다. 꾸준히 모으는 그릇이고 한방은 없다.'));
      if (c >= 3 && R.strength.pct < 45) lines.push('재성이 많은데 일간이 약하다. 재다신약 — 돈이 보이는데 내 것이 못 된다. 남의 돈을 관리하는 자리가 낫다.');
      if (c >= 2 && R.strength.pct >= 57) lines.push('일간이 강하고 재성도 있다. 돈을 감당할 힘이 있다. 그릇이 크다.');
    }
    if (gm.length) lines.push(gm.join('·') + '의 재성이 공망이다. 벌어도 손에 안 잡히는 자리다. 이 재물은 남을 위해 쓰는 돈으로 생각해야 남는다.');
    var dw = daewoonOf(R, ['재성']);
    lines.push('', '**시기**');
    lines.push(dw.length ? '재성 대운은 ' + dw.join(', ') + '. 이 구간에 돈이 움직인다. 준비 없이 맞으면 나가는 돈이 된다.' : '앞으로 60년 안에 재성 대운이 없다. 돈은 운으로 오지 않고 구조로 만들어야 한다.');
    return lines.join('\n');
  };

  SOLO.money = function (R) {
    var n = nm(R), f = R.godCount.식상, w = R.godCount.재성, b = R.godCount.비겁;
    var lines = ['**현금 흐름**'];
    if (f > 0 && w > 0) lines.push('식상에서 재성으로 가는 길이 뚫려 있다. 내가 만든 것이 돈으로 바뀐다. 수입의 지속성이 있다.');
    else if (f > 0 && w === 0) lines.push('기술과 재능은 있는데 돈으로 바꾸는 통로가 없다. 일은 많이 하고 정산은 못 받는 구조다. 가격을 남이 정하게 두지 마라.');
    else if (f === 0 && w > 0) lines.push('돈은 들어오는데 만드는 힘이 약하다. 남의 판 위에서 들어오는 돈이다. 판이 바뀌면 끊긴다.');
    else lines.push('만드는 힘도 돈의 자리도 없다. 고정 수입 구조를 먼저 확보해야 한다. 변동 수입에 인생을 걸면 안 된다.');
    lines.push('', '**새는 구멍**');
    if (b >= 2) lines.push('비겁이 ' + b + '개. 돈이 사람으로 나간다. 형제·친구·동업자에게 빌려주는 돈, 보증, 같이 한 투자. ' + n + '은(는) 절대 보증을 서지 마라.');
    if (hasGod(R, '편재')) lines.push('편재가 있어 한 방 욕심이 있다. 투자·도박·충동 지출의 방아쇠는 "이번엔 확실하다"는 감각이다. 그 감각이 들 때가 가장 위험하다.');
    if (hasGod(R, '정재') && !hasGod(R, '편재')) lines.push('정재 위주라 쓰는 데는 짜다. 대신 돈 아끼느라 시간과 기회를 놓친다. 큰 지출 결정을 못 내린다.');
    if (R.godCount.인성 >= 3) lines.push('인성이 많아 배우는 데 돈을 쓴다. 강의·자격·책은 좋은 지출이지만 실행 없는 학습은 소비다.');
    if (b < 2 && !hasGod(R, '편재') && R.godCount.인성 < 3) lines.push('큰 구멍은 없다. 새는 곳은 습관성 소액 지출이다. 자동이체를 점검하라.');
    var risk = daewoonOf(R, ['비겁']);
    if (risk.length) lines.push('', '**위험 시기**', '비겁 대운 ' + risk.join(', ') + '. 이 구간에 돈을 나누는 일(동업·공동투자·보증)이 들어온다. 전부 거절하라.');
    return lines.join('\n');
  };

  SOLO.biz = function (R) {
    var n = nm(R), st = R.strength.pct, f = R.godCount.식상, w = R.godCount.재성, b = R.godCount.비겁, o = R.godCount.관성;
    var lines = ['**판정**'];
    if (st >= 50 && (f > 0 || w > 0)) lines.push(n + '은(는) 독립·창업이 맞는 사주다. 일간이 버티고, 벌이거나(식상) 거두는(재성) 힘이 있다.');
    else if (st < 45 && o >= 2) lines.push(n + '은(는) 창업보다 조직이 맞다. 일간이 약하고 관성이 눌러, 혼자 판을 벌이면 압박에 먼저 무너진다.');
    else if (st < 45) lines.push('창업은 조건부다. 일간이 약해 혼자서는 소모된다. 하려면 강한 파트너 뒤에서 실무를 맡는 형태여야 한다.');
    else lines.push('창업은 가능하지만 벌이는 힘(식상)이나 거두는 힘(재성)이 약하다. 판을 만드는 사람보다 판을 키우는 사람으로 들어가라.');
    if (b >= 2) lines.push('비겁이 ' + b + '개라 동업은 금지다. 지분을 나누는 순간 경쟁자가 된다. 하려면 지분 없는 고용 형태로만.');
    else if (b === 0) lines.push('비겁이 없어 혼자 다 감당한다. 사람을 쓰는 법을 배우지 않으면 규모를 못 키운다.');
    lines.push('', '**업종의 결**');
    lines.push('용신 ' + EL[R.yongsin.main] + ' 기운의 업종이 맞다: ' + EL_BIZ[R.yongsin.main] + '. 기신 ' + EL[R.yongsin.gi] + ' 업종(' + EL_BIZ[R.yongsin.gi] + ')은 잘돼도 몸이 상한다.');
    var dw = daewoonOf(R, ['식상', '재성']);
    lines.push('', '**시기**', dw.length ? '창업 적기 대운: ' + dw.join(', ') + '.' : '식상·재성 대운이 가까이 없다. 시작하려면 운이 아니라 자본과 사람으로 밀어야 한다.');
    return lines.join('\n');
  };

  SOLO.job = function (R) {
    var n = nm(R), o = R.godCount.관성, f = R.godCount.식상, i = R.godCount.인성, w = R.godCount.재성;
    var lines = ['**조직 적성**'];
    if (o === 0) lines.push('관성이 없다. 남이 정한 규칙 안에서 오래 못 있다. 승진 사다리보다 전문성으로 자리를 만드는 직군이어야 한다.');
    else if (o >= 3) lines.push('관성이 ' + o + '개. 규율과 책임이 몸에 붙어 있다. 공직·대기업·군경처럼 틀이 단단한 조직에서 오히려 편하다. 방임형 조직에서는 불안해진다.');
    else lines.push('관성이 ' + o + '개. 조직에 적응하지만 통제는 싫다. 중간 규모, 자율이 있는 팀이 맞다.');
    if (i >= 3) lines.push('인성이 많아 전문직·연구·교육 쪽이 맞다. 배우고 정리하고 가르치는 일에서 존재감이 나온다.');
    if (f >= 2) lines.push('식상이 있어 표현하는 일이 맞다. 기획·마케팅·영업·창작. 말 못 하게 막는 자리에서는 병이 난다.');
    if (w >= 2) lines.push('재성이 있어 숫자와 거래에 강하다. 영업·금융·유통에서 성과가 난다.');
    var pool = EL_JOB[R.dmEl].concat(EL_JOB[R.yongsin.main]).filter(function (x, k, a) { return a.indexOf(x) === k; }).slice(0, 7);
    lines.push('', '**맞는 직업군**', pool.join(', ') + '.');
    lines.push('', '**못 버티는 환경**');
    lines.push(f >= 2 && o >= 2 ? '표현은 하고 싶은데 규율도 강한 사주다. 위계가 엄격한데 성과는 창의로 내라는 조직에서 가장 빨리 소진된다.'
      : R.strength.pct < 45 ? '경쟁을 붙이는 조직이다. 실적 압박 속에서 ' + n + '은(는) 능력보다 먼저 체력이 꺾인다.'
        : '지시만 받는 자리다. 판단권 없이 손만 빌려주는 위치에서는 1년 안에 나온다.');
    return lines.join('\n');
  };

  SOLO.bond = function (R) {
    var n = nm(R), b = R.godCount.비겁, i = R.godCount.인성;
    var lines = ['**사람이 붙는 방식**'];
    if (R.shinsal.indexOf('천을귀인') >= 0) lines.push('천을귀인이 있다. 위기마다 도와주는 사람이 나타난다. 다만 그 도움은 늘 예상 밖의 사람에게서 온다.');
    if (b >= 2) lines.push('비겁이 ' + b + '개. 친구·동료는 많은데 그 사람들이 ' + n + '의 시간과 돈을 가져간다. 관계가 넓을수록 가난해진다.');
    else if (b === 0) lines.push('비겁이 없다. 옆에 서는 동료가 없어 외롭지만, 나눌 경쟁자도 없다. 혼자 결정하는 게 익숙하다.');
    if (i >= 3) lines.push('인성이 많아 윗사람·스승·어른 인연이 두텁다. 동년배보다 나이 든 사람과 맞는다.');
    lines.push('', '**도움과 해**');
    lines.push('도움이 되는 사람: ' + EL_PERSON[R.yongsin.main] + '. 이 사람 옆에서는 판단이 맑아진다.');
    lines.push('해가 되는 사람: ' + EL_PERSON[R.yongsin.gi] + '. 처음엔 끌리지만 오래 있으면 ' + n + '의 기운을 뺏는다.');
    lines.push('', '**반복되는 패턴**');
    lines.push(relCount(R, false) >= 2 ? '원국에 충·해가 많다. 가까워질수록 부딪힌다. 적당한 거리를 유지하는 관계만 오래 간다.'
      : relCount(R, true) >= 2 ? '원국에 합이 많다. 쉽게 엮이고 못 끊는다. 끊어야 할 관계를 정리 못 해서 손해가 쌓인다.'
        : '합충이 적어 사람 때문에 크게 흔들리지 않는다. 대신 깊어지지도 않는다. 관계가 얕다는 평을 듣는다.');
    return lines.join('\n');
  };

  SOLO.love = function (R) {
    var n = nm(R), sg = spouseGroup(R), c = R.godCount[sg], where = whereGroup(R, sg);
    var dayP = R.pillars[2], dayBad = dayRel(R, ['충', '삼형', '자형', '상형', '해']), dayGood = dayRel(R, ['육합', '반합', '삼합기운']);
    var lines = ['**배우자 자리**'];
    lines.push('일지(배우자궁)는 ' + S.BRANCH_H[dayP.b] + ', 십신으로 ' + dayP.branchGod + '. ' + {
      비견: '배우자가 나와 대등하다. 친구 같은 관계가 되지만 주도권 싸움이 있다.', 겁재: '배우자가 내 것을 나눠 간다. 경쟁하거나 빼앗기는 느낌이 반복된다.',
      식신: '배우자가 나를 편하게 한다. 먹고 사는 문제로 싸울 일이 적다.', 상관: '배우자와 말로 부딪힌다. 재치 있는 상대에게 끌리고 그 재치에 다친다.',
      편재: '배우자가 활동적이고 돈 감각이 있다. 집에 잘 안 붙어 있다.', 정재: '배우자가 성실하고 안정적이다. 재미는 적다.',
      편관: '배우자가 나를 압박한다. 강한 상대에게 끌리고 그 강함에 눌린다.', 정관: '배우자가 바르고 책임감 있다. 틀에 갇히는 느낌이 온다.',
      편인: '배우자가 독특하고 속을 안 보인다. 외로운 결혼이 될 수 있다.', 정인: '배우자가 나를 돌본다. 편하지만 의존이 생긴다.'
    }[dayP.branchGod]);
    if (dayBad.length) lines.push('일지에 ' + dayBad.map(function (r) { return r.text; }).join(', ') + '. 배우자 자리가 흔들린다. 결혼 후 부딪힘이 구조로 들어 있다.');
    if (dayGood.length) lines.push('일지에 ' + dayGood.map(function (r) { return r.text; }).join(', ') + '. 배우자 자리가 묶여 있다. 한 번 맺으면 잘 안 끊어진다.');
    lines.push('', '**배우자성(' + sg + ')**');
    if (c === 0) lines.push(sg + '이 원국에 없다. 상대가 잘 안 보이는 사주다. 늦게 만나거나, 만나도 ' + n + '이(가) 먼저 알아보지 못한다. 배우자성 대운이 올 때 인연이 보인다.');
    else if (c >= 3) lines.push(sg + '이 ' + c + '개로 많다. 인연이 많고 선택이 어렵다. 한 사람에 집중하지 못해 관계가 겹치는 일이 생긴다.');
    else lines.push(sg + '이 ' + c + '개(' + where.join(', ') + '). 배우자 인연이 분명하게 있다.');
    if (R.shinsal.indexOf('도화') >= 0) lines.push('도화가 있다. 이성에게 눈에 띄고 유혹도 많다. 결혼 후에도 그 시선이 끊기지 않는 게 문제다.');
    var dw = daewoonOf(R, [sg]);
    lines.push('', '**시기와 숙제**');
    lines.push(dw.length ? '배우자성 대운 ' + dw.join(', ') + '에 결혼 인연이 들어온다.' : '배우자성 대운이 가까이 없다. 결혼은 운이 아니라 결심으로 해야 한다.');
    lines.push('고칠 것 하나: ' + {
      비겁: '상대를 이기려는 습관. 관계는 승부가 아니다.', 식상: '말로 다 해버리는 습관. 침묵도 대화다.',
      재성: '관계를 계산하는 습관. 손익으로 재면 상대도 잰다.', 관성: '참다가 한 번에 터지는 습관. 작을 때 말하라.',
      인성: '생각만 하고 표현 안 하는 습관. 상대는 독심술사가 아니다.'
    }[topGroup(R)]);
    return lines.join('\n');
  };

  SOLO.past = function (R) {
    var n = nm(R), stage = R.pillars[2].stage, top = topGroup(R);
    var role = { 비겁: '무인이나 유랑하는 사람', 식상: '예인이나 장인', 재성: '상인이나 지주', 관성: '관리나 군인', 인성: '학자나 승려' }[top];
    var lines = ['**장면**'];
    lines.push(n + '의 일주는 ' + S.gz(R.pillars[2].s, R.pillars[2].b) + '. 일간 ' + S.STEM_H[R.dm] + '의 기질에 일지 십이운성이 ' + stage + '. 전생은 ' + STAGE_IMG[stage] + '이었고, 신분으로는 ' + role + '에 가깝다.');
    if (R.shinsal.indexOf('화개') >= 0) lines.push('화개가 있다. 전생에 종교·학문·은둔의 자리에 있었다. 세상을 떠나 있던 기억이 이번 생의 고독감으로 남았다.');
    if (R.gongmang.length) lines.push('공망이 ' + R.gongmang.map(function (b) { return S.BRANCH_H[b]; }).join('') + '. 전생에서 끝내지 못하고 비워둔 자리다. 그 자리에 해당하는 인연(' +
      R.gongmang.map(function (b) { var idx = R.active.map(function (p) { return p.b; }).indexOf(b); return idx >= 0 ? ['조상·뿌리', '부모·형제', '배우자', '자식·후배'][idx] : null; }).filter(Boolean).join(', ') + ')이 이번 생에서 채워지지 않는 감각으로 나타난다.');
    lines.push('', '**흔적**');
    lines.push({
      비겁: '혼자 버텨온 기억이 몸에 있다. 이번 생에서도 남에게 기대는 게 어색하고, 도움을 받으면 빚처럼 느낀다.',
      식상: '손으로 만들고 입으로 노래하던 기억이다. 이번 생의 재능은 배운 게 아니라 이어받은 것이다.',
      재성: '셈하고 거두던 기억이다. 이번 생에서 돈 감각이 빠른 건 그 때문이고, 잃는 것에 대한 공포도 그 때문이다.',
      관성: '명령하고 명령받던 기억이다. 이번 생에서 규율을 견디는 힘과 억눌림의 답답함이 같이 온다.',
      인성: '읽고 쓰고 기도하던 기억이다. 이번 생에서 배움이 빠른 대신, 세상 물정에 늦다.'
    }[top]);
    return lines.join('\n');
  };

  SOLO.pastbond = function (R) {
    var n = nm(R), sg = spouseGroup(R);
    var lines = ['**이어져 온 사람**'];
    var need = R.yongsin.main;
    lines.push('이번 생에 다시 만나기로 되어 있는 사람은 ' + EL_PERSON[need] + '의 결을 가졌다. ' + n + '의 용신이 ' + EL[need] + '이라, 이 사람은 만나는 순간 이유 없이 편하다. 그 편안함이 전생의 기억이다.');
    var dayGood = dayRel(R, ['육합', '반합', '삼합기운']), dayBad = dayRel(R, ['충', '삼형', '자형', '상형', '해']);
    if (dayGood.length) lines.push('일지에 합이 걸려 있다. 전생에서 맺었던 약속이 있는 인연이다. 만나면 빨리 깊어지고 끊으려 해도 다시 이어진다.');
    if (dayBad.length) lines.push('일지에 충·형이 걸려 있다. 전생에서 갚지 못한 빚이 있는 인연이다. 강하게 끌리고 강하게 다친다. 이번 생의 과제는 그 사람을 이기는 게 아니라 빚을 정리하는 것이다.');
    lines.push('', '**받으러 온 인연과 갚으러 온 인연**');
    lines.push(R.godCount[sg] === 0
      ? '배우자성이 없어, 이번 생의 짝은 전생의 채무 관계가 아닌 새 인연이다. 그래서 늦게 오고, 알아보기 어렵다.'
      : R.godCount.인성 >= 2 ? '인성이 있어 받으러 온 인연이 있다. 조건 없이 돕는 사람이 나타나면 그게 전생에 ' + n + '이(가) 베푼 것을 돌려주는 사람이다. 거절하지 마라.'
        : '갚으러 온 인연이 먼저 온다. 이유 없이 마음이 쓰이는 사람, 손해를 봐도 도와주게 되는 사람이 그 사람이다. 갚고 나면 관계는 자연히 끝난다.');
    if (R.shinsal.indexOf('도화') >= 0 || R.shinsal.indexOf('역마') >= 0) lines.push('', (R.shinsal.indexOf('역마') >= 0 ? '역마가 있어 그 인연은 이동 중에, 낯선 곳에서 만난다.' : '') + (R.shinsal.indexOf('도화') >= 0 ? ' 도화가 있어 첫 만남은 시선으로 시작된다. 말보다 눈이 먼저 알아본다.' : ''));
    return lines.join('\n');
  };

  /* ============================================================
     궁합 (두 사람)
     ============================================================ */
  var PAIR = {};
  function lead(A, B, C) {
    var l = C.dm.label;
    if (l === 'A→B 극' || l === 'A→B 생') return [A, B];
    if (l === 'B→A 극' || l === 'B→A 생') return [B, A];
    return A.strength.pct >= B.strength.pct ? [A, B] : [B, A];
  }
  function bad(C) { return C.relations.filter(function (r) { return r.w < 0; }); }
  function good(C) { return C.relations.filter(function (r) { return r.w > 0; }); }

  PAIR.p_overall = function (A, B, C) {
    var ld = lead(A, B, C);
    var lines = ['**구도**'];
    lines.push(C.a + '(' + S.STEM_H[A.dm] + ')와 ' + C.b + '(' + S.STEM_H[B.dm] + ')의 일간 관계는 ' + C.dm.label + '. ' + C.dm.desc + '.');
    lines.push('일지 관계는 ' + C.dayBranch.label + '. ' + C.dayBranch.desc + '.');
    lines.push('종합 ' + C.total + '점. ' + (C.total >= 75 ? '구조적으로 잘 맞는 조합이다. 노력 없이도 굴러간다.' : C.total >= 58 ? '맞는 부분과 부딪히는 부분이 같이 있다. 관리하면 오래 간다.' : C.total >= 42 ? '끌림은 있어도 마찰이 구조에 박혀 있다. 규칙 없이는 소모된다.' : '구조가 서로를 깎는다. 유지하려면 거리가 필요하다.'));
    lines.push('', '**주도권**');
    lines.push('판을 이끄는 쪽은 ' + nm(ld[0]) + '. ' + (C.dm.label.indexOf('극') >= 0 ? '누르는 관계라 ' + nm(ld[1]) + '이(가) 맞춰주는 형태로 굴러간다. 오래 가면 맞춰주는 쪽이 지친다.' : C.dm.label.indexOf('생') >= 0 ? '키워주는 관계라 ' + nm(ld[1]) + '이(가) 받는 쪽이다. 받는 쪽이 고마움을 잊으면 균형이 깨진다.' : '힘이 대등해서 양보하는 쪽이 없다. 역할을 나누지 않으면 계속 부딪힌다.'));
    lines.push(C.balance.improved ? '둘의 오행을 합치면 균형이 좋아진다. 혼자일 때보다 둘일 때 판단이 맑아지는 조합이다.' : '둘의 오행을 합치면 한쪽으로 더 쏠린다. 같이 있으면 같은 실수를 두 배로 한다.');
    return lines.join('\n');
  };

  PAIR.p_mind = function (A, B, C) {
    var fast = function (R) { return pct(R, 0) + pct(R, 1); };
    var fa = fast(A), fb = fast(B), b = bad(C), g = good(C);
    var lines = ['**속도와 온도**'];
    lines.push(C.a + '은(는) 木火가 ' + fa + '%, ' + C.b + '은(는) ' + fb + '%. ' + (Math.abs(fa - fb) >= 25 ? '속도가 다르다. ' + (fa > fb ? C.a : C.b) + '이(가) 먼저 움직이고 ' + (fa > fb ? C.b : C.a) + '이(가) 뒤에서 브레이크를 잡는다. 빠른 쪽은 답답하고 느린 쪽은 불안하다.' : '속도가 비슷하다. 같이 달리거나 같이 멈춘다. 둘 다 느리면 결정이 없고, 둘 다 빠르면 수습이 없다.'));
    lines.push(A.dmYin === B.dmYin ? '일간 음양이 같다. 감정 처리 방식이 비슷해서 설명이 필요 없다. 대신 같은 방식으로 틀린다.' : '일간 음양이 다르다. 한쪽이 드러내면 한쪽은 삼킨다. 드러내는 쪽은 상대가 무관심하다고 느끼고, 삼키는 쪽은 상대가 과하다고 느낀다.');
    lines.push('', '**싸움이 시작되는 지점**');
    lines.push(b.length ? '글자끼리 ' + b.map(function (r) { return r.t; }).join(', ') + '. 이 ' + b.length + '곳이 뇌관이다. ' + (b.some(function (r) { return r.k === '충'; }) ? '충이 있어 싸움이 시작되면 한쪽이 자리를 뜬다.' : b.some(function (r) { return r.k.indexOf('형') >= 0; }) ? '형이 있어 말이 가시로 꽂힌다. 사과해도 흔적이 남는다.' : '해·파라 큰 폭발 대신 서운함이 쌓인다.') : '글자끼리 충·형이 없다. 싸움이 크게 나지 않는다. 대신 문제를 덮고 지나가서 나중에 한꺼번에 꺼낸다.');
    lines.push('', '**화해**');
    lines.push(g.length ? '합이 ' + g.length + '개 있어 돌아오는 길이 있다. 시간을 두면 저절로 붙는다.' : '합이 없다. 저절로 화해되지 않는다. 먼저 말하는 쪽이 정해져 있어야 한다.');
    return lines.join('\n');
  };

  PAIR.p_love = function (A, B, C) {
    var lines = ['**애정의 온도**'];
    lines.push('애정 점수 ' + C.sub.애정 + '. 일지(배우자궁) 관계가 ' + C.dayBranch.label + '이라 ' + (C.dayBranch.score >= 22 ? '생활 리듬과 잠자리가 맞는다. 몸이 먼저 편한 조합이다.' : C.dayBranch.score <= 12 ? '가까워질수록 부딪힌다. 끌림은 강한데 같이 살면 소모된다.' : '특별한 끌림도 충돌도 없다. 정이 붙는 데 시간이 걸린다.'));
    [A, B].forEach(function (R) {
      var sg = spouseGroup(R), c = R.godCount[sg];
      lines.push(nm(R) + '의 배우자성(' + sg + ')은 ' + c + '개. ' + (c === 0 ? '상대를 잘 못 알아보는 쪽이다. 이 관계에서도 확신이 늦다.' : c >= 3 ? '인연이 많은 쪽이다. 이 관계 밖의 시선이 문제가 된다.' : '배우자 인연이 분명하다.'));
    });
    if (A.shinsal.indexOf('도화') >= 0 || B.shinsal.indexOf('도화') >= 0) lines.push((A.shinsal.indexOf('도화') >= 0 ? C.a : C.b) + '에게 도화가 있다. 둘 사이의 긴장은 밖에서 온다.');
    lines.push('', '**결혼까지**');
    lines.push(C.sub.애정 >= 70 && C.sub.지속력 >= 60 ? '결혼까지 갈 구조다. 조건은 하나 — ' + (bad(C).length ? bad(C)[0].t + ' 자리의 마찰을 규칙으로 막는 것.' : '서로의 속도를 존중하는 것.') : C.sub.애정 >= 50 ? '결혼은 가능하지만 자동으로 가지 않는다. 결정하는 쪽이 있어야 하고, 그 쪽은 ' + nm(lead(A, B, C)[0]) + '이다.' : '연인으로는 끌려도 결혼 구조가 약하다. 간다면 ' + (C.sub.소통 < 50 ? '소통' : '지속력') + ' 점수가 말해주듯 ' + (C.sub.소통 < 50 ? '말이 안 통하는 데서' : '시간이 흐르며') + ' 끊어진다.');
    return lines.join('\n');
  };

  PAIR.p_bond = function (A, B, C) {
    var lines = ['**귀인인가 채권자인가**'];
    C.yongsin.detail.forEach(function (d) {
      lines.push(d.who + '의 용신 ' + d.need + '을(를) 상대가 ' + d.have + '% 갖고 있다. ' + (d.have >= 30 ? '상대는 ' + d.who + '에게 귀인이다. 옆에 있으면 기운이 산다.' : d.have <= 10 ? '상대에게서 ' + d.who + '이(가) 필요한 기운은 거의 안 나온다. 채워지는 관계가 아니다.' : '약간 채워준다. 결정적이지는 않다.') + (d.giHave >= 30 ? ' 다만 기신 ' + d.gi + '도 ' + d.giHave + '%라 오래 붙어 있으면 뺏긴다.' : ''));
    });
    var da = C.yongsin.detail[0].score, db = C.yongsin.detail[1].score;
    lines.push(Math.abs(da - db) >= 4 ? '한쪽이 일방적으로 주는 구조다. ' + (da > db ? C.b : C.a) + '이(가) 주고 ' + (da > db ? C.a : C.b) + '이(가) 받는다. 받는 쪽이 이걸 모르면 관계가 끝난다.' : '주고받는 균형이 맞다. 오래 갈 인연의 조건은 갖췄다.');
    lines.push('', '**지속성**');
    lines.push('지속력 ' + C.sub.지속력 + '. ' + (good(C).length > bad(C).length ? '합이 충보다 많다. 계절성 인연이 아니라 오래 가는 인연이다.' : bad(C).length > good(C).length ? '충이 합보다 많다. 강렬하지만 계절성 인연이다. 끝날 때를 알고 만나라.' : '합과 충이 비슷하다. 유지되지만 늘 조금 흔들린다.'));
    lines.push('관계를 망치는 제3자: ' + (A.godCount.비겁 + B.godCount.비겁 >= 3 ? '둘 다 비겁이 있어 친구·형제·동료가 사이에 낀다. 둘 사이 문제를 남에게 먼저 말하지 마라.' : '비겁이 적어 제3자 개입은 크지 않다. 문제는 늘 둘 사이에서 나온다.'));
    return lines.join('\n');
  };

  PAIR.p_money = function (A, B, C) {
    var wa = A.godCount.재성, wb = B.godCount.재성;
    var lines = ['**돈이 걸리면**'];
    lines.push('재물 점수 ' + C.sub.재물 + '. ' + C.a + ' 재성 ' + wa + '개, ' + C.b + ' 재성 ' + wb + '개. ' + (wa === 0 && wb === 0 ? '둘 다 돈이 목표가 아니다. 돈 문제로 싸우진 않지만 돈이 모이지도 않는다.' : wa > 0 && wb > 0 ? '둘 다 돈 감각이 있다. 서로의 판단을 인정하면 시너지, 무시하면 각자 딴 주머니를 찬다.' : (wa > wb ? C.a : C.b) + '이(가) 돈을 보고 ' + (wa > wb ? C.b : C.a) + '이(가) 안 본다. 관리는 보는 쪽이 하고, 안 보는 쪽은 간섭하지 말아야 한다.'));
    lines.push(C.balance.improved ? '둘의 기운을 합치면 균형이 좋아져서 공동 자산은 혼자보다 낫다.' : '둘의 기운을 합치면 한쪽으로 쏠린다. 공동 투자는 같은 실수를 두 배로 한다.');
    var pa = C.relations.filter(function (r) { return r.k === '파' || r.k === '해'; });
    lines.push('', '**깨지는 지점**');
    lines.push(pa.length ? pa.map(function (r) { return r.t; }).join(', ') + '. 파·해가 있어 돈으로 판이 깨지는 구조가 있다. 공동 계좌·연대 보증·명의 대여는 하지 마라.' : '파·해가 없어 돈으로 판이 깨질 구조는 약하다. 대신 돈 얘기를 미루다 쌓인다. 월 1회 정산을 규칙으로.');
    if ((A.godCount.비겁 >= 2 && wa > 0) || (B.godCount.비겁 >= 2 && wb > 0)) lines.push('비겁과 재성이 같은 사람 안에 있다. 그 사람의 돈은 주변으로 흘러나간다. 이 관계의 돈이 제3자에게 가는 경로가 여기다.');
    return lines.join('\n');
  };

  PAIR.p_biz = function (A, B, C) {
    var ra = S.ROLE_BY_EL[A.dmEl], rb = S.ROLE_BY_EL[B.dmEl];
    var lines = ['**역할**'];
    lines.push(C.a + '은(는) ' + ra.name + ' — ' + ra.desc + '. ' + C.b + '은(는) ' + rb.name + ' — ' + rb.desc + '.');
    lines.push(A.dmEl === B.dmEl ? '일간 오행이 같아 역할이 겹친다. 같은 자리를 두고 부딪히고, 빈 자리는 아무도 안 맡는다. 겹치는 역할은 한 명에게 몰고, 다른 한 명은 억지로라도 다른 자리를 맡아야 한다.' : '역할이 겹치지 않는다. 자기 자리를 지키면 서로 보완된다.');
    lines.push('', '**결정권**');
    var oa = A.godCount.관성, ob = B.godCount.관성;
    lines.push(oa !== ob ? '최종 결정권은 ' + (oa > ob ? C.a : C.b) + '에게. 관성이 더 있어 책임을 지는 구조가 몸에 있다. ' + (oa > ob ? C.b : C.a) + '은(는) 아이디어와 실행을 맡고 결정에서는 물러나야 한다.' : '관성이 같아 결정권이 애매하다. 영역별로 결정권을 미리 문서로 나누지 않으면 모든 결정이 회의로 끝난다.');
    lines.push('협업 점수 ' + C.sub.협업 + '. ' + (C.sub.협업 >= 70 ? '같이 일하면 성과가 난다.' : C.sub.협업 >= 50 ? '역할만 나누면 굴러간다.' : '같이 일하면 둘 다 소모된다. 프로젝트 단위로만 붙어라.'));
    lines.push('', '**계약서에 넣을 것**');
    lines.push((A.godCount.비겁 >= 2 || B.godCount.비겁 >= 2) ? '지분과 퇴출 조건. 비겁이 있는 조합은 잘될 때 갈라진다. 잘될 때의 분배를 먼저 적어라.' : '역할 경계와 결정권. 비겁은 적어 지분 싸움은 덜하지만, 누가 뭘 결정하는지 안 적으면 아무도 안 한다.');
    lines.push('맞는 업종: 둘의 용신 ' + EL[A.yongsin.main] + '·' + EL[B.yongsin.main] + ' 기운 — ' + EL_BIZ[A.yongsin.main] + (A.yongsin.main !== B.yongsin.main ? ' / ' + EL_BIZ[B.yongsin.main] : '') + '.');
    return lines.join('\n');
  };

  var PAST_ROLE = { 비겁: '무인이나 떠도는 사람', 식상: '예인이나 장인', 재성: '상인이나 땅을 가진 사람', 관성: '관리나 군인', 인성: '학자나 승려' };
  var PAST_END = {
    충: '한쪽이 떠나며 끝났다. 작별 인사가 없었다', 삼형: '서로를 찌른 말이 끝을 냈다', 자형: '스스로를 망친 쪽이 먼저 무너졌다', 상형: '한쪽의 고발로 갈라졌다',
    해: '서운함이 쌓여 조용히 멀어졌다', 파: '약속이 깨지며 끝났다', 천간충: '뜻이 맞지 않아 각자 다른 길을 갔다'
  };
  PAIR.p_pastlife = function (A, B, C) {
    var g = good(C), b = bad(C);
    var ra = PAST_ROLE[topGroup(A)], rb = PAST_ROLE[topGroup(B)];
    var lines = ['**그때의 두 사람**'];
    lines.push(C.a + '의 일주 ' + S.gz(A.pillars[2].s, A.pillars[2].b) + '(' + A.pillars[2].stage + '), ' + C.b + '의 일주 ' + S.gz(B.pillars[2].s, B.pillars[2].b) + '(' + B.pillars[2].stage + '). ' +
      C.a + '은(는) ' + STAGE_IMG[A.pillars[2].stage] + '으로 신분은 ' + ra + '에 가깝고, ' + C.b + '은(는) ' + STAGE_IMG[B.pillars[2].stage] + '으로 ' + rb + '에 가깝다.');
    lines.push((A.shinsal.indexOf('역마') >= 0 || B.shinsal.indexOf('역마') >= 0)
      ? '역마가 있어 두 사람은 한곳에서 자라지 않았다. 길 위에서, 낯선 고을에서 만났다.'
      : '역마가 없어 두 사람은 같은 고을 안에서 만났다. 자주 마주치다가 어느 날 서로를 알아봤다.');
    lines.push('', '**함께한 시간과 끝**');
    lines.push(g.length && !b.length ? '글자끼리 합만 있고 충이 없다. 전생에서 같은 편이었다. 한 지붕 아래 있었거나 같은 길을 걸었고, 끝은 다툼이 아니라 시간이었다 — 한쪽이 먼저 세상을 떠났고, 남은 쪽이 오래 기억했다. 이번 생에 만나자마자 익숙한 이유가 이것이다.'
      : b.length && !g.length ? '글자끼리 충·형만 있다. 전생에서 맞서던 관계다. 한쪽이 한쪽을 이겼고, 진 쪽의 기억이 이번 생의 끌림으로 바뀌었다. ' + (PAST_END[b[0].k] || '갈라지며 끝났다') + '. 끌림과 경계가 같이 오는 이유다.'
        : g.length && b.length ? '합과 충이 섞여 있다. 전생에서 가까웠다가 갈라진 사이다. 처음엔 한편이었고(합), 어느 순간 뜻이 갈렸다(충). ' + (PAST_END[b[0].k] || '갈라지며 끝났다') + '. 끝내지 못한 대화가 남았고, 이번 생에서 그 대화를 다시 하게 된다.'
          : '글자끼리 아무 관계가 없다. 전생에 인연이 없던 두 사람이 이번 생에서 처음 만났다. 기억이 없으니 오해도 없고, 익숙함도 없다. 모든 걸 새로 쌓아야 한다.');
    if (A.shinsal.indexOf('화개') >= 0 || B.shinsal.indexOf('화개') >= 0) lines.push((A.shinsal.indexOf('화개') >= 0 ? C.a : C.b) + '에게 화개가 있다. 그때 한쪽은 세상을 등지고 절이나 서원에 들어갔다. 관계가 끝난 게 아니라 멈춘 것이다.');
    lines.push('', '**예를 들어**');
    lines.push('예를 들어, 이번 생에서 두 사람이 처음 만난 자리를 떠올려 보면 된다. ' + (g.length ? '소개받은 첫날인데 말이 끊기지 않고, 헤어질 때 "어디서 봤죠?"라는 말이 나온다. 그 익숙함이 그때의 기억이다.' : b.length ? '첫인상은 좋았는데 이유 없이 한 번 더 확인하고 싶어진다. 경계와 끌림이 동시에 오는 그 느낌이 그때의 기억이다.' : '특별한 느낌이 없다. 편하지도 불편하지도 않다. 백지에서 시작하는 인연이라 그렇다.'));
    return lines.join('\n');
  };

  PAIR.p_pastbond = function (A, B, C) {
    var g = good(C), b = bad(C);
    var sgA = spouseGroup(A), sgB = spouseGroup(B);
    var kind = (g.length && !b.length) ? '약속' : (b.length && !g.length) ? '빚' : (g.length && b.length) ? '못 끝낸 대화' : '새 인연';
    var lines = ['**이 인연의 성격 — ' + kind + '**'];
    lines.push(kind === '약속' ? '다시 잇기로 한 약속이다. 합이 걸려 있어 만나면 빨리 깊어지고, 끊으려 해도 다시 이어진다. 갚을 것도 받을 것도 없고, 이어 가기만 하면 된다.'
      : kind === '빚' ? '갚아야 할 빚이 있는 인연이다. 충·형이 걸려 있어 강하게 끌리고 강하게 다친다. 어느 쪽이 채무자인지는 일간 관계가 말해 준다 — ' + (C.dm.label.indexOf('A→B') >= 0 ? C.a + '이(가) 누르는 쪽이라 이번엔 ' + C.a + '이(가) 갚는 차례다.' : C.dm.label.indexOf('B→A') >= 0 ? C.b + '이(가) 누르는 쪽이라 이번엔 ' + C.b + '이(가) 갚는 차례다.' : '힘이 대등해서 서로 조금씩 갚는다.')
        : kind === '못 끝낸 대화' ? '가까웠다가 갈라진 사이라, 이번 생의 과제는 그때 못 한 말을 하는 것이다. 합이 다시 붙여 주고 충이 다시 갈라놓는 일이 반복된다. 말을 끝내면 반복이 멈춘다.'
          : '전생의 빚도 약속도 없다. 이 관계는 순전히 지금의 선택이다. 익숙함이 없어 느리지만, 반복되는 상처도 없다.');
    lines.push('', '**이번 생의 재현**');
    lines.push(b.length ? b[0].t + ' 자리에서 같은 장면이 되풀이된다. ' + {
      충: '한쪽이 자리를 뜨는 장면. 문을 닫고 나가고, 며칠 뒤 아무 일 없던 듯 돌아온다.', 삼형: '말이 가시가 되는 장면. 사과해도 흔적이 남는다.',
      자형: '자기가 자기를 망치는 장면. 상대는 보고만 있어야 한다.', 상형: '누가 잘못했는지를 따지는 장면. 답이 나오지 않는다.',
      해: '서운함이 쌓이는 장면. 큰 사건은 없는데 말수가 줄어든다.', 파: '약속이 깨지는 장면. 작은 약속부터 큰 약속까지.', 천간충: '뜻이 갈리는 장면. 같은 걸 보고 다른 결론을 낸다.'
    }[b[0].k] : '큰 재현은 없다. 대신 합이 걸린 자리(' + (g[0] ? g[0].p : '일지') + ')에서 이유 없이 편해지는 장면이 반복된다. 그 편안함을 당연하게 여기면 관계가 식는다.');
    lines.push('', '**각자의 숙제**');
    lines.push(C.a + ': ' + { 비겁: '이기려 하지 않는 것', 식상: '말을 끝까지 듣는 것', 재성: '계산하지 않고 주는 것', 관성: '참지 않고 말하는 것', 인성: '생각을 밖으로 꺼내는 것' }[topGroup(A)] + '. ' +
      C.b + ': ' + { 비겁: '이기려 하지 않는 것', 식상: '말을 끝까지 듣는 것', 재성: '계산하지 않고 주는 것', 관성: '참지 않고 말하는 것', 인성: '생각을 밖으로 꺼내는 것' }[topGroup(B)] + '.');
    lines.push('숙제를 끝내면 ' + (kind === '빚' ? '빚이 청산되고 관계는 조용히 끝나거나 전혀 다른 관계로 바뀐다. 끝내지 못하면 다음 생에 같은 자리에서 다시 만난다.' : kind === '약속' ? '이 관계는 평생 간다. 끝내지 못하면 약속은 지켜지되 서로 지친다.' : kind === '못 끝낸 대화' ? '반복이 멈추고 관계가 안정된다. 끝내지 못하면 같은 다툼을 10년 한다.' : '관계가 깊어진다. 끝내지 못해도 크게 잃을 건 없다.'));
    lines.push('', '**예를 들어**');
    lines.push('예를 들어, ' + (b.length
      ? '늦은 밤 사소한 말 한마디에서 시작된 다툼이 있다. ' + C.a + '이(가) 한 말을 ' + C.b + '이(가) 다르게 받아들이고, 두 사람 다 "왜 늘 이 얘기로 싸우지"라고 생각한다. 그 "늘"이 전생의 자리다. 그 순간 한 사람이 "이건 지금 일이 아니다"라고 말하면 끊긴다.'
      : '오래 연락이 끊겼다가 몇 년 뒤 우연히 마주친 장면이다. 어색해야 할 자리에서 두 사람은 어제 본 것처럼 말을 이어 간다. 약속으로 이어진 인연은 시간에 닳지 않는다.'));
    if (A.godCount[sgA] === 0 || B.godCount[sgB] === 0) lines.push((A.godCount[sgA] === 0 ? C.a : C.b) + '에게 배우자성이 없다. 이 사람은 상대를 늦게 알아본다. 상대가 먼저 확신해도 이 사람은 세 번은 더 만나야 안다.');
    return lines.join('\n');
  };

  PAIR.p_verdict = function (A, B, C) {
    var subs = Object.keys(C.sub).sort(function (x, y) { return C.sub[x] - C.sub[y]; });
    var lines = ['**결론**'];
    lines.push(C.total >= 65 ? '유지할 가치가 있다. 구조가 받쳐준다.' : C.total >= 48 ? '유지할 가치는 있지만 조건부다. 아래 규칙을 안 지키면 소모전이 된다.' : '구조가 서로를 깎는다. 유지하려면 거리와 규칙이 둘 다 필요하고, 그래도 힘들다.');
    lines.push('가장 약한 곳은 ' + subs[0] + '(' + C.sub[subs[0]] + ')과 ' + subs[1] + '(' + C.sub[subs[1]] + ').');
    lines.push('', '**규칙 세 가지**');
    var rules = {
      애정: '애정을 확인하려 시험하지 마라. 일지 관계가 ' + C.dayBranch.label + '이라 시험할수록 멀어진다.',
      재물: '돈은 각자 관리하고 공동 지출만 합쳐라. 재성 구조가 다르다.',
      협업: '같은 일을 같이 하지 말고 나눠서 하라. 역할이 겹치면 둘 다 죽는다.',
      소통: '싸움이 나면 24시간 안에 먼저 말하는 사람을 정해라. 합이 없으면 저절로 안 붙는다.',
      지속력: '헤어질 결심은 충 대운이 아닐 때 하라. 충 대운에 내린 결정은 후회한다.'
    };
    lines.push('1. ' + rules[subs[0]]);
    lines.push('2. ' + rules[subs[1]]);
    lines.push('3. ' + (bad(C).length ? bad(C)[0].t + ' 자리를 건드리는 주제(그 기둥이 뜻하는 영역)는 둘만 있을 때 꺼내라. 남 앞에서 꺼내면 판이 깨진다.' : '문제를 덮고 넘어가지 마라. 충이 없는 조합은 터지지 않는 대신 곪는다.'));
    lines.push('', bad(C).some(function (r) { return r.k === '충'; }) ? '깨진다면 충이 걸린 자리(' + bad(C).filter(function (r) { return r.k === '충'; })[0].p + ')와 관련된 사건으로, 한쪽이 자리를 떠나는 형태로 끝난다.' : '깨진다면 큰 사건이 아니라 서운함이 쌓여 조용히 멀어지는 형태다. 알아챌 때는 이미 늦다.');
    return lines.join('\n');
  };

  /* ============================================================
     그룹
     ============================================================ */
  var GROUP = {};
  function pn(list, i) { return list[i].input.name; }

  GROUP.g_field = function (list, G) {
    var tot = G.merged.reduce(function (a, b) { return a + b; }, 0) || 1;
    var lines = ['**기운의 판도**'];
    lines.push('합산 오행: ' + EL.map(function (e, k) { return e + ' ' + Math.round(G.merged[k] / tot * 100) + '%'; }).join(' / ') + '.');
    if (G.over.length) lines.push(G.over.join('·') + ' 기운이 넘친다. ' + G.over.map(function (e) {
      return { 목: '다들 벌이기만 하고 거두는 사람이 없다', 화: '분위기는 뜨는데 실속이 없고 쉽게 식는다', 토: '안정적이지만 아무것도 바뀌지 않는다', 금: '서로 자르고 평가한다. 냉정한데 따뜻함이 없다', 수: '전략은 많은데 아무도 안 움직인다' }[e];
    }).join('. ') + '.');
    if (G.missing.length) lines.push(G.missing.join('·') + ' 기운이 없다. ' + G.missing.map(function (e) {
      return { 목: '새 판을 시작하는 사람이 없다', 화: '팀을 데우고 밖에 알리는 사람이 없다', 토: '판을 붙들고 수습하는 사람이 없다', 금: '자르고 마감하는 사람이 없다', 수: '한 발 물러나 흐름을 읽는 사람이 없다' }[e];
    }).join('. ') + '. 이 자리를 누군가 억지로 메우다 먼저 지친다.');
    if (!G.over.length && !G.missing.length) lines.push('다섯 기운이 고르다. 한쪽으로 쏠리지 않는 대신 뾰족한 강점도 없다. 평균적인 팀이다.');
    lines.push('', '**공기의 온도**');
    var hot = (G.merged[0] + G.merged[1]) / tot;
    lines.push(hot >= 0.55 ? '木火가 많아 뜨겁고 빠르다. 회의가 길지 않고 결정이 빠르지만, 식은 뒤의 수습은 아무도 안 한다.' : hot <= 0.35 ? '金水土가 많아 차고 느리다. 신중하고 실수가 적지만, 시작이 늦고 열이 없다.' : '온도가 중간이다. 뜨거워지는 사람과 식히는 사람이 같이 있다.');
    return lines.join('\n');
  };

  GROUP.g_map = function (list, G) {
    var lines = ['**가장 맞는 쌍과 안 맞는 쌍**'];
    lines.push('최고: ' + G.best.a + ' ↔ ' + G.best.b + ' ' + G.best.total + '점. 일간 ' + G.best.dm.label + ', 일지 ' + G.best.dayBranch.label + '. ' + G.best.dm.desc + '.');
    lines.push('최저: ' + G.worst.a + ' ↔ ' + G.worst.b + ' ' + G.worst.total + '점. 일간 ' + G.worst.dm.label + ', 일지 ' + G.worst.dayBranch.label + '. ' + (bad(G.worst).length ? bad(G.worst).map(function (r) { return r.t; }).join(', ') + '이 박혀 있다.' : '합충은 없지만 서로 채워주는 게 없다.'));
    var hidden = G.pairs.filter(function (c) { return c.sub.소통 >= 60 && c.sub.지속력 < 45; })[0];
    if (hidden) lines.push('겉으로 좋아 보이지만 속으로 곪는 쌍: ' + hidden.a + ' ↔ ' + hidden.b + '. 소통은 되는데 지속력이 없다. 말은 통하고 마음은 식는다.');
    var surprise = G.pairs.filter(function (c) { return c.sub.소통 < 50 && c.total >= 60; })[0];
    if (surprise) lines.push('의외로 잘 맞는 쌍: ' + surprise.a + ' ↔ ' + surprise.b + '. 말은 안 통해도 구조가 맞는다. 말 대신 역할로 붙어라.');
    if (list.length >= 3) {
      var n = list.length, i, sums = [];
      for (i = 0; i < n; i++) sums.push({ i: i, s: G.pairs.filter(function (c) { return c.i === i || c.j === i; }).reduce(function (a, c) { return a + c.total; }, 0) });
      sums.sort(function (a, b) { return a.s - b.s; });
      lines.push('', '**삼각구도**');
      lines.push(G.best.a + '과(와) ' + G.best.b + '이(가) 붙으면 ' + pn(list, sums[0].i) + '이(가) 밀려난다. 모든 쌍 점수를 더했을 때 가장 낮은 사람이 ' + pn(list, sums[0].i) + '이고, 이 사람이 소외되는 순간 판이 갈라진다.');
    }
    return lines.join('\n');
  };

  GROUP.g_love = function (list, G) {
    var lines = ['**연인으로 묶는다면**'];
    G.loveRank.slice(0, 3).forEach(function (c, k) {
      lines.push((k + 1) + '위 ' + c.a + ' ↔ ' + c.b + ' (애정 ' + c.sub.애정 + '). 일지 ' + c.dayBranch.label + '. ' + (k === 0 ? c.dayBranch.desc + '. 사귀면 ' + (c.sub.지속력 >= 60 ? '오래 간다' : '뜨겁고 짧다') + '.' : ''));
    });
    var w = G.loveRank[G.loveRank.length - 1];
    lines.push('', '**엮이면 안 되는 조합**');
    lines.push(w.a + ' ↔ ' + w.b + ' (애정 ' + w.sub.애정 + '). ' + (bad(w).some(function (r) { return r.p.indexOf('일지') >= 0; }) ? '일지에 충·형이 걸려 잠자리와 생활이 안 맞는다.' : '끌림 자체가 구조에 없다. 억지로 엮으면 둘 다 다른 사람을 본다.'));
    return lines.join('\n');
  };

  GROUP.g_team = function (list, G) {
    var lines = ['**자리 배정**'];
    var leaderIdx = 0, best = -1;
    list.forEach(function (R, i) {
      var score = R.strength.pct * (1 + R.godCount.관성 * 0.4 + R.godCount.비겁 * 0.2);
      if (score > best) { best = score; leaderIdx = i; }
    });
    list.forEach(function (R, i) {
      var role = S.ROLE_BY_EL[R.dmEl];
      var avoid = S.ROLE_BY_EL[R.yongsin.gi];
      lines.push('**' + R.input.name + '** — ' + role.name + '. ' + role.desc + '. 맡기면 안 되는 자리: ' + avoid.name + '(기신 ' + EL[R.yongsin.gi] + ' 영역). 무너지는 조건: ' + (R.strength.pct < 45 ? '혼자 책임을 떠안을 때' : R.godCount.관성 >= 3 ? '권한 없이 책임만 질 때' : R.godCount.식상 >= 2 ? '의견을 말할 통로가 막힐 때' : '역할이 모호할 때') + '.');
    });
    lines.push('', '**리더**');
    var L = list[leaderIdx];
    lines.push(L.input.name + '. ' + L.strength.label + '이고 관성 ' + L.godCount.관성 + '개로 책임을 지는 구조가 몸에 있다. ' + (L.godCount.관성 === 0 ? '관성이 없어 규율은 약하니, 규칙은 다른 사람이 세워야 한다.' : '결정권을 이 사람에게 몰아라. 나누면 아무도 안 정한다.'));
    return lines.join('\n');
  };

  GROUP.g_drive = function (list, G) {
    var tot = G.merged.reduce(function (a, b) { return a + b; }, 0) || 1;
    var wood = G.merged[0] / tot, fire = G.merged[1] / tot, metal = G.merged[3] / tot, earth = G.merged[2] / tot;
    var lines = ['**초반·중반·장기**'];
    lines.push('초반: ' + (wood + fire >= 0.5 ? '빨리 뜬다. 아이디어와 열기로 첫 성과가 나온다.' : '느리게 시작한다. 준비가 길고 첫 성과가 늦다.'));
    lines.push('중반: ' + (earth >= 0.22 ? '土가 받쳐 안정된다. 큰 사고 없이 굴러간다.' : '土가 약해 흔들린다. 수습하는 사람이 없어 작은 사고가 커진다.'));
    lines.push('장기: ' + (metal >= 0.2 ? '金이 있어 마무리가 된다. 벌인 걸 끝낸다.' : '金이 약해 벌이기만 하고 끝을 못 낸다. 프로젝트가 쌓이고 완성이 없다.'));
    lines.push('', '**성과가 나는 일**');
    var m = 0; for (var k = 1; k < 5; k++) if (G.merged[k] > G.merged[m]) m = k;
    lines.push('가장 강한 ' + EL[m] + ' 기운의 일 — ' + EL_BIZ[m] + '. 이 영역에서는 남들보다 빠르다.');
    lines.push('', '**밖에서 조달해야 하는 것**');
    lines.push(G.missing.length ? G.missing.join('·') + ' 기운의 기능. ' + G.missing.map(function (e) { return S.ROLE_BY_EL[EL.indexOf(e)].name; }).join('·') + '을(를) 외부 인력이나 도구로 채우지 않으면 이 팀은 그 지점에서 멈춘다.' : '빠진 기운은 없다. 조달할 건 기능이 아니라 속도다 — 결정 기한을 외부에서 정해줄 사람.');
    return lines.join('\n');
  };

  GROUP.g_risk = function (list, G) {
    var chungPairs = G.pairs.filter(function (c) { return bad(c).some(function (r) { return r.k === '충'; }); }).sort(function (a, b) { return a.total - b.total; });
    var first = chungPairs[0] || G.worst;
    var lines = ['**뇌관**'];
    lines.push('먼저 터지는 곳: ' + first.a + ' ↔ ' + first.b + '. ' + (bad(first).length ? bad(first).map(function (r) { return r.t; }).join(', ') + '. ' : '') + '이 둘 사이에서 시작된 균열이 나머지로 번진다.');
    lines.push('시나리오: ' + first.a + '이(가) ' + (first.dm.label.indexOf('극') >= 0 ? '누르고' : '앞서가고') + ' ' + first.b + '이(가) 침묵한다. 침묵이 길어지면 ' + (list.length >= 3 ? '제3자에게 먼저 말이 가고, 편이 갈린다.' : '어느 날 한쪽이 자리를 뜬다.'));
    lines.push('', '**운영 규칙 네 가지**');
    lines.push('1. 결정권은 한 사람에게. 관성이 가장 있는 사람이 정하고, 나머지는 의견만 낸다. 나눠 갖는 순간 아무것도 안 정해진다.');
    lines.push('2. ' + first.a + '과(와) ' + first.b + '은(는) 둘만 남겨두지 마라. 충이 걸린 쌍은 제3자가 있을 때만 붙여라.');
    lines.push('3. ' + (G.missing.length ? G.missing.join('·') + ' 기운 역할을 순번제로 맡겨라. 아무도 타고나지 않은 자리는 돌아가며 억지로 채워야 한다.' : '역할을 고정하라. 기운이 고른 팀은 역할이 흐려지면 서로 남 탓을 한다.'));
    lines.push('4. 돈은 ' + (G.pairs.some(function (c) { return c.sub.재물 < 45; }) ? '한 사람이 관리하고 나머지는 보지 마라. 재물 점수가 낮은 쌍이 있어 돈이 사이를 갈라놓는다.' : '투명하게 공개하라. 재물 점수가 고르게 나와 숨기는 것만 문제가 된다.'));
    return lines.join('\n');
  };

  /* ============================================================
     해결방안 · 힘이 되는 말
     ============================================================ */
  var EL_ACT = [
    '초록색·동쪽·아침을 가까이하라. 새 일을 시작하는 자리, 기획하는 일, 식물이 있는 공간이 기운을 살린다.',
    '붉은색·남쪽·햇빛을 가까이하라. 사람 앞에서 말하고 보여주는 일, 몸을 움직이는 운동이 기운을 살린다.',
    '노란색·흙빛·규칙적인 식사를 지켜라. 부동산·안정 자산, 중재하고 관리하는 자리가 기운을 살린다.',
    '흰색·서쪽·정리정돈을 습관으로 삼아라. 마감을 정하고 자르는 연습, 금속 소재가 기운을 살린다.',
    '검정·파랑·북쪽·물 가까이를 택하라. 밤의 독서와 사색, 전략을 짜는 일이 기운을 살린다.'
  ];
  var EL_AVOID = [
    '기신 木 — 무작정 벌리는 일, 동시에 여러 개를 시작하는 습관', '기신 火 — 감정으로 결정하기, 과열된 사람과 환경',
    '기신 土 — 안전만 좇다 굳어 버리는 것, 미루는 습관', '기신 金 — 지나친 비판과 완벽주의, 냉정한 사람과의 장기 동거',
    '기신 水 — 생각만 하고 안 움직이는 것, 밤샘과 과음'
  ];
  var CHEER_GROUP = {
    비겁: '누가 뭐라 해도 스스로 서는 힘이 있다. 그 힘은 배워서 되는 게 아니다. 이미 갖고 있다.',
    식상: '만들고 표현하는 재능이 원국에 박혀 있다. 이 재능은 나이가 들수록 값이 오른다.',
    재성: '현실을 보는 눈이 있다. 남들이 꿈꿀 때 이 사람은 계산이 끝나 있다. 그게 살아남는 힘이다.',
    관성: '맡은 일을 끝까지 하는 사람이다. 세상은 결국 이런 사람에게 자리를 준다.',
    인성: '배우는 속도가 남다르다. 지금 모르는 건 아직 안 배운 것일 뿐, 못 배우는 게 아니다.'
  };
  var CHEER_STEM = [
    '甲木은 부러질 뿐 굽지 않는다. 그 곧음이 당신을 끝까지 데려간다.', '乙木은 어디서든 살아남는다. 지금 자리가 좁아도 뻗을 길은 반드시 있다.',
    '丙火는 있는 것만으로 주변을 밝힌다. 당신이 있는 방은 온도가 다르다.', '丁火는 오래 탄다. 화려하지 않아도 끝까지 꺼지지 않는 불이다.',
    '戊土는 산이다. 흔들리는 사람들이 결국 기대러 온다.', '己土는 무엇이든 키운다. 당신 곁에서 자란 것들이 당신을 증명한다.',
    '庚金은 두드릴수록 강해진다. 지금의 압박이 당신을 무기로 만든다.', '辛金은 이미 다듬어진 보석이다. 빛을 보려면 꺼내 놓기만 하면 된다.',
    '壬水는 바다다. 무엇이 들어와도 삼키고 결국 제 길로 흐른다.', '癸水는 스며든다. 눈에 띄지 않게 세상을 바꾸는 힘이 당신 것이다.'
  ];

  /* 예시 일화 — 이 사람이 겪을 법한 전형적 장면 */
  function soloAnecdote(R, id) {
    var n = nm(R), top = topGroup(R), y = R.yongsin;
    var A = {
      mind: { 비겁: n + '이(가) 회의에서 자기 안을 냈는데 누가 "그건 좀…"이라고 한다. 겉으로는 "알겠다"고 하지만 그날 밤 그 말을 열 번 되감는다. 다음 회의에서 같은 안을 더 단호하게 낸다.',
        식상: '친구 모임에서 ' + n + '이(가) 말을 시작하면 자리가 산다. 그런데 누가 중간에 끊으면 표정이 굳고, 그 뒤로 말수가 확 줄어든다. 집에 가서 "내가 너무 나섰나"를 생각한다.',
        재성: '점심 메뉴를 고르는 데도 ' + n + '은(는) 가성비를 계산한다. 상대가 "그냥 먹자"고 하면 답답하고, 상대는 ' + n + '이(가) 계산적이라 느낀다. 둘 다 틀리지 않았다.',
        관성: '상사가 ' + n + '의 보고서를 대충 넘기며 "고생했어"라고만 한다. ' + n + '은(는) 아무 말 없이 자리에 앉지만, 그 무심함이 3주 동안 남는다. 어느 날 사소한 일에 폭발한다.',
        인성: '누가 ' + n + '에게 "그래서 결론이 뭐야?"라고 묻는다. 머릿속엔 이미 다섯 가지 답이 있는데 입에서는 "음, 좀 더 생각해 볼게"가 나온다. 상대는 ' + n + '이(가) 생각이 없다고 오해한다.' }[top],
      money: R.godCount.비겁 >= 2 ? '오랜 친구가 "잠깐만 빌려줘, 다음 달에 갚을게"라고 한다. ' + n + '은(는) 거절하는 말이 안 나와 이체를 한다. 다음 달은 오지 않고, 돈보다 친구를 잃는 게 더 아프다.'
        : hasGod(R, '편재') ? '지인이 "이거 확실한 정보야"라며 투자를 권한다. ' + n + '은(는) 하루도 안 재고 들어간다. 오르면 더 넣고 내리면 물타기를 한다. 확실하다는 느낌이 들 때가 가장 위험한 순간이었다.'
          : '월급이 들어오면 며칠은 여유롭다가 20일쯤 잔고를 보고 놀란다. 큰돈을 쓴 기억은 없는데 커피·배달·구독이 합쳐져 있다. 매달 같은 장면이다.',
      love: R.godCount[spouseGroup(R)] === 0 ? '주변에서 "그 사람 너 좋아하는 것 같은데?"라고 하는데 ' + n + '은(는) 전혀 몰랐다. 나중에 알고 나서도 "정말?"을 세 번 묻는다. 인연이 옆에 와 있어도 알아보는 데 시간이 걸리는 사주다.'
        : dayRel(R, ['충', '삼형', '자형', '상형', '해']).length ? '연인과 사소한 약속 시간 문제로 다툰다. ' + n + '은(는) 옳고 틀림을 따지고, 상대는 감정을 말한다. 두 시간 뒤 화해하지만 같은 다툼이 다음 달에 또 온다.'
          : '연애가 안정되면 ' + n + '은(는) 편해진다. 너무 편해서 기념일을 잊고, 상대는 "나한테 관심 없지?"라고 묻는다. 관심이 없는 게 아니라 안정을 무관심으로 표현하는 사주다.',
      bond: '새로 만난 사람이 첫날부터 ' + n + '에게 지나치게 친절하다. ' + n + '은(는) 고마워서 마음을 여는데, 석 달 뒤 그 사람이 부탁을 들고 온다. 용신 ' + EL[y.main] + ' 기운의 사람은 처음엔 조용하고, 기신 ' + EL[y.gi] + ' 기운의 사람은 처음부터 뜨겁다. 순서를 기억하라.',
      biz: '동료가 "우리 둘이 나가서 하면 잘될 것 같아"라고 한다. ' + n + '은(는) 밤새 사업계획을 짠다. ' + (R.godCount.비겁 >= 2 ? '석 달 뒤 지분 얘기가 나오고 둘은 서로를 처음 보는 사람처럼 대한다. 비겁이 많은 사주의 동업은 이렇게 끝난다.' : '준비는 좋은데 시작이 늦다. 반년 뒤 비슷한 아이템이 남의 이름으로 나온다. 벌이는 힘이 약한 사주는 시작 날짜를 먼저 정해야 한다.'),
      job: R.godCount.관성 === 0 ? '입사 첫 달은 열심인데 석 달째 "왜 이 규칙이 필요하지?"라는 생각이 든다. 회의에서 그 말을 꺼내면 분위기가 식는다. 규칙 안에 있기보다 규칙을 만드는 자리로 가야 하는 사주다.'
        : R.godCount.관성 >= 3 ? '업무 지시가 모호하면 ' + n + '은(는) 불안해진다. "어디까지 해야 하나요"를 세 번 묻고, 상사는 "알아서 해"라고 한다. 틀이 명확한 조직에서만 능력이 나온다.'
          : '팀에서 ' + n + '은(는) 무난하게 잘한다. 문제는 승진 시기 — 눈에 띄는 사람이 먼저 올라간다. 실력이 아니라 드러내는 방식의 문제다.',
      wealth: R.godCount.재성 === 0 ? n + '이(가) 열심히 만든 결과물에 남이 값을 매긴다. "이 정도면 되죠?"라는 말에 고개를 끄덕이고, 집에 와서 시장 가격을 검색해 보고 놀란다. 재성이 없는 사주는 가격을 남이 정하게 두면 늘 손해다.'
        : hasGod(R, '편재') ? '어느 해에 큰돈이 들어온다. 차를 바꾸고 집을 넓히고 사람을 산다. 2년 뒤 잔고는 들어오기 전과 같다. 편재의 돈은 통과하는 돈이라 30%를 먼저 떼어 두지 않으면 남지 않는다.'
          : '월급을 꾸준히 모으다 보니 어느새 목돈이 됐다. 그런데 그 돈으로 무엇을 할지 결정을 못 해 3년째 예금이다. 정재의 돈은 안전하지만 움직이지 않는다.'
    };
    return A[id] ? '\n**예를 들어**\n' + A[id] : '';
  }

  function soloRemedy(R, id) {
    var n = nm(R), y = R.yongsin, top = topGroup(R), sg = spouseGroup(R);
    var L = [soloAnecdote(R, id), '', '**해결방안**'];
    var base = '- ' + EL_ACT[y.main] + '\n- 피할 것: ' + EL_AVOID[y.gi] + '.';
    switch (id) {
      case 'overall': L.push(base); L.push('- 올해 할 일 하나를 정하고 나머지는 버려라. ' + (R.strength.pct >= 57 ? '힘이 넘치는 사주는 분산이 가장 큰 적이다.' : '힘이 모자란 사주는 집중이 유일한 무기다.')); break;
      case 'mind': L.push('- 화가 올라오면 24시간 뒤에 답하라. ' + {
        비겁: '침범당했다는 느낌은 대개 오해다. 하루 지나면 절반이 사라진다.', 식상: '말하고 싶은 걸 글로 먼저 써라. 쓰고 나면 절반은 말할 필요가 없어진다.',
        재성: '손해 계산을 종이에 적어라. 실제 손해는 느낌의 3분의 1이다.', 관성: '작은 불만을 그날 말하라. 쌓아서 터지면 관계가 끝난다.', 인성: '설명을 포기하지 마라. 세 문장만 더 하면 상대는 이해한다.' }[top]);
        L.push('- ' + EL_ACT[y.main]); break;
      case 'wealth': L.push(R.godCount.재성 === 0 ? '- 돈을 목표로 삼지 말고 재능(식상)이나 자격(인성)을 목표로 삼아라. 돈은 그 뒤에 따라온다.\n- 월급처럼 고정 수입이 나오는 구조를 먼저 만든 뒤 나머지를 시도하라.' : '- 재성 대운이 오기 전에 종잣돈과 지식을 준비하라. 준비 없이 맞는 재성 대운은 나가는 돈이 된다.\n- 큰 돈이 들어온 달에는 30%를 먼저 떼어 손대지 못하는 계좌에 넣어라.'); L.push('- ' + EL_ACT[y.main]); break;
      case 'money': L.push('- 보증·연대보증·명의 대여는 예외 없이 거절하라. 거절 문장을 미리 외워 둬라: "내 원칙이라 안 된다."'); L.push('- 고정비를 자동이체로 묶고, 남는 돈만 쓰는 통장을 따로 만들어라.'); if (hasGod(R, '편재')) L.push('- "이번엔 확실하다"는 느낌이 들면 하루를 미뤄라. 하루 뒤에도 확실하면 절반만 하라.'); break;
      case 'biz': L.push(R.strength.pct < 45 ? '- 창업하려면 강한 파트너 뒤에서 실무를 맡는 형태로 시작하라. 간판은 나중에.' : '- 시작은 작게, 동업 없이. 사람은 지분 대신 월급으로 쓰라.'); L.push('- 업종은 용신 ' + EL[y.main] + ' 기운(' + EL_BIZ[y.main] + ') 안에서 고르라.'); L.push('- 기신 ' + EL[y.gi] + ' 업종(' + EL_BIZ[y.gi] + ')은 잘돼도 몸이 상한다. 들어가지 마라.'); break;
      case 'job': L.push('- 이직·전직은 ' + EL[y.main] + ' 기운이 있는 환경(' + EL_JOB[y.main].slice(0, 3).join('·') + ' 계열)을 우선 보라.'); L.push(R.godCount.관성 === 0 ? '- 승진 사다리보다 전문성으로 자리를 만들어라. 이 사주는 직함이 아니라 실력으로 인정받는다.' : '- 조직 안에서는 맡은 범위를 문서로 분명히 하라. 책임만 늘고 권한이 없는 자리를 피해야 한다.'); break;
      case 'bond': L.push('- 새 사람을 만나면 3개월은 돈·시간을 크게 걸지 마라. ' + EL_PERSON[y.gi] + ' 유형인지 먼저 확인하라.'); L.push('- 도움을 받으면 그 자리에서 갚을 방법을 말하라. 빚처럼 남기면 관계가 어색해진다.'); if (R.godCount.비겁 >= 2) L.push('- 친구·형제와의 돈거래는 "주는 돈"만 하라. 빌려주는 돈은 없다고 생각하라.'); break;
      case 'love': L.push('- 관계에서 고쳐야 할 습관 하나(위에 짚은 것)를 종이에 써서 보이는 곳에 붙여라.'); L.push(R.godCount[sg] === 0 ? '- 상대를 잘 못 알아보는 사주다. 첫인상 대신 세 번 이상 만난 뒤 판단하라.' : '- 배우자성 대운이 올 때 만나는 사람은 진지하게 보라. 이 시기의 인연이 결혼으로 간다.'); L.push('- 일지에 ' + (dayRel(R, ['충', '삼형', '자형', '상형', '해']).length ? '충·형이 있다. 같이 사는 공간을 넓게 쓰고, 각자의 방을 두라.' : '큰 마찰이 없다. 대신 권태가 온다. 1년에 한 번은 둘만의 새 경험을 계획하라.')); break;
      case 'past': L.push('- 전생의 흔적은 지울 게 아니라 쓸 것이다. 이번 생의 재능(' + top + ')을 반복해서 쓰는 일을 직업으로 삼아라.'); L.push('- 이유 없는 두려움이 올라오는 상황을 메모하라. 패턴이 보이면 그건 지금이 아닌 그때의 감정이다.'); break;
      case 'pastbond': L.push('- 이유 없이 편한 사람(' + EL_PERSON[y.main] + ')을 만나면 관계를 서두르지 말고 오래 두라. 서두르면 빚 갚기가 아니라 빚 만들기가 된다.'); L.push('- 강하게 끌리면서 강하게 다치는 사람은 이기려 하지 말고 정리하라. 그게 이번 생의 숙제다.'); break;
      default: L.push(base);
    }
    L.push('', '**힘이 되는 말**');
    L.push(CHEER_GROUP[top] + ' ' + CHEER_STEM[R.dm]);
    return L.join('\n');
  }

  function pairAnecdote(A, B, C, id) {
    var b = bad(C), g = good(C);
    var A2 = {
      p_overall: '함께 여행 계획을 짜는 장면이다. ' + nm(lead(A, B, C)[0]) + '이(가) 일정표를 만들어 오고, ' + nm(lead(A, B, C)[1]) + '은(는) "좋아"라고 한다. 여행 셋째 날 ' + nm(lead(A, B, C)[1]) + '이(가) 갑자기 "나는 그냥 쉬고 싶었는데"라고 말한다. 주도하는 쪽은 그 말이 어디서 왔는지 모른다.',
      p_mind: '한 사람이 카톡에 긴 문장을 보내고, 다른 사람이 "ㅇㅇ"라고 답한다. ' + (A.dmYin === B.dmYin ? '둘 다 같은 방식으로 감정을 처리해 그게 무례하다고 느끼지 않는다. 대신 둘 다 속에 쌓아 두다 같은 날 터진다.' : '드러내는 쪽은 그 두 글자에 밤새 상처받고, 삼키는 쪽은 뭐가 문제인지 진심으로 모른다.'),
      p_love: C.dayBranch.score >= 22 ? '피곤한 날 둘이 아무 말 없이 같은 소파에 앉아 있다. 어색하지 않다. 일지 관계가 좋은 조합은 침묵이 편하다. 이 편안함을 당연하게 여기는 순간부터 문제가 생긴다.' : '데이트가 끝나고 각자 집에 가는 길, 둘 다 "오늘 좋았는데 뭔가 피곤하다"고 느낀다. 일지가 부딛히는 조합은 끌림과 피로가 같이 온다. 같이 사는 걸 결정하기 전에 여행을 먼저 가 봐야 한다.',
      p_bond: '한 사람이 이직·이사 같은 큰 결정을 앞두고 있다. 다른 사람이 "내 생각엔…"이라고 말을 꺼낸다. ' + (C.yongsin.detail[0].have >= 30 || C.yongsin.detail[1].have >= 30 ? '그 말을 듣고 나면 머리가 맑아진다. 상대가 용신 기운을 채워 주는 사람이라 그렇다. 이 사람 옆에서 내린 결정은 대개 맞다.' : '그 말이 도움이 되지는 않는다. 나쁜 조언은 아닌데 내 것이 되지 않는다. 서로 채워 주는 기운이 약한 조합은 결정을 각자 해야 한다.'),
      p_money: (A.godCount.재성 + B.godCount.재성) === 0 ? '둘이 공동 통장을 만든다. 석 달 뒤 둘 다 잔고를 확인하지 않는다. 돈이 목표가 아닌 두 사람은 돈으로 싸우지 않지만, 어느 날 카드 대금 문자를 보고 동시에 놀란다.' : '한 사람이 "이거 투자하면 좋을 것 같아"라고 하고, 다른 사람은 "얼마나?"부터 묻는다. 보는 쪽과 안 보는 쪽이 갈리는 순간이다. ' + (C.relations.some(function (r) { return r.k === '파' || r.k === '해'; }) ? '파·해가 있는 조합은 이 대화가 세 번째쯤 반복될 때 판이 깨진다.' : '이 대화가 감정 싸움으로 안 가면 이 조합의 돈은 안전하다.'),
      p_biz: A.dmEl === B.dmEl ? '프로젝트 회의에서 둘이 같은 아이디어를 동시에 낸다. 처음엔 "우리 통했다"고 웃는데, 실행 단계에서 둘 다 기획만 하고 아무도 마감을 안 챈다. 일간 오행이 같은 조합의 전형적 장면이다.' : '한 사람이 판을 벌이고 다른 사람이 수습한다. 성과가 나면 벌인 쪽이 칭찬을 받고, 수습한 쪽은 "내가 없었으면…"이라고 속으로 생각한다. 역할 분담이 잘 된 조합일수록 공을 나누는 규칙이 필요하다.'
    };
    return A2[id] ? '\n**예를 들어**\n예를 들어, ' + A2[id] : '';
  }

  function pairRemedy(A, B, C, id) {
    var subs = Object.keys(C.sub).sort(function (x, y) { return C.sub[x] - C.sub[y]; });
    var L = [pairAnecdote(A, B, C, id), '', '**해결방안**'];
    var b = bad(C);
    switch (id) {
      case 'p_overall': L.push('- 주도하는 쪽(' + nm(lead(A, B, C)[0]) + ')은 결정 전에 상대 의견을 먼저 묻는 것을 규칙으로 하라. 맞춰 주는 쪽이 지치지 않게 하는 유일한 방법이다.'); L.push('- 월 1회, 둘의 관계에서 잘 된 것 하나와 고칠 것 하나만 말하는 시간을 정하라.'); break;
      case 'p_mind': L.push('- 싸움이 나면 먼저 말하는 사람을 정해 두라(' + (A.dmYin ? nm(B) : nm(A)) + ' — 드러내는 쪽이 먼저).'); L.push('- 속도가 다르면 빠른 쪽이 기다리는 게 아니라 느린 쪽이 마감을 말하라. "언제까지 답할게"가 다툼을 절반으로 줄인다.'); break;
      case 'p_love': L.push(b.some(function (r) { return r.p.indexOf('일지') >= 0; }) ? '- 일지에 마찰이 있다. 같이 살면 각자의 공간을 반드시 두고, 잠자리 시간이 다르면 억지로 맞추지 마라.' : '- 애정을 확인하려 시험하지 마라. 이 조합은 시험할수록 멀어진다.'); L.push('- 결혼을 생각하면 서로의 배우자성 대운 시기를 맞춰 보라. 둘 중 한쪽의 배우자성 대운에 결정하는 게 좋다.'); break;
      case 'p_bond': L.push('- 한쪽이 주는 구조라면 받는 쪽이 매달 한 번 구체적으로 고마움을 말하라. 이게 없으면 주는 쪽이 조용히 떠난다.'); L.push('- 둘 사이 문제를 제3자에게 먼저 말하지 마라. 비겁이 낀 관계는 밖에서 깨진다.'); break;
      case 'p_money': L.push('- 돈은 각자 관리하고 공동 지출만 합쳐라. 공동 계좌를 만들려면 한도를 정하고 둘 다 서명하는 규칙을 두라.'); L.push('- 보증·명의 대여·연대 대출은 서로 하지 않는다고 지금 약속하라. 관계가 좋을 때 정하는 규칙이 관계를 지킨다.'); break;
      case 'p_biz': L.push('- 역할표를 문서로 만들어 겹치는 일을 없애라. 결정권자는 한 명, 나머지는 의견.'); L.push('- 동업이면 잘될 때의 분배와 나갈 때의 조건을 먼저 계약서에 적어라. 못될 때는 어차피 싸우지 않는다.'); break;
      case 'p_pastlife': L.push('- 전생 이야기는 관계를 이해하는 틀로만 쓰고, 상대를 판단하는 무기로 쓰지 마라. "너는 전생에도 그랬다"는 말은 관계를 끝낸다.'); L.push('- 처음 만났을 때의 느낌(익숙함이든 경계심이든)을 기록해 두라. 관계가 흔들릴 때 그 첫 느낌이 기준점이 된다.'); break;
      case 'p_pastbond': L.push('- 같은 장면에서 같은 감정이 반복되면 멈추고 말하라: "이건 지금 일이 아니다." 그 한마디가 반복을 끊는다.'); L.push('- 위의 "각자의 숙제"를 한 문장으로 적어 서로 교환하라. 상대의 숙제를 대신 하려 하지 말고 자기 것만 하라.'); L.push('- 빚이 있는 관계라면 이기려 하지 말고 정리하는 쪽으로 방향을 잡아라. 정리는 끝내는 게 아니라 셈을 맞추는 것이다.'); break;
      default: L.push('- 가장 약한 ' + subs[0] + '(' + C.sub[subs[0]] + ')부터 손대라. 강점을 키우는 것보다 약점 하나를 막는 게 이 관계에선 빠르다.');
    }
    L.push('', '**힘이 되는 말**');
    var best = Object.keys(C.sub).sort(function (x, y) { return C.sub[y] - C.sub[x]; })[0];
    L.push(C.total >= 65 ? '이 조합은 구조가 받쳐 준다. ' + best + ' ' + C.sub[best] + '점은 노력해서 얻은 게 아니라 타고난 궁합이다. 그 위에 규칙만 얹으면 오래 간다.'
      : C.total >= 48 ? best + '이(가) ' + C.sub[best] + '점으로 이 관계의 기둥이다. 다른 게 흔들려도 이 기둥은 남는다. 여기서부터 다시 쌓으면 된다.'
        : '점수가 낮아도 ' + best + '(' + C.sub[best] + ')은 살아 있다. 모든 관계가 모든 걸 채울 필요는 없다. 이 관계가 줄 수 있는 것 하나를 정확히 알면 그걸로 충분하다.');
    return L.join('\n');
  }

  function groupRemedy(list, G, id) {
    var L = ['', '**해결방안**'];
    switch (id) {
      case 'g_field': L.push(G.missing.length ? '- 부족한 ' + G.missing.join('·') + ' 기운의 역할(' + G.missing.map(function (e) { return S.ROLE_BY_EL[EL.indexOf(e)].name; }).join('·') + ')을 외부 사람이나 도구로 채워라. 안에서 억지로 채우면 그 사람이 먼저 지친다.' : '- 기운이 고르니 역할을 고정하라. 흐려지면 서로 남 탓을 한다.'); if (G.over.length) L.push('- 넘치는 ' + G.over.join('·') + ' 기운은 규칙으로 눌러라. 결정 기한과 예산 한도를 숫자로 정해 두라.'); break;
      case 'g_map': L.push('- 최저 쌍(' + G.worst.a + '↔' + G.worst.b + ')은 둘만 두지 마라. 반드시 제3자와 함께 붙여라.'); L.push('- 최고 쌍(' + G.best.a + '↔' + G.best.b + ')이 뭉치면 소외되는 사람이 생긴다. 그 사람에게 따로 역할을 주라.'); break;
      case 'g_love': L.push('- 연인으로 묶인 쌍이 생기면 팀 안의 다른 사람에게 미리 알려라. 숨기면 삼각구도가 판을 깨뜬다.'); break;
      case 'g_team': L.push('- 리더는 한 명, 결정은 리더가, 나머지는 의견까지만. 이 원칙을 첫날 문서로 만들어라.'); L.push('- 각자 "맡기면 안 되는 자리"에 절대 앉히지 마라. 잘하는 걸 더 잘하게 하는 게 이 팀의 성장 방식이다.'); break;
      case 'g_drive': L.push('- 마무리 담당을 지정하라. ' + (G.merged[3] / (G.merged.reduce(function (a, b) { return a + b; }, 0) || 1) < 0.2 ? '金 기운이 약해 저절로 끝나는 일이 없다. 마감을 사람에게 붙여라.' : '벌인 일의 끝을 보는 사람이 있으니 그 사람에게 마감 권한을 주라.')); L.push('- 분기마다 하는 일을 반으로 줄여라. 이 팀은 덜 벌이는 게 성과다.'); break;
      case 'g_risk': L.push('- 뇌관 쌍 사이에 문제가 생기면 48시간 안에 제3자가 낀 자리에서 풀어라. 미루면 편이 갈린다.'); L.push('- 돈은 한 사람이 관리하고 월 1회 전체 공개. 숨기는 순간 신뢰가 아니라 의심이 쌓인다.'); break;
      default: L.push('- 가장 약한 쌍부터 규칙을 만들어라.');
    }
    L.push('', '**힘이 되는 말**');
    var tot = G.merged.reduce(function (a, b) { return a + b; }, 0) || 1, m = 0;
    for (var k = 1; k < 5; k++) if (G.merged[k] > G.merged[m]) m = k;
    L.push('이 조합에는 ' + EL[m] + ' 기운이 ' + Math.round(G.merged[m] / tot * 100) + '%로 뚜렷하다. ' + {
      목: '새 판을 벌이는 힘이 있는 팀이다. 시작하는 팀은 드물다.', 화: '사람을 모으고 열을 내는 팀이다. 이 열기는 만들어서 되는 게 아니다.',
      토: '흔들리지 않는 팀이다. 오래 가는 팀은 결국 이런 팀이다.', 금: '끝을 보는 팀이다. 마무리 잘하는 팀은 신뢰를 산다.', 수: '흐름을 읽는 팀이다. 남들이 헤맬 때 이 팀은 방향을 안다.'
    }[EL[m]] + ' 평균 ' + G.avg + '점은 출발점이다. 위의 규칙을 지키면 점수는 올라간다.');
    return L.join('\n');
  }

  /* ---------- 공개 ---------- */
  global.Rules = {
    solo: function (R, id) { try { return SOLO[id] ? SOLO[id](R) + '\n' + soloRemedy(R, id) : ''; } catch (e) { return ''; } },
    pair: function (A, B, C, id) { try { return PAIR[id] ? PAIR[id](A, B, C) + '\n' + pairRemedy(A, B, C, id) : ''; } catch (e) { return ''; } },
    group: function (list, G, id) { try { return GROUP[id] ? GROUP[id](list, G) + '\n' + groupRemedy(list, G, id) : ''; } catch (e) { return ''; } }
  };
})(typeof window !== 'undefined' ? window : this);
