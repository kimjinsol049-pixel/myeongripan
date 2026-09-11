/* ============================================================
   신살(神煞) — 길성·흉살 판정과 뜻
   지지 index: 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11
   천간 index: 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9
   kind: 길 = 도움이 되는 별, 흉 = 조심할 별, 중 = 쓰기 나름
   ============================================================ */
(function (global) {
  'use strict';

  var TAGS = ['년', '월', '일', '시'];
  var YUK = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];        // 육합 짝
  var GEONROK = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];            // 일간별 건록
  var JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];          // 일간별 장생(=학당귀인)
  var MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];           // 일간별 문창
  var CHEONEUL = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
  var YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };            // 양간만
  var HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];           // 일간별 홍염
  var NAKJEONG = [5, 0, 8, 10, 3, 5, 0, 8, 10, 3];          // 일간별 낙정관살
  var TAEGEUK = [[0, 6], [0, 6], [3, 9], [3, 9], [4, 10, 1, 7], [4, 10, 1, 7], [2, 11], [2, 11], [5, 8], [5, 8]];

  // 십이신살 — 년지(또는 일지) 삼합국의 묘지 다음 글자부터 차례로
  var TWELVE = ['겁살', '재살', '천살', '지살', '년살', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살'];
  var GEOP_START = [5, 11, 2, 8]; // 신자진→巳, 인오술→亥, 사유축→寅, 해묘미→申
  function samhapGroup(b) {
    if ([8, 0, 4].indexOf(b) >= 0) return 0;
    if ([2, 6, 10].indexOf(b) >= 0) return 1;
    if ([5, 9, 1].indexOf(b) >= 0) return 2;
    return 3;
  }
  // 천덕귀인 — 월지별. 천간이면 s, 지지면 b
  var CHEONDEOK = { 2: { s: 3 }, 3: { b: 8 }, 4: { s: 8 }, 5: { s: 7 }, 6: { b: 11 }, 7: { s: 0 },
    8: { s: 9 }, 9: { b: 2 }, 10: { s: 2 }, 11: { s: 1 }, 0: { b: 5 }, 1: { s: 6 } };
  // 월덕귀인 — 월지 삼합국별 천간
  var WOLDEOK = [8, 2, 6, 0]; // 신자진→壬, 인오술→丙, 사유축→庚, 해묘미→甲
  // 고신·과숙 — 년지 방합별
  function gosinGwasuk(yb) {
    if ([11, 0, 1].indexOf(yb) >= 0) return { go: 2, gwa: 10 };
    if ([2, 3, 4].indexOf(yb) >= 0) return { go: 5, gwa: 1 };
    if ([5, 6, 7].indexOf(yb) >= 0) return { go: 8, gwa: 4 };
    return { go: 11, gwa: 7 };
  }
  // 급각살 — 월지 계절별
  function geupgak(mb) {
    if ([2, 3, 4].indexOf(mb) >= 0) return [11, 0];
    if ([5, 6, 7].indexOf(mb) >= 0) return [3, 7];
    if ([8, 9, 10].indexOf(mb) >= 0) return [2, 10];
    return [1, 4];
  }
  var DANGYO = { 2: 2, 3: 3, 4: 8, 5: 1, 6: 10, 7: 9, 8: 4, 9: 5, 10: 6, 11: 7, 0: 11, 1: 0 };
  // 천사일 — 월지 계절별 일주
  function cheonsa(mb) {
    if ([2, 3, 4].indexOf(mb) >= 0) return [4, 2];   // 戊寅
    if ([5, 6, 7].indexOf(mb) >= 0) return [0, 6];   // 甲午
    if ([8, 9, 10].indexOf(mb) >= 0) return [4, 8];  // 戊申
    return [0, 0];                                    // 甲子
  }

  var PAIR = {
    원진: [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]],
    귀문관살: [[0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10]]
  };
  var GWAEGANG = [[6, 4], [6, 10], [8, 4], [4, 10]];              // 庚辰 庚戌 壬辰 戊戌
  var BAEKHO = [[0, 4], [1, 7], [2, 10], [3, 1], [4, 4], [8, 10], [9, 1]];
  var GORAN = [[0, 2], [1, 5], [3, 5], [4, 8], [7, 11]];          // 甲寅 乙巳 丁巳 戊申 辛亥
  var CHACHAK = [[2, 0], [2, 6], [3, 1], [3, 7], [4, 2], [4, 8], [7, 3], [7, 9], [8, 4], [8, 10], [9, 5], [9, 11]];
  var SAMGI = [
    { name: '천상삼기', stems: [0, 4, 6], desc: '甲戊庚. 하늘의 세 기운. 큰 뜻과 비범한 재능, 위기에서 귀인이 붙는다.' },
    { name: '지하삼기', stems: [1, 2, 3], desc: '乙丙丁. 땅의 세 기운. 총명하고 예술·학문에서 이름을 낸다.' },
    { name: '인중삼기', stems: [8, 9, 7], desc: '壬癸辛. 사람의 세 기운. 속이 깊고 전략에 능하다.' }
  ];

  var DESC = {
    // ── 길성 ──
    천을귀인: '가장 강한 길성. 막히면 사람이 나타나 풀어 준다. 흉한 일도 절반으로 줄인다.',
    천덕귀인: '하늘이 덕을 베푸는 자리. 위기에서 저절로 길이 열리고 남의 원망을 덜 산다.',
    월덕귀인: '달의 덕. 조상과 어머니 쪽 음덕이 있고, 큰 사고를 피해 간다.',
    문창귀인: '글과 시험의 별. 머리가 맑고 배운 것을 잘 써먹는다. 학업·자격·글쓰기에 유리하다.',
    문곡귀인: '숨은 재주의 별. 문창이 드러난 재주라면 이쪽은 깊이 파는 재주다. 연구·기술·예술.',
    학당귀인: '배움의 자리. 가르치고 배우는 일에 인연이 깊다. 스승 복이 있다.',
    태극귀인: '시작과 끝을 관장하는 별. 한 분야를 끝까지 파면 크게 이룬다. 종교·역학과도 인연.',
    금여: '금 수레. 배우자 복과 재물 복. 좋은 인연을 만나고 말년이 편하다.',
    암록: '숨은 녹봉. 드러나지 않는 도움이 있어 굶지 않는다. 어려울 때 뜻밖의 지원이 온다.',
    천의성: '활인성. 남을 살리는 별. 의료·상담·종교·복지에서 힘을 쓴다.',
    반안살: '말 안장. 윗사람의 후원으로 편하게 올라탄다. 승진과 출세의 자리.',
    장성살: '우두머리 자리. 강하게 밀어붙이고 굽히지 않는다. 조직을 이끄는 힘.',
    천사일: '하늘이 사면하는 날. 큰 잘못도 용서받고, 병과 재난이 풀린다.',
    // ── 중립 ──
    도화살: '이성에게 눈에 띄는 별. 매력과 인기가 따르지만 구설과 삼각관계도 같이 온다. 연예·영업·서비스에서는 무기다.',
    역마살: '움직이는 별. 이동·이사·해외·출장이 잦다. 한곳에 묶이면 답답해진다. 무역·운수·영업과 맞는다.',
    화개살: '덮개의 별. 종교·예술·학문·고독. 화려함 뒤의 쓸쓸함이 있고, 혼자 있는 시간이 필요하다.',
    지살: '움직임의 시작. 이사·여행·홍보. 역마의 순한 버전이다.',
    홍염살: '은근한 매력의 별. 도화가 드러난 매력이라면 이쪽은 스며드는 매력이다. 외도의 빌미가 되기도 한다.',
    현침살: '바늘처럼 뾰족한 글자(甲辛卯午申). 말이 날카롭고 손재주가 정교하다. 의료·미용·바느질·금속에 맞고, 말로 사람을 벤다.',
    // ── 흉살 ──
    양인살: '칼날의 별. 추진력과 결단이 최고지만 그 칼에 자기가 베인다. 극단으로 치닫기 쉽다. 칼을 쓰는 직업(의료·군경·요리·기술)이면 오히려 밥이 된다.',
    비인살: '양인의 반대편. 숨은 칼. 갑작스러운 사고와 수술, 급한 성질. 평소엔 안 보이다가 한 번에 터진다.',
    괴강살: '우두머리의 기질. 극단적으로 강하고 결벽하다. 크게 되거나 크게 꺾인다. 중간이 없고 남에게 지는 걸 못 견딘다.',
    백호대살: '피를 보는 별. 사고·수술·출혈. 조상 중에 비명횡사가 있다고도 본다. 대신 기가 세서 험한 일을 감당하고 큰일을 한다.',
    겁살: '빼앗기는 자리. 내 의지와 무관하게 잃는다. 도난·사기·강탈.',
    재살: '수옥살. 갇히고 묶인다. 송사·구설·감금. 규칙을 어기면 크게 걸린다.',
    천살: '하늘이 내리는 재앙. 사람 힘으로 못 막는 일. 윗사람·부모와의 갈등.',
    년살: '도화와 같은 자리. 이성 문제와 구설.',
    월살: '고초살. 메마르고 막힌다. 일이 더디고 결실이 늦다.',
    망신살: '드러나는 자리. 감추던 것이 밖으로 나온다. 체면 손상과 구설.',
    육해살: '발목 잡히는 자리. 일이 자꾸 늦어지고 몸이 약해진다.',
    원진살: '까닭 없이 미운 관계. 이유를 대기 어려운 짜증과 원망이 쌓인다. 가족이나 배우자 자리에 있으면 한집에서 서로 피곤하다.',
    귀문관살: '신경이 예민해지는 살. 직감이 날카롭고 촉이 좋지만, 집착과 불면·강박으로 간다.',
    고신살: '홀아비 살. 배우자와 떨어져 지내거나 혼자 있는 시간이 길다.',
    과숙살: '과부 살. 외로움의 별. 인연이 늦거나 헤어져 지내는 일이 있다.',
    급각살: '다치는 살. 뼈·관절·다리를 다친다. 어릴 때 잔병치레.',
    단교관살: '끊어지는 살. 넘어지고 부러진다. 급각살과 같이 있으면 더 강하다.',
    탕화살: '끓는 물과 불의 살(寅午丑). 화상·음독·중독·비관. 극단적 생각을 조심해야 한다.',
    낙정관살: '우물에 빠지는 살. 물가·구덩이·함정. 방심하다 걸려 넘어진다.',
    천라지망: '하늘 그물과 땅 그물(戌亥·辰巳). 갇히고 막히는 구조. 종교·의료·수사·교도 계통이면 오히려 쓴다.',
    고란살: '외로운 난초. 배우자가 있어도 혼자인 느낌. 독립적이고 스스로 벌어먹는다.',
    음양차착살: '어긋나는 살. 배우자 인연이 어긋나고 처가·시가와 거리가 생긴다.',
    공망: '비어 있는 자리. 그 자리가 뜻하는 영역은 채워도 허전하다. 대신 종교·학문 쪽에서는 오히려 깊어진다.'
  };

  function push(out, name, kind, tag) {
    var f = out.filter(function (x) { return x.name === name; })[0];
    if (f) { if (tag && f.where.indexOf(tag) < 0) f.where.push(tag); return; }
    out.push({ name: name, kind: kind, where: tag ? [tag] : [], desc: DESC[name] || '' });
  }
  function hasPair(list, a, b) {
    return list.some(function (p) {
      return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a);
    });
  }

  /**
   * @param {Array} P 분석에 쓰는 기둥들 (시주를 모르면 3개)
   * @param {Array} gongmang 공망 지지 2개
   */
  function detect(P, gongmang) {
    var out = [];
    var dm = P[2].s, dayB = P[2].b, yearB = P[0].b, monthB = P[1].b;
    var branches = P.map(function (p) { return p.b; });
    var stems = P.map(function (p) { return p.s; });

    // ── 일간 기준 길성 ──
    branches.forEach(function (b, i) {
      var tag = TAGS[i] + '지';
      if (CHEONEUL[dm].indexOf(b) >= 0) push(out, '천을귀인', '길', tag);
      if (MUNCHANG[dm] === b) push(out, '문창귀인', '길', tag);
      if (YUK[MUNCHANG[dm]] === b) push(out, '문곡귀인', '길', tag);
      if (JANGSAENG[dm] === b) push(out, '학당귀인', '길', tag);
      if ((GEONROK[dm] + 2) % 12 === b) push(out, '금여', '길', tag);
      if (YUK[GEONROK[dm]] === b) push(out, '암록', '길', tag);
      if (TAEGEUK[dm].indexOf(b) >= 0) push(out, '태극귀인', '길', tag);
      if ((monthB + 11) % 12 === b) push(out, '천의성', '길', tag);
      if (YANGIN[dm] === b) push(out, '양인살', '흉', tag);
      if (YANGIN[dm] !== undefined && (YANGIN[dm] + 6) % 12 === b) push(out, '비인살', '흉', tag);
      if (HONGYEOM[dm] === b) push(out, '홍염살', '중', tag);
      if (NAKJEONG[dm] === b) push(out, '낙정관살', '흉', tag);
    });

    // ── 천덕·월덕 ──
    var cd = CHEONDEOK[monthB];
    if (cd) {
      if (cd.s !== undefined) stems.forEach(function (s, i) { if (s === cd.s) push(out, '천덕귀인', '길', TAGS[i] + '간'); });
      if (cd.b !== undefined) branches.forEach(function (b, i) { if (b === cd.b) push(out, '천덕귀인', '길', TAGS[i] + '지'); });
    }
    var wd = WOLDEOK[samhapGroup(monthB)];
    stems.forEach(function (s, i) { if (s === wd) push(out, '월덕귀인', '길', TAGS[i] + '간'); });

    // ── 십이신살 (년지와 일지 둘 다 기준으로 본다) ──
    [yearB, dayB].forEach(function (base) {
      var start = GEOP_START[samhapGroup(base)];
      branches.forEach(function (b, i) {
        var name = TWELVE[((b - start) % 12 + 12) % 12];
        if (name === '년살') { push(out, '도화살', '중', TAGS[i] + '지'); return; }
        var kind = ['반안살', '장성살'].indexOf(name) >= 0 ? '길'
          : ['역마살', '화개살', '지살'].indexOf(name) >= 0 ? '중' : '흉';
        push(out, name, kind, TAGS[i] + '지');
      });
    });

    // ── 년지 기준 고신·과숙 ──
    var gg = gosinGwasuk(yearB);
    branches.forEach(function (b, i) {
      if (b === gg.go) push(out, '고신살', '흉', TAGS[i] + '지');
      if (b === gg.gwa) push(out, '과숙살', '흉', TAGS[i] + '지');
    });

    // ── 월지 기준 급각·단교 ──
    var gk = geupgak(monthB);
    branches.forEach(function (b, i) {
      if (gk.indexOf(b) >= 0) push(out, '급각살', '흉', TAGS[i] + '지');
      if (DANGYO[monthB] === b) push(out, '단교관살', '흉', TAGS[i] + '지');
    });

    // ── 글자 자체로 보는 살 ──
    branches.forEach(function (b, i) {
      if ([2, 6, 1].indexOf(b) >= 0) push(out, '탕화살', '흉', TAGS[i] + '지');
      if ([3, 6, 8].indexOf(b) >= 0) push(out, '현침살', '중', TAGS[i] + '지');
    });
    stems.forEach(function (s, i) {
      if ([0, 7].indexOf(s) >= 0) push(out, '현침살', '중', TAGS[i] + '간');
    });

    // ── 지지 쌍으로 보는 살 ──
    for (var i = 0; i < branches.length; i++) for (var j = i + 1; j < branches.length; j++) {
      if (hasPair(PAIR.원진, branches[i], branches[j])) push(out, '원진살', '흉', TAGS[i] + '지·' + TAGS[j] + '지');
      if (hasPair(PAIR.귀문관살, branches[i], branches[j])) push(out, '귀문관살', '흉', TAGS[i] + '지·' + TAGS[j] + '지');
    }
    var hasCheonra = branches.indexOf(10) >= 0 && branches.indexOf(11) >= 0;
    var hasJimang = branches.indexOf(4) >= 0 && branches.indexOf(5) >= 0;
    if (hasCheonra || hasJimang) push(out, '천라지망', '흉', hasCheonra ? '戌亥 천라' : '辰巳 지망');

    // ── 일주·기둥으로 보는 살 ──
    P.forEach(function (p, i) {
      var tag = TAGS[i] + '주';
      if (GWAEGANG.some(function (g) { return g[0] === p.s && g[1] === p.b; }) && i === 2) push(out, '괴강살', '흉', tag);
      if (BAEKHO.some(function (g) { return g[0] === p.s && g[1] === p.b; })) push(out, '백호대살', '흉', tag);
      if (GORAN.some(function (g) { return g[0] === p.s && g[1] === p.b; }) && i === 2) push(out, '고란살', '흉', tag);
      if (CHACHAK.some(function (g) { return g[0] === p.s && g[1] === p.b; }) && (i === 2 || i === 3)) push(out, '음양차착살', '흉', tag);
    });
    var cs = cheonsa(monthB);
    if (P[2].s === cs[0] && P[2].b === cs[1]) push(out, '천사일', '길', '일주');

    // ── 삼기귀인 (천간 3개가 모두 있을 때) ──
    SAMGI.forEach(function (g) {
      if (g.stems.every(function (s) { return stems.indexOf(s) >= 0; })) {
        out.push({ name: g.name, kind: '길', where: ['천간'], desc: g.desc });
      }
    });

    // ── 공망 ──
    if (gongmang) branches.forEach(function (b, i) {
      if (gongmang.indexOf(b) >= 0) push(out, '공망', '흉', TAGS[i] + '지');
    });

    var order = { 길: 0, 중: 1, 흉: 2 };
    out.sort(function (a, b) { return order[a.kind] - order[b.kind] || a.name.localeCompare(b.name); });
    return out;
  }

  global.Shinsal = { detect: detect, DESC: DESC };
})(typeof window !== 'undefined' ? window : this);
