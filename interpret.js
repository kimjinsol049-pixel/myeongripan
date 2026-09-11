/* ============================================================
   해석 프롬프트 빌더
   계산 엔진의 결과를 Claude가 읽을 수 있는 명식 브리프로 바꾸고,
   항목별 프롬프트를 조립한다.
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Saju;

  var VOICE = [
    '너는 30년 경력의 사주명리 상담가다. 아래 규칙을 어기지 마라.',
    '',
    '[말투]',
    '- 직설적으로 단정해서 말한다. "~할 수도 있습니다", "~인 경향이 있습니다", "개인차가 있습니다" 같은 회피 표현 금지.',
    '- 쿠션어 금지. "물론", "다만 너무 걱정하지 마세요", "긍정적으로 보면" 같은 완충 문구를 쓰지 마라.',
    '- 나쁜 건 나쁘다고 말한다. 약점은 약점이라고 정확히 짚고, 그게 현실에서 어떤 장면으로 나타나는지 예를 들어라.',
    '- 좋은 것도 근거를 대고 말한다. 근거 없는 칭찬 금지.',
    '- 문장은 짧고 힘 있게. 해요체 말고 반말도 말고, "~다 / ~한다" 체로 쓴다.',
    '- 마지막에 "재미로 보세요", "참고만 하세요" 같은 면책 문구를 붙이지 마라. 그건 페이지가 따로 안내한다.',
    '',
    '[내용]',
    '- 반드시 아래 명식 데이터를 근거로 말한다. 어떤 글자/합충/십신 때문에 그런지 본문에 자연스럽게 섞어라.',
    '- 일반론(별자리 운세 같은 말)은 쓰지 마라. 이 사람에게만 해당하는 이야기를 써라.',
    '- 각 항목은 충분히 길게 쓴다. 요약하지 말고 끝까지 풀어써라.',
    '- 현실 장면으로 번역해라. "재물운이 좋다"가 아니라 "어떤 방식으로 돈이 들어오고 어디서 새는지"를 쓴다.',
    '- 사주 용어(격국·용신·비겁·식상·관성 등)를 처음 쓰는 자리에서는 괄호로 다섯 글자 안팎의 뜻을 한 번 달아라. 예: "관성(직장과 규율)". 같은 용어를 두 번째 쓸 때는 달지 않는다.',
    '- 각 항목에는 "예를 들어,"로 시작하는 짧은 일화(3~5문장)를 하나 넣어라. 이 사람(들)이 실제로 겪을 법한 구체적인 장면 — 장소·상황·주고받는 말이 들어가야 한다. 실제 있었던 일이라고 단정하지 말고 "이런 장면이 반복된다"는 전형적 장면으로 쓴다. 일화는 해결방안 블록 바로 앞에 둔다.',
    '- 각 항목의 끝에는 반드시 두 블록을 붙인다.',
    '  첫째, "**해결방안**": 이 항목에서 짚은 약점·위험을 줄이는 구체적 행동 2~4가지를 "- "로 시작하는 명령문 리스트로 쓴다. 추상적인 조언("노력하라") 금지. 언제·무엇을·어떻게가 들어가야 한다.',
    '  둘째, "**힘이 되는 말**": 이 사람의 명식에 실제로 있는 강점에서 끌어낸 긍정적인 한두 문장. 빈말 위로가 아니라 "당신에게는 이 무기가 있다"는 근거 있는 말이어야 한다. 이 블록은 항목의 마지막이다.',
    '',
    '[형식]',
    '- 마크다운으로 쓴다. 항목 제목은 "## 제목" 한 줄로 시작한다.',
    '- 소제목은 "**굵게**" 한 줄로. 리스트는 해결방안 블록과 꼭 필요할 때만.',
    '- 표를 쓰지 마라. 이모지를 쓰지 마라.',
    '- 지정된 항목만 쓰고, 요청하지 않은 항목이나 총정리 문단을 덧붙이지 마라.'
  ].join('\n');

  function pillarLine(p, label) {
    var hid = p.hidden.map(function (h, i) { return S.STEM_H[h] + '(' + p.hiddenGods[i] + ')'; }).join(' ');
    return label + ': ' + S.STEM_H[p.s] + S.BRANCH_H[p.b] + ' (' + S.STEM[p.s] + S.BRANCH[p.b] + ') / ' +
      '천간 ' + S.STEM_H[p.s] + '=' + S.EL[S.STEM_EL[p.s]] + '·' + p.stemGod +
      ' / 지지 ' + S.BRANCH_H[p.b] + '=' + S.EL[S.BRANCH_EL[p.b]] + '·' + p.branchGod +
      ' / 지장간 ' + hid + ' / 십이운성 ' + p.stage;
  }

  function pct(v, tot) { return Math.round(v / tot * 100); }

  /** 한 사람의 명식을 텍스트 브리프로 */
  function brief(R) {
    var i = R.input;
    var tot = R.scores.reduce(function (a, b) { return a + b; }, 0) || 1;
    var L = [];
    L.push('[' + (i.name || '본인') + ' 명식]');
    L.push('성별: ' + (i.gender === 'M' ? '남자' : '여자'));
    L.push('양력 생일: ' + R.solar.y + '년 ' + R.solar.m + '월 ' + R.solar.d + '일' +
      (R.unknownTime ? ' (출생시각 모름 — 시주는 무시하고 해석할 것)'
        : ' ' + pad(i.hour) + ':' + pad(i.minute || 0)));
    if (R.lunar) L.push('음력 생일: ' + R.lunar.y + '년 ' + (R.lunar.leap ? '윤' : '') + R.lunar.m + '월 ' + R.lunar.d + '일');
    L.push('사주 기준 연도(입춘 기준): ' + R.sajuYear + '년, 띠: ' + R.zodiac);
    L.push('');
    L.push('사주 원국');
    L.push(pillarLine(R.pillars[0], '  년주'));
    L.push(pillarLine(R.pillars[1], '  월주'));
    L.push(pillarLine(R.pillars[2], '  일주') + '  ← 일간 ' + S.STEM_H[R.dm] + '(' + S.EL[R.dmEl] + ', ' + (R.dmYin ? '음' : '양') + ')이 이 사람 자신');
    if (R.unknownTime) L.push('  시주: 불명 (아래 시주 글자는 정오 기준 임시값이니 해석에 쓰지 말 것)');
    L.push(pillarLine(R.pillars[3], '  시주'));
    L.push('');
    L.push('오행 세력: ' +
      S.EL.map(function (e, k) { return e + ' ' + pct(R.scores[k], tot) + '%'; }).join(' / '));
    L.push('십신 분포(개수): ' +
      Object.keys(R.godCount).map(function (k) { return k + ' ' + R.godCount[k]; }).join(' / '));
    L.push('일간 강약: ' + R.strength.label + ' (신강도 ' + Math.round(R.strength.pct) + '/100, ' +
      (R.strength.deukryeong ? '월령 득령' : '월령 실령') + ')');
    L.push('격국: ' + R.gyeok);
    L.push('용신(억부+조후): ' + S.EL[R.yongsin.main] +
      (R.yongsin.sub >= 0 ? ' / 희신 ' + S.EL[R.yongsin.sub] : '') +
      (R.yongsin.johu >= 0 ? ' / 조후용신 ' + S.EL[R.yongsin.johu] : '') +
      ' · 기신 ' + S.EL[R.yongsin.gi]);
    L.push('공망: ' + R.gongmang.map(function (b) { return S.BRANCH_H[b]; }).join('') +
      ' (해당 자리는 채워도 비는 자리)');
    var ss = R.shinsalAll || [];
    if (ss.length) {
      ['길', '중', '흉'].forEach(function (k) {
        var g = ss.filter(function (s) { return s.kind === k; });
        if (g.length) L.push(({ 길: '길성', 중: '중립 신살', 흉: '흉살' })[k] + ': ' +
          g.map(function (s) { return s.name + (s.where.length ? '(' + s.where.join('·') + ')' : ''); }).join(', '));
      });
      L.push('※ 위 신살의 뜻: ' + ss.slice(0, 14).map(function (s) { return s.name + '=' + s.desc.split('.')[0]; }).join(' / '));
    } else {
      L.push('신살: 두드러진 신살 없음');
    }
    if (R.relations.length) {
      L.push('원국 내부 관계: ' + R.relations.map(function (r) { return r.a + '·' + r.b + ' ' + r.text; }).join(' / '));
    } else {
      L.push('원국 내부 관계: 합충형해파 없음 (글자들이 서로 간섭하지 않음)');
    }
    L.push('대운: ' + (R.daewoon.forward ? '순행' : '역행') + ', 대운수 ' + R.daewoon.num +
      ' → ' + R.daewoon.list.slice(0, 7).map(function (d) {
        return d.age + '세 ' + S.STEM_H[d.s] + S.BRANCH_H[d.b];
      }).join(', '));
    var nowY = new Date().getFullYear();
    var cur = null;
    for (var k = R.daewoon.list.length - 1; k >= 0; k--) {
      if (nowY >= R.daewoon.list[k].year) { cur = R.daewoon.list[k]; break; }
    }
    if (cur) L.push('현재 대운(' + nowY + '년 기준): ' + S.STEM_H[cur.s] + S.BRANCH_H[cur.b] +
      ' (' + cur.age + '세부터) — 천간 ' + S.tenGod(R.dm, cur.s) + ', 지지 본기 ' +
      S.tenGod(R.dm, S.HIDDEN[cur.b][S.HIDDEN[cur.b].length - 1][0]));
    return L.join('\n');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- 개인 사주 항목 ---------- */
  var SOLO_SECTIONS = [
    { id: 'overall', title: '전체 총평', el: 2 },
    { id: 'mind', title: '심리와 성향', el: 4 },
    { id: 'wealth', title: '재물운', el: 3 },
    { id: 'money', title: '금전운', el: 3 },
    { id: 'biz', title: '사업운', el: 1 },
    { id: 'job', title: '직업운', el: 0 },
    { id: 'bond', title: '인연운', el: 0 },
    { id: 'love', title: '연애·결혼운', el: 1 },
    { id: 'past', title: '전생의 모습', el: 4 },
    { id: 'pastbond', title: '전생의 인연', el: 4 }
  ];

  var SOLO_SPEC = {
    overall: '이 사람이 어떤 사람인지 전체를 한 번에 잡아준다. 일간의 물상(예: 甲은 곧게 뻗는 큰 나무, 癸는 스며드는 물)으로 시작해 월령·격국·강약이 만들어낸 기본 골격, 인생이 어느 방향으로 굴러가게 설계되어 있는지, 타고난 가장 큰 무기 하나와 가장 큰 약점 하나를 못 박아라. 현재 대운이 이 사람을 어느 쪽으로 밀고 있는지도 반드시 포함한다. 1200자 이상.',
    mind: '겉으로 보이는 모습과 속에 있는 모습이 어떻게 다른지. 화가 나는 지점, 무너지는 지점, 혼자 있을 때의 상태, 스트레스를 처리하는 방식. 오행 편중과 십신 구성이 만드는 사고 습관과 감정 패턴을 구체적으로 짚어라. 이 사람이 자기 자신에 대해 착각하고 있을 법한 것도 하나 지적한다. 1000자 이상.',
    wealth: '재성(정재·편재)의 유무와 위치, 강약으로 재물 그릇의 크기와 모양을 판정한다. 돈이 어떤 경로로 들어오는지(월급형/사업형/투자형/무형자산형), 자산이 쌓이는 구조인지 흘러나가는 구조인지, 재물이 터지는 대운 시기를 짚는다. 재성이 없거나 공망이면 없다고 분명히 말하고 대안 경로를 제시한다. 900자 이상.',
    money: '재물운이 자산 얘기라면 이건 현금 흐름 얘기다. 돈 쓰는 습관, 새는 구멍, 빚과 보증에 대한 태도, 충동 지출의 방아쇠, 남에게 돈 빌려주는 패턴. 식상→재성 흐름이 뚫려 있는지로 수입의 지속성을 판정한다. 돈 문제로 사고가 나기 쉬운 시기와 상황을 구체적으로 지목한다. 800자 이상.',
    biz: '독립·창업에 맞는 사주인지 아닌지를 먼저 단정한다. 맞으면 어떤 업종·규모·동업 형태가 맞는지, 안 맞으면 왜 안 맞는지와 그래도 하겠다면 반드시 갖춰야 할 조건을 말한다. 식상·재성·관성의 흐름, 비겁의 세기(동업자·경쟁자 문제)로 판단하고, 창업 적기 대운을 짚는다. 900자 이상.',
    job: '조직 안에서의 적성. 어떤 직군·직무에서 살고 어떤 자리에서 죽는지. 상사·조직과의 관계(관성), 자기표현 욕구(식상), 전문성 축적(인성)의 균형으로 판정한다. 구체적 직업군을 최소 5개 이상 실명으로 제시하고, 반대로 절대 오래 못 버틸 환경도 명시한다. 900자 이상.',
    bond: '사람이 어떻게 붙고 어떻게 떨어지는지. 도움이 되는 사람의 유형과 해가 되는 사람의 유형을 오행·십신으로 특정한다. 귀인이 들어오는 자리(천을귀인·인성), 사람 때문에 돈과 시간을 잃는 구조(비겁·겁재), 가족·형제 관계의 온도. 인간관계에서 반복되는 패턴 하나를 정확히 지목한다. 900자 이상.',
    love: '연애할 때의 실제 행동, 끌리는 상대의 유형, 관계가 깨지는 지점. 남자는 재성, 여자는 관성이 배우자성이니 그 상태(유무·강약·합충·공망)로 배우자운을 판정한다. 일지(배우자 자리)의 글자와 그 충형 여부를 반드시 해석한다. 결혼 시기, 결혼 후 달라지는 점, 이 사람이 관계에서 반드시 고쳐야 할 것 하나를 못 박는다. 1100자 이상.',
    past: '전생을 명식으로 읽는다. 일주의 물상과 십이운성(특히 일지의 단계), 화개·공망·인성의 상태로 전생의 신분·직업·살던 환경·죽음의 결을 하나의 장면처럼 묘사한다. 그 전생이 이번 생에 남긴 흔적(재능, 두려움, 반복되는 상황)을 구체적으로 연결한다. 소설처럼 쓰되 반드시 명식 근거를 문장 안에 넣어라. 900자 이상.',
    pastbond: '전생에서 이어져 온 인연을 읽는다. 공망 자리, 일지와 월지의 합충, 도화·홍염·화개, 배우자성의 상태로 "이번 생에 다시 만나기로 되어 있는 사람"의 결을 묘사한다. 갚아야 할 빚 같은 인연과 받으러 온 인연을 구분해서 말하고, 그 인연이 어떤 상황에서 나타나는지(첫 만남의 장소와 첫 대화, 알아보는 신호) 장면으로 그린다. 그 인연을 만났을 때 하지 말아야 할 행동 하나를 못 박는다. 1000자 이상.'
  };

  /* ---------- 궁합 항목 ---------- */
  var PAIR_SECTIONS = [
    { id: 'p_overall', title: '두 사람의 기본 구도', el: 2 },
    { id: 'p_mind', title: '심리와 성향의 충돌·조화', el: 4 },
    { id: 'p_love', title: '연애·결혼운', el: 1 },
    { id: 'p_bond', title: '인연운', el: 0 },
    { id: 'p_money', title: '재물운·금전운', el: 3 },
    { id: 'p_biz', title: '사업운·직업운·협업', el: 1 },
    { id: 'p_pastlife', title: '전생의 모습', el: 4 },
    { id: 'p_pastbond', title: '전생의 인연', el: 4 },
    { id: 'p_verdict', title: '결론과 사용법', el: 3 }
  ];

  var PAIR_SPEC = {
    p_overall: '두 사람의 일간 관계, 일지 관계, 오행 보완 구조로 이 관계의 기본 골격을 판정한다. 누가 주도하고 누가 끌려가는지, 처음 만났을 때 어떤 인상으로 서로를 읽는지, 시간이 지나면 관계가 어느 쪽으로 기우는지. 궁합 점수의 근거를 숫자가 아니라 구조로 설명한다. 1000자 이상.',
    p_mind: '두 사람의 사고 속도와 감정 처리 방식 차이. 싸움이 시작되는 정확한 지점과 그때 각자가 하는 행동. 한쪽이 침묵하면 다른 쪽이 어떻게 반응하는지까지 장면으로 쓴다. 화해가 되는 방식과 안 되는 방식을 구분한다. 900자 이상.',
    p_love: '연애와 결혼 관점. 일지(배우자궁) 관계를 중심으로 애정의 온도, 성적 궁합의 결, 생활 리듬의 합을 판정한다. 남자는 재성, 여자는 관성 상태를 상대와 대조한다. 결혼까지 갈 관계인지, 간다면 무엇이 조건인지, 안 간다면 어디서 끊어지는지 못 박는다. 1000자 이상.',
    p_bond: '이 인연의 성격. 서로에게 귀인인지 채권자인지. 한쪽이 일방적으로 주는 구조인지, 주고받는 구조인지. 오래 갈 인연인지 계절성 인연인지를 합충 구조로 판정하고, 관계를 망치는 제3자 유형(비겁·겁재)도 특정한다. 800자 이상.',
    p_money: '돈이 걸렸을 때 무슨 일이 생기는지. 두 사람의 재성 구조가 서로를 키우는지 뺏는지. 공동 자산·공동 계좌·대출·투자를 같이 했을 때의 결과. 돈 문제로 관계가 깨질 확률과 그 트리거를 구체적으로 말한다. 800자 이상.',
    p_biz: '같이 일하거나 사업했을 때. 각자 맡아야 할 역할, 절대 겹치면 안 되는 역할, 의사결정 권한을 누가 가져야 하는지. 동업 시 지분·계약에서 반드시 명문화해야 할 것 하나를 지목한다. 이 조합이 성과를 내는 업종의 결도 말한다. 800자 이상.',
    p_pastlife: '두 사람이 전생에서 각각 어떤 사람이었고 서로 어떤 관계였는지를 각자의 일주(일간의 물상과 일지의 십이운성)·합충·공망·화개·역마로 읽어 한 편의 장면으로 쓴다. 시대와 장소의 공기, 두 사람의 신분과 하는 일, 처음 만난 순간, 함께 보낸 시간, 그 인연이 어떻게 끝났는지(이별·죽음·배신·지키지 못한 약속)를 순서대로 묘사한다. 소설처럼 쓰되 문장마다 어떤 글자·관계에서 그렇게 읽었는지 근거를 괄호나 문장 안에 남긴다. 1100자 이상.',
    p_pastbond: '전생에서 이어져 온 인연의 성격을 판정한다. 갚아야 할 빚인지, 받으러 온 인연인지, 다시 잇기로 한 약속인지를 두 사람 사이의 합·충·공망·배우자성 상태로 단정하고, 그때 끝내지 못한 것이 이번 생에서 어떤 상황·감정·반복 패턴으로 재현되는지 구체적으로 연결한다. 첫 만남에서 느꼈을 이유 없는 익숙함 또는 경계심, 반복되는 다툼의 장면, 헤어지려 해도 다시 이어지는 방식을 각각 일화로 그린다. 이번 생에서 이 인연을 통해 각자가 배워야 할 숙제를 한 문장씩 못 박고, 숙제를 끝내면 관계가 어떻게 바뀌는지와 끝내지 못하면 어떻게 끝나는지 양쪽을 쓴다. 1300자 이상.',
    p_verdict: '결론. 이 관계를 유지할 가치가 있는지 없는지 단정한다. 유지한다면 지켜야 할 규칙 3가지를 명령문으로 쓰고, 각각 왜 그 규칙인지 명식 근거를 붙인다. 관계가 깨진다면 언제 어떤 식으로 깨지는지 예고한다. 700자 이상.'
  };

  /* ---------- 궁합 브리프 ---------- */
  function pairBrief(A, B, C) {
    var L = [];
    L.push(brief(A));
    L.push('');
    L.push(brief(B));
    L.push('');
    L.push('[' + C.a + ' ↔ ' + C.b + ' 궁합 계산 결과]');
    L.push('종합 ' + C.total + '점 / 100');
    L.push('세부: ' + Object.keys(C.sub).map(function (k) { return k + ' ' + C.sub[k]; }).join(' · '));
    L.push('일간 관계: ' + C.dm.label + ' — ' + C.dm.desc);
    L.push('일지(배우자궁) 관계: ' + C.dayBranch.label + ' — ' + C.dayBranch.desc);
    C.yongsin.detail.forEach(function (d) {
      L.push('용신 보완: ' + d.who + '의 용신 ' + d.need + '을(를) 상대가 ' + d.have + '% 보유, 기신 ' + d.gi + '은(는) ' + d.giHave + '% 보유');
    });
    var tot = C.merged.reduce(function (a, b) { return a + b; }, 0) || 1;
    L.push('두 사람 오행 합산: ' + S.EL.map(function (e, k) {
      return e + ' ' + Math.round(C.merged[k] / tot * 100) + '%';
    }).join(' / ') + (C.balance.improved ? ' (혼자일 때보다 균형이 좋아짐)' : ' (혼자일 때보다 균형이 나빠짐)'));
    if (C.relations.length) {
      L.push('글자 간 관계 전체:');
      C.relations.forEach(function (r) { L.push('  ' + r.p + ' ' + r.t + ' [' + r.k + ']'); });
    } else {
      L.push('글자 간 관계: 합충형해파가 하나도 없음 — 서로 간섭이 없는 무색무취 구조');
    }
    return L.join('\n');
  }

  /* ---------- 프롬프트 조립 ---------- */
  function soloPrompt(R, ids) {
    var secs = SOLO_SECTIONS.filter(function (s) { return ids.indexOf(s.id) >= 0; });
    var p = [VOICE, '', '아래는 계산이 끝난 명식 데이터다.', '', brief(R), '', '---', '',
      '다음 ' + secs.length + '개 항목을 순서대로 써라. 각 항목은 "## 제목"으로 시작한다.', ''];
    secs.forEach(function (s) {
      p.push('## ' + s.title);
      p.push(SOLO_SPEC[s.id]);
      p.push('');
    });
    p.push('지금 바로 "## ' + secs[0].title + '"부터 시작해라. 서두 인사말 없이.');
    return p.join('\n');
  }

  function pairPrompt(A, B, C, ids) {
    var secs = PAIR_SECTIONS.filter(function (s) { return ids.indexOf(s.id) >= 0; });
    var p = [VOICE, '',
      '두 사람의 궁합을 본다. 관계 유형을 미리 가정하지 마라. 연인·친구·가족·동료 어느 쪽으로도 될 수 있는 "사람 대 사람"의 상성으로 읽고, 각 항목에서 해당되는 관계 결을 짚어라.',
      '', pairBrief(A, B, C), '', '---', '',
      '다음 ' + secs.length + '개 항목을 순서대로 써라. 각 항목은 "## 제목"으로 시작한다.', ''];
    secs.forEach(function (s) {
      p.push('## ' + s.title);
      p.push(PAIR_SPEC[s.id]);
      p.push('');
    });
    p.push('두 사람 이름은 "' + C.a + '", "' + C.b + '"로 부른다.');
    p.push('지금 바로 "## ' + secs[0].title + '"부터 시작해라. 서두 인사말 없이.');
    return p.join('\n');
  }

  /* ---------- 그룹 종합 ---------- */
  var GROUP_SECTIONS = [
    { id: 'g_field', title: '이 조합의 기운 판도', el: 2 },
    { id: 'g_map', title: '누가 누구와 맞고 안 맞는가', el: 1 },
    { id: 'g_love', title: '연인이 된다면 최적 조합', el: 1 },
    { id: 'g_team', title: '팀으로 굴릴 때 각자의 역할', el: 0 },
    { id: 'g_drive', title: '이 팀이 굴러가는 방향', el: 3 },
    { id: 'g_risk', title: '뇌관과 운영 규칙', el: 4 }
  ];
  var GROUP_SPEC = {
    g_field: '이 사람들이 모였을 때 만들어지는 전체 기운을 판정한다. 합산 오행에서 넘치는 기운과 빠진 기운이 이 집단을 어떻게 움직이는지, 이 조합의 공기가 어떤 온도인지. 빠진 오행이 있으면 그 자리를 누가 억지로 메우다 지치는지도 지목한다. 900자 이상.',
    g_map: '전체 쌍의 점수와 합충 구조를 근거로, 가장 잘 맞는 쌍과 가장 안 맞는 쌍을 실명으로 단정하고 그 이유를 구조로 설명한다. 의외로 잘 맞는 쌍, 겉으로 좋아 보이지만 속으로 곪는 쌍도 각각 하나씩 짚는다. 사람이 3명 이상이면 삼각구도(둘이 붙으면 하나가 밀려나는 구조)가 있는지 반드시 확인해서 말한다. 1000자 이상.',
    g_love: '이 사람들 중 연인으로 묶었을 때 가장 잘 맞는 조합을 순위로 매긴다. 성별이나 현재 관계와 무관하게 순수하게 사주 상성만으로 판정한다. 1위 조합이 왜 1위인지 일간·일지·용신 보완으로 설명하고, 반대로 절대 연인으로 엮이면 안 되는 조합도 하나 못 박는다. 각 조합이 실제로 사귀면 어떤 모습일지 장면으로 쓴다. 900자 이상.',
    g_team: '한 명씩 이름을 부르며 팀에서 맡아야 할 자리를 배정한다. 일간 오행과 십신 구성, 격국을 근거로 한다. 각자에게 (1) 맡아야 할 역할, (2) 절대 맡기면 안 되는 역할, (3) 이 사람이 팀에서 무너지는 조건을 쓴다. 리더를 한 명 지정하고 왜 그 사람인지 단정한다. 사람 수 × 250자 이상.',
    g_drive: '이 팀이 실제로 어떻게 굴러가는지. 초반·중반·장기로 나눠서 예측한다. 어떤 종류의 일에서 성과가 나고 어떤 일에서 무너지는지, 속도가 빠른 팀인지 느린 팀인지, 마무리가 되는 팀인지 벌이기만 하는 팀인지. 이 팀이 성공하려면 반드시 외부에서 조달해야 하는 기능 하나를 지목한다. 900자 이상.',
    g_risk: '뇌관. 이 조합이 깨진다면 어디서 어떻게 깨지는지 시나리오로 쓴다. 누구와 누구 사이에서 먼저 터지는지 실명으로 지목한다. 그리고 이 조합을 유지하기 위한 운영 규칙 4가지를 명령문으로 쓰고 각각 명식 근거를 붙인다. 800자 이상.'
  };

  function groupBrief(list, G) {
    var L = [];
    L.push('[구성원 ' + list.length + '명]');
    list.forEach(function (p) {
      var tot = p.scores.reduce(function (a, b) { return a + b; }, 0) || 1;
      L.push('- ' + p.input.name + ' (' + (p.input.gender === 'M' ? '남' : '여') + ', ' +
        p.solar.y + '.' + p.solar.m + '.' + p.solar.d + ') ' +
        '일주 ' + S.gz(p.pillars[2].s, p.pillars[2].b) +
        ' / 일간 ' + S.STEM_H[p.dm] + '(' + S.EL[p.dmEl] + ') / ' + p.strength.label +
        ' / ' + p.gyeok + ' / 용신 ' + S.EL[p.yongsin.main] +
        ' / 오행 ' + S.EL.map(function (e, k) { return e + Math.round(p.scores[k] / tot * 100); }).join(' ') +
        ' / 십신 ' + Object.keys(p.godCount).map(function (k) { return k + p.godCount[k]; }).join(' ') +
        (p.shinsal.length ? ' / 신살 ' + p.shinsal.join(',') : ''));
    });
    L.push('');
    L.push('[쌍별 궁합 점수]');
    G.pairs.forEach(function (c) {
      L.push('- ' + c.a + ' ↔ ' + c.b + ': 종합 ' + c.total +
        ' (애정 ' + c.sub.애정 + ' 재물 ' + c.sub.재물 + ' 협업 ' + c.sub.협업 +
        ' 소통 ' + c.sub.소통 + ' 지속력 ' + c.sub.지속력 + ')' +
        ' | 일간 ' + c.dm.label + ' | 일지 ' + c.dayBranch.label +
        (c.relations.length ? ' | ' + c.relations.map(function (r) { return r.p + ' ' + r.t; }).join(', ') : ' | 합충 없음'));
    });
    L.push('');
    var tot = G.merged.reduce(function (a, b) { return a + b; }, 0) || 1;
    L.push('[집단 합산]');
    L.push('오행 총합: ' + S.EL.map(function (e, k) { return e + ' ' + Math.round(G.merged[k] / tot * 100) + '%'; }).join(' / '));
    L.push('부족한 기운: ' + (G.missing.length ? G.missing.join(', ') : '없음'));
    L.push('과다한 기운: ' + (G.over.length ? G.over.join(', ') : '없음'));
    L.push('평균 궁합: ' + G.avg + '점, 최고 ' + G.best.a + '↔' + G.best.b + ' ' + G.best.total +
      '점, 최저 ' + G.worst.a + '↔' + G.worst.b + ' ' + G.worst.total + '점');
    L.push('일간 오행 기준 기본 포지션: ' + G.roles.map(function (r) {
      return r.name + '=' + S.EL[r.el] + '(' + r.role.name + ')';
    }).join(', '));
    return L.join('\n');
  }

  function groupPrompt(list, G, ids) {
    var secs = GROUP_SECTIONS.filter(function (s) { return ids.indexOf(s.id) >= 0; });
    var p = [VOICE, '',
      '여러 사람의 사주를 한꺼번에 놓고 전체 판을 읽는다. 관계 유형을 미리 가정하지 마라. 연인·친구·가족·팀 어느 쪽으로도 볼 수 있게 사람 대 사람의 상성으로 읽어라.',
      '', groupBrief(list, G), '', '---', '',
      '다음 ' + secs.length + '개 항목을 순서대로 써라. 각 항목은 "## 제목"으로 시작한다.', ''];
    secs.forEach(function (s) {
      p.push('## ' + s.title);
      p.push(GROUP_SPEC[s.id]);
      p.push('');
    });
    p.push('사람은 반드시 실명으로 부른다.');
    p.push('지금 바로 "## ' + secs[0].title + '"부터 시작해라. 서두 인사말 없이.');
    return p.join('\n');
  }

  /* ---------- 후속 질문 ---------- */
  function chatSeed(contextText, generated) {
    var g = (generated || '').slice(0, 12000);
    return [
      VOICE, '',
      '지금부터 사용자가 아래 명식/궁합에 대해 추가로 질문한다. 질문에만 답하고, 묻지 않은 항목을 새로 쓰지 마라.',
      '답은 3~8문단, 마크다운 소제목 없이 본문으로만 쓴다. 항상 명식 근거를 문장에 넣어라.',
      '답의 마지막에는 "해결방안:"으로 시작하는 구체적 행동 한두 문장과, 명식의 실제 강점에서 끌어낸 힘이 되는 말 한 문장을 붙여라. 위의 "각 항목 끝 두 블록" 규칙은 여기서는 이 두 문장으로 대신한다.',
      '명식에 없는 정보(현재 직업, 연봉, 사는 곳 등)를 물으면 사주로는 그 부분을 특정할 수 없다고 먼저 말하고, 사주로 말할 수 있는 범위에서 답해라.',
      '', '---', '', contextText,
      '', '---', '', '[이미 사용자에게 보여준 해석 요약]', g || '(아직 해석 생성 전)',
      '', '---', '', '이제 질문을 받는다. 아래 첫 질문에 답해라.'
    ].join('\n');
  }

  global.Interp = {
    VOICE: VOICE,
    brief: brief,
    pairBrief: pairBrief,
    groupBrief: groupBrief,
    SOLO_SECTIONS: SOLO_SECTIONS,
    PAIR_SECTIONS: PAIR_SECTIONS,
    GROUP_SECTIONS: GROUP_SECTIONS,
    soloPrompt: soloPrompt,
    pairPrompt: pairPrompt,
    groupPrompt: groupPrompt,
    chatSeed: chatSeed,
    // 한 번의 호출에 묶을 항목 배치
    SOLO_BATCHES: [
      ['overall', 'mind'],
      ['wealth', 'money', 'biz', 'job'],
      ['bond', 'love'],
      ['past', 'pastbond']
    ],
    PAIR_BATCHES: [
      ['p_overall', 'p_mind', 'p_love'],
      ['p_bond', 'p_money', 'p_biz'],
      ['p_pastlife', 'p_pastbond', 'p_verdict']
    ],
    PAIR_BATCHES_DEEP: [
      ['p_overall', 'p_mind'],
      ['p_love', 'p_bond'],
      ['p_money', 'p_biz'],
      ['p_pastlife', 'p_pastbond'],
      ['p_verdict']
    ],
    GROUP_BATCHES: [
      ['g_field', 'g_map'],
      ['g_love', 'g_team'],
      ['g_drive', 'g_risk']
    ]
  };
})(typeof window !== 'undefined' ? window : this);
