/* ============================================================
   해석 공급자
   1) claude.ai 아티팩트 안 → `sample` 능력 (보는 사람의 Claude 계정, 키 불필요)
   2) 일반 웹사이트 → 이 브라우저에 저장한 Anthropic API 키로 직접 호출
   3) 둘 다 없음 → null (계산 결과와 핵심 판정만 표시)
   에러는 sample 과 같은 {code, message, text?} 모양으로 통일한다.
   ============================================================ */
(function (global) {
  'use strict';

  var LS = { key: 'mng.ai.key', model: 'mng.ai.model' };
  var MODELS = [
    { id: 'claude-opus-5', label: 'Claude Opus 5', note: '기본값 · 가장 깊게 씀 · 입력 $5 / 출력 $25 (100만 토큰당)' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', note: '빠르고 저렴 · 입력 $2 / 출력 $10' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: '가장 저렴 · 글이 짧아짐 · 입력 $1 / 출력 $5' }
  ];

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) {
    try { if (v === null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { }
  }

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
    if (o.chat) so.cache = false;
    else so.cache = { gcTime: 3600000, refresh: !!o.refresh };
    return so;
  }

  /* ---------- Anthropic Messages API 직접 호출 ---------- */
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
    try { msg = JSON.parse(bodyText).error.message || ''; } catch (e) { msg = String(bodyText || '').slice(0, 200); }
    if (status === 401 || status === 403) return { code: 'bad_key', message: msg || 'API 키 인증 실패' };
    if (status === 429) return { code: 'rate_limited', message: msg };
    if (status === 400 || status === 413 || status === 422) return { code: 'invalid_request', message: msg };
    if (status === 529 || status >= 500) return { code: 'upstream_error', message: msg };
    return { code: 'upstream_error', message: msg || ('HTTP ' + status) };
  }

  function viaApi(input, opts) {
    var key = ls(LS.key), model = ls(LS.model) || MODELS[0].id;
    var body = { model: model, max_tokens: 64000, stream: true, messages: toMessages(input) };
    var headers = {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    if (model === 'claude-opus-5') {
      // 안전 분류기가 거절하면 서버가 대체 모델로 같은 요청을 이어서 처리한다
      headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
      body.fallbacks = 'default';
    }
    var text = '', stop = null;

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: headers, body: JSON.stringify(body), signal: opts.signal
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw httpError(res.status, t); });
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';

      function handle(chunk) {
        var data = null;
        chunk.split('\n').forEach(function (l) { if (l.indexOf('data:') === 0) data = l.slice(5).trim(); });
        if (!data) return;
        var ev; try { ev = JSON.parse(data); } catch (e) { return; }
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
          text += ev.delta.text;
          if (opts.onText) { try { opts.onText({ text: text, delta: ev.delta.text }); } catch (e) { } }
        } else if (ev.type === 'message_delta' && ev.delta) {
          stop = ev.delta.stop_reason || stop;
        } else if (ev.type === 'error') {
          throw { code: 'upstream_error', message: (ev.error && ev.error.message) || 'stream error', text: text };
        }
      }
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            if (buf.trim()) handle(buf);
            if (stop === 'refusal') throw { code: 'refused', message: 'refused' };
            if (!text.trim()) throw { code: 'empty_completion', message: 'empty' };
            return { text: text, truncated: stop === 'max_tokens', modelTierApplied: 'default' };
          }
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split('\n\n'); buf = parts.pop();
          parts.forEach(handle);
          return pump();
        });
      }
      return pump();
    }).catch(function (e) {
      if (e && e.code) { if (text && e.text === undefined && e.code !== 'refused') e.text = text; throw e; }
      if (e && e.name === 'AbortError') throw { code: 'cancelled', message: 'cancelled', text: text || undefined };
      throw { code: 'upstream_error', message: String((e && e.message) || e), text: text || undefined };
    });
  }

  /* ---------- 공개 인터페이스 ---------- */
  function provider() {
    return sampleFn().then(function (s) {
      if (s) return 'sample';
      if (ls(LS.key)) return 'apikey';
      return null;
    });
  }
  function generate(input, opts) {
    opts = opts || {};
    return sampleFn().then(function (s) {
      if (s) return s(input, sampleOpts(opts));
      if (ls(LS.key)) return viaApi(input, opts);
      return Promise.reject({ code: 'not_granted', message: 'no provider' });
    });
  }

  global.AI = {
    MODELS: MODELS,
    provider: provider,
    generate: generate,
    getKey: function () { return ls(LS.key); },
    setKey: function (k) { lsSet(LS.key, (k || '').trim()); },
    getModel: function () { return ls(LS.model) || MODELS[0].id; },
    setModel: function (m) { lsSet(LS.model, m); }
  };
})(typeof window !== 'undefined' ? window : this);
