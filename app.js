/* ============================================================
   명리판 — 화면·상태·AI 해석
   ============================================================ */
(function () {
  'use strict';
  var S = window.Saju, I = window.Interp;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app');

  /* ---------- 저장소 ---------- */
  var K = { people: 'mng.people.v2', solo: 'mng.solo.v2', match: 'mng.match.v2', theme: 'mng.theme' };
  function load(k, def) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  }
  function saveLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('저장 공간이 부족합니다'); } }
  function allData() { return { people: people, solo: soloStore, match: matchStore }; }
  // 저장하면 로컬에 쓰고, 로그인 상태면 서버에도 올린다
  function save(k, v) {
    saveLocal(k, v);
    if (window.Sync && Sync.user() && (k === K.people || k === K.solo || k === K.match)) Sync.schedulePush(allData);
  }

  var people = load(K.people, []);
  var soloStore = load(K.solo, {});
  var matchStore = load(K.match, []);
  var readOnly = false;      // 공유 링크로 열린 상태
  var sharedData = null;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /** 이름 뒤 "이(가)" 같은 표기를 받침에 맞춰 고른다 (rules.js 의 규칙을 재사용) */
  function jo(s) { return (window.Rules && Rules.josa) ? Rules.josa(s) : String(s); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  var toastTimer;
  function toast(msg) {
    var old = $('.toast'); if (old) old.remove();
    var t = el('<div class="toast">' + esc(msg) + '</div>');
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------- 이름 + 일간 이모지 ---------- */
  function nameTag(p, R) {
    if (!R) { try { R = computeOf(p); } catch (e) { R = null; } }
    var name = esc(p.name || '');
    if (!R) return name;
    return name + ' <span class="pe" title="일간 ' + S.STEM_H[R.dm] + ' — ' + esc(S.STEM_OBJ[R.dm]) + '">' + S.STEM_EMOJI[R.dm] + '</span>';
  }

  /* ---------- 로딩 화면 · 완료 알림 ---------- */
  var genAbort = false, activeCtl = null;
  var Loader = (function () {
    var box = null, total = 0, done = 0, t0 = 0, timer = null, aborted = false;
    function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
    function show(o) {
      hide(); genAbort = false; aborted = false;
      total = Math.max(1, o.total || 1); done = 0; t0 = Date.now();
      var glyphs = (o.glyphs || []).map(function (p, i) {
        return '<i class="el-' + S.STEM_EL[p.s] + '" style="animation-delay:' + (i * .28) + 's">' + S.STEM_H[p.s] + '</i>' +
          '<i class="el-' + S.BRANCH_EL[p.b] + '" style="animation-delay:' + (i * .28 + .14) + 's">' + S.BRANCH_H[p.b] + '</i>';
      }).join('');
      var canAsk = false;
      try { canAsk = !!(window.Notification && Notification.permission === 'default'); } catch (e) { }
      box = el('<div class="loader" role="status" aria-live="polite"><div class="loader-card">' +
        '<div class="eyebrow">해석 중</div>' +
        '<h2>' + (o.names || []).join(' <span class="vs">·</span> ') + '</h2>' +
        (glyphs ? '<div class="glyphs">' + glyphs + '</div>' : '') +
        '<div class="lsub">' + esc(o.sub || '') + '</div>' +
        '<div class="ltrack"><i style="width:0%"></i></div>' +
        '<div class="lstep mono">준비 중</div>' +
        '<div class="ltime mono">0:00</div>' +
        '<div class="row-actions" style="justify-content:center">' +
        '<button type="button" class="btn ghost sm" data-l="peek">계산 결과 먼저 보기</button>' +
        (canAsk ? '<button type="button" class="btn ghost sm" data-l="notify">끝나면 알림 받기</button>' : '') +
        '<button type="button" class="btn danger sm" data-l="stop">중단</button></div>' +
        '<p class="lnote">전부 끝나면 이 화면이 닫히고 알려드립니다. 다른 탭을 봐도 됩니다.</p>' +
        '</div></div>');
      document.body.appendChild(box);
      document.body.classList.add('locked');
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-l]'); if (!b) return;
        if (b.dataset.l === 'peek') hide();
        else if (b.dataset.l === 'stop') { aborted = true; genAbort = true; if (activeCtl) activeCtl.abort(); }
        else if (b.dataset.l === 'notify') {
          try { Notification.requestPermission().then(function () { b.remove(); }); } catch (er) { b.remove(); }
        }
      });
      timer = setInterval(function () {
        var t = box && $('.ltime', box);
        if (t) t.textContent = fmt(Math.round((Date.now() - t0) / 1000));
      }, 1000);
    }
    function batchStart(label) {
      if (!box) return;
      var s = $('.lstep', box); if (s) s.textContent = (done + 1) + '/' + total + ' — ' + label;
    }
    function batchDone() {
      done++;
      if (!box) return;
      var i = $('.ltrack i', box); if (i) i.style.width = Math.round(Math.min(1, done / total) * 100) + '%';
    }
    function hide() {
      if (timer) { clearInterval(timer); timer = null; }
      if (box) { box.remove(); box = null; }
      document.body.classList.remove('locked');
    }
    function end(msg) {
      hide();
      if (aborted || genAbort) { toast('중단했습니다'); return; }
      if (msg) notifyDone(msg);
    }
    return { show: show, hide: hide, end: end, batchStart: batchStart, batchDone: batchDone };
  })();
  function notifyDone(msg) {
    toast(msg);
    var old = document.title;
    document.title = '✓ ' + msg;
    setTimeout(function () { document.title = old; }, 8000);
    try { if (window.Notification && Notification.permission === 'granted' && document.hidden) new Notification('명리판', { body: msg }); } catch (e) { }
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { }
  }

  /* ---------- 마크다운 ---------- */
  function md(text) {
    var lines = String(text).split('\n');
    var out = [], buf = [], inList = false;
    function flush() {
      if (buf.length) { out.push('<p>' + inline(buf.join('<br>')) + '</p>'); buf = []; }
    }
    function closeList() { if (inList) { out.push('</ul>'); inList = false; } }
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i].replace(/\s+$/, '');
      if (/^\s*$/.test(L)) { flush(); closeList(); continue; }
      if (/^#{1,6}\s/.test(L)) {
        flush(); closeList();
        out.push('<p><strong>' + inline(L.replace(/^#{1,6}\s*/, '')) + '</strong></p>');
        continue;
      }
      if (/^\s*[-*]\s+/.test(L)) {
        flush();
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(L.replace(/^\s*[-*]\s+/, '')) + '</li>');
        continue;
      }
      if (/^\s*(---|___|\*\*\*)\s*$/.test(L)) { flush(); closeList(); out.push('<hr>'); continue; }
      closeList();
      buf.push(esc(L));
    }
    flush(); closeList();
    return out.join('');
  }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function splitByHeading(text) {
    var re = /^##[ \t]*(.+)$/gm, m, last = null, res = [];
    while ((m = re.exec(text))) {
      if (last) last.body = text.slice(last.end, m.index).trim();
      last = { title: m[1].trim(), end: re.lastIndex };
      res.push(last);
    }
    if (last) last.body = text.slice(last.end).trim();
    return res;
  }
  function distribute(text, defs) {
    var found = splitByHeading(text), map = {}, used = {}, i, j;
    for (i = 0; i < found.length; i++) {
      for (j = 0; j < defs.length; j++) {
        if (used[defs[j].id]) continue;
        if (norm(found[i].title) === norm(defs[j].title)) { map[defs[j].id] = found[i].body || ''; used[defs[j].id] = 1; break; }
      }
    }
    var rest = found.filter(function (f) {
      return !defs.some(function (d) { return used[d.id] && norm(d.title) === norm(f.title); });
    });
    var free = defs.filter(function (d) { return !used[d.id]; });
    for (i = 0; i < free.length && i < rest.length; i++) map[free[i].id] = rest[i].body || '';
    if (!found.length && defs.length === 1) map[defs[0].id] = text.trim();
    return map;
  }
  function norm(s) { return String(s).replace(/[\s·・,.'"‘’“”()·]/g, '').toLowerCase(); }

  /* ---------- 해석 공급자 (ai.js) · 규칙 판정 (rules.js) ---------- */
  var AIP = window.AI, RU = window.Rules, GL = window.Glossary, Card = window.Card;
  // claude.ai 에 올린 같은 앱. 거기서는 보는 사람의 Claude 계정으로 키 없이 해석이 나온다.
  var CLAUDE_URL = 'https://claude.ai/code/artifact/a6721853-107e-483a-b278-ca8d9cf8faa6';
  var ERRCOPY = {
    not_granted: 'AI 해석이 꺼져 있습니다. 첫 화면의 "AI 해석 설정"에서 켜면 각 항목을 길게 씁니다.',
    bad_key: 'API 키가 틀렸거나 만료됐습니다. 첫 화면의 "AI 해석 설정"에서 다시 넣으세요.',
    server_config: 'AI 서버 설정에 문제가 있습니다. 잠시 뒤 다시 시도하거나, "AI 해석 설정"에서 내 키를 넣어 쓰세요.',
    invalid_request: '요청 형식 오류입니다. 인원을 줄이거나 다시 시도하세요.',
    sampling_disabled: '이 계정에서는 AI 해석을 쓸 수 없습니다. 계산 결과는 그대로 볼 수 있습니다.',
    not_declared: 'AI 해석 기능이 이 페이지에 없습니다.',
    capability_disabled: '이 화면에서는 AI 해석을 쓸 수 없습니다.',
    capability_removed: '이 화면에서는 AI 해석을 쓸 수 없습니다.',
    rate_limited: '무료 사용 한도(분당 요청 수)에 걸렸습니다. 1~2분 뒤 다시 눌러주세요. 자주 그러면 "AI 해석 설정"에서 내 키를 넣어 쓰면 됩니다.',
    session_expired: '다시 로그인한 뒤 시도하세요.',
    refused: '이 내용은 생성할 수 없습니다. 항목을 바꿔서 다시 시도하세요.',
    empty_completion: '답이 비어 돌아왔습니다. 다시 눌러주세요.',
    prompt_too_large: '입력이 너무 깁니다. 인원을 줄여주세요.',
    cancelled: '중단했습니다.',
    upstream_error: '연결이 끊겼습니다. 다시 눌러주세요.'
  };
  function errCopy(e) { return ERRCOPY[e && e.code] || '해석 생성에 실패했습니다. 다시 눌러주세요.'; }

  /* ---------- 공유 인코딩 ---------- */
  function b64url(u8) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  function packShare(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
      var st = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Response(st).arrayBuffer().then(function (b) { return 'z' + b64url(new Uint8Array(b)); });
    }
    return Promise.resolve('r' + b64url(bytes));
  }
  function unpackShare(str) {
    var tag = str.charAt(0), body = unb64url(str.slice(1));
    if (tag === 'z') {
      if (typeof DecompressionStream !== 'function') return Promise.reject(new Error('unsupported'));
      var st = new Blob([body]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(st).arrayBuffer().then(function (b) {
        return JSON.parse(new TextDecoder().decode(new Uint8Array(b)));
      });
    }
    return Promise.resolve(JSON.parse(new TextDecoder().decode(body)));
  }

  /* ---------- 사람 → 계산 ---------- */
  function computeOf(p) {
    return S.compute({
      name: p.name, gender: p.gender, calType: p.cal, leap: p.leap,
      y: p.y, m: p.m, d: p.d, hour: p.hour, minute: p.minute,
      unknownTime: p.unknown, lon: p.lon, timeMode: p.timeMode, trueSolar: p.trueSolar, lateZi: p.lateZi
    });
  }
  function personLabel(p) {
    // 시각을 모르면 시간 자리를 비운다. 표시는 따로 붙는 "시각모름" 배지가 맡는다.
    return p.y + '.' + pad(p.m) + '.' + pad(p.d) + (p.cal === 'lunar' ? ' 음' + (p.leap ? '(윤)' : '') : ' 양') +
      (p.unknown ? '' : ' ' + pad(p.hour) + ':' + pad(p.minute || 0)) +
      ' · ' + (p.gender === 'M' ? '남' : '여');
  }

  /* ============================================================
     컴포넌트
     ============================================================ */
  function plateHTML(R) {
    var order = [3, 2, 1, 0]; // 오른쪽에서 왼쪽으로 시-일-월-년
    var names = ['년주', '월주', '일주', '시주'];
    function c(i) { return (i === 2 ? ' cell-day' : '') + (i === 3 && R.unknownTime ? ' dim' : ''); }
    var h = ['<div class="plate-wrap"><div class="plate">'];
    h.push('<div class="rowlab"></div>');
    order.forEach(function (i) {
      h.push('<div class="colhead' + (i === 2 ? ' day' : '') + (i === 3 && R.unknownTime ? ' dim' : '') + '">' +
        names[i] + (i === 3 && R.unknownTime ? ' · 모름' : '') + '</div>');
    });
    h.push('<div class="rowlab">' + GL.term('십신', '천간 십신') + '</div>');
    order.forEach(function (i) {
      h.push('<div class="god' + c(i) + '">' +
        (i === 2 ? '<b style="color:var(--gold)">일간</b>' : esc(R.pillars[i].stemGod)) + '</div>');
    });
    h.push('<div class="rowlab">천간</div>');
    order.forEach(function (i) {
      var p = R.pillars[i], e = S.STEM_EL[p.s];
      h.push('<div class="char' + c(i) + '">' +
        '<span class="h el-' + e + '">' + S.STEM_H[p.s] + '</span>' +
        '<span class="k">' + S.STEM[p.s] + ' · ' + S.EL[e] + (S.STEM_YIN[p.s] ? '음' : '양') + '</span>' +
        '<span class="stripe bg-' + e + '"></span></div>');
    });
    h.push('<div class="rowlab">지지</div>');
    order.forEach(function (i) {
      var p = R.pillars[i], e = S.BRANCH_EL[p.b];
      var gm = R.gongmang.indexOf(p.b) >= 0;
      h.push('<div class="char' + c(i) + '">' +
        '<span class="h el-' + e + '">' + S.BRANCH_H[p.b] + '</span>' +
        '<span class="k">' + S.BRANCH[p.b] + ' · ' + S.EL[e] + (gm ? ' · 공망' : '') + '</span>' +
        '<span class="stripe bg-' + e + '"></span></div>');
    });
    h.push('<div class="rowlab">' + GL.term('십신', '지지 십신') + '</div>');
    order.forEach(function (i) {
      h.push('<div class="god' + c(i) + '">' + esc(R.pillars[i].branchGod) + '</div>');
    });
    h.push('<div class="rowlab">' + GL.term('지장간') + '</div>');
    order.forEach(function (i) {
      h.push('<div class="hid' + c(i) + '">' +
        R.pillars[i].hidden.map(function (s) { return S.STEM_H[s]; }).join('') + '</div>');
    });
    h.push('<div class="rowlab">' + GL.term('십이운성') + '</div>');
    order.forEach(function (i) {
      h.push('<div class="stage' + c(i) + '">' + esc(R.pillars[i].stage) + '</div>');
    });
    h.push('</div></div>');
    h.push('<p class="plate-legend">줄 순서: 천간 십신 → 천간 → 지지 → 지지 십신 → 지장간 → 십이운성. 기둥은 오른쪽부터 년·월·일·시.</p>');
    return h.join('');
  }

  /** 출생 시각을 모를 때 띄우는 경고. 무엇이 되고 무엇이 안 되는지 분명히 적는다. */
  function unknownTimeNote(names) {
    var who = names ? esc(names) + '은(는) ' : '';
    return '<div class="warn-box"><b>⚠ 출생 시각을 몰라 정확하지 않을 수 있습니다</b>' +
      '<p>' + jo(who + '태어난 시각이 없어 <b>시주(時柱)를 세우지 못했습니다.</b> 년·월·일 세 기둥만으로 본 결과라 실제와 다를 수 있습니다.</p>') +
      '<div class="wb-cols">' +
      '<div><span class="ok">그대로 믿어도 되는 것</span>' +
      '<ul><li>일간 — 나 자신의 기본 성질</li><li>년주·월주·일주 세 기둥</li><li>격국과 월령(태어난 달의 기운)</li><li>대운의 흐름과 시기</li></ul></div>' +
      '<div><span class="no">달라질 수 있는 것</span>' +
      '<ul><li>오행 비율과 일간 강약 — 시주 두 글자(전체의 25%)가 빠졌습니다</li><li>용신·희신·기신</li><li>자식운·말년운 — 시주가 맡는 영역입니다</li><li>시주와 얽히는 신살·합충</li>' +
      '<li><b>밤 11시~12시 출생이면 일주까지 하루 달라집니다</b></li></ul></div>' +
      '</div>' +
      '<p class="wb-tip">시각을 알게 되면 다시 넣어 주세요. 훨씬 정확해집니다. ' +
      '모를 때는 <b>태어난 때가 낮인지 밤인지</b>만 알아도 도움이 되니, 어른께 여쭤 볼 값어치가 있습니다.</p></div>';
  }

  function elbarHTML(scores) {
    var tot = scores.reduce(function (a, b) { return a + b; }, 0) || 1;
    var bar = '<div class="elbar">' + scores.map(function (v, k) {
      return '<span class="bg-' + k + '" style="width:' + (v / tot * 100) + '%"></span>';
    }).join('') + '</div>';
    var leg = '<div class="ellegend">' + scores.map(function (v, k) {
      return '<span class="el-' + k + '"><b>' + S.EL_H[k] + '</b>' + S.EL[k] +
        '<i>' + Math.round(v / tot * 100) + '%</i></span>';
    }).join('') + '</div>';
    return bar + leg;
  }

  function panelsHTML(R) {
    var y = R.yongsin;
    var now = new Date().getFullYear();
    var curIdx = -1;
    for (var k = R.daewoon.list.length - 1; k >= 0; k--) {
      if (now >= R.daewoon.list[k].year) { curIdx = k; break; }
    }
    var h = ['<div class="panels">'];

    h.push('<div class="panel"><h3>' + GL.term('오행', '오행 세력') + '</h3>' + elbarHTML(R.scores) + '</div>');

    h.push('<div class="panel"><h3>' + GL.term('일간 강약') + '</h3>' +
      '<div class="gauge"><i class="bg-' + (R.strength.pct < 47 ? 4 : 1) + '" style="width:' + Math.round(R.strength.pct) + '%"></i>' +
      '<span class="gauge-mark" style="left:50%"></span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--fg-3)" class="mono">' +
      '<span>신약</span><b style="color:var(--gold)">' + R.strength.label + ' ' + Math.round(R.strength.pct) + '</b><span>신강</span></div>' +
      '<dl class="kv" style="margin-top:10px">' +
      '<dt>' + GL.term('월령') + '</dt><dd>' + (R.strength.deukryeong ? GL.term('득령') + ' — 태어난 달이 나를 돕는다' : GL.term('실령') + ' — 태어난 달이 나를 돕지 않는다') + '</dd>' +
      '<dt>' + GL.term('격국') + '</dt><dd><b>' + esc(R.gyeok) + '</b></dd>' +
      '<dt>' + GL.term('용신') + '</dt><dd><b>' + S.EL[y.main] + '</b>' +
      (y.sub >= 0 ? ' · ' + GL.term('희신') + ' ' + S.EL[y.sub] : '') +
      (y.johu >= 0 ? ' · ' + GL.term('조후') + ' ' + S.EL[y.johu] : '') + ' / ' + GL.term('기신') + ' ' + S.EL[y.gi] + '</dd>' +
      '</dl></div>');

    h.push('<div class="panel"><h3>' + GL.term('십신', '십신 분포') + '</h3>' +
      Object.keys(R.godCount).map(function (g) {
        var v = R.godCount[g];
        return '<div class="subbar" style="margin-bottom:7px"><div class="lab"><span>' + GL.term(g) + '</span><b>' + v + '</b></div>' +
          '<div class="track"><i class="bg-' + ({ 비겁: 0, 식상: 1, 재성: 2, 관성: 3, 인성: 4 })[g] + '" style="width:' + Math.min(100, v * 20) + '%"></i></div></div>';
      }).join('') + '</div>');

    h.push('<div class="panel"><h3>기본 정보</h3><dl class="kv">' +
      '<dt>일주</dt><dd><b>' + S.gz(R.pillars[2].s, R.pillars[2].b) + '</b> ' + S.gzKo(R.pillars[2].s, R.pillars[2].b) + '일주</dd>' +
      '<dt>일간</dt><dd>' + S.STEM_H[R.dm] + ' ' + S.STEM[R.dm] + ' · ' + S.EL[R.dmEl] + ' · ' + (R.dmYin ? '음' : '양') + '</dd>' +
      '<dt>띠</dt><dd>' + R.zodiac + '띠 (' + R.sajuYear + '년생 기준)</dd>' +
      '<dt>양력</dt><dd class="mono">' + R.solar.y + '-' + pad(R.solar.m) + '-' + pad(R.solar.d) + '</dd>' +
      (R.lunar ? '<dt>음력</dt><dd class="mono">' + R.lunar.y + '-' + pad(R.lunar.m) + '-' + pad(R.lunar.d) + (R.lunar.leap ? ' (윤달)' : '') + '</dd>' : '') +
      '<dt>' + GL.term('공망') + '</dt><dd>' + R.gongmang.map(function (b) { return S.BRANCH_H[b]; }).join('') + '</dd>' +
      (R.dst ? '<dt>서머타임</dt><dd>적용 (1시간 보정)</dd>' : '') +
      (R.tzOffset !== 9 ? '<dt>표준시</dt><dd>UTC+' + R.tzOffset + ' (동경 127.5° 기준 시기)</dd>' : '') +
      (R.unknownTime ? '' : '<dt>시간 보정</dt><dd>' + ({
        std30: '표준시 −30분 (일반 만세력 방식)',
        'true': '진태양시 (경도 ' + R.lon + '° + 균시차 ' + (R.eot >= 0 ? '+' : '') + Math.round(R.eot) + '분)',
        none: '보정 없음'
      })[R.timeMode] + '</dd>') +
      '</dl></div>');

    h.push('</div>');

    // 신살 · 원국 관계
    h.push('<div class="panels" style="margin-top:22px">');
    var SS = R.shinsalAll || [];
    var byKind = { 길: [], 중: [], 흉: [] };
    SS.forEach(function (s, i) { s._i = i; (byKind[s.kind] || byKind['중']).push(s); });
    function ssChips(list, cls) {
      if (!list.length) return '<span class="chip">없음</span>';
      return list.map(function (s) {
        return '<button type="button" class="chip ss ' + cls + '" data-ss="' + s._i + '" aria-pressed="false">' +
          esc(s.name) + (s.where.length ? '<span class="p" style="margin:0 0 0 5px">' + esc(s.where[0]) + '</span>' : '') + '</button>';
      }).join('');
    }
    h.push('<div class="panel" style="grid-column:1/-1"><h3>' + GL.term('신살') + ' · 길성 ' + byKind['길'].length +
      ' / 중립 ' + byKind['중'].length + ' / 흉살 ' + byKind['흉'].length +
      ' <span style="text-transform:none;letter-spacing:0;color:var(--gold)">— 눌러서 뜻 보기</span></h3>' +
      '<div style="display:grid;gap:10px">' +
      '<div><div class="ss-lab" style="color:var(--good)">길성 — 도움이 되는 별</div><div class="chips">' + ssChips(byKind['길'], 'good') + '</div></div>' +
      '<div><div class="ss-lab" style="color:var(--gold)">중립 — 쓰기 나름</div><div class="chips">' + ssChips(byKind['중'], 'gold') + '</div></div>' +
      '<div><div class="ss-lab" style="color:var(--bad)">흉살 — 조심할 별</div><div class="chips">' + ssChips(byKind['흉'], 'bad') + '</div></div>' +
      '</div>' +
      '<div class="ss-detail" id="ssDetail" hidden></div>' +
      (SS.length ? '<details class="adv" style="margin-top:14px"><summary>한꺼번에 모두 보기 (' + SS.length + '개)</summary>' +
        '<dl class="gl" style="margin-top:12px">' + SS.map(function (s) {
          return '<dt style="color:var(--' + ({ 길: 'good', 중: 'gold', 흉: 'bad' })[s.kind] + ')">' + esc(s.name) +
            (s.where.length ? ' <span class="mono" style="color:var(--fg-3);font-size:11px">' + esc(s.where.join(', ')) + '</span>' : '') +
            '</dt><dd>' + esc(s.desc) + '</dd>';
        }).join('') + '</dl></details>' : '') +
      '</div>');
    h.push('<div class="panel"><h3>' + GL.term('원국 내부 관계') + '</h3><div class="chips">' +
      (R.relations.length ? R.relations.map(function (r) {
        return '<span class="chip ' + (r.good > 0 ? 'good' : 'bad') + '"><span class="p">' + esc(r.a + r.b) + '</span>' + esc(r.text) + '</span>';
      }).join('') : '<span class="chip">합충형해파 없음</span>') + '</div></div>');
    h.push('</div>');

    // 대운
    h.push('<div class="panel" style="margin-top:24px"><h3>' + GL.term('대운') + ' · ' + (R.daewoon.forward ? '순행' : '역행') +
      ' · 대운수 ' + R.daewoon.num + '</h3><div class="daewoon">' +
      R.daewoon.list.map(function (d, i) {
        return '<div class="' + (i === curIdx ? 'now' : '') + '">' +
          '<div class="age">' + d.age + '세</div>' +
          '<span class="gz el-' + S.STEM_EL[d.s] + '">' + S.STEM_H[d.s] + '</span>' +
          '<span class="gz el-' + S.BRANCH_EL[d.b] + '">' + S.BRANCH_H[d.b] + '</span>' +
          '<div class="yr">' + d.year + '</div></div>';
      }).join('') + '</div></div>');

    if (R.edgeMinutes < 30 && !R.unknownTime) {
      h.push('<div class="alert info">절기 경계까지 약 ' + Math.round(R.edgeMinutes) +
        '분. 이 계산은 천문 근사식을 쓰므로 경계 30분 이내 출생은 월주가 한 칸 달라질 수 있습니다. 만세력 원본을 한 번 더 확인하세요.</div>');
    }
    return h.join('');
  }

  /** 신살 칩을 누르면 아래에 뜻이 펼쳐진다 (모바일에는 마우스 오버가 없으므로) */
  function wireShinsal(R) {
    var box = $('#ssDetail');
    if (!box) return;
    var SS = R.shinsalAll || [];
    var KIND = { 길: { cls: 'good', label: '길성 — 도움이 되는 별' }, 중: { cls: 'gold', label: '중립 — 쓰기 나름' }, 흉: { cls: 'bad', label: '흉살 — 조심할 별' } };
    app.querySelectorAll('[data-ss]').forEach(function (b) {
      b.onclick = function () {
        var s = SS[+b.dataset.ss];
        if (!s) return;
        var wasOn = b.getAttribute('aria-pressed') === 'true';
        app.querySelectorAll('[data-ss]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (wasOn) { box.hidden = true; return; }
        b.setAttribute('aria-pressed', 'true');
        var k = KIND[s.kind] || KIND['중'];
        box.hidden = false;
        box.className = 'ss-detail ' + k.cls;
        box.innerHTML =
          '<div class="ss-head"><b>' + esc(s.name) + '</b>' +
          '<span class="mono">' + esc(k.label) + (s.where.length ? ' · ' + esc(s.where.join(', ')) : '') + '</span>' +
          '<button type="button" class="ss-x" aria-label="닫기">×</button></div>' +
          '<p>' + esc(s.desc) + '</p>';
        $('.ss-x', box).onclick = function () {
          box.hidden = true;
          b.setAttribute('aria-pressed', 'false');
        };
      };
    });
  }

  /* ---------- 해석 섹션 렌더 ---------- */
  function ruleBlock(text) {
    if (!text) return '<p class="pending">아직 생성 전입니다.</p>';
    return '<div class="rule-tag">계산 기반 핵심 판정</div>' + md(text);
  }
  function sectionsHTML(defs, store, prefix, rulesFn) {
    return '<div class="reading" id="' + prefix + '">' + defs.map(function (d) {
      var t = store && store[d.id];
      return '<article class="sec" data-sec="' + d.id + '">' +
        '<div class="eyebrow-el el-' + d.el + '">' + esc(d.title) + '</div>' +
        '<h3>' + esc(d.title) + '</h3>' +
        '<div class="body" data-body="' + d.id + '">' +
        (t ? md(t) : ruleBlock(rulesFn ? rulesFn(d.id) : '')) + '</div>' +
        '</article>';
    }).join('') + '</div>';
  }
  function aiOffNote(el) {
    if (!el) return;
    el.innerHTML = '<div class="banner"><span>AI 해석이 꺼져 있어 <b>계산 기반 핵심 판정</b>만 표시했습니다. ' +
      '“AI 해석 설정”에서 켜면 각 항목을 길게 씁니다.</span>' +
      '<button class="btn sm" id="goai" style="margin-left:auto">설정으로</button></div>';
    var b = $('#goai', el);
    if (b) b.onclick = function () {
      go('home');
      setTimeout(function () { var s = $('#aisec'); if (s) s.scrollIntoView({ behavior: 'smooth' }); }, 60);
    };
  }

  function progressHTML(id) {
    return '<div class="progress" id="' + id + '" hidden>' +
      '<span class="mono lbl">준비 중</span><span class="track"><i style="width:0%"></i></span>' +
      '<button class="btn ghost sm stop">중단</button></div>';
  }

  /** 배치 실행: 각 배치를 순차로 호출하며 섹션에 스트리밍 */
  function runBatches(opts) {
    // opts: {batches:[[ids]], defs, buildPrompt(ids), store, root, progressEl, onDone, tier}
    var ctl = new AbortController();
    activeCtl = ctl;
    var total = opts.batches.length, done = 0, failed = 0;
    var prog = opts.progressEl;
    if (prog) {
      prog.hidden = false;
      var stopBtn = prog.querySelector('.stop');
      stopBtn.onclick = function () { ctl.abort(); };
    }
    function setProg(txt, frac) {
      if (!prog) return;
      prog.querySelector('.lbl').textContent = txt;
      prog.querySelector('.track i').style.width = Math.round(frac * 100) + '%';
    }
    function bodyOf(id) { return opts.root.querySelector('[data-body="' + id + '"]'); }

    function restoreRule(d) {
      var b = bodyOf(d.id);
      if (b && !opts.store[d.id]) b.innerHTML = ruleBlock(opts.rules ? opts.rules(d.id) : '');
    }
    return AIP.provider().then(function (prov) {
      if (!prov) {
        if (prog) prog.hidden = true;
        if (opts.onNoAI) opts.onNoAI();
        return false;
      }
      if (genAbort) { if (prog) prog.hidden = true; return false; }
      var chain = Promise.resolve();
      opts.batches.forEach(function (ids, bi) {
        chain = chain.then(function () {
          if (ctl.signal.aborted || genAbort) return;
          var defs = opts.defs.filter(function (d) { return ids.indexOf(d.id) >= 0; });
          var titles = defs.map(function (d) { return d.title; }).join(' · ');
          setProg('생성 중 ' + (bi + 1) + '/' + total + ' — ' + titles, done / total);
          Loader.batchStart(titles);
          defs.forEach(function (d) {
            var b = bodyOf(d.id);
            if (b && !b.querySelector('.writing')) b.insertAdjacentHTML('afterbegin', '<p class="pending cursor writing">AI가 쓰는 중 — 아래는 계산 기반 요약</p>');
          });
          return AIP.generate(opts.buildPrompt(ids), {
            tier: opts.tier || 'default',
            signal: ctl.signal,
            refresh: !!opts.refresh,
            onNotice: function (msg) {
              setProg(msg || ('생성 중 ' + (bi + 1) + '/' + total + ' — ' + titles), done / total);
              if (msg) Loader.batchStart(msg);
            },
            onText: function (u) {
              var map = distribute(u.text, defs);
              defs.forEach(function (d) {
                var b = bodyOf(d.id);
                if (!b) return;
                if (map[d.id] !== undefined) b.innerHTML = md(map[d.id]);
              });
            }
          }).then(function (res) {
            var map = distribute(res.text, defs);
            defs.forEach(function (d) {
              opts.store[d.id] = map[d.id] || '';
              var b = bodyOf(d.id);
              if (!b) return;
              if (opts.store[d.id]) b.innerHTML = md(opts.store[d.id]);
              else restoreRule(d);
            });
            if (res.truncated) toast('답이 길어 잘렸습니다. 해당 항목만 다시 생성하세요.');
            Loader.batchDone();
            done++;
            setProg('생성 중 ' + done + '/' + total, done / total);
            if (opts.onBatch) opts.onBatch();
          }).catch(function (e) {
            var msg = (e && e.code === 'cancelled') ? '중단했습니다.' : errCopy(e);
            defs.forEach(function (d) {
              var b = bodyOf(d.id);
              if (!b || opts.store[d.id]) return;
              restoreRule(d);
              b.insertAdjacentHTML('afterbegin', '<p class="pending">' + esc(msg) + '</p>');
            });
            if (e && e.code === 'cancelled') throw e;
            failed++;
            Loader.batchDone();
            done++;
            setProg('생성 중 ' + done + '/' + total, done / total);
          });
        });
      });
      return chain.then(function () {
        if (prog) prog.hidden = true;
        if (opts.onDone) opts.onDone({ failed: failed, total: total, cancelled: false });
        return true;
      }).catch(function () {
        if (prog) prog.hidden = true;
        if (opts.onDone) opts.onDone({ failed: failed, total: total, cancelled: true });
        return false;
      });
    });
  }

  /* ---------- 질문 ---------- */
  function chatHTML(id, suggestions) {
    return '<div class="chat" id="' + id + '">' +
      '<h3>더 궁금한 것 물어보기</h3>' +
      '<p class="sub">위 명식을 그대로 보고 답합니다. 원하는 걸 구체적으로 물을수록 답이 정확합니다.</p>' +
      '<div class="suggest">' + suggestions.map(function (s) {
        return '<button type="button" data-q="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('') + '</div>' +
      '<div class="log"></div>' +
      '<form><textarea placeholder="예) 올해 이직해도 됩니까? 근거까지 말해주세요." rows="2"></textarea>' +
      '<button class="btn" type="submit">묻기</button></form></div>';
  }

  function wireChat(rootId, seedFn) {
    var root = $('#' + rootId);
    if (!root) return;
    var log = $('.log', root), form = $('form', root), ta = $('textarea', root), btn = $('button[type=submit]', root);
    var turns = null, busy = false;

    $('.suggest', root).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-q]');
      if (!b) return;
      ta.value = b.dataset.q;
      form.requestSubmit();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = ta.value.trim();
      if (!q || busy) return;
      busy = true; btn.disabled = true; ta.value = '';
      log.appendChild(el('<div class="q">' + esc(q) + '</div>'));
      var ans = el('<div class="a"><p class="pending cursor">생각하는 중</p></div>');
      log.appendChild(ans);
      ans.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      AIP.provider().then(function (prov) {
        if (!prov) {
          ans.innerHTML = '<p class="pending">질문은 AI 해석이 켜져 있어야 합니다. 첫 화면의 "AI 해석 설정"에서 켜세요.</p>';
          busy = false; btn.disabled = false; return;
        }
        if (!turns) turns = [{ role: 'user', content: seedFn() }];
        turns.push({ role: 'user', content: q });
        if (turns.length > 11) turns.splice(1, 2);
        return AIP.generate(turns, {
          chat: true, tier: 'default',
          onText: function (u) { ans.innerHTML = md(u.text); }
        }).then(function (r) {
          ans.innerHTML = md(r.text);
          turns.push({ role: 'assistant', content: r.text });
        }).catch(function (err) {
          ans.innerHTML = '<p class="pending">' + esc(errCopy(err)) + '</p>';
          turns.pop();
        }).then(function () { busy = false; btn.disabled = false; });
      });
    });
  }

  /* ============================================================
     화면 : 홈
     ============================================================ */
  function viewHome() {
    var glyphs = '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥'.split('');
    var h = [];
    h.push('<div class="hero"><div class="cols"><div>' +
      '<div class="eyebrow">천간지지 · 오행 · 십신</div>' +
      '<h1>사주를 계산하고,<br>사람과 사람 사이를 읽는다</h1>' +
      '<p>생년월일시를 넣으면 천문 계산으로 절기와 삭을 구해 사주 원국을 세웁니다. ' +
      '음력·윤달, 역대 서머타임, 1954~1961년 동경 127.5° 표준시까지 반영합니다. ' +
      '해석은 돌려 말하지 않습니다.</p>' +
      '<div class="row-actions"><button class="btn" data-go="new">사주 보기</button>' +
      '<button class="btn ghost" data-go="match">궁합 보기</button></div>' +
      '</div><div><div class="glyph-row">' +
      glyphs.map(function (g) { return '<i>' + g + '</i>'; }).join('') + '</div></div></div></div>');

    h.push('<section class="block"><div class="sec-head"><h2>저장된 사람</h2>' +
      '<span class="note">이 브라우저에만 저장됩니다. 한 번 넣으면 다시 안 넣어도 됩니다.</span></div>');
    if (!people.length) {
      h.push('<div class="empty">아직 없습니다. <button class="btn sm" data-go="new" style="margin-left:6px">첫 사주 넣기</button></div>');
    } else {
      h.push('<div class="people">' + people.map(function (p) {
        var R;
        try { R = computeOf(p); } catch (e) { R = null; }
        return '<div class="person" data-open="' + p.id + '" role="button" tabindex="0">' +
          '<button class="x" data-del="' + p.id + '" title="삭제" aria-label="삭제">×</button>' +
          '<div class="nm">' + nameTag(p, R) + ' <em>' + (p.gender === 'M' ? '남' : '여') + '</em></div>' +
          '<div class="dt">' + esc(personLabel(p)) +
          (p.unknown ? ' <span class="notime">시각모름</span>' : '') + '</div>' +
          (R ? '<div class="gzrow">' + R.pillars.map(function (q) { return S.gz(q.s, q.b); }).join(' ') + '</div>' +
            '<div class="dt">' + esc(R.gyeok + ' · ' + R.strength.label + ' · 용신 ' + S.EL[R.yongsin.main]) + '</div>'
            : '<div class="dt" style="color:var(--bad)">계산 실패</div>') +
          '</div>';
      }).join('') + '</div>');
    }
    h.push('</section>');

    if (matchStore.length) {
      h.push('<section class="block"><div class="sec-head"><h2>저장된 궁합</h2></div><div class="people">' +
        matchStore.map(function (m) {
          return '<div class="person" data-openmatch="' + m.id + '" role="button" tabindex="0">' +
            '<button class="x" data-delmatch="' + m.id + '" title="삭제" aria-label="삭제">×</button>' +
            '<div class="nm">' + m.snapshot.map(function (q) { return nameTag(q); }).join(' <span style="color:var(--gold)">·</span> ') + '</div>' +
            '<div class="dt">' + m.snapshot.length + '명 · 평균 ' + m.avg + '점 · ' + new Date(m.at).toLocaleDateString('ko-KR') + '</div>' +
            '</div>';
        }).join('') + '</div></section>');
    }

    h.push('<section class="block" id="accsec"><div class="sec-head"><h2>계정 · 기기 간 동기화</h2>' +
      '<span class="note" id="accnote">확인 중…</span></div><div id="accbody"></div></section>');

    h.push('<section class="block" id="aisec"><div class="sec-head"><h2>AI 해석 설정</h2>' +
      '<span class="note" id="aiprov">확인 중…</span></div><div id="aibody"></div></section>');

    h.push('<section class="block"><div class="sec-head"><h2>공유받은 결과 열기</h2>' +
      '<span class="note">받은 링크나 공유 코드를 그대로 붙여넣으세요</span></div>' +
      '<div class="field-grid"><div class="f f-12">' +
      '<label for="codeInput">링크 또는 코드</label>' +
      '<input id="codeInput" placeholder="…#s=eJyNk… 또는 코드만" autocomplete="off"></div></div>' +
      '<div class="row-actions"><button class="btn ghost" id="openCode">열기</button></div></section>');

    app.innerHTML = h.join('');

    app.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { go(b.dataset.go); };
    });
    app.querySelectorAll('[data-open]').forEach(function (c) {
      var open = function () { go('solo', c.dataset.open); };
      c.onclick = function (e) { if (e.target.closest('[data-del]')) return; open(); };
      c.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
    app.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var p = people.find(function (x) { return x.id === b.dataset.del; });
        if (!confirm((p ? p.name : '이 사람') + '을(를) 삭제합니다. 저장된 해석도 함께 지워집니다.')) return;
        people = people.filter(function (x) { return x.id !== b.dataset.del; });
        delete soloStore[b.dataset.del];
        save(K.people, people); save(K.solo, soloStore);
        render();
      };
    });
    app.querySelectorAll('[data-openmatch]').forEach(function (c) {
      var open = function () { go('saved', c.dataset.openmatch); };
      c.onclick = function (e) { if (e.target.closest('[data-delmatch]')) return; open(); };
      c.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
    var pasteBtn = $('#openCode');
    if (pasteBtn) pasteBtn.onclick = function () {
      var raw = $('#codeInput').value.trim();
      if (!raw) return;
      var code = raw.indexOf('#s=') >= 0 ? raw.split('#s=')[1] : raw;
      go('shared', code.replace(/[\s"']/g, ''));
    };
    renderAISettings();
    renderAccount();
    app.querySelectorAll('[data-delmatch]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        if (!confirm('이 궁합 기록을 삭제합니다.')) return;
        matchStore = matchStore.filter(function (x) { return x.id !== b.dataset.delmatch; });
        save(K.match, matchStore); render();
      };
    });
  }

  /* ---------- 이미지 · PDF ---------- */
  function imgErr(e) {
    var code = e && e.code;
    if (code === 'declined') return;
    if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled') toast('이 화면에서는 저장이 막혀 있습니다. 웹사이트에서 저장하세요.');
    else if (code === 'rate_limited') toast('저장 창이 이미 열려 있습니다.');
    else toast('이미지 저장에 실패했습니다');
  }
  function saveImage(makeCanvas, filename) {
    toast('이미지를 만드는 중…');
    return makeCanvas().then(function (cv) { return Card.save(cv, filename); })
      .then(function () { toast('이미지를 저장했습니다'); })
      .catch(imgErr);
  }
  /** 전체 내용을 담은 긴 이미지. 너무 길면 여러 장으로 나뉜다. */
  function saveFullImage(makeCanvases, base) {
    toast('전체 이미지를 만드는 중…');
    return makeCanvases().then(function (list) {
      if (list.length > 1) toast(list.length + '장으로 나눠 저장합니다');
      return Card.saveAll(list, base).then(function (n) {
        toast(n > 1 ? n + '장을 저장했습니다' : '이미지를 저장했습니다');
      });
    }).catch(imgErr);
  }
  /** 인쇄 대화상자를 거치지 않고 PDF 파일을 직접 만들어 저장한다 */
  function savePDF(makeCanvases, base) {
    toast('PDF를 만드는 중…');
    return makeCanvases().then(function (list) {
      return Card.toPDF(list, base + '.pdf').then(function () {
        toast(list.length + '쪽 PDF를 저장했습니다');
      });
    }).catch(function (e) {
      var code = e && e.code;
      if (code === 'declined') return;
      if (code === 'pdf_lib') toast(e.message || 'PDF 모듈을 불러오지 못했습니다');
      else if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled') toast('이 화면에서는 저장이 막혀 있습니다. 웹사이트에서 저장하세요.');
      else if (code === 'rejected_extension' || code === 'extension_not_enabled') toast('이 화면에서는 PDF 저장이 막혀 있습니다. 전체 이미지로 저장하세요.');
      else toast('PDF 저장에 실패했습니다. 전체 이미지로 저장해 보세요.');
    });
  }
  /** 브라우저 인쇄 (원하는 사람만) */
  function printPDF() {
    document.querySelectorAll('details.glossary').forEach(function (d) { d.open = false; });
    toast('인쇄 창에서 대상을 "PDF로 저장"으로 고르세요');
    setTimeout(function () {
      try { window.print(); }
      catch (e) { toast('이 브라우저에서는 인쇄 창을 열 수 없습니다. "PDF로 저장"을 쓰세요.'); }
    }, 250);
  }

  /* ---------- 계정 · 동기화 ---------- */
  function codeUI() {
    return '<details class="adv" style="margin-top:14px"><summary>동기화 코드로 옮기기 (서버 없이)</summary>' +
      '<p class="gnote">이 브라우저의 모든 기록(사람·해석·궁합)을 코드 하나로 만들어 다른 기기에 붙여넣습니다. 아티팩트와 웹사이트 사이에도 옮길 수 있습니다.</p>' +
      '<div class="row-actions" style="margin-top:12px"><button class="btn ghost sm" id="expAll">내보내기 코드 복사</button></div>' +
      '<div class="share-url hidden" id="expOut"></div>' +
      '<div class="field-grid" style="margin-top:14px"><div class="f f-12"><label for="impCode">가져오기</label>' +
      '<input id="impCode" placeholder="다른 기기에서 복사한 코드" autocomplete="off"></div></div>' +
      '<div class="row-actions"><button class="btn ghost sm" id="impAll">가져와서 합치기</button></div></details>';
  }
  function wireCode() {
    var ex = $('#expAll'), im = $('#impAll');
    if (ex) ex.onclick = function () {
      packShare({ v: 1, t: 'all', people: people, solo: soloStore, match: matchStore }).then(function (code) {
        var out = $('#expOut'); out.classList.remove('hidden'); out.textContent = code;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(
          function () { toast('내보내기 코드를 복사했습니다 (' + Math.round(code.length / 1024 * 10) / 10 + 'KB)'); },
          function () { toast('아래 상자에서 직접 복사하세요'); });
      }).catch(function () { toast('코드를 만들지 못했습니다'); });
    };
    if (im) im.onclick = function () {
      var raw = $('#impCode').value.trim(); if (!raw) return;
      unpackShare(raw.replace(/[\s"']/g, '')).then(function (d) {
        if (!d || d.t !== 'all') throw new Error('not all');
        var n = mergeData({ people: d.people, solo: d.solo, match: d.match }, true);
        save(K.people, people); save(K.solo, soloStore); save(K.match, matchStore);
        toast(n + '명을 합쳤습니다'); render();
      }).catch(function () { toast('코드가 깨졌거나 동기화 코드가 아닙니다'); });
    };
  }
  /** 가져온 데이터를 합친다. union=true 면 이름 기준 중복만 빼고 더하고, false 면 원격이 로컬을 대체한다 */
  function mergeData(d, union) {
    var added = 0;
    if (d.people) {
      if (union) {
        var keyOf = function (p) { return [p.name, p.y, p.m, p.d, p.hour, p.cal].join('|'); };
        var have = {}; people.forEach(function (p) { have[keyOf(p)] = 1; });
        d.people.forEach(function (p) { if (!have[keyOf(p)]) { people.push(p); have[keyOf(p)] = 1; added++; } });
      } else { people = d.people; }
    }
    if (d.solo) soloStore = union ? Object.assign({}, soloStore, d.solo) : d.solo;
    if (d.match) {
      if (union) {
        var ids = {}; matchStore.forEach(function (m) { ids[m.id] = 1; });
        d.match.forEach(function (m) { if (!ids[m.id]) matchStore.push(m); });
        matchStore.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      } else { matchStore = d.match; }
    }
    return added;
  }
  /** 서버에서 내려받아 로컬을 맞춘다 (로그인 상태가 기준). 첫 로그인이면 이 기기 데이터를 합칠지 묻는다 */
  function pullAndMerge(firstLogin) {
    return Sync.pull().then(function (remote) {
      if (!remote) return;
      var remoteEmpty = !(remote.people && remote.people.length) && !(remote.match && remote.match.length);
      var localHas = people.length || matchStore.length;
      if (remoteEmpty && localHas) {
        // 계정이 비어 있고 이 기기에 기록이 있다 → 그대로 올린다
        return Sync.pushNow(allData()).then(function () { toast('이 기기의 기록을 계정에 올렸습니다'); });
      }
      var localOnly = localHas && firstLogin && people.some(function (p) {
        return !(remote.people || []).some(function (q) { return q.name === p.name && q.y === p.y && q.m === p.m && q.d === p.d; });
      });
      if (localOnly && confirm('이 기기에만 있는 기록이 있습니다. 계정 기록과 합칠까요?\n"취소"를 누르면 계정 기록으로 덮어씁니다.')) {
        mergeData(remote, true);
        saveLocal(K.people, people); saveLocal(K.solo, soloStore); saveLocal(K.match, matchStore);
        return Sync.pushNow(allData()).then(function () { toast('합쳐서 올렸습니다'); });
      }
      mergeData(remote, false);
      saveLocal(K.people, people); saveLocal(K.solo, soloStore); saveLocal(K.match, matchStore);
    }).catch(function (e) { toast('동기화 실패: ' + Sync.errText(e)); });
  }
  function updateAcctChip(u) {
    var chip = $('#acct');
    if (!chip) {
      chip = el('<button type="button" class="acct hidden" id="acct" title="계정"></button>');
      var top = document.querySelector('.top'), th = $('#theme');
      if (top && th) top.insertBefore(chip, th);
      chip.onclick = function () {
        go('home');
        setTimeout(function () { var s = $('#accsec'); if (s) s.scrollIntoView({ behavior: 'smooth' }); }, 60);
      };
    }
    if (u) { chip.textContent = '☁ ' + Sync.name(); chip.classList.remove('hidden'); }
    else chip.classList.add('hidden');
  }
  function renderAccount() {
    var body = $('#accbody'), note = $('#accnote');
    if (!body || !note) return;
    if (!window.Sync || !Sync.configured()) {
      note.textContent = (window.claude && window.claude.use) ? '로그인은 웹사이트에서 · 여기서는 코드로 옮기기' : '로그인 서버가 아직 연결되지 않았습니다';
      body.innerHTML = '<p style="font-size:14px;color:var(--fg-2);margin:0;max-width:64ch">' +
        ((window.claude && window.claude.use)
          ? '이 화면(claude.ai)에서는 외부 서버 연결이 막혀 있어 닉네임 로그인을 쓸 수 없습니다. 아래 코드로 웹사이트나 다른 기기에 기록을 옮기세요.'
          : '닉네임·비밀번호 로그인은 관리자가 <code>config.js</code>에 Firebase 설정을 넣으면 켜집니다. 그 전에는 아래 코드 방식으로 기기 간에 옮길 수 있습니다.') +
        '</p>' + codeUI();
      wireCode(); return;
    }
    Sync.init().then(function (ok) {
      if (!ok) {
        note.textContent = '서버 연결 실패';
        body.innerHTML = '<div class="alert">동기화 서버에 연결하지 못했습니다. 잠시 뒤 새로 고침하세요.</div>' + codeUI();
        wireCode(); return;
      }
      var u = Sync.user();
      if (u) {
        note.textContent = Sync.name() + ' 님 · 로그인됨';
        body.innerHTML = '<div class="form-card"><p style="margin:0 0 12px;font-size:14.5px;color:var(--fg-2)">이 닉네임으로 로그인한 모든 기기에서 같은 기록을 봅니다. 저장할 때마다 자동으로 올라갑니다.</p>' +
          '<div class="row-actions" style="margin-top:0"><button class="btn sm" id="syncNow">지금 동기화</button>' +
          '<button class="btn ghost sm" id="logout">로그아웃</button></div>' +
          '<div class="mono" id="syncStat" style="margin-top:10px;font-size:12px;color:var(--fg-3)">' +
          (Sync.lastPullAt() ? '마지막 내려받기 ' + new Date(Sync.lastPullAt()).toLocaleTimeString('ko-KR') : '') + '</div></div>' + codeUI();
        $('#syncNow').onclick = function () {
          var b = $('#syncNow'); b.disabled = true;
          pullAndMerge(false).then(function () { toast('동기화했습니다'); render(); });
        };
        $('#logout').onclick = function () {
          Sync.logout().then(function () { toast('로그아웃했습니다. 이 기기의 기록은 그대로 남습니다.'); render(); });
        };
      } else {
        note.textContent = '로그인하면 다른 기기에서도 기록이 그대로 보입니다';
        body.innerHTML = '<div class="form-card">' +
          '<div class="row-actions" style="margin-top:0"><button class="btn" id="accGoogle">Google 계정으로 로그인</button>' +
          '<span style="font-size:13px;color:var(--fg-3)">가장 간단합니다. 비밀번호를 따로 만들지 않습니다.</span></div>' +
          '<div style="display:flex;align-items:center;gap:12px;margin:18px 0 14px;color:var(--fg-3);font-size:12.5px"><span style="flex:1;height:1px;background:var(--line)"></span>또는 닉네임으로<span style="flex:1;height:1px;background:var(--line)"></span></div>' +
          '<div class="field-grid">' +
          '<div class="f f-6"><label for="accName">닉네임</label><input id="accName" autocomplete="username" placeholder="다른 사람과 겹치지 않는 이름"></div>' +
          '<div class="f f-6"><label for="accPw">비밀번호 (6자 이상)</label><input id="accPw" type="password" autocomplete="current-password"></div></div>' +
          '<div class="row-actions"><button class="btn" id="accLogin">로그인</button><button class="btn ghost" id="accReg">새 계정 만들기</button></div>' +
          '<div class="alert err hidden" id="accErr"></div>' +
          '<p style="font-size:13px;color:var(--fg-3);margin:14px 0 0;max-width:64ch">이메일을 받지 않으므로 <b>비밀번호를 잊으면 복구할 수 없습니다.</b> 비밀번호는 서버(Firebase)가 암호화해 보관하며 이 페이지는 저장하지 않습니다.</p>' +
          '</div>' + codeUI();
        var errEl = $('#accErr');
        function showErr(m) { if (m) { errEl.textContent = m; errEl.classList.remove('hidden'); } else errEl.classList.add('hidden'); }
        function go2(fn) {
          var name = $('#accName').value, pw = $('#accPw').value;
          showErr(''); $('#accLogin').disabled = $('#accReg').disabled = true;
          fn(name, pw).then(function () {
            return pullAndMerge(true);
          }).then(function () { toast(Sync.name() + ' 님, 로그인했습니다'); render(); })
            .catch(function (e) { showErr(Sync.errText(e)); $('#accLogin').disabled = $('#accReg').disabled = false; });
        }
        $('#accLogin').onclick = function () { go2(Sync.login); };
        $('#accReg').onclick = function () { go2(Sync.register); };
        $('#accGoogle').onclick = function () { go2(function () { return Sync.loginGoogle(); }); };
        $('#accPw').onkeydown = function (e) { if (e.key === 'Enter') go2(Sync.login); };
      }
      wireCode();
    });
  }

  function renderAISettings() {
    var body = $('#aibody'), prov = $('#aiprov');
    if (!body || !prov) return;
    AIP.provider().then(function (p) {
      if (p === 'sample') {
        prov.textContent = '이 화면에서는 보는 사람의 Claude 계정으로 씁니다. 키가 필요 없습니다.';
        body.innerHTML = '<p style="font-size:14px;color:var(--fg-2);margin:0;max-width:62ch">첫 해석을 만들 때 “Use Claude” 허용 창이 한 번 뜹니다. ' +
          '허용하면 이후로는 바로 씁니다. 해석 비용은 보는 사람의 Claude 사용량에서 나갑니다.</p>';
        return;
      }
      var cur = AIP.getProvider();
      var all = AIP.PROVIDERS.filter(function (x) { return x.id !== 'firebase' || AIP.firebaseAvailable(); });
      var PV = all.filter(function (x) { return x.id === cur; })[0] || all[0];
      var keyless = !!PV.keyless;
      var freeGuide =
        '<div class="banner" style="display:block;margin:0 0 16px">' +
        '<b>돈 안 내고 쓰는 방법</b>' +
        '<div style="font-size:13.5px;color:var(--fg-2);margin-top:8px;line-height:1.7">' +
        '· <b>Gemini</b> — 지금 이 화면 기본값. 아무것도 등록할 필요 없습니다.<br>' +
        '· <b>Claude</b> — 아래 “Claude로 보기”를 누르면 <b>본인 Claude 계정</b>으로 키 없이 해석이 나옵니다. 무료 계정도 됩니다.<br>' +
        '· <b>ChatGPT</b> — OpenAI는 무료 API가 없습니다. 대신 <b>OpenRouter</b>에 무료 가입하면 결제 없이 큰 모델들을 쓸 수 있습니다.' +
        '</div>' +
        '<div class="row-actions" style="margin-top:12px">' +
        '<a class="btn sm" href="' + CLAUDE_URL + '" target="_blank" rel="noopener" style="text-decoration:none">Claude로 보기 ↗</a>' +
        '<button type="button" class="btn ghost sm" id="pickOR">OpenRouter 무료 모델 쓰기</button>' +
        '</div></div>';
      prov.textContent = keyless ? '켜져 있음 · ' + AIP.describe() + ' · 설정 불필요'
        : (p === 'apikey' ? '켜져 있음 · ' + AIP.describe() : '꺼져 있음 — 계산 결과와 핵심 판정만 표시됩니다');
      body.innerHTML = freeGuide +
        '<div class="form-card">' +
        '<div class="seg" id="provseg" style="flex-wrap:wrap">' + all.map(function (x) {
          return '<button type="button" data-v="' + x.id + '" aria-pressed="' + (x.id === cur) + '" style="flex:1 1 45%">' +
            esc(x.label) + ' <small style="opacity:.75">' + esc(x.vendor) + '</small></button>';
        }).join('') + '</div>' +
        '<p class="gnote">' + esc(PV.note) +
        (PV.keyUrl ? ' <a href="' + PV.keyUrl + '" target="_blank" rel="noopener">키 만들기 ↗</a>' : '') + '</p>' +
        '<div class="field-grid" style="margin-top:14px">' +
        (keyless ? '' :
          '<div class="f f-12"><label for="aikey">' + esc(PV.label) + ' API 키</label>' +
          '<input id="aikey" type="password" autocomplete="off" placeholder="키 붙여넣기" value="' + esc(AIP.getKey(cur)) + '"></div>') +
        '<div class="f f-12"><label for="aimodel">모델' +
        (keyless ? '' : ' · <button type="button" id="aireload" style="background:none;border:0;padding:0;color:var(--gold);cursor:pointer;font:inherit;text-transform:none;letter-spacing:0">목록 새로 고침</button>') +
        '</label><select id="aimodel">' + modelOptions(AIP.cachedModels(cur), AIP.getModel(cur)) + '</select></div></div>' +
        '<div class="row-actions"><button class="btn" id="aisave">' + (keyless ? '모델 저장' : '저장') + '</button>' +
        (!keyless && AIP.getKey(cur) ? '<button class="btn danger" id="aiclear">키 지우기</button>' : '') + '</div>' +
        '<p style="font-size:13px;color:var(--fg-3);margin:14px 0 0;max-width:64ch">' +
        (keyless
          ? '이 방식은 방문자가 아무것도 등록하지 않아도 동작합니다. 무료 한도를 넘어 오류가 나면 잠시 뒤 다시 시도하거나, 위에서 다른 공급자를 골라 내 키를 넣으면 됩니다.'
          : '키는 이 브라우저에만 저장되고 서버로 가지 않습니다. 이 페이지에서 해당 회사 API로 직접 호출하며, 비용과 한도는 키 소유자 계정 기준입니다. 공유 링크에는 키가 절대 들어가지 않습니다.') +
        '</p></div>';
      $('#provseg').onclick = function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        AIP.setProvider(b.dataset.v); renderAISettings();
      };
      var orBtn = $('#pickOR');
      if (orBtn) orBtn.onclick = function () {
        AIP.setProvider('openrouter'); renderAISettings();
        setTimeout(function () { var k = $('#aikey'); if (k) k.focus(); }, 60);
      };
      $('#aisave').onclick = function () {
        if (!keyless) AIP.setKey(cur, $('#aikey').value);
        AIP.setModel(cur, $('#aimodel').value);
        toast(AIP.ready(cur) ? 'AI 해석을 켰습니다 · ' + AIP.describe() : '키가 비어 있어 AI 해석은 꺼진 상태입니다');
        renderAISettings();
      };
      var clr = $('#aiclear');
      if (clr) clr.onclick = function () { AIP.setKey(cur, ''); toast('키를 지웠습니다'); renderAISettings(); };
      var rl = $('#aireload');
      if (rl) rl.onclick = function () {
        var k = $('#aikey').value.trim();
        if (k) AIP.setKey(cur, k);
        if (!AIP.getKey(cur) && cur !== 'openrouter') { toast('먼저 키를 넣으세요. 목록은 키로 조회합니다.'); return; }
        var sel = $('#aimodel'); sel.disabled = true; toast('모델 목록을 불러오는 중…');
        AIP.listModels(cur, true).then(function (list) {
          sel.innerHTML = modelOptions(list, sel.value); sel.disabled = false;
          toast(list.length + '개 모델을 불러왔습니다' + (list.some(function (m) { return m.free; }) ? ' · 무료 모델 포함' : ''));
        }).catch(function (e) { sel.disabled = false; toast('목록을 못 불러왔습니다: ' + errCopy(e)); });
      };
    });
  }
  function modelOptions(models, cur) {
    var has = models.some(function (m) { return m.id === cur; });
    var list = has ? models : [{ id: cur, label: cur }].concat(models);
    return list.map(function (m) {
      return '<option value="' + esc(m.id) + '"' + (m.id === cur ? ' selected' : '') + '>' + esc(m.label || m.id) + (m.free ? ' · 무료' : '') + '</option>';
    }).join('');
  }

  /* ============================================================
     화면 : 입력 폼
     ============================================================ */
  function formHTML(v, idx) {
    v = v || {};
    var id = 'f' + (idx === undefined ? '' : idx);
    var now = new Date();
    return '<div class="form-card" data-form="' + (idx === undefined ? '0' : idx) + '">' +
      '<div class="field-grid">' +
      '<div class="f f-6"><label for="' + id + 'n">이름</label>' +
      '<input id="' + id + 'n" data-k="name" value="' + esc(v.name || '') + '" placeholder="이름 또는 별칭" autocomplete="off"></div>' +
      '<div class="f f-6"><label>성별</label><div class="seg" data-seg="gender">' +
      '<button type="button" data-v="M" aria-pressed="' + ((v.gender || 'M') === 'M') + '">남자</button>' +
      '<button type="button" data-v="F" aria-pressed="' + (v.gender === 'F') + '">여자</button></div></div>' +

      '<div class="f f-12"><label>달력</label><div class="seg" data-seg="cal">' +
      '<button type="button" data-v="solar" aria-pressed="' + ((v.cal || 'solar') === 'solar') + '">양력</button>' +
      '<button type="button" data-v="lunar" aria-pressed="' + (v.cal === 'lunar') + '">음력 평달</button>' +
      '<button type="button" data-v="lunarleap" aria-pressed="' + (v.cal === 'lunar' && v.leap) + '">음력 윤달</button></div></div>' +

      '<div class="f f-4"><label for="' + id + 'y">년</label>' +
      '<input id="' + id + 'y" data-k="y" type="number" min="1900" max="2100" value="' + (v.y || '') + '" placeholder="' + (now.getFullYear() - 30) + '"></div>' +
      '<div class="f f-4"><label for="' + id + 'm">월</label>' +
      '<input id="' + id + 'm" data-k="m" type="number" min="1" max="12" value="' + (v.m || '') + '" placeholder="1"></div>' +
      '<div class="f f-4"><label for="' + id + 'd">일</label>' +
      '<input id="' + id + 'd" data-k="d" type="number" min="1" max="31" value="' + (v.d || '') + '" placeholder="1"></div>' +

      '<div class="f f-4"><label for="' + id + 'h">시</label>' +
      '<input id="' + id + 'h" data-k="hour" type="number" min="0" max="23" value="' + (v.hour === undefined ? '' : v.hour) + '" placeholder="0~23"></div>' +
      '<div class="f f-4"><label for="' + id + 'i">분</label>' +
      '<input id="' + id + 'i" data-k="minute" type="number" min="0" max="59" value="' + (v.minute === undefined ? '' : v.minute) + '" placeholder="0~59"></div>' +
      '<div class="f f-4"><label>출생시각</label><div class="seg" data-seg="unknown">' +
      '<button type="button" data-v="0" aria-pressed="' + (!v.unknown) + '">안다</button>' +
      '<button type="button" data-v="1" aria-pressed="' + (!!v.unknown) + '">모른다</button></div></div>' +

      '<div class="f f-12 notime-hint' + (v.unknown ? '' : ' hidden') + '">' +
      '<span style="font-size:13px;color:var(--warn);line-height:1.6">' +
      '시각 없이도 사주가 나옵니다. 다만 <b>시주(時柱)를 못 세워 정확하지 않을 수 있습니다</b> — ' +
      '오행 비율·일간 강약·용신이 달라질 수 있고, 자식운·말년운은 볼 수 없습니다. 결과 화면에 자세히 안내합니다.</span></div>' +

      '</div>' +
      '<details class="adv"><summary>고급 설정 — 시간 보정·야자시·출생지 경도</summary><div class="field-grid">' +
      '<div class="f f-12"><label>시간 보정</label><div class="seg" data-seg="timeMode">' +
      '<button type="button" data-v="std30" aria-pressed="' + ((v.timeMode || 'std30') === 'std30') + '">−30분 (일반 만세력)</button>' +
      '<button type="button" data-v="true" aria-pressed="' + (v.timeMode === 'true') + '">진태양시 (경도+균시차)</button>' +
      '<button type="button" data-v="none" aria-pressed="' + (v.timeMode === 'none') + '">보정 없음</button></div>' +
      '<span style="font-size:12.5px;color:var(--fg-3)">국내 만세력 앱 대부분은 −30분 방식을 씁니다. 다른 곳에서 본 결과와 시주가 다르면 이 설정을 맞춰보세요.</span></div>' +
      '<div class="f f-6"><label>23시~24시 일주</label><div class="seg" data-seg="lateZi">' +
      '<button type="button" data-v="1" aria-pressed="' + (v.lateZi !== false) + '">다음날로</button>' +
      '<button type="button" data-v="0" aria-pressed="' + (v.lateZi === false) + '">당일 유지</button></div></div>' +
      '<div class="f f-12"><label for="' + id + 'lon">출생지 경도 (동경)</label>' +
      '<select id="' + id + 'lon" data-k="lon">' +
      [['126.9784', '서울 · 경기 (127.0°)'], ['129.0756', '부산 (129.1°)'], ['128.6014', '대구 (128.6°)'],
      ['126.7052', '인천 (126.7°)'], ['126.8526', '광주 (126.9°)'], ['127.3845', '대전 (127.4°)'],
      ['129.3114', '울산 (129.3°)'], ['128.6811', '강릉 (128.7°)'], ['126.5312', '제주 (126.5°)'],
      ['139.6917', '도쿄 (139.7°)'], ['116.4074', '베이징 (116.4°)'], ['121.4737', '상하이 (121.5°)'],
      ['135', '보정 안 함 (135°)']].map(function (o) {
        return '<option value="' + o[0] + '"' + (String(v.lon || 126.9784) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select></div>' +
      '</div></details>' +
      '<div class="alert err hidden"></div>' +
      '</div>';
  }

  function readForm(card) {
    var v = { lon: 126.9784, timeMode: 'std30', lateZi: true, gender: 'M', cal: 'solar', leap: false };
    card.querySelectorAll('[data-k]').forEach(function (i) {
      var k = i.dataset.k, val = i.value.trim();
      if (k === 'name') v.name = val;
      else if (k === 'lon') v.lon = parseFloat(val);
      else v[k] = val === '' ? undefined : parseInt(val, 10);
    });
    card.querySelectorAll('[data-seg]').forEach(function (s) {
      var on = s.querySelector('[aria-pressed="true"]');
      var val = on ? on.dataset.v : null;
      var k = s.dataset.seg;
      if (k === 'cal') { v.cal = (val === 'solar') ? 'solar' : 'lunar'; v.leap = (val === 'lunarleap'); }
      else if (k === 'gender') v.gender = val;
      else if (k === 'unknown') v.unknown = val === '1';
      else if (k === 'timeMode') v.timeMode = val || 'std30';
      else if (k === 'lateZi') v.lateZi = val === '1';
    });
    return v;
  }

  function validateForm(v) {
    if (!v.name) return '이름을 넣으세요.';
    if (!v.y || !v.m || !v.d) return '생년월일을 모두 넣으세요.';
    if (v.y < 1900 || v.y > 2100) return '1900~2100년만 계산합니다.';
    if (v.m < 1 || v.m > 12) return '월은 1~12입니다.';
    if (v.d < 1 || v.d > 31) return '일은 1~31입니다.';
    if (!v.unknown) {
      if (v.hour === undefined) return '출생 시각을 넣거나 "모른다"를 고르세요.';
      if (v.hour < 0 || v.hour > 23) return '시는 0~23입니다.';
      if (v.minute !== undefined && (v.minute < 0 || v.minute > 59)) return '분은 0~59입니다.';
    }
    if (v.minute === undefined) v.minute = 0;
    if (v.unknown) { v.hour = 12; v.minute = 0; }
    try { S.compute({ name: v.name, gender: v.gender, calType: v.cal, leap: v.leap, y: v.y, m: v.m, d: v.d, hour: v.hour, minute: v.minute, unknownTime: v.unknown, lon: v.lon, timeMode: v.timeMode, lateZi: v.lateZi }); }
    catch (e) { return e.message; }
    return null;
  }

  function wireForm(card) {
    card.querySelectorAll('[data-seg]').forEach(function (s) {
      s.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        s.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (s.dataset.seg === 'unknown') {
          var on = b.dataset.v === '1';
          card.querySelectorAll('[data-k="hour"],[data-k="minute"]').forEach(function (i) { i.disabled = on; });
          var hint = card.querySelector('.notime-hint');
          if (hint) hint.classList.toggle('hidden', !on);
        }
      });
    });
    var unk = card.querySelector('[data-seg="unknown"] [aria-pressed="true"]');
    if (unk && unk.dataset.v === '1') {
      card.querySelectorAll('[data-k="hour"],[data-k="minute"]').forEach(function (i) { i.disabled = true; });
    }
  }
  function showErr(card, msg) {
    var a = card.querySelector('.alert.err');
    if (msg) { a.textContent = msg; a.classList.remove('hidden'); }
    else a.classList.add('hidden');
  }

  function viewNew() {
    app.innerHTML = '<section class="block"><div class="sec-head"><h2>사주 입력</h2>' +
      '<span class="note">출생 시각을 모르면 "모른다"를 고르세요. 시주 없이 나머지 세 기둥으로 봅니다.</span></div>' +
      formHTML({}) + '<div class="row-actions">' +
      '<button class="btn" id="go">계산하고 사주 보기</button>' +
      '<button class="btn ghost" id="back">취소</button></div></section>';
    var card = $('.form-card', app);
    wireForm(card);
    $('#back').onclick = function () { go('home'); };
    $('#go').onclick = function () {
      var v = readForm(card), err = validateForm(v);
      showErr(card, err);
      if (err) return;
      v.id = uid();
      people.push(v); save(K.people, people);
      go('solo', v.id);
    };
    $('input[data-k="name"]', card).focus();
  }

  /* ============================================================
     화면 : 개인 사주
     ============================================================ */
  function viewSolo(person, opts) {
    opts = opts || {};
    var R;
    try { R = computeOf(person); }
    catch (e) {
      app.innerHTML = '<section class="block"><div class="alert">' + esc(e.message) + '</div>' +
        '<div class="row-actions"><button class="btn ghost" id="errhome">처음으로</button></div></section>';
      $('#errhome').onclick = function () { go('home'); };
      return;
    }
    var store = opts.store || (soloStore[person.id] = soloStore[person.id] || {});
    var defs = I.SOLO_SECTIONS;
    var hasAll = defs.every(function (d) { return store[d.id]; });

    var h = [];
    h.push('<div class="hero" style="padding:34px 0 24px"><div class="eyebrow">사주 원국</div>' +
      '<h1 style="font-size:clamp(26px,4vw,38px)">' + nameTag(person, R) + '</h1>' +
      '<p class="mono" style="font-size:14px">' + esc(personLabel(person)) +
      (R.unknownTime ? ' <span class="notime">시각모름</span>' : '') +
      ' · ' + R.active.map(function (q) { return S.gz(q.s, q.b); }).join(' ') +
      (R.unknownTime ? ' <span style="color:var(--fg-3)">+ 시주 없음</span>' : '') + '</p></div>');

    h.push('<section class="block">' +
      (R.unknownTime ? unknownTimeNote(null) : '') +
      plateHTML(R) + panelsHTML(R) + GL.sectionHTML() + '</section>');

    h.push('<section class="block"><div class="sec-head"><h2>올해 · 연애 · 건강 · 첫인상 · 외모</h2>' +
      '<span class="note">계산에서 바로 나온 값입니다. 재미로 보세요</span></div>' +
      personaHTML(R, null) + '</section>');

    h.push('<section class="block"><div class="sec-head"><h2>해석</h2>' +
      '<span class="note">총평 · 심리 · 재물 · 금전 · 사업 · 직업 · 인연 · 연애결혼 · 전생 10개 항목</span></div>' +
      '<div class="row-actions" style="margin-top:0">' +
      '<button class="btn" id="gen">' + (hasAll ? '해석 다시 생성' : '해석 생성하기') + '</button>' +
      '<button class="btn ghost" id="share">링크 공유</button>' +
      '<button class="btn ghost" id="imgFull">전체 이미지 저장</button>' +
      '<button class="btn ghost" id="img">요약 카드</button>' +
      '<button class="btn ghost" id="pdf">PDF로 저장</button>' +
      '<button class="btn ghost" id="print">브라우저 인쇄</button>' +
      (readOnly ? '' : '<button class="btn ghost" id="home">저장된 목록</button>') +
      '</div>' + progressHTML('prog') + '<div id="aistat"></div>' +
      '<div id="sharebox"></div>' +
      sectionsHTML(defs, store, 'sections', function (id) { return RU.solo(R, id); }) + '</section>');

    h.push('<section class="block">' + chatHTML('chat', [
      '올해 나한테 제일 중요한 게 뭡니까?',
      '내 약점을 어떻게 보완합니까?',
      '이직해도 되는 시기는 언제입니까?',
      '돈이 어디서 새고 있습니까?'
    ]) + '</section>');

    app.innerHTML = h.join('');

    wireShinsal(R);
    if (!readOnly) $('#home').onclick = function () { go('home'); };
    $('#gen').onclick = function () { generate(true); };
    $('#share').onclick = function () { shareUI('solo', { person: person, store: store }); };
    $('#img').onclick = function () { saveImage(function () { return Card.solo(R, person, store); }, 'saju_' + person.name + '.png'); };
    $('#imgFull').onclick = function () {
      saveFullImage(function () { return Card.soloFull(R, person, store, defs); }, 'saju_' + person.name + '_전체');
    };
    $('#pdf').onclick = function () {
      savePDF(function () { return Card.soloFull(R, person, store, defs, Card.PDF_PAGE); }, 'saju_' + person.name);
    };
    $('#print').onclick = printPDF;
    wireChat('chat', function () { return I.chatSeed(I.brief(R), Object.keys(store).map(function (k) { return store[k]; }).join('\n\n')); });

    function generate(force) {
      var btn = $('#gen');
      if (btn) btn.disabled = true;
      var ids = force ? defs.map(function (d) { return d.id; })
        : defs.filter(function (d) { return !store[d.id]; }).map(function (d) { return d.id; });
      var batches = I.SOLO_BATCHES.map(function (b) {
        return b.filter(function (x) { return ids.indexOf(x) >= 0; });
      }).filter(function (b) { return b.length; });
      if (!batches.length) { if (btn) btn.disabled = false; return; }
      function persist() { if (!readOnly) { soloStore[person.id] = store; save(K.solo, soloStore); } }
      Loader.show({
        names: [nameTag(person, R)], glyphs: R.active, total: batches.length,
        sub: '항목 ' + ids.length + '개 · 호출 ' + batches.length + '회'
      });
      runBatches({
        batches: batches, defs: defs, store: store, refresh: !!force,
        root: $('#sections'), progressEl: $('#prog'),
        rules: function (id) { return RU.solo(R, id); },
        onNoAI: function () { Loader.hide(); aiOffNote($('#aistat')); if (btn) btn.disabled = false; },
        buildPrompt: function (bids) { return I.soloPrompt(R, bids); },
        onBatch: persist,
        onDone: function (r) {
          if (btn) { btn.disabled = false; btn.textContent = '해석 다시 생성'; }
          persist();
          if (r && r.failed) { Loader.end(); if (!r.cancelled) toast(r.failed + '개 항목 생성에 실패했습니다. 항목의 안내를 확인하세요.'); }
          else Loader.end(person.name + '의 사주 해석이 끝났습니다');
        }
      });
    }
    // 무료로 쓰는 환경(아티팩트 sample, 설정 불필요 Gemini)은 바로 생성한다.
    // 내 API 키 모드는 키 소유자 돈이 나가므로 버튼을 눌러야 생성한다.
    AIP.provider().then(function (p) {
      if (!p) { aiOffNote($('#aistat')); return; }
      if (AIP.isFree(p) && !hasAll && !opts.noAuto) generate(false);
    });
  }

  /* ============================================================
     화면 : 궁합 인원 선택
     ============================================================ */
  var matchPick = [];
  function viewMatch() {
    matchPick = matchPick.filter(function (id) { return people.some(function (p) { return p.id === id; }); });
    var h = [];
    h.push('<div class="hero" style="padding:34px 0 22px"><div class="eyebrow">궁합</div>' +
      '<h1 style="font-size:clamp(26px,4vw,38px)">두 명이든 열 명이든</h1>' +
      '<p>고른 사람들의 모든 쌍을 하나씩 본 다음, 마지막에 전체를 한 판으로 읽습니다. ' +
      '관계 유형은 가정하지 않습니다. 연인으로 묶으면 누가 누구와 맞는지, 팀으로 굴리면 각자 무슨 자리인지까지 봅니다.</p></div>');

    h.push('<section class="block"><div class="sec-head"><h2>사람 고르기</h2>' +
      '<span class="note" id="pickcount">2명 이상 고르세요</span></div>');
    if (!people.length) {
      h.push('<div class="empty">저장된 사람이 없습니다. 아래에서 바로 추가하세요.</div>');
    } else {
      h.push('<div class="people" id="picklist">' + people.map(function (p) {
        var R = null; try { R = computeOf(p); } catch (e) { }
        return '<div class="person" role="button" tabindex="0" data-pick="' + p.id + '" aria-pressed="' + (matchPick.indexOf(p.id) >= 0) + '">' +
          '<div class="nm">' + nameTag(p, R) + ' <em>' + (p.gender === 'M' ? '남' : '여') + '</em></div>' +
          '<div class="dt">' + esc(personLabel(p)) +
          (p.unknown ? ' <span class="notime">시각모름</span>' : '') + '</div>' +
          (R ? '<div class="gzrow">' + R.pillars.map(function (q) { return S.gz(q.s, q.b); }).join(' ') + '</div>' : '') +
          '<div class="pick">' + (matchPick.indexOf(p.id) >= 0 ? '선택됨' : '&nbsp;') + '</div></div>';
      }).join('') + '</div>');
    }
    h.push('</section>');

    h.push('<section class="block"><div class="sec-head"><h2>사람 추가</h2>' +
      '<span class="note">추가하면 자동으로 선택됩니다</span></div>' + formHTML({}) +
      '<div class="row-actions"><button class="btn ghost" id="add">추가하고 선택</button></div></section>');

    h.push('<section class="block"><div class="row-actions" style="margin-top:0">' +
      '<button class="btn" id="run" disabled>궁합 보기</button>' +
      '<button class="btn ghost" id="home">처음으로</button></div></section>');

    app.innerHTML = h.join('');
    var card = $('.form-card', app);
    wireForm(card);

    function refresh() {
      app.querySelectorAll('[data-pick]').forEach(function (c) {
        var on = matchPick.indexOf(c.dataset.pick) >= 0;
        c.setAttribute('aria-pressed', String(on));
        $('.pick', c).innerHTML = on ? '선택됨' : '&nbsp;';
      });
      $('#run').disabled = matchPick.length < 2;
      $('#pickcount').textContent = matchPick.length < 2
        ? '2명 이상 고르세요 (현재 ' + matchPick.length + '명)'
        : matchPick.length + '명 선택 · 쌍 ' + (matchPick.length * (matchPick.length - 1) / 2) + '개';
    }
    function toggle(id) {
      var i = matchPick.indexOf(id);
      if (i >= 0) matchPick.splice(i, 1); else matchPick.push(id);
      refresh();
    }
    app.querySelectorAll('[data-pick]').forEach(function (c) {
      c.onclick = function () { toggle(c.dataset.pick); };
      c.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.dataset.pick); } };
    });
    $('#add').onclick = function () {
      var v = readForm(card), err = validateForm(v);
      showErr(card, err);
      if (err) return;
      v.id = uid();
      people.push(v); save(K.people, people);
      matchPick.push(v.id);
      viewMatch();
    };
    $('#home').onclick = function () { go('home'); };
    $('#run').onclick = function () { go('result', matchPick.slice()); };
    refresh();
  }

  /* ============================================================
     화면 : 궁합 결과
     ============================================================ */
  function pairKey(i, j) { return i + '-' + j; }

  function viewMatchResult(list, stores, groupStore, meta) {
    // list: person 객체 배열
    var Rs, err = null;
    try { Rs = list.map(computeOf); }
    catch (e) { err = e.message; }
    if (err) {
      app.innerHTML = '<section class="block"><div class="alert">' + esc(err) + '</div></section>';
      return;
    }
    Rs.forEach(function (R, i) { R.nameRef = list[i].name; });
    var G = S.groupAnalyze(Rs);
    var many = list.length > 2;
    var pairDefs = I.PAIR_SECTIONS;
    var pairBatches = many ? I.PAIR_BATCHES : I.PAIR_BATCHES_DEEP;
    var title = list.map(function (p) { return p.name; }).join(' · ');

    var h = [];
    h.push('<div class="hero" style="padding:34px 0 22px"><div class="eyebrow">궁합 · ' + list.length + '명</div>' +
      '<h1 style="font-size:clamp(26px,4vw,38px)">' + list.map(function (p, i) { return nameTag(p, Rs[i]); }).join(' <span style="color:var(--gold)">·</span> ') + '</h1>' +
      '<p class="mono" style="font-size:14px">평균 ' + G.avg + '점 · 최고 ' + esc(G.best.a + ' ↔ ' + G.best.b) + ' ' + G.best.total +
      '점 · 최저 ' + esc(G.worst.a + ' ↔ ' + G.worst.b) + ' ' + G.worst.total + '점</p></div>');

    /* --- 계산 요약 --- */
    var noTime = list.filter(function (p, i) { return Rs[i].unknownTime; }).map(function (p) { return p.name; });
    h.push('<section class="block"><div class="sec-head"><h2>계산 요약</h2>' +
      '<span class="note">아래 숫자는 명식 계산에서 바로 나온 값입니다</span></div>' +
      (noTime.length ? unknownTimeNote(noTime.join(', ')) : ''));

    if (many) {
      h.push('<div class="panel" style="margin-bottom:24px"><h3>쌍별 종합 점수</h3><div style="overflow-x:auto">' +
        matrixHTML(list, G) + '</div></div>');
    }

    h.push('<div class="panels">');
    h.push('<div class="panel"><h3>구성원 오행 합산</h3>' + elbarHTML(G.merged) +
      '<p style="font-size:13.5px;color:var(--fg-2);margin:10px 0 0">' +
      (G.missing.length ? '<b style="color:var(--bad)">부족: ' + G.missing.join(', ') + '</b> — 아무도 채우지 못하는 기능입니다. ' : '') +
      (G.over.length ? '<b style="color:var(--warn)">과다: ' + G.over.join(', ') + '</b> — 이 기운으로 서로 부딪힙니다.' : '') +
      (!G.missing.length && !G.over.length ? '다섯 기운이 고르게 깔렸습니다. 한쪽으로 쏠리지 않는 조합입니다.' : '') +
      '</p></div>');
    h.push('<div class="panel"><h3>기본 포지션</h3><div class="roles">' + G.roles.map(function (r, ri) {
      return '<div class="role" style="border-left-color:var(--' + ['wood', 'fire', 'earth', 'metal', 'water'][r.el] + ')">' +
        '<h4>' + nameTag(list[ri], Rs[ri]) + '</h4><div class="rl">' + esc(r.role.name) + ' — ' + esc(r.role.desc) + '</div>' +
        '<div class="meta">' + S.EL_H[r.el] + ' ' + S.EL[r.el] + ' · ' + esc(r.strength) + ' · ' + esc(r.gyeok) + '</div></div>';
    }).join('') + '</div></div>');
    h.push('</div>' + GL.sectionHTML() + '</section>');

    /* --- 재미로 보는 순위 --- */
    h.push(fortuneHTML(list, Rs));

    /* --- 쌍별 --- */
    h.push('<section class="block"><div class="sec-head"><h2>한 쌍씩</h2>' +
      '<span class="note">' + G.pairs.length + '개 쌍</span></div>' +
      '<div class="row-actions" style="margin-top:0">' +
      '<button class="btn" id="genall">전체 해석 생성' +
      (many ? ' <span class="mono" style="opacity:.7">· 호출 ' + (G.pairs.length * pairBatches.length + I.GROUP_BATCHES.length) + '회</span>' : '') +
      '</button>' +
      '<button class="btn ghost" id="share">링크 공유</button>' +
      '<button class="btn ghost" id="imgFull">전체 이미지 저장</button>' +
      '<button class="btn ghost" id="img">요약 카드</button>' +
      '<button class="btn ghost" id="pdf">PDF로 저장</button>' +
      '<button class="btn ghost" id="print">브라우저 인쇄</button>' +
      (readOnly ? '' : '<button class="btn ghost" id="savem">기록 저장</button>' +
        '<button class="btn ghost" id="home">처음으로</button>') +
      '</div>' + progressHTML('prog') + '<div id="aistat"></div><div id="sharebox"></div>');

    /* 쌍 탭 — 한 번에 한 쌍만 보고 이전/다음으로 넘긴다. 마지막 탭은 전체 종합 */
    var tabKeys = G.pairs.map(function (c) { return pairKey(c.i, c.j); });
    if (many) tabKeys.push('group');
    if (tabKeys.length > 1) {
      h.push('<nav class="pairtabs" id="pairtabs" aria-label="쌍 고르기">' +
        G.pairs.map(function (c, k) {
          return '<button type="button" data-pane="' + pairKey(c.i, c.j) + '" aria-current="' + (k === 0) + '">' +
            '<span class="nm">' + nameTag(list[c.i], Rs[c.i]) + ' <i>↔</i> ' + nameTag(list[c.j], Rs[c.j]) + '</span>' +
            '<span class="sc" style="color:' + scoreColor(c.total) + '">' + c.total + '</span>' +
            '<span class="dot" data-dot="' + pairKey(c.i, c.j) + '"></span></button>';
        }).join('') +
        (many ? '<button type="button" data-pane="group" aria-current="false" class="all">' +
          '<span class="nm">전체 종합 <i>·</i> ' + list.length + '명</span>' +
          '<span class="dot" data-dot="group"></span></button>' : '') +
        '</nav>');
    }

    G.pairs.forEach(function (c, k) {
      var key = pairKey(c.i, c.j);
      var st = stores[key] = stores[key] || {};
      h.push('<div class="pane" data-pane-id="' + key + '"' + (k === 0 ? '' : ' hidden') + '>');
      h.push('<div class="pair-card" data-pair="' + key + '"><header>' +
        '<h3>' + nameTag(list[c.i], Rs[c.i]) + ' <span class="vs">↔</span> ' + nameTag(list[c.j], Rs[c.j]) + '</h3>' +
        '<button class="btn ghost sm" data-genpair="' + key + '" style="margin-left:auto">이 쌍만 생성</button>' +
        '</header>' +
        '<div class="score-head" style="margin-bottom:18px">' +
        '<div class="score-big"><b style="color:' + scoreColor(c.total) + '">' + c.total + '</b><span>/100</span></div>' +
        '<div class="subbars">' + Object.keys(c.sub).map(function (k) {
          return '<div class="subbar"><div class="lab"><span>' + k + '</span><b>' + c.sub[k] + '</b></div>' +
            '<div class="track"><i style="width:' + c.sub[k] + '%;background:' + scoreColor(c.sub[k]) + '"></i></div></div>';
        }).join('') + '</div></div>' +
        '<dl class="kv" style="margin-bottom:14px">' +
        '<dt>' + GL.term('일간') + '</dt><dd><b>' + esc(c.dm.label) + '</b> — ' + jo(esc(c.dm.desc)) + '</dd>' +
        '<dt>' + GL.term('일지') + '</dt><dd><b>' + esc(c.dayBranch.label) + '</b> — ' + jo(esc(c.dayBranch.desc)) + '</dd>' +
        '<dt>오행</dt><dd>' + (c.balance.improved ? '둘이 만나면 균형이 좋아진다' : '둘이 만나면 한쪽으로 더 쏠린다') + '</dd>' +
        '</dl>' +
        '<div class="chips" style="margin-bottom:6px">' +
        (c.relations.length ? c.relations.map(function (r) {
          return '<span class="chip ' + (r.w > 0 ? 'good' : 'bad') + '"><span class="p">' + esc(r.p) + '</span>' + esc(r.t) + '</span>';
        }).join('') : '<span class="chip">글자끼리 합충이 하나도 없음</span>') + '</div>' +
        sectionsHTML(pairDefs, st, 'sec-' + key, function (id) { return RU.pair(Rs[c.i], Rs[c.j], c, id); }) +
        '</div>');
      if (tabKeys.length > 1) h.push(paneNavHTML(k, tabKeys));
      h.push('</div>');
    });

    /* --- 전체 종합 (마지막 탭) --- */
    if (many) {
      h.push('<div class="pane" data-pane-id="group" hidden>' +
        '<div class="sec-head" style="margin-top:8px"><h2>전체 종합</h2>' +
        '<span class="note">' + list.length + '명 전부를 한 판으로</span></div>' +
        sectionsHTML(I.GROUP_SECTIONS, groupStore, 'sec-group', function (id) { return RU.group(Rs, G, id); }) +
        paneNavHTML(tabKeys.length - 1, tabKeys) + '</div>');
    }
    h.push('</section>');

    h.push('<section class="block">' + chatHTML('chat', many ? [
      '이 중에 누가 제일 위험한 조합입니까?',
      '팀 리더는 누가 맞습니까?',
      '연인으로 묶으면 1순위는 누구입니까?',
      '누가 가장 먼저 결혼합니까?',
      '이 조합이 깨진다면 언제입니까?'
    ] : [
      '이 관계 계속 가도 됩니까?',
      '싸움이 나면 누가 먼저 굽혀야 합니까?',
      '결혼한다면 언제가 좋습니까?',
      '같이 돈을 굴려도 됩니까?'
    ]) + '</section>');

    app.innerHTML = h.join('');

    $('#genall').onclick = function () { genAll(true); };
    $('#share').onclick = function () {
      shareUI('match', { list: list, stores: stores, groupStore: groupStore });
    };
    var baseName = 'gunghap_' + list.map(function (p) { return p.name; }).join('_').slice(0, 40);
    $('#img').onclick = function () {
      saveImage(function () {
        return many ? Card.group(list, Rs, G) : Card.pair(Rs[0], Rs[1], G.pairs[0], list[0], list[1]);
      }, baseName + '.png');
    };
    $('#imgFull').onclick = function () {
      saveFullImage(function () {
        return Card.matchFull(list, Rs, G, stores, groupStore, pairDefs, many ? I.GROUP_SECTIONS : null);
      }, baseName + '_전체');
    };
    $('#pdf').onclick = function () {
      savePDF(function () {
        return Card.matchFull(list, Rs, G, stores, groupStore, pairDefs, many ? I.GROUP_SECTIONS : null, Card.PDF_PAGE);
      }, baseName);
    };
    $('#print').onclick = printPDF;
    app.querySelectorAll('[data-genpair]').forEach(function (b) {
      b.onclick = function () { genPair(b.dataset.genpair, true, true); };
    });

    /* ---- 쌍 탭 ---- */
    function showPane(id, scroll) {
      app.querySelectorAll('.pane').forEach(function (p) { p.hidden = p.dataset.paneId !== id; });
      app.querySelectorAll('#pairtabs button').forEach(function (b) {
        b.setAttribute('aria-current', String(b.dataset.pane === id));
      });
      var t = app.querySelector('#pairtabs button[aria-current="true"]');
      if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      if (scroll) {
        var tabs = $('#pairtabs');
        if (tabs) window.scrollTo({ top: tabs.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
      }
    }
    var tabsEl = $('#pairtabs');
    if (tabsEl) tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pane]'); if (!b) return;
      showPane(b.dataset.pane, false);
    });
    app.querySelectorAll('[data-goto]').forEach(function (b) {
      b.onclick = function () { showPane(b.dataset.goto, true); };
    });
    /** 탭에 "생성됨" 점을 켠다 */
    function markTabs() {
      G.pairs.forEach(function (c) {
        var key = pairKey(c.i, c.j), st = stores[key] || {};
        var d = app.querySelector('[data-dot="' + key + '"]');
        if (d) d.classList.toggle('on', pairDefs.every(function (x) { return st[x.id]; }));
      });
      var gd = app.querySelector('[data-dot="group"]');
      if (gd) gd.classList.toggle('on', I.GROUP_SECTIONS.every(function (x) { return groupStore[x.id]; }));
    }
    markTabs();
    if (!readOnly) {
      $('#home').onclick = function () { go('home'); };
      $('#savem').onclick = function () {
        var rec = {
          id: (meta && meta.id) || uid(), title: title, at: Date.now(), avg: G.avg,
          snapshot: list.map(function (p) { return Object.assign({}, p); }),
          stores: stores, groupStore: groupStore
        };
        matchStore = matchStore.filter(function (x) { return x.id !== rec.id; });
        matchStore.unshift(rec);
        if (matchStore.length > 30) matchStore.length = 30;
        save(K.match, matchStore);
        toast('궁합 기록을 저장했습니다');
      };
    }

    var ctxText = G.pairs.map(function (c) { return I.pairBrief(Rs[c.i], Rs[c.j], c); }).join('\n\n') +
      '\n\n' + I.groupBrief(Rs, G);
    wireChat('chat', function () {
      var gen = [];
      Object.keys(stores).forEach(function (k) {
        Object.keys(stores[k]).forEach(function (s) { gen.push(stores[k][s]); });
      });
      Object.keys(groupStore).forEach(function (s) { gen.push(groupStore[s]); });
      return I.chatSeed(ctxText.slice(0, 32000), gen.join('\n\n'));
    });

    function pairBatchList(key, force) {
      var st = stores[key] || {};
      var ids = force ? pairDefs.map(function (d) { return d.id; })
        : pairDefs.filter(function (d) { return !st[d.id]; }).map(function (d) { return d.id; });
      return pairBatches.map(function (b) { return b.filter(function (x) { return ids.indexOf(x) >= 0; }); })
        .filter(function (b) { return b.length; });
    }
    function groupBatchList(force) {
      var ids = force ? I.GROUP_SECTIONS.map(function (d) { return d.id; })
        : I.GROUP_SECTIONS.filter(function (d) { return !groupStore[d.id]; }).map(function (d) { return d.id; });
      return I.GROUP_BATCHES.map(function (b) { return b.filter(function (x) { return ids.indexOf(x) >= 0; }); })
        .filter(function (b) { return b.length; });
    }
    var anyFailed = 0;
    function genPair(key, force, standalone) {
      var c = G.pairs.filter(function (x) { return pairKey(x.i, x.j) === key; })[0];
      if (!c) return Promise.resolve();
      var st = stores[key];
      var batches = pairBatchList(key, force);
      if (!batches.length) return Promise.resolve();
      showPane(key, false); // 지금 쓰고 있는 쌍을 보여준다
      if (standalone) {
        anyFailed = 0;
        Loader.show({
          names: [nameTag(list[c.i], Rs[c.i]), nameTag(list[c.j], Rs[c.j])],
          glyphs: [Rs[c.i].pillars[2], Rs[c.j].pillars[2]], total: batches.length,
          sub: '이 쌍만 · 호출 ' + batches.length + '회'
        });
      }
      return runBatches({
        batches: batches, defs: pairDefs, store: st, refresh: !!force,
        root: $('#sec-' + key), progressEl: $('#prog'),
        rules: function (id) { return RU.pair(Rs[c.i], Rs[c.j], c, id); },
        onNoAI: function () { Loader.hide(); aiOffNote($('#aistat')); },
        buildPrompt: function (bids) { return I.pairPrompt(Rs[c.i], Rs[c.j], c, bids); },
        onBatch: function () { persistMatch(); markTabs(); },
        onDone: function (r) {
          persistMatch(); markTabs();
          if (r && r.failed) anyFailed += r.failed;
          if (standalone) finishLoader(c.a + ' ↔ ' + c.b + ' 궁합 해석이 끝났습니다');
        }
      });
    }
    function finishLoader(msg) {
      if (anyFailed) { Loader.end(); if (!genAbort) toast(anyFailed + '개 항목 생성에 실패했습니다. 항목의 안내를 확인하세요.'); }
      else Loader.end(msg);
    }
    function persistMatch() {
      if (readOnly || !meta || !meta.id) return;
      var rec = matchStore.filter(function (x) { return x.id === meta.id; })[0];
      if (!rec) return;
      rec.stores = stores; rec.groupStore = groupStore;
      save(K.match, matchStore);
    }
    function genGroup(force) {
      var batches = groupBatchList(force);
      if (!batches.length) return Promise.resolve();
      showPane('group', false);
      return runBatches({
        batches: batches, defs: I.GROUP_SECTIONS, store: groupStore, refresh: !!force,
        root: $('#sec-group'), progressEl: $('#prog'),
        rules: function (id) { return RU.group(Rs, G, id); },
        onNoAI: function () { Loader.hide(); aiOffNote($('#aistat')); },
        buildPrompt: function (bids) { return I.groupPrompt(Rs, G, bids); },
        onBatch: function () { persistMatch(); markTabs(); },
        onDone: function (r) { persistMatch(); markTabs(); if (r && r.failed) anyFailed += r.failed; }
      });
    }
    function genAll(force) {
      var btn = $('#genall'); if (btn) btn.disabled = true;
      var steps = 0;
      G.pairs.forEach(function (c) { steps += pairBatchList(pairKey(c.i, c.j), force).length; });
      if (many) steps += groupBatchList(force).length;
      if (!steps) { if (btn) btn.disabled = false; return; }
      anyFailed = 0;
      Loader.show({
        names: list.map(function (p, i) { return nameTag(p, Rs[i]); }),
        glyphs: Rs.slice(0, 6).map(function (R) { return R.pillars[2]; }),
        total: steps,
        sub: '쌍 ' + G.pairs.length + '개' + (many ? ' + 전체 종합' : '') + ' · 호출 ' + steps + '회'
      });
      var chain = Promise.resolve();
      G.pairs.forEach(function (c) {
        chain = chain.then(function () { if (genAbort) return; return genPair(pairKey(c.i, c.j), force); });
      });
      if (many) chain = chain.then(function () { if (genAbort) return; return genGroup(force); });
      chain.then(function () {
        if (btn) { btn.disabled = false; btn.textContent = '전체 해석 다시 생성'; }
        finishLoader('궁합 해석이 모두 끝났습니다');
      });
    }

    var anyMissing = G.pairs.some(function (c) {
      var st = stores[pairKey(c.i, c.j)];
      return pairDefs.some(function (d) { return !st[d.id]; });
    }) || (many && I.GROUP_SECTIONS.some(function (d) { return !groupStore[d.id]; }));
    // 아티팩트(sample)에서 두 명이면 바로 생성한다. 세 명 이상이거나 API 키 모드면 버튼을 누르게 한다.
    AIP.provider().then(function (p) {
      if (!p) { aiOffNote($('#aistat')); return; }
      if (!anyMissing) return;
      if (AIP.isFree(p) && !many) { genAll(false); return; }
      var pel = $('#prog');
      if (pel) pel.parentNode.insertBefore(el('<div class="banner">' +
        '<span>아래 계산 결과와 핵심 판정은 이미 완성입니다. <b>전체 해석 생성</b>을 누르면 쌍 ' + G.pairs.length +
        '개를 하나씩 길게 쓰고' + (many ? ' 마지막에 ' + list.length + '명 전체를 종합합니다.' : ' 끝냅니다.') +
        ' 한 쌍만 먼저 보려면 카드의 “이 쌍만 생성”을 누르세요.</span></div>'), pel.nextSibling);
    });
  }

  /* ---------- 캐릭터 (올해 연애·스타일·건강·이미지·옷·동물) ---------- */
  function personaHTML(R, who) {
    if (!window.Persona) return '';
    var P = Persona.of(R);
    var nm = who ? esc(who) + ' · ' : '';
    var h = ['<div class="persona">'];

    h.push('<div class="pz-animal"><span class="em">' + P.animal.emoji + '</span>' +
      '<div><h4>' + nm + '닮은 동물 — ' + esc(P.animal.name) + '</h4>' +
      '<p>' + esc(P.animal.desc) + ' ' + esc(P.animal.extra) + '</p>' +
      '<span class="mono">일간 ' + S.STEM_H[R.dm] + ' 기준 · 띠는 ' + esc(P.animal.zodiac) + '띠</span></div></div>');

    h.push('<div class="pz-grid">');

    // 올해 연애
    h.push('<div class="pz"><h4>' + P.thisYear.year + '년 연애 시기</h4>' +
      '<p class="pz-lead">세운 ' + esc(P.thisYear.gz) + '</p>' +
      '<ul>' + P.thisYear.note.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
      (P.thisYear.months.length
        ? '<div class="pz-months">' + P.thisYear.months.map(function (m) {
          return '<span class="mchip"><b>' + esc(m.m) + '</b><i>' + esc(m.gz) + '</i>' +
            '<em>' + esc(m.why.join(', ')) + '</em></span>';
        }).join('') + '</div>'
        : '<p class="pz-none">올해는 특별히 도드라지는 달이 없다. 인연보다 자기 일에 쓰는 해다.</p>') +
      '</div>');

    // 연애 스타일
    h.push('<div class="pz"><h4>연애 스타일</h4>' +
      '<p class="pz-lead">일지 ' + esc(P.loveStyle.god) + '</p>' +
      '<p>' + esc(P.loveStyle.main) + '</p>' +
      (P.loveStyle.extra.length ? '<ul>' + P.loveStyle.extra.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '</div>');

    // 만나는 사람
    h.push('<div class="pz"><h4>만나는 사람 특징</h4>' +
      '<p class="pz-lead el-' + P.partner.el + '">' + S.EL_H[P.partner.el] + ' ' + S.EL[P.partner.el] + ' 기운</p>' +
      P.partner.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>');

    // 건강운
    h.push('<div class="pz"><h4>건강운 <span class="hscore">' + P.health.score + '점 · ' + esc(P.health.grade) + '</span></h4>' +
      '<div class="gauge"><i style="width:' + P.health.score + '%;background:' + scoreColor(P.health.score) + '"></i></div>' +
      (P.health.notes.length ? '<ul>' + P.health.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      (P.health.care.length
        ? '<div class="pz-care">' + P.health.care.map(function (c) {
          return '<div><b>' + esc(c.organ) + '</b> ' + esc(c.why) + '</div>';
        }).join('') + '</div>'
        : '<p class="pz-none">특별히 약한 곳이 없다.</p>') +
      '<p class="pz-tip">용신 ' + esc(P.health.best) + ' 기운을 채우는 생활이 몸에도 좋다.</p></div>');

    // 첫인상
    h.push('<div class="pz pz-wide"><h4>첫인상</h4>' +
      '<p class="pz-lead">일간 ' + S.STEM_H[R.dm] + ' — ' + esc(P.firstLook.key) + '</p>' +
      P.firstLook.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      (P.firstLook.gap ? '<p class="pz-gap"><b>그런데</b> ' + esc(P.firstLook.gap) +
        ' <span class="mono">(일지 ' + esc(P.firstLook.dayGod) + ')</span></p>' : '') +
      '</div>');

    // 외모 특징
    h.push('<div class="pz pz-wide"><h4>외모 특징</h4>' +
      '<p class="pz-lead el-' + P.looks.el + '">' + S.EL_H[P.looks.el] + ' ' + S.EL[P.looks.el] + ' 일간의 골격</p>' +
      '<dl class="pz-look">' + P.looks.items.map(function (it) {
        return '<dt>' + esc(it.part) + '</dt><dd>' + esc(it.d) + '</dd>';
      }).join('') + '</dl>' +
      (P.looks.marks.length
        ? '<div class="pz-care">' + P.looks.marks.map(function (m) { return '<div>' + esc(m) + '</div>'; }).join('') + '</div>'
        : '') +
      '<p class="pz-tip">외모는 사주가 가장 느슨하게 맞히는 영역입니다. 경향으로만 보세요.</p></div>');

    // 남에게 보이는 이미지
    h.push('<div class="pz pz-wide"><h4>남에게 보이는 이미지</h4>' +
      '<p class="pz-lead">' + esc(P.image.role) + '</p>' +
      P.image.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      (P.image.heard.length ? '<div class="pz-heard"><b>자주 듣는 말</b>' +
        P.image.heard.map(function (x) { return '<span>“' + esc(x) + '”</span>'; }).join('') + '</div>' : '') +
      (P.image.misread.length ? '<div class="pz-care">' + P.image.misread.map(function (m) {
        return '<div><b>오해받는 지점</b> ' + esc(m) + '</div>';
      }).join('') + '</div>' : '') +
      '</div>');

    // 옷
    h.push('<div class="pz"><h4>어울리는 옷</h4>' +
      '<p class="pz-lead">' + esc(P.fashion.color) + '</p>' +
      '<p>' + esc(P.fashion.item) + '</p>' +
      '<p class="pz-avoid">피할 것 — ' + esc(P.fashion.avoidColor) + ' 계열, ' + esc(P.fashion.avoid) + '</p>' +
      '<p class="pz-tip">' + esc(P.fashion.why) + '</p></div>');

    h.push('</div></div>');
    return h.join('');
  }

  /* ---------- 재미로 보는 순위 ---------- */
  var MEDAL = ['🥇', '🥈', '🥉'];
  function fortuneHTML(list, Rs) {
    if (!window.Fortune) return '';
    var F = Fortune.rank(Rs);
    var anyNoTime = Rs.some(function (R) { return R.unknownTime; });
    var h = ['<section class="block"><div class="sec-head"><h2>재미로 보는 순위</h2>' +
      '<span class="note">사주로 뽑은 예측입니다. 그대로 믿지 마세요</span></div>'];

    h.push('<div class="fun-grid">' + F.cats.map(function (c) {
      return '<div class="fun-card"><h4>' + esc(c.title) + '</h4><ol class="fun-rank">' +
        c.rows.map(function (r) {
          return '<li' + (r.place === 1 ? ' class="top"' : '') + '>' +
            '<span class="pl">' + (MEDAL[r.place - 1] || r.place) + '</span>' +
            '<span class="nm">' + nameTag(list[r.i], Rs[r.i]) + '</span>' +
            '<span class="v">' + esc(r.label) + '</span>' +
            '<span class="sb">' + esc(r.sub) + '</span></li>';
        }).join('') + '</ol></div>';
    }).join('') + '</div>');

    h.push('<details class="adv" style="margin-top:18px"><summary>한 사람씩 — 올해 연애·스타일·건강·첫인상·외모·이미지·옷·닮은 동물</summary>' +
      list.map(function (p, i) {
        return '<div class="fun-person">' + personaHTML(Rs[i], p.name) + '</div>';
      }).join('') + '</details>');

    h.push('<details class="adv" style="margin-top:12px"><summary>순위를 왜 그렇게 봤는지</summary>' +
      F.profiles.map(function (p, i) {
        function why(a) { return a.length ? '<div class="fw">' + a.map(function (x) { return esc(x); }).join(' · ') + '</div>' : ''; }
        return '<div class="fun-person"><h4>' + nameTag(list[i], Rs[i]) +
          (p.unknownTime ? ' <span class="notime">시각모름</span>' : '') + '</h4>' +
          '<dl class="kv">' +
          '<dt>첫 연애</dt><dd><b>' + p.firstLove.age + '세</b> (' + p.firstLove.year + '년쯤)' + why(p.firstLove.why) + '</dd>' +
          '<dt>결혼</dt><dd><b>' + p.marriage.age + '세</b> (' + p.marriage.year + '년쯤) · 결혼 의지 ' + p.marriage.will + '/100' +
          (p.marriage.will < 35 ? ' — 혼자 사는 쪽도 충분히 가능하다' : '') + why(p.marriage.why) + '</dd>' +
          '<dt>연애 횟수</dt><dd><b>결혼 전까지 약 ' + p.count.n + '번</b>' + why(p.count.why) + '</dd>' +
          '<dt>연애 기간</dt><dd><b>평균 ' + esc(p.duration.label) + '</b>' + why(p.duration.why) + '</dd>' +
          '<dt>취직</dt><dd><b>' + p.job.age + '세</b> (' + p.job.year + '년쯤) · ' + esc(p.job.path) + why(p.job.why) + '</dd>' +
          '<dt>건강운</dt><dd><b>' + p.health.score + '점 · ' + esc(p.health.grade) + '</b>' + why(p.health.notes) + '</dd>' +
          '</dl></div>';
      }).join('') + '</details>');

    h.push('<p class="fun-note">대운에서 배우자성(남자는 재성, 여자는 관성)·관성이 들어오는 구간을 잡고 ' +
      '도화·합충·공망 같은 구조로 보정한 값입니다. 명리에서 시기를 잡는 흔한 방식이지만 ' +
      '<b>사람의 선택과 환경이 훨씬 크게 작용합니다.</b> 순위는 놀이로만 보세요.' +
      (anyNoTime ? ' 출생 시각을 모르는 사람이 있어 더 헐거운 값입니다.' : '') + '</p>');

    return h.join('') + '</section>';
  }

  function paneNavHTML(k, keys) {
    return '<div class="pane-nav">' +
      (k > 0 ? '<button class="btn ghost sm" data-goto="' + keys[k - 1] + '">← 이전 쌍</button>' : '<span></span>') +
      '<span class="mono">' + (k + 1) + ' / ' + keys.length + '</span>' +
      (k < keys.length - 1
        ? '<button class="btn ghost sm" data-goto="' + keys[k + 1] + '">' +
          (keys[k + 1] === 'group' ? '전체 종합 보기 →' : '다음 쌍 →') + '</button>'
        : '<span></span>') +
      '</div>';
  }

  function scoreColor(v) {
    if (v >= 75) return 'var(--wood)';
    if (v >= 58) return 'var(--gold)';
    if (v >= 42) return 'var(--earth)';
    return 'var(--fire)';
  }
  function matrixHTML(list, G) {
    var n = list.length, i, j;
    var h = ['<table class="matrix"><thead><tr><th></th>'];
    for (j = 0; j < n; j++) h.push('<th>' + nameTag(list[j]) + '</th>');
    h.push('</tr></thead><tbody>');
    for (i = 0; i < n; i++) {
      h.push('<tr><th class="rowh">' + nameTag(list[i]) + '</th>');
      for (j = 0; j < n; j++) {
        if (i === j) { h.push('<td class="self">—</td>'); continue; }
        var c = G.pairs.filter(function (p) {
          return (p.i === i && p.j === j) || (p.i === j && p.j === i);
        })[0];
        h.push('<td style="background:color-mix(in srgb,' + scoreColor(c.total) + ' 16%, transparent)">' +
          '<b style="color:' + scoreColor(c.total) + '">' + c.total + '</b></td>');
      }
      h.push('</tr>');
    }
    h.push('</tbody></table>');
    return h.join('');
  }

  /* ============================================================
     공유
     ============================================================ */
  function slimPerson(p) {
    return {
      n: p.name, g: p.gender, c: p.cal, l: p.leap ? 1 : 0,
      y: p.y, o: p.m, d: p.d, h: p.hour, i: p.minute, u: p.unknown ? 1 : 0,
      lo: p.lon, tm: p.timeMode || (p.trueSolar === false ? 'none' : 'std30'), lz: p.lateZi === false ? 0 : 1
    };
  }
  function fatPerson(s) {
    return {
      id: uid(), name: s.n, gender: s.g, cal: s.c, leap: !!s.l,
      y: s.y, m: s.o, d: s.d, hour: s.h, minute: s.i, unknown: !!s.u,
      lon: s.lo, timeMode: s.tm || (s.ts === 0 ? 'none' : 'std30'), lateZi: s.lz !== 0
    };
  }

  function shareUI(kind, data) {
    var box = $('#sharebox');
    box.innerHTML = '<div class="share-box"><h3>공유하기</h3>' +
      '<p><b>해석 포함</b>은 지금까지 생성된 해석 문장을 통째로 코드에 담습니다. ' +
      '받는 사람은 Claude를 쓰지 않고도 같은 글을 그대로 읽습니다. 코드는 길어집니다. ' +
      '<b>짧게</b>는 생일만 담습니다. 계산 결과(원국·합충·점수)는 그대로 다 보이고, 해석 문장만 상대 쪽에서 새로 씁니다.</p>' +
      '<div class="row-actions" style="margin-top:0">' +
      '<button class="btn sm" data-mode="full">해석 포함해서 만들기</button>' +
      '<button class="btn ghost sm" data-mode="lite">짧게 만들기</button>' +
      '<button class="btn ghost sm" data-mode="close">닫기</button></div>' +
      '<div class="share-out hidden" style="margin-top:14px"></div></div>';
    var out = $('.share-out', box);

    box.querySelector('.row-actions').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]'); if (!b) return;
      if (b.dataset.mode === 'close') { box.innerHTML = ''; return; }
      var full = b.dataset.mode === 'full';
      var payload;
      if (kind === 'solo') {
        payload = { v: 1, t: 's', p: [slimPerson(data.person)] };
        if (full) payload.x = data.store;
      } else {
        payload = { v: 1, t: 'm', p: data.list.map(slimPerson) };
        if (full) { payload.x = data.stores; payload.gx = data.groupStore; }
      }
      out.classList.remove('hidden');
      out.innerHTML = '<p class="pending">만드는 중…</p>';
      packShare(payload).then(function (code) {
        var kb = Math.round(code.length / 1024 * 10) / 10;
        var link = '';
        try { link = String(location.href).split('#')[0] + '#s=' + code; } catch (er) { }
        out.innerHTML =
          '<div class="row-actions" style="margin-top:0">' +
          '<button class="btn sm" id="cpCode">공유 코드 복사 (' + kb + 'KB)</button>' +
          (link ? '<button class="btn ghost sm" id="cpLink">주소 + 코드로 복사</button>' : '') +
          '</div>' +
          '<p style="font-size:13px;color:var(--fg-2);margin:12px 0 0;max-width:62ch">' +
          '받는 사람은 이 페이지를 연 뒤 첫 화면의 <b>“공유받은 결과 열기”</b>에 코드를 붙여넣으면 됩니다. ' +
          '주소 뒤에 코드가 붙은 링크를 그대로 눌러도 열립니다.</p>' +
          '<div class="share-url" id="shareText">' + esc(code) + '</div>';
        function copy(text, label) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
              function () { toast(label + '를 복사했습니다'); },
              function () { toast('복사가 막혔습니다 — 아래 상자에서 직접 복사하세요'); });
          } else toast('아래 상자에서 직접 복사하세요');
        }
        $('#cpCode').onclick = function () { $('#shareText').textContent = code; copy(code, '공유 코드'); };
        if (link) $('#cpLink').onclick = function () { $('#shareText').textContent = link; copy(link, '링크'); };
      }).catch(function () {
        out.innerHTML = '<p class="pending">공유 코드를 만들지 못했습니다. 다시 눌러주세요.</p>';
      });
    });
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function openShared(code) {
    app.innerHTML = '<section class="block"><p class="pending">공유된 결과를 여는 중…</p></section>';
    unpackShare(code).then(function (data) {
      readOnly = true; sharedData = data;
      var list = data.p.map(fatPerson);
      if (data.t === 's') {
        viewSolo(list[0], { store: data.x || {} });
      } else {
        var stores = data.x || {};
        viewMatchResult(list, stores, data.gx || {}, null);
      }
      prependBanner(list, data);
    }).catch(function () {
      readOnly = false;
      app.innerHTML = '<section class="block"><div class="alert">' +
        '링크나 코드가 깨졌습니다. 주소의 <b>#s=</b> 뒤 전체가 복사됐는지 확인하세요.</div>' +
        '<div class="row-actions"><button class="btn" id="errhome2">처음으로</button></div></section>';
      $('#errhome2').onclick = function () { go('home'); };
    });
  }
  function prependBanner(list, data) {
    var has = data.x && Object.keys(data.x).length;
    var b = el('<div class="banner"><b>공유받은 결과입니다.</b>' +
      '<span>' + (has ? '해석 문장이 링크에 담겨 있습니다.' : '생일 정보만 담긴 짧은 링크라 해석은 비어 있습니다.') + '</span>' +
      '<button class="btn sm" style="margin-left:auto" id="copyin">내 목록에 담기</button>' +
      '<button class="btn ghost sm" id="mkown">내 사주 보기</button></div>');
    app.insertBefore(b, app.firstChild);
    $('#copyin').onclick = function () {
      list.forEach(function (p) {
        if (!people.some(function (q) {
          return q.name === p.name && q.y === p.y && q.m === p.m && q.d === p.d && q.hour === p.hour;
        })) people.push(p);
      });
      save(K.people, people);
      toast('내 목록에 담았습니다');
    };
    $('#mkown').onclick = function () { readOnly = false; go('new'); };
  }

  /* ============================================================
     화면 전환 — URL 에 의존하지 않는다.
     (아티팩트는 iframe 안에서 돌기 때문에 주소 해시로 라우팅할 수 없다.)
     공유 링크의 해시는 최초 로드 때 한 번만 읽는다.
     ============================================================ */
  var view = { name: 'home', arg: null };
  function go(name, arg) {
    view = { name: name, arg: arg };
    render();
  }
  window.go = go;

  function render() {
    window.scrollTo(0, 0);
    setTab(view.name);
    if (view.name !== 'shared') readOnly = false;

    switch (view.name) {
      case 'new': return viewNew();
      case 'match': return viewMatch();
      case 'shared': return openShared(view.arg);
      case 'solo': {
        var p = people.filter(function (x) { return x.id === view.arg; })[0];
        if (!p) return go('home');
        return viewSolo(p);
      }
      case 'result': {
        var list = view.arg.map(function (id) {
          return people.filter(function (x) { return x.id === id; })[0];
        }).filter(Boolean);
        if (list.length < 2) return go('match');
        matchPick = list.map(function (x) { return x.id; });
        return viewMatchResult(list, {}, {}, null);
      }
      case 'saved': {
        var rec = matchStore.filter(function (x) { return x.id === view.arg; })[0];
        if (!rec) return go('home');
        return viewMatchResult(rec.snapshot, rec.stores || {}, rec.groupStore || {}, rec);
      }
      default: return viewHome();
    }
  }
  function setTab(name) {
    var cur = (name === 'match' || name === 'result' || name === 'saved') ? 'match' : 'home';
    document.querySelectorAll('nav.tabs button').forEach(function (b) {
      b.setAttribute('aria-current', String(b.dataset.tab === cur));
    });
  }

  /* ---------- 테마 ---------- */
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  var themeMode = load(K.theme, 'dark'); // 먹빛 화면이 기본, 토글로 밝게/기기설정
  applyTheme(themeMode);

  var booted = false;
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
  function boot() {
    if (booted) return; booted = true;
    document.querySelectorAll('nav.tabs button').forEach(function (b) {
      b.onclick = function () { go(b.dataset.tab); };
    });
    var brand = document.querySelector('.brand');
    if (brand) brand.onclick = function (e) { e.preventDefault(); go('home'); };
    // 로그인 서버가 연결돼 있고 이미 로그인된 기기면 먼저 내려받는다
    if (window.Sync && Sync.configured()) {
      Sync.onAuth(function (u, info) {
        if (info && info.error) toast('동기화 실패: ' + info.error);
        updateAcctChip(u);
      });
      Sync.init().then(function (ok) {
        if (ok && Sync.user()) pullAndMerge(false).then(function () { if (view.name === 'home') render(); });
      });
    }
    $('#theme').onclick = function () {
      themeMode = themeMode === 'dark' ? 'light' : (themeMode === 'light' ? 'auto' : 'dark');
      save(K.theme, themeMode);
      applyTheme(themeMode);
      toast('화면: ' + ({ auto: '기기 설정 따라감', light: '한지(밝게)', dark: '먹빛(어둡게)' })[themeMode]);
    };
    // 공유 링크로 들어온 경우에만 주소를 읽는다
    var h = '';
    try { h = (location.hash || '').replace(/^#/, ''); } catch (e) { }
    if (h.indexOf('s=') === 0) go('shared', h.slice(2));
    else render();
  }
})();
