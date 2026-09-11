/* ============================================================
   해석 공급자
   1) claude.ai 아티팩트 안 → `sample` 능력 (보는 사람의 Claude 계정, 키 불필요)
   2) 일반 웹사이트 → 이 브라우저에 저장한 API 키로 직접 호출
      Claude(Anthropic) · Gemini(Google) · ChatGPT(OpenAI) · OpenRouter(무료 모델 다수)
   3) 둘 다 없음 → null (계산 결과와 핵심 판정만 표시)
   에러는 sample 과 같은 {code, message, text?} 모양으로 통일한다.
   ============================================================ */
(function (global) {
  'use strict';

  var LS = { prov: 'mng.ai.prov', key: 'mng.ai.key.', model: 'mng.ai.model.', list: 'mng.ai.list.' };

  var PROVIDERS = [
    {
      id: 'firebase', label: 'Gemini', vendor: '무료 · 설정 불필요', free: true, keyless: true,
      keyUrl: null,
      note: '이 사이트에 연결된 Firebase 프로젝트로 Gemini를 호출합니다. 방문자는 아무것도 등록하지 않아도 바로 씁니다. 비용은 Google의 무료 한도 안에서 처리되며, 한도를 넘으면 잠시 뒤 다시 시도하면 됩니다.',
      defaults: [
        { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — 기본, 무료 한도 넉넉함', free: true },
        { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite — 가장 가볍고 한도 큼', free: true },
        { id: 'gemini-flash-latest', label: 'Gemini Flash 최신', free: true },
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash — 가장 똑똑함 (무료 하루 20회)', free: true },
        { id: 'gemini-pro-latest', label: 'Gemini Pro 최신 — 가장 깊게 (무료 한도 거의 없음)' }
      ]
    },
    {
      id: 'anthropic', label: 'Claude', vendor: 'Anthropic', free: false,
      keyUrl: 'https://console.anthropic.com/settings/keys',
      note: 'Anthropic API 키는 유료(선불 크레딧)입니다. Claude를 무료로 쓰려면 claude.ai 아티팩트 버전에서 보세요 — 거기서는 보는 사람의 Claude 계정으로 키 없이 씁니다.',
      defaults: [
        { id: 'claude-opus-5', label: 'Claude Opus 5 — 가장 깊게 씀' },
        { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — 빠르고 저렴' },
        { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — 가장 저렴' }
      ]
    },
    {
      id: 'google', label: 'Gemini (내 키)', vendor: 'Google', free: true,
      keyUrl: 'https://aistudio.google.com/apikey',
      note: '내 Google AI Studio 키로 직접 호출합니다. 위의 "설정 불필요"가 한도에 걸릴 때 쓰면 됩니다. Flash 계열은 무료 한도(분당·일일 요청 제한) 안에서 비용 없이 씁니다. 한도를 넘으면 잠시 기다렸다가 다시 하세요.',
      defaults: [
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash — 빠름', free: true },
        { id: 'gemini-flash-latest', label: 'Gemini Flash 최신', free: true },
        { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite — 가장 가벼움', free: true },
        { id: 'gemini-pro-latest', label: 'Gemini Pro 최신 — 더 깊게 (무료 한도 적음)' }
      ]
    },
    {
      id: 'openai', label: 'ChatGPT', vendor: 'OpenAI', free: false,
      keyUrl: 'https://platform.openai.com/api-keys',
      note: 'OpenAI API 키는 유료(선불 크레딧)입니다. ChatGPT 구독과는 별개로 API 결제가 필요합니다.',
      defaults: [
        { id: 'gpt-5', label: 'GPT-5 — 가장 깊게' },
        { id: 'gpt-5-mini', label: 'GPT-5 mini — 균형' },
        { id: 'gpt-5-nano', label: 'GPT-5 nano — 가장 저렴' },
        { id: 'gpt-4.1', label: 'GPT-4.1' }
      ]
    },
    {
      id: 'openrouter', label: 'OpenRouter', vendor: '여러 회사 모델', free: true,
      keyUrl: 'https://openrouter.ai/keys',
      note: '한 키로 여러 회사 모델을 씁니다. 이름 끝에 :free 가 붙은 모델은 무료(속도·한도 제한 있음). 무료 가입 뒤 키를 발급받고 "목록 새로 고침"을 누르면 지금 무료인 모델이 위쪽에 뜹니다.',
      defaults: [
        { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (OpenRouter)' },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B — 무료', free: true },
        { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 — 무료', free: true }
      ]
    }
  ];
  function P(id) { return PROVIDERS.filter(function (p) { return p.id === id; })[0] || PROVIDERS[0]; }

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v === null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }

  /** 키 없이 쓰는 Firebase AI Logic 을 쓸 수 있는 화면인가.
      아티팩트(claude.ai) 안에서는 외부 모듈 로드가 막히므로 제외하고, 거기서는 sample 을 쓴다. */
  function firebaseAvailable() {
    return !!(global.MNG_FIREBASE && global.MNG_FIREBASE.apiKey && !(global.claude && global.claude.use));
  }
  function fallbackProvider() { return firebaseAvailable() ? 'firebase' : 'google'; }

  // 예전 저장값 이관
  (function migrate() {
    var ok = ls('mng.ai.key'), om = ls('mng.ai.model');
    if (ok && !ls(LS.key + 'anthropic')) { lsSet(LS.key + 'anthropic', ok); lsSet('mng.ai.key', null); }
    if (om && !ls(LS.model + 'anthropic')) { lsSet(LS.model + 'anthropic', om); lsSet('mng.ai.model', null); }
    var cur = ls(LS.prov);
    // 키를 넣은 적 없이 google 로 남아 있던 사용자는 설정 불필요 쪽으로 옮긴다
    if (!cur || (cur === 'google' && !ls(LS.key + 'google'))) lsSet(LS.prov, fallbackProvider());
    // 내려갔거나 무료 한도가 너무 작은 모델이 저장돼 있으면 비워 기본값으로 되돌린다
    ['firebase', 'google'].forEach(function (id) {
      var m = ls(LS.model + id);
      if (/^gemini-2\./.test(m) || m === 'gemini-3.6-flash') lsSet(LS.model + id, null);
      lsSet(LS.list + id, null);
    });
  })();

  function getProvider() {
    var p = ls(LS.prov) || fallbackProvider();
    if (p === 'firebase' && !firebaseAvailable()) return 'google';
    return p;
  }
  function setProvider(id) { lsSet(LS.prov, P(id).id); }
  function getKey(id) { return ls(LS.key + (id || getProvider())); }
  function setKey(id, k) { lsSet(LS.key + id, (k || '').trim()); }
  function getModel(id) { id = id || getProvider(); return ls(LS.model + id) || P(id).defaults[0].id; }
  function setModel(id, m) { lsSet(LS.model + id, m); }
  function describe() { var id = getProvider(); return P(id).label + ' · ' + getModel(id); }

  /* ---------- sample (아티팩트) ---------- */
  var samplePromise = null;
  function sampleFn() {
    if (!samplePromise) {
      samplePromise = (global.claude && global.claude.use)
        ? global.claude.use('sample').catch(function () { return null; })
        : Promise.resolve(null);
    }
    return samplePromise;
  }
  function sampleOpts(o) {
    var so = { onText: o.onText, signal: o.signal, modelTier: o.tier || 'default' };
    if (o.chat) so.cache = false; else so.cache = { gcTime: 3600000, refresh: !!o.refresh };
    return so;
  }

  /* ---------- 공통 ---------- */
  function toMessages(input) {
    if (typeof input === 'string') return [{ role: 'user', content: input }];
    var out = [];
    input.forEach(function (t) {
      var last = out[out.length - 1];
      if (last && last.role === t.role) last.content += '\n\n' + t.content;
      else out.push({ role: t.role, content: t.content });
    });
    return out;
  }
  function httpError(status, bodyText) {
    var msg = '';
    try { var j = JSON.parse(bodyText); msg = (j.error && (j.error.message || j.error.status)) || j.message || ''; } catch (e) { msg = String(bodyText || '').slice(0, 200); }
    if (status === 401 || status === 403) return { code: 'bad_key', message: msg || '인증 실패' };
    if (status === 400 && /api key|API_KEY|invalid.*key|key.*invalid/i.test(msg)) return { code: 'bad_key', message: msg };
    if (status === 404 && /model/i.test(msg)) return { code: 'invalid_request', message: '이 모델을 찾을 수 없습니다. 목록을 새로 고쳐 다른 모델을 고르세요.' };
    if (status === 429) return { code: 'rate_limited', message: msg };
    if (status === 400 || status === 413 || status === 422) return { code: 'invalid_request', message: msg };
    if (status === 402) return { code: 'bad_key', message: '크레딧이 없습니다. 결제 잔액을 확인하세요.' };
    return { code: 'upstream_error', message: msg || ('HTTP ' + status) };
  }
  function wrapNetErr(e, text) {
    if (e && e.code) { if (text && e.text === undefined && e.code !== 'refused') e.text = text; return e; }
    if (e && e.name === 'AbortError') return { code: 'cancelled', message: 'cancelled', text: text || undefined };
    return { code: 'upstream_error', message: String((e && e.message) || e), text: text || undefined };
  }

  /** SSE 스트림을 읽어 data 라인마다 onData(json 또는 문자열) */
  function readSSE(res, onData) {
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
    function handle(chunk) {
      var data = [];
      chunk.split('\n').forEach(function (l) { if (l.indexOf('data:') === 0) data.push(l.slice(5).trim()); });
      if (!data.length) return;
      var joined = data.join('\n');
      if (joined === '[DONE]') return;
      var ev; try { ev = JSON.parse(joined); } catch (e) { return; }
      onData(ev);
    }
    function pump() {
      return reader.read().then(function (r) {
        if (r.done) { if (buf.trim()) handle(buf); return; }
        buf += dec.decode(r.value, { stream: true });
        var parts = buf.split(/\r?\n\r?\n/); buf = parts.pop();
        parts.forEach(handle);
        return pump();
      });
    }
    return pump();
  }

  function streamCall(url, headers, body, opts, onEvent) {
    var st = { text: '', stop: null, refused: false };
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: opts.signal })
      .then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw httpError(res.status, t); });
        return readSSE(res, function (ev) {
          var delta = onEvent(ev, st);
          if (delta) {
            st.text += delta;
            if (opts.onText) { try { opts.onText({ text: st.text, delta: delta }); } catch (e) { } }
          }
        });
      }).then(function () {
        if (st.refused) throw { code: 'refused', message: 'refused' };
        if (!st.text.trim()) throw { code: 'empty_completion', message: 'empty' };
        return { text: st.text, truncated: st.stop === 'max', modelTierApplied: 'default' };
      }).catch(function (e) { throw wrapNetErr(e, st.text); });
  }

  /* ---------- Anthropic ---------- */
  function viaAnthropic(input, opts) {
    var key = getKey('anthropic'), model = getModel('anthropic');
    var body = { model: model, max_tokens: 64000, stream: true, messages: toMessages(input) };
    var headers = {
      'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    if (model === 'claude-opus-5') { headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; body.fallbacks = 'default'; }
    return streamCall('https://api.anthropic.com/v1/messages', headers, body, opts, function (ev, st) {
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') return ev.delta.text;
      if (ev.type === 'message_delta' && ev.delta) {
        if (ev.delta.stop_reason === 'max_tokens') st.stop = 'max';
        if (ev.delta.stop_reason === 'refusal') st.refused = true;
      }
      if (ev.type === 'error') throw { code: 'upstream_error', message: (ev.error && ev.error.message) || 'stream error' };
      return '';
    });
  }

  /* ---------- Google Gemini ---------- */
  function viaGoogle(input, opts) {
    var key = getKey('google'), model = getModel('google');
    var contents = toMessages(input).map(function (m) {
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
    });
    var body = { contents: contents, generationConfig: { maxOutputTokens: 24000, temperature: 0.9 } };
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse';
    return streamCall(url, { 'content-type': 'application/json', 'x-goog-api-key': key }, body, opts, function (ev, st) {
      if (ev.promptFeedback && ev.promptFeedback.blockReason) { st.refused = true; return ''; }
      var c = ev.candidates && ev.candidates[0];
      if (!c) return '';
      if (c.finishReason === 'MAX_TOKENS') st.stop = 'max';
      if (c.finishReason === 'SAFETY' || c.finishReason === 'PROHIBITED_CONTENT') st.refused = true;
      var parts = (c.content && c.content.parts) || [], out = '';
      parts.forEach(function (p) { if (p.text && !p.thought) out += p.text; });
      return out;
    });
  }

  /* ---------- OpenAI 호환 (OpenAI · OpenRouter) ---------- */
  function viaOpenAICompat(prov, input, opts) {
    var key = getKey(prov), model = getModel(prov);
    var isOR = prov === 'openrouter';
    var body = { model: model, stream: true, messages: toMessages(input) };
    if (isOR) body.max_tokens = 16000; else body.max_completion_tokens = 16000;
    var headers = { 'content-type': 'application/json', 'authorization': 'Bearer ' + key };
    if (isOR) headers['X-Title'] = 'Myeongripan';
    var url = isOR ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    return streamCall(url, headers, body, opts, function (ev, st) {
      if (ev.error) throw { code: 'upstream_error', message: ev.error.message || 'stream error' };
      var ch = ev.choices && ev.choices[0];
      if (!ch) return '';
      if (ch.finish_reason === 'length') st.stop = 'max';
      if (ch.finish_reason === 'content_filter') st.refused = true;
      return (ch.delta && ch.delta.content) || '';
    });
  }

  /* ---------- 모델 목록 ---------- */
  function cachedModels(prov) {
    try { var c = JSON.parse(ls(LS.list + prov) || 'null'); if (c && c.list && c.list.length) return c.list; } catch (e) { }
    return P(prov).defaults;
  }
  function fetchJSON(url, headers) {
    return fetch(url, { headers: headers || {} }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw httpError(res.status, t); });
      return res.json();
    }).catch(function (e) { throw wrapNetErr(e); });
  }
  function listModels(prov, force) {
    if (!force) { var c = cachedModels(prov); if (c !== P(prov).defaults) return Promise.resolve(c); }
    var key = getKey(prov), p;
    if (prov === 'anthropic') {
      p = fetchJSON('https://api.anthropic.com/v1/models?limit=100', { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' })
        .then(function (j) { return (j.data || []).map(function (m) { return { id: m.id, label: m.display_name || m.id }; }); });
    } else if (prov === 'google') {
      p = fetchJSON('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { 'x-goog-api-key': key })
        .then(function (j) {
          return (j.models || []).filter(function (m) {
            var ok = (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0;
            return ok && !/embedding|tts|image|veo|imagen|aqa|audio|live|robotics|computer|learnlm/i.test(m.name);
          }).map(function (m) {
            var id = m.name.replace(/^models\//, '');
            return { id: id, label: (m.displayName || id), free: true };
          }).sort(function (a, b) { return (/pro/.test(b.id) ? 1 : 0) - (/pro/.test(a.id) ? 1 : 0) || a.id.localeCompare(b.id); });
        });
    } else if (prov === 'openai') {
      p = fetchJSON('https://api.openai.com/v1/models', { 'authorization': 'Bearer ' + key })
        .then(function (j) {
          return (j.data || []).map(function (m) { return m.id; }).filter(function (id) {
            return /^(gpt-|o[0-9]|chatgpt-)/.test(id) && !/realtime|audio|tts|transcri|image|embed|search|instruct|moderation|dall|whisper|codex|-\d{4}-\d{2}-\d{2}$/i.test(id);
          }).sort(function (a, b) {
            var ra = /^gpt-5/.test(a) ? 0 : 1, rb = /^gpt-5/.test(b) ? 0 : 1;
            return ra - rb || a.localeCompare(b);
          }).map(function (id) { return { id: id, label: id }; });
        });
    } else {
      p = fetchJSON('https://openrouter.ai/api/v1/models')
        .then(function (j) {
          return (j.data || []).map(function (m) {
            var pr = m.pricing || {};
            var free = /:free$/.test(m.id) || (String(pr.prompt) === '0' && String(pr.completion) === '0');
            return { id: m.id, label: m.name || m.id, free: free };
          }).sort(function (a, b) { return (b.free ? 1 : 0) - (a.free ? 1 : 0) || a.label.localeCompare(b.label); }).slice(0, 400);
        });
    }
    return p.then(function (list) {
      if (!list.length) throw { code: 'invalid_request', message: '목록이 비어 있습니다' };
      lsSet(LS.list + prov, JSON.stringify({ at: Date.now(), list: list }));
      return list;
    });
  }

  /* ---------- Firebase AI Logic (키 불필요) ---------- */
  var SDK_URL = 'https://www.gstatic.com/firebasejs/12.3.0/';
  var fbHandle = null;
  function getFbAI() {
    if (fbHandle) return fbHandle;
    fbHandle = Promise.all([
      import(SDK_URL + 'firebase-app.js'),
      import(SDK_URL + 'firebase-ai.js')
    ]).then(function (m) {
      var appMod = m[0], aiMod = m[1], app;
      try { app = appMod.getApp('mng-ai'); }
      catch (e) { app = appMod.initializeApp(global.MNG_FIREBASE, 'mng-ai'); }
      return { ai: aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() }), mod: aiMod };
    }).catch(function (e) {
      fbHandle = null;
      throw { code: 'upstream_error', message: 'AI 모듈을 불러오지 못했습니다. 연결을 확인하세요.' };
    });
    return fbHandle;
  }
  function mapFbErr(e, text) {
    if (e && e.code && /^(cancelled|empty_completion|refused|rate_limited|upstream_error|invalid_request|server_config)$/.test(e.code)) {
      if (text && e.text === undefined && e.code !== 'refused') e.text = text;
      return e;
    }
    var msg = String((e && (e.message || e)) || '');
    if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) return { code: 'rate_limited', message: msg, text: text || undefined };
    if (/SAFETY|blocked|PROHIBITED|block_reason/i.test(msg)) return { code: 'refused', message: msg };
    if (/App ?Check|403|PERMISSION_DENIED|permission-denied|not-?enabled|SERVICE_DISABLED/i.test(msg)) {
      return { code: 'server_config', message: msg.slice(0, 160), text: text || undefined };
    }
    if (/404|NOT_FOUND|not found/i.test(msg)) return { code: 'invalid_request', message: '이 모델은 쓸 수 없습니다. 다른 모델을 고르세요.' };
    return { code: 'upstream_error', message: msg.slice(0, 160), text: text || undefined };
  }
  /* 무료 등급은 모델당 분당 20회다. 요청 사이에 최소 간격을 두어 한도에 아예 닿지 않게 한다.
     (분당 약 17회 페이스. 여러 배치를 연속으로 돌려도 429 가 나지 않는다.) */
  var MIN_GAP_MS = 3500, nextSlot = 0;
  function pace() {
    var now = Date.now();
    var at = Math.max(now, nextSlot);
    nextSlot = at + MIN_GAP_MS;
    var wait = at - now;
    return wait > 0 ? new Promise(function (ok) { setTimeout(ok, wait); }) : Promise.resolve();
  }

  /** 429 응답에 담긴 "Please retry in 4.09s" 를 밀리초로 읽는다 */
  function retryAfterMs(e) {
    var m = String((e && (e.message || e)) || '').match(/retry in ([\d.]+)s/i);
    var s = m ? parseFloat(m[1]) : NaN;
    if (!isFinite(s)) return 12000;
    return Math.min(45000, Math.max(2000, Math.ceil(s * 1000) + 1500));
  }
  /* 무료 한도는 모델마다 다르다 (최신 모델일수록 하루 허용량이 적다).
     고른 모델이 한도에 걸리면 아래 순서대로 다음 모델로 넘어간다. */
  var FB_CHAIN = ['gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.6-flash'];
  function fbChain() {
    var sel = getModel('firebase');
    return [sel].concat(FB_CHAIN.filter(function (m) { return m !== sel; }));
  }

  function viaFirebase(input, opts, st) {
    st = st || { attempt: 0, mi: 0, chain: fbChain() };
    var modelId = st.chain[st.mi] || st.chain[0];
    var contents = toMessages(input).map(function (m) {
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
    });
    var text = '', stopped = false;
    if (opts.signal) {
      if (opts.signal.aborted) return Promise.reject({ code: 'cancelled', message: 'cancelled' });
      opts.signal.addEventListener('abort', function () { stopped = true; });
    }
    return pace().then(getFbAI).then(function (h) {
      if (stopped) throw { code: 'cancelled', message: 'cancelled' };
      var gm = h.mod.getGenerativeModel(h.ai, {
        model: modelId,
        generationConfig: { maxOutputTokens: 24000, temperature: 0.9 }
      });
      return gm.generateContentStream({ contents: contents });
    }).then(async function (res) {
      for await (var chunk of res.stream) {
        if (stopped) throw { code: 'cancelled', message: 'cancelled', text: text };
        var t = '';
        try { t = chunk.text() || ''; } catch (e) { t = ''; }
        if (t) {
          text += t;
          if (opts.onText) { try { opts.onText({ text: text, delta: t }); } catch (e) { } }
        }
      }
      if (!text.trim()) throw { code: 'empty_completion', message: 'empty' };
      return { text: text, truncated: false, modelTierApplied: 'default' };
    }).catch(function (e) {
      var err = mapFbErr(e, text);
      if (err.code !== 'rate_limited' || text || stopped) throw err;

      // 1) 한도는 모델마다 따로다. 남은 모델이 있으면 바로 그쪽으로 넘어간다.
      if (st.mi < st.chain.length - 1) {
        var next = st.chain[st.mi + 1];
        if (opts.onNotice) { try { opts.onNotice(modelId + ' 한도 초과 — ' + next + '로 바꿔 다시 씁니다'); } catch (x) { } }
        return viaFirebase(input, opts, { attempt: st.attempt, mi: st.mi + 1, chain: st.chain });
      }
      // 2) 전부 막혔으면 서버가 알려준 시간만큼 쉬고 처음 모델부터 다시 시도한다.
      if (st.attempt < 2) {
        var wait = retryAfterMs(e);
        nextSlot = Date.now() + wait; // 대기 중에는 다른 호출도 나가지 않게 슬롯을 밀어 둔다
        if (opts.onNotice) { try { opts.onNotice('무료 한도에 걸려 ' + Math.round(wait / 1000) + '초 기다립니다'); } catch (x) { } }
        return new Promise(function (ok) { setTimeout(ok, wait); }).then(function () {
          if (stopped) throw { code: 'cancelled', message: 'cancelled' };
          if (opts.onNotice) { try { opts.onNotice(''); } catch (x) { } }
          return viaFirebase(input, opts, { attempt: st.attempt + 1, mi: 0, chain: st.chain });
        });
      }
      throw err;
    });
  }

  /* ---------- 공개 인터페이스 ---------- */
  function ready(prov) {
    prov = prov || getProvider();
    if (prov === 'firebase') return firebaseAvailable();
    return !!getKey(prov);
  }
  function provider() {
    return sampleFn().then(function (s) {
      if (s) return 'sample';
      var p = getProvider();
      if (p === 'firebase' && firebaseAvailable()) return 'firebase';
      return getKey(p) ? 'apikey' : null;
    });
  }
  /** 방문자가 아무것도 설정하지 않아도 쓸 수 있는 환경인가 (자동 생성 여부 판단용) */
  function isFree(prov) { return prov === 'sample' || prov === 'firebase'; }

  function generate(input, opts) {
    opts = opts || {};
    return sampleFn().then(function (s) {
      if (s) return s(input, sampleOpts(opts));
      var prov = getProvider();
      if (prov === 'firebase') {
        if (!firebaseAvailable()) return Promise.reject({ code: 'not_granted', message: 'no provider' });
        return viaFirebase(input, opts);
      }
      if (!getKey(prov)) return Promise.reject({ code: 'not_granted', message: 'no provider' });
      if (prov === 'anthropic') return viaAnthropic(input, opts);
      if (prov === 'google') return viaGoogle(input, opts);
      return viaOpenAICompat(prov, input, opts);
    });
  }

  global.AI = {
    PROVIDERS: PROVIDERS,
    provider: provider, generate: generate, describe: describe,
    isFree: isFree, ready: ready, firebaseAvailable: firebaseAvailable,
    getProvider: getProvider, setProvider: setProvider,
    getKey: getKey, setKey: setKey, getModel: getModel, setModel: setModel,
    listModels: listModels, cachedModels: cachedModels
  };
})(typeof window !== 'undefined' ? window : this);
