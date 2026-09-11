/* ============================================================
   기기 간 동기화 — Firebase Auth(닉네임+비밀번호) + Firestore
   config.js 의 window.MNG_FIREBASE 가 없으면 전부 비활성.
   닉네임은 SHA-256 으로 가짜 이메일을 만들어 Firebase 에 넘긴다.
   비밀번호는 Firebase 가 처리하며 이 코드는 저장하지 않는다.
   ============================================================ */
(function (global) {
  'use strict';

  var SDK = '10.12.2';
  var cfg = null, auth = null, db = null, user = null;
  var sdkPromise = null, initPromise = null, listeners = [];
  var pushTimer = null, pendingGetter = null, lastPushAt = 0, lastPullAt = 0;

  function configured() {
    // claude.ai 아티팩트 안에서는 외부 네트워크가 막혀 있어 동기화를 켜지 않는다
    if (global.claude && global.claude.use) return false;
    cfg = global.MNG_FIREBASE || null;
    return !!(cfg && cfg.apiKey && cfg.projectId);
  }

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { fail(new Error('load fail ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    if (global.firebase && global.firebase.firestore) return (sdkPromise = Promise.resolve());
    var base = 'https://www.gstatic.com/firebasejs/' + SDK + '/';
    sdkPromise = loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-auth-compat.js'); })
      .then(function () { return loadScript(base + 'firebase-firestore-compat.js'); });
    return sdkPromise;
  }

  /** 준비. 설정이 없으면 false 로 끝난다. */
  function init() {
    if (initPromise) return initPromise;
    if (!configured()) return (initPromise = Promise.resolve(false));
    initPromise = loadSdk().then(function () {
      var fb = global.firebase;
      var app = fb.apps && fb.apps.length ? fb.app() : fb.initializeApp(cfg);
      auth = fb.auth(app); db = fb.firestore(app);
      return new Promise(function (ok) {
        var first = true;
        auth.onAuthStateChanged(function (u) {
          user = u || null;
          listeners.forEach(function (f) { try { f(user); } catch (e) { } });
          if (first) { first = false; ok(true); }
        });
      });
    }).catch(function () { return false; });
    return initPromise;
  }

  function onAuth(f) { listeners.push(f); if (initPromise) initPromise.then(function () { f(user); }); }

  /* ---------- 닉네임 → 가짜 이메일 ---------- */
  function norm(name) { return String(name || '').trim().toLowerCase().replace(/\s+/g, ''); }
  function sha256hex(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function pseudoEmail(name) {
    return sha256hex('mng:' + norm(name)).then(function (h) { return 'u' + h.slice(0, 28) + '@id.myeongripan.app'; });
  }

  var ERR = {
    'auth/email-already-in-use': '이미 쓰는 닉네임입니다. 로그인하거나 다른 닉네임을 쓰세요.',
    'auth/invalid-credential': '닉네임 또는 비밀번호가 틀렸습니다.',
    'auth/wrong-password': '비밀번호가 틀렸습니다.',
    'auth/user-not-found': '없는 닉네임입니다. 먼저 계정을 만드세요.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
    'auth/too-many-requests': '시도가 너무 많습니다. 잠시 뒤 다시 하세요.',
    'auth/network-request-failed': '네트워크 오류입니다. 연결을 확인하세요.',
    'auth/operation-not-allowed': '서버에서 이 로그인 방식이 꺼져 있습니다. 관리자 설정이 필요합니다.',
    'auth/popup-closed-by-user': '로그인 창을 닫았습니다.',
    'auth/cancelled-popup-request': '로그인 창을 닫았습니다.',
    'auth/popup-blocked': '팝업이 막혔습니다. 이 사이트의 팝업을 허용하고 다시 누르세요.',
    'auth/unauthorized-domain': '이 주소가 Firebase 승인 도메인 목록에 없습니다. 관리자 설정이 필요합니다.',
    'permission-denied': '서버 권한 규칙이 막았습니다. Firestore 규칙을 확인하세요.'
  };
  function errText(e) {
    var code = (e && e.code) || '';
    return ERR[code] || ((e && e.message) ? String(e.message).slice(0, 120) : '알 수 없는 오류');
  }

  function register(name, pw) {
    if (!norm(name)) return Promise.reject({ code: 'x', message: '닉네임을 넣으세요.' });
    if (!pw || pw.length < 6) return Promise.reject({ code: 'auth/weak-password' });
    return pseudoEmail(name).then(function (email) {
      return auth.createUserWithEmailAndPassword(email, pw);
    }).then(function (cred) {
      var u = cred.user;
      return u.updateProfile({ displayName: String(name).trim() }).then(function () {
        return db.doc('users/' + u.uid + '/data/profile').set({
          name: String(name).trim(), createdAt: global.firebase.firestore.FieldValue.serverTimestamp()
        });
      }).then(function () { return u; });
    });
  }
  function login(name, pw) {
    if (!norm(name)) return Promise.reject({ code: 'x', message: '닉네임을 넣으세요.' });
    return pseudoEmail(name).then(function (email) {
      return auth.signInWithEmailAndPassword(email, pw);
    }).then(function (cred) { return cred.user; });
  }
  /** Google 계정으로 로그인. 모바일은 팝업이 막히는 일이 많아 리다이렉트로 간다 */
  function loginGoogle() {
    var fb = global.firebase;
    var provider = new fb.auth.GoogleAuthProvider();
    var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var p = mobile
      ? auth.signInWithRedirect(provider).then(function () { return null; })
      : auth.signInWithPopup(provider);
    return p.then(function (cred) {
      var u = cred ? cred.user : auth.currentUser;
      if (!u) return null;
      return db.doc('users/' + u.uid + '/data/profile').set({
        name: u.displayName || 'Google 사용자', provider: 'google',
        updatedAt: fb.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function () { return u; });
    });
  }
  function logout() { return auth ? auth.signOut() : Promise.resolve(); }

  /* ---------- 데이터 ---------- */
  var KEYS = ['people', 'solo', 'match'];
  function base() { return 'users/' + user.uid + '/data/'; }

  function pull() {
    if (!user || !db) return Promise.resolve(null);
    return Promise.all(KEYS.map(function (k) { return db.doc(base() + k).get(); })).then(function (snaps) {
      var out = { at: 0 };
      snaps.forEach(function (s, i) {
        var d = s.exists ? s.data() : null;
        try { out[KEYS[i]] = d && d.json ? JSON.parse(d.json) : null; } catch (e) { out[KEYS[i]] = null; }
        if (d && d.at && d.at.toMillis) out.at = Math.max(out.at, d.at.toMillis());
      });
      lastPullAt = Date.now();
      return out;
    });
  }

  function pushNow(data) {
    if (!user || !db) return Promise.resolve(false);
    var fb = global.firebase;
    var writes = KEYS.filter(function (k) { return data[k] !== undefined; }).map(function (k) {
      var json = JSON.stringify(data[k]);
      if (json.length > 950000) return Promise.reject({ code: 'x', message: k + ' 데이터가 너무 커서(1MB 초과) 동기화하지 못했습니다. 오래된 기록을 지워 주세요.' });
      return db.doc(base() + k).set({ v: 1, json: json, at: fb.firestore.FieldValue.serverTimestamp() });
    });
    return Promise.all(writes).then(function () { lastPushAt = Date.now(); return true; });
  }

  /** 저장 직후 호출 — 1.5초 안에 몰아서 한 번 올린다 */
  function schedulePush(getter) {
    if (!user) return;
    pendingGetter = getter;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var g = pendingGetter; pendingGetter = null;
      if (!g) return;
      pushNow(g()).catch(function (e) {
        listeners.forEach(function (f) { try { f(user, { error: errText(e) }); } catch (er) { } });
      });
    }, 1500);
  }

  global.Sync = {
    configured: configured, init: init, onAuth: onAuth,
    user: function () { return user; },
    name: function () { return user ? (user.displayName || '사용자') : ''; },
    register: register, login: login, loginGoogle: loginGoogle, logout: logout,
    pull: pull, pushNow: pushNow, schedulePush: schedulePush,
    errText: errText,
    lastPushAt: function () { return lastPushAt; }, lastPullAt: function () { return lastPullAt; }
  };
})(typeof window !== 'undefined' ? window : this);
