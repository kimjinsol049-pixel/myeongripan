/* ============================================================
   요약 카드 이미지 — 캔버스에 직접 그린다 (1080×1350)
   저장: 웹사이트에서는 <a download>, 아티팩트에서는 downloads 능력
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Saju;
  var SITE = 'kimjinsol049-pixel.github.io/myeongripan';
  var C = { bg: '#0B0D11', bg2: '#151920', bg3: '#1D2230', line: '#2A303D', fg: '#EDE7DA', fg2: '#A6ACBB', fg3: '#6F7686', gold: '#C8A24A', goldSoft: '#6A5527' };
  var ELC = ['#55A473', '#CC5148', '#CFA253', '#A9B5C8', '#5189C4'];
  var W = 1080, PAD = 72;
  var F = {
    serif: '"Hahmlet","Nanum Myeongjo",serif', hanja: '"Noto Serif KR","Nanum Myeongjo",Batang,serif',
    sans: '"IBM Plex Sans KR","Malgun Gothic",sans-serif', mono: '"IBM Plex Mono",Menlo,monospace',
    emoji: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'
  };

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('600 90px ' + F.hanja), document.fonts.load('700 56px ' + F.serif),
      document.fonts.load('400 26px ' + F.sans), document.fonts.load('500 22px ' + F.mono)
    ]).then(function () { }, function () { });
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW) {
    var chars = String(text).split(''), lines = [], cur = '';
    for (var i = 0; i < chars.length; i++) {
      var t = cur + chars[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = chars[i] === ' ' ? '' : chars[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function jo(s) { return (global.Rules && global.Rules.josa) ? global.Rules.josa(s) : String(s); }
  function plain(md) {
    return String(md || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/gm, '')
      .replace(/^\s*[-*]\s+/gm, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function excerpt(md, n) {
    var p = plain(md); if (!p) return '';
    // 해결방안 블록 앞까지만
    var cut = p.split('해결방안')[0];
    cut = cut.slice(0, n);
    var last = Math.max(cut.lastIndexOf('다. '), cut.lastIndexOf('. '));
    if (last > n * 0.45) cut = cut.slice(0, last + 1);
    return cut.trim();
  }
  function text(ctx, s, x, y, font, color, align) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function para(ctx, s, x, y, maxW, font, color, lh, maxLines) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    var lines = wrap(ctx, s, maxW);
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '') + '…'; }
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    return lines.length * lh;
  }
  function nameWithEmoji(ctx, R, name, x, y, size, align) {
    var em = S.STEM_EMOJI[R.dm];
    ctx.font = '700 ' + size + 'px ' + F.serif; ctx.textBaseline = 'middle';
    var nw = ctx.measureText(name).width;
    ctx.font = (size * 0.85) + 'px ' + F.emoji;
    var ew = ctx.measureText(em).width;
    var total = nw + 14 + ew, sx = align === 'center' ? x - total / 2 : x;
    text(ctx, name, sx, y, '700 ' + size + 'px ' + F.serif, C.fg, 'left');
    text(ctx, em, sx + nw + 14, y + 2, (size * 0.85) + 'px ' + F.emoji, C.fg, 'left');
    return total;
  }

  function frame(H) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * 0.82, -60, 10, W * 0.82, -60, 720);
    g.addColorStop(0, 'rgba(200,162,74,.18)'); g.addColorStop(1, 'rgba(200,162,74,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var g2 = ctx.createRadialGradient(40, H, 10, 40, H, 600);
    g2.addColorStop(0, 'rgba(81,137,196,.14)'); g2.addColorStop(1, 'rgba(81,137,196,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.gold; rrect(ctx, PAD, PAD, 54, 54, 6); ctx.fill();
    text(ctx, '命', PAD + 27, PAD + 29, '600 34px ' + F.hanja, C.bg, 'center');
    text(ctx, '명리판', PAD + 70, PAD + 27, '700 30px ' + F.serif, C.fg);
    text(ctx, 'MYEONGRIPAN', PAD + 188, PAD + 31, '500 15px ' + F.mono, C.fg3);
    return { cv: cv, ctx: ctx };
  }
  function footer(ctx, H, note) {
    ctx.fillStyle = C.line; ctx.fillRect(PAD, H - 100, W - PAD * 2, 1);
    text(ctx, note, PAD, H - 62, '400 18px ' + F.mono, C.fg3);
    text(ctx, SITE, W - PAD, H - 62, '400 18px ' + F.mono, C.fg3, 'right');
  }
  function eyebrow(ctx, s, y) { text(ctx, s, PAD, y, '500 17px ' + F.mono, C.gold); }

  function pillars(ctx, x, y, w, R) {
    var order = [3, 2, 1, 0], names = ['년주', '월주', '일주', '시주'], colW = w / 4;
    ctx.fillStyle = C.bg2; rrect(ctx, x, y, w, 330, 8); ctx.fill();
    ctx.strokeStyle = C.goldSoft; ctx.lineWidth = 1; rrect(ctx, x + .5, y + .5, w - 1, 329, 8); ctx.stroke();
    order.forEach(function (i, k) {
      var p = R.pillars[i], cx = x + colW * k + colW / 2;
      var dim = (i === 3 && R.unknownTime);
      ctx.globalAlpha = dim ? 0.32 : 1;
      if (i === 2) { ctx.fillStyle = 'rgba(200,162,74,.08)'; ctx.fillRect(x + colW * k, y, colW, 330); }
      if (k > 0) { ctx.fillStyle = C.line; ctx.fillRect(x + colW * k, y + 12, 1, 306); }
      text(ctx, names[i] + (dim ? ' · 모름' : ''), cx, y + 30, '500 18px ' + F.mono, i === 2 ? C.gold : C.fg3, 'center');
      text(ctx, i === 2 ? '일간' : p.stemGod, cx, y + 62, '400 19px ' + F.sans, i === 2 ? C.gold : C.fg3, 'center');
      text(ctx, S.STEM_H[p.s], cx, y + 130, '600 92px ' + F.hanja, ELC[S.STEM_EL[p.s]], 'center');
      text(ctx, S.BRANCH_H[p.b], cx, y + 240, '600 92px ' + F.hanja, ELC[S.BRANCH_EL[p.b]], 'center');
      text(ctx, p.branchGod, cx, y + 305, '400 19px ' + F.sans, C.fg3, 'center');
      ctx.globalAlpha = 1;
    });
    return 330;
  }
  function elbar(ctx, x, y, w, scores) {
    var tot = scores.reduce(function (a, b) { return a + b; }, 0) || 1, cx = x;
    ctx.save(); rrect(ctx, x, y, w, 16, 4); ctx.clip();
    scores.forEach(function (v, k) { var sw = w * v / tot; ctx.fillStyle = ELC[k]; ctx.fillRect(cx, y, sw + 1, 16); cx += sw; });
    ctx.restore();
    var lx = x;
    scores.forEach(function (v, k) {
      var label = S.EL_H[k] + ' ' + S.EL[k] + ' ' + Math.round(v / tot * 100) + '%';
      text(ctx, label, lx, y + 44, '500 20px ' + F.mono, ELC[k]);
      ctx.font = '500 20px ' + F.mono; lx += ctx.measureText(label).width + 34;
    });
    return 70;
  }
  function facts(ctx, x, y, w, items) {
    var gap = 16, bw = (w - gap * (items.length - 1)) / items.length;
    items.forEach(function (it, i) {
      var bx = x + (bw + gap) * i;
      ctx.fillStyle = C.bg2; rrect(ctx, bx, y, bw, 92, 8); ctx.fill();
      ctx.strokeStyle = C.line; rrect(ctx, bx + .5, y + .5, bw - 1, 91, 8); ctx.stroke();
      text(ctx, it[0], bx + 18, y + 26, '500 15px ' + F.mono, C.fg3);
      text(ctx, it[1], bx + 18, y + 62, '600 26px ' + F.sans, it[2] || C.fg);
    });
    return 92;
  }

  /* ---------- 개인 카드 ---------- */
  function solo(R, person, store) {
    return fontsReady().then(function () {
      var H = 1350, f = frame(H), ctx = f.ctx, w = W - PAD * 2, y = PAD + 110;
      eyebrow(ctx, '사주 원국 · ' + R.gyeok + ' · ' + R.strength.label, y); y += 46;
      nameWithEmoji(ctx, R, person.name, PAD, y, 56); y += 58;
      var i = person;
      var birth = R.solar.y + '.' + pad(R.solar.m) + '.' + pad(R.solar.d) + (i.cal === 'lunar' ? ' (음력 ' + R.lunar.y + '.' + pad(R.lunar.m) + '.' + pad(R.lunar.d) + ')' : '') +
        ' · ' + (R.unknownTime ? '시각 모름' : pad(i.hour) + ':' + pad(i.minute || 0)) + ' · ' + (i.gender === 'M' ? '남' : '여');
      text(ctx, birth, PAD, y, '400 22px ' + F.mono, C.fg2); y += 46;
      y += pillars(ctx, PAD, y, w, R) + 34;
      y += elbar(ctx, PAD, y, w, R.scores) + 30;
      y += facts(ctx, PAD, y, w, [
        ['격국 · 기본 틀', R.gyeok, C.gold],
        ['일간 강약', R.strength.label + ' ' + Math.round(R.strength.pct), C.fg],
        ['용신 · 필요한 기운', S.EL_H[R.yongsin.main] + ' ' + S.EL[R.yongsin.main] + (R.yongsin.sub >= 0 ? ' · 희신 ' + S.EL[R.yongsin.sub] : ''), ELC[R.yongsin.main]]
      ]) + 38;
      var ex = excerpt((store && store.overall) || (global.Rules ? global.Rules.solo(R, 'overall') : ''), 210);
      if (ex) {
        eyebrow(ctx, (store && store.overall) ? '총평' : '핵심 판정', y); y += 34;
        para(ctx, ex, PAD, y, w, '400 25px ' + F.sans, C.fg2, 40, 5);
      }
      footer(ctx, H, '띠 ' + R.zodiac + ' · 공망 ' + R.gongmang.map(function (b) { return S.BRANCH_H[b]; }).join('') +
        (R.shinsal.length ? ' · ' + R.shinsal.slice(0, 3).join(' ') : ''));
      return f.cv;
    });
  }

  /* ---------- 두 사람 카드 ---------- */
  function pair(A, B, Cm, pa, pb) {
    return fontsReady().then(function () {
      var H = 1350, f = frame(H), ctx = f.ctx, w = W - PAD * 2, y = PAD + 110;
      eyebrow(ctx, '궁합', y); y += 50;
      var half = w / 2;
      nameWithEmoji(ctx, A, pa.name, PAD + half / 2, y, 44, 'center');
      text(ctx, '↔', PAD + half, y, '600 40px ' + F.hanja, C.gold, 'center');
      nameWithEmoji(ctx, B, pb.name, PAD + half + half / 2, y, 44, 'center');
      y += 44;
      text(ctx, S.gz(A.pillars[2].s, A.pillars[2].b) + '일주 · ' + S.EL[A.dmEl] + ' · ' + A.strength.label, PAD + half / 2, y, '400 19px ' + F.mono, C.fg3, 'center');
      text(ctx, S.gz(B.pillars[2].s, B.pillars[2].b) + '일주 · ' + S.EL[B.dmEl] + ' · ' + B.strength.label, PAD + half + half / 2, y, '400 19px ' + F.mono, C.fg3, 'center');
      y += 70;
      var verdict = Cm.total >= 75 ? '구조적으로 잘 맞는 조합' : Cm.total >= 58 ? '관리하면 오래 가는 조합' : Cm.total >= 42 ? '마찰이 구조에 있는 조합' : '서로를 깎는 조합';
      text(ctx, String(Cm.total), W / 2, y + 60, '500 168px ' + F.mono, C.gold, 'center');
      text(ctx, '/ 100', W / 2 + 190, y + 100, '400 26px ' + F.mono, C.fg3, 'left');
      y += 160;
      text(ctx, verdict, W / 2, y, '600 28px ' + F.sans, C.fg, 'center'); y += 60;
      var keys = Object.keys(Cm.sub), bx = PAD + 130, bw = w - 260;
      keys.forEach(function (k) {
        var v = Cm.sub[k], col = v >= 75 ? ELC[0] : v >= 58 ? C.gold : v >= 42 ? ELC[2] : ELC[1];
        text(ctx, k, PAD, y, '500 22px ' + F.sans, C.fg2);
        ctx.fillStyle = C.bg3; rrect(ctx, bx, y - 6, bw, 12, 6); ctx.fill();
        ctx.fillStyle = col; rrect(ctx, bx, y - 6, Math.max(12, bw * v / 100), 12, 6); ctx.fill();
        text(ctx, String(v), W - PAD, y, '500 22px ' + F.mono, col, 'right');
        y += 44;
      });
      y += 20;
      ctx.fillStyle = C.line; ctx.fillRect(PAD, y, w, 1); y += 34;
      text(ctx, '일간', PAD, y, '500 17px ' + F.mono, C.gold);
      y += 30; y += para(ctx, jo(Cm.dm.label + ' — ' + Cm.dm.desc), PAD, y, w, '400 23px ' + F.sans, C.fg, 34, 2) + 18;
      text(ctx, '일지 · 배우자궁', PAD, y, '500 17px ' + F.mono, C.gold);
      y += 30; y += para(ctx, jo(Cm.dayBranch.label + ' — ' + Cm.dayBranch.desc), PAD, y, w, '400 23px ' + F.sans, C.fg, 34, 2) + 22;
      if (Cm.relations.length) {
        var cx = PAD, cy = y;
        ctx.font = '400 19px ' + F.mono;
        Cm.relations.slice(0, 10).forEach(function (r) {
          var label = r.p + ' ' + r.t, tw = ctx.measureText(label).width + 28;
          if (cx + tw > W - PAD) { cx = PAD; cy += 44; }
          if (cy > H - 150) return;
          ctx.fillStyle = C.bg2; rrect(ctx, cx, cy - 16, tw, 34, 17); ctx.fill();
          ctx.strokeStyle = r.w > 0 ? ELC[0] : ELC[1]; ctx.lineWidth = 1; rrect(ctx, cx + .5, cy - 15.5, tw - 1, 33, 17); ctx.stroke();
          text(ctx, label, cx + 14, cy + 1, '400 19px ' + F.mono, r.w > 0 ? ELC[0] : ELC[1]);
          cx += tw + 10;
        });
      } else {
        text(ctx, '글자끼리 합충이 하나도 없는 무색무취 구조', PAD, y, '400 21px ' + F.sans, C.fg3);
      }
      footer(ctx, H, '일간·일지·용신 보완·오행 균형·합충 합산 점수');
      return f.cv;
    });
  }

  /* ---------- 여러 명 카드 ---------- */
  function group(list, Rs, G) {
    return fontsReady().then(function () {
      var H = 1350, f = frame(H), ctx = f.ctx, w = W - PAD * 2, y = PAD + 110, n = list.length;
      eyebrow(ctx, '궁합 · ' + n + '명', y); y += 50;
      var names = list.map(function (p, i) { return p.name + ' ' + S.STEM_EMOJI[Rs[i].dm]; }).join('  ·  ');
      ctx.font = '700 40px ' + F.serif;
      var nl = wrap(ctx, names, w);
      nl.slice(0, 2).forEach(function (l) { text(ctx, l, PAD, y, '700 40px ' + F.serif, C.fg); y += 52; });
      y += 20;
      text(ctx, String(G.avg), PAD, y + 44, '500 128px ' + F.mono, C.gold);
      ctx.font = '500 128px ' + F.mono; var aw = ctx.measureText(String(G.avg)).width;
      text(ctx, '평균 / 100', PAD + aw + 18, y + 78, '400 24px ' + F.mono, C.fg3);
      text(ctx, '최고 ' + G.best.a + ' ↔ ' + G.best.b + '  ' + G.best.total, PAD + aw + 18, y + 22, '500 24px ' + F.sans, ELC[0]);
      text(ctx, '최저 ' + G.worst.a + ' ↔ ' + G.worst.b + '  ' + G.worst.total, PAD + aw + 18, y + 52, '500 24px ' + F.sans, ELC[1]);
      y += 140;
      if (n <= 6) {
        var cell = Math.min(110, Math.floor(w / (n + 1)));
        var mx = PAD, my = y;
        for (var r = 0; r <= n; r++) for (var c = 0; c <= n; c++) {
          var cx = mx + c * cell, cy = my + r * cell;
          if (r === 0 && c === 0) continue;
          if (r === 0 || c === 0) { text(ctx, list[(r === 0 ? c : r) - 1].name, cx + cell / 2, cy + cell / 2, '500 20px ' + F.sans, C.fg2, 'center'); continue; }
          if (r === c) { ctx.fillStyle = C.bg3; ctx.fillRect(cx + 3, cy + 3, cell - 6, cell - 6); continue; }
          var pr = G.pairs.filter(function (p) { return (p.i === r - 1 && p.j === c - 1) || (p.i === c - 1 && p.j === r - 1); })[0];
          var col = pr.total >= 75 ? ELC[0] : pr.total >= 58 ? C.gold : pr.total >= 42 ? ELC[2] : ELC[1];
          ctx.fillStyle = col; ctx.globalAlpha = .16; ctx.fillRect(cx + 3, cy + 3, cell - 6, cell - 6); ctx.globalAlpha = 1;
          text(ctx, String(pr.total), cx + cell / 2, cy + cell / 2, '500 30px ' + F.mono, col, 'center');
        }
        y += cell * (n + 1) + 36;
      }
      eyebrow(ctx, '팀 포지션 · 일간 기준', y); y += 36;
      G.roles.slice(0, 8).forEach(function (r) {
        if (y > H - 150) return;
        ctx.fillStyle = ELC[r.el]; ctx.fillRect(PAD, y - 14, 4, 28);
        text(ctx, r.name + ' ' + S.STEM_EMOJI[Rs[G.roles.indexOf(r)].dm], PAD + 18, y, '600 23px ' + F.sans, C.fg);
        text(ctx, r.role.name + ' — ' + r.role.desc, PAD + 220, y, '400 21px ' + F.sans, C.fg2);
        y += 42;
      });
      var tot = G.merged.reduce(function (a, b) { return a + b; }, 0) || 1;
      footer(ctx, H, '합산 오행 ' + S.EL.map(function (e, k) { return e + Math.round(G.merged[k] / tot * 100); }).join(' ') +
        (G.missing.length ? ' · 부족 ' + G.missing.join('') : ''));
      return f.cv;
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ============================================================
     전체 저장 — 내용을 전부 담아 세로로 길게 그린다.
     캔버스 높이 한계가 있어 12000px 단위로 쪽을 나눈다.
     ============================================================ */
  var PAGE_MAX = 15000;   // 한 장의 최대 높이 (1080×15000 은 브라우저 캔버스 한계 안쪽)

  /** 텍스트를 블록 목록으로 바꾼다. 각 블록은 높이를 미리 계산해 둔다. */
  function buildBlocks(ctx, w, parts) {
    var blocks = [];
    parts.forEach(function (p) {
      if (p.t === 'gap') { blocks.push({ h: p.h, draw: function () { } }); return; }
      if (p.t === 'rule') {
        blocks.push({ h: 25, draw: function (c, y) { c.fillStyle = C.line; c.fillRect(PAD, y + 12, w, 1); } });
        return;
      }
      if (p.t === 'eyebrow') {
        blocks.push({ h: 40, draw: function (c, y) { text(c, p.s, PAD, y + 16, '500 17px ' + F.mono, p.color || C.gold); } });
        return;
      }
      if (p.t === 'h') {
        ctx.font = '700 ' + (p.size || 34) + 'px ' + F.serif;
        var hl = wrap(ctx, p.s, w);
        blocks.push({
          h: hl.length * (p.size || 34) * 1.35 + 14,
          draw: function (c, y) {
            c.font = '700 ' + (p.size || 34) + 'px ' + F.serif; c.fillStyle = p.color || C.fg;
            c.textAlign = 'left'; c.textBaseline = 'middle';
            hl.forEach(function (l, i) { c.fillText(l, PAD, y + (p.size || 34) * 0.75 + i * (p.size || 34) * 1.35); });
          }
        });
        return;
      }
      // 본문
      var size = p.size || 25, lh = p.lh || 40, bullet = p.bullet;
      ctx.font = (p.bold ? '600 ' : '400 ') + size + 'px ' + F.sans;
      var lines = wrap(ctx, p.s, w - (bullet ? 26 : 0));
      blocks.push({
        h: lines.length * lh + (p.after || 10),
        draw: function (c, y) {
          c.font = (p.bold ? '600 ' : '400 ') + size + 'px ' + F.sans;
          c.fillStyle = p.color || (p.bold ? C.gold : C.fg2);
          c.textAlign = 'left'; c.textBaseline = 'middle';
          if (bullet) { c.fillStyle = C.gold; c.fillText('·', PAD, y + lh / 2); c.fillStyle = p.color || C.fg2; }
          lines.forEach(function (l, i) { c.fillText(l, PAD + (bullet ? 26 : 0), y + lh / 2 + i * lh); });
        }
      });
    });
    return blocks;
  }

  /** 마크다운을 블록 지시문으로 편다 */
  function mdParts(md) {
    var parts = [];
    String(md || '').split('\n').forEach(function (raw) {
      var L = raw.trim();
      if (!L) { parts.push({ t: 'gap', h: 10 }); return; }
      var mHead = L.match(/^\*\*(.+?)\*\*$/);
      if (mHead) { parts.push({ t: 'gap', h: 8 }, { t: 'p', s: mHead[1], bold: true, size: 25, lh: 38, after: 4 }); return; }
      if (/^[-*]\s+/.test(L)) { parts.push({ t: 'p', s: L.replace(/^[-*]\s+/, '').replace(/\*\*/g, ''), bullet: true, size: 24, lh: 38, after: 4 }); return; }
      parts.push({ t: 'p', s: L.replace(/\*\*/g, ''), size: 25, lh: 40, after: 8 });
    });
    return parts;
  }

  /** 블록들을 쪽으로 나눠 캔버스 배열을 만든다 */
  function paint(blocks, headerDraw, footerNote, pageLabel) {
    var headH = headerDraw ? headerDraw.h : 0;
    var body = blocks.reduce(function (a, b) { return a + b.h; }, 0);
    var total = headH + body + 150;
    // 쪽 수를 먼저 정하고 그만큼 고르게 나눈다 (마지막에 얇은 조각이 남지 않게)
    var n = Math.max(1, Math.ceil(total / PAGE_MAX));
    var target = Math.ceil(body / n);
    var pages = [], cur = [], h = 0;
    blocks.forEach(function (b) {
      if (cur.length && h + b.h > target && pages.length < n - 1) { pages.push({ blocks: cur, h: h }); cur = []; h = 0; }
      cur.push(b); h += b.h;
    });
    if (cur.length) pages.push({ blocks: cur, h: h });

    return pages.map(function (pg, pi) {
      var H = Math.max(600, (pi === 0 ? headH : PAD + 90) + pg.h + 150);
      var f = frame(H), ctx = f.ctx;
      var y = PAD + 110;
      if (pi === 0 && headerDraw) { headerDraw.draw(ctx); y = headerDraw.h; }
      else { text(ctx, pageLabel + ' — 이어서 (' + (pi + 1) + '/' + pages.length + ')', PAD, PAD + 100, '500 20px ' + F.mono, C.fg3); y = PAD + 150; }
      pg.blocks.forEach(function (b) { b.draw(ctx, y); y += b.h; });
      footer(ctx, H, pages.length > 1 ? (footerNote + ' · ' + (pi + 1) + '/' + pages.length) : footerNote);
      return f.cv;
    });
  }

  function shinsalParts(R) {
    var ss = R.shinsalAll || [];
    if (!ss.length) return [];
    var out = [{ t: 'gap', h: 14 }, { t: 'eyebrow', s: '신살 ' + ss.length + '개' }];
    ['길', '중', '흉'].forEach(function (k) {
      var g = ss.filter(function (s) { return s.kind === k; });
      if (!g.length) return;
      var col = k === '길' ? ELC[0] : k === '흉' ? ELC[1] : C.gold;
      out.push({ t: 'p', s: ({ 길: '길성', 중: '중립', 흉: '흉살' })[k] + ' — ' + g.map(function (s) { return s.name; }).join(', '), bold: true, color: col, size: 24, lh: 38, after: 4 });
      g.forEach(function (s) {
        out.push({ t: 'p', s: s.name + (s.where.length ? '(' + s.where.join('·') + ')' : '') + ' — ' + s.desc, bullet: true, size: 22, lh: 34, after: 2 });
      });
    });
    return out;
  }

  /** 개인 사주 — 전체 */
  function soloFull(R, person, store, defs) {
    return fontsReady().then(function () {
      var w = W - PAD * 2;
      var mc = document.createElement('canvas').getContext('2d');
      var i = person;
      var birth = R.solar.y + '.' + pad(R.solar.m) + '.' + pad(R.solar.d) +
        (i.cal === 'lunar' && R.lunar ? ' (음력 ' + R.lunar.y + '.' + pad(R.lunar.m) + '.' + pad(R.lunar.d) + ')' : '') +
        ' · ' + (R.unknownTime ? '시각 모름' : pad(i.hour) + ':' + pad(i.minute || 0)) + ' · ' + (i.gender === 'M' ? '남' : '여');
      var tot = R.scores.reduce(function (a, b) { return a + b; }, 0) || 1;

      var headH = PAD + 110 + 46 + 58 + 46 + 330 + 34 + 70 + 30 + 92 + 46;
      var header = {
        h: headH,
        draw: function (ctx) {
          var y = PAD + 110;
          eyebrow(ctx, '사주 원국 · ' + R.gyeok + ' · ' + R.strength.label, y); y += 46;
          nameWithEmoji(ctx, R, person.name, PAD, y, 56); y += 58;
          text(ctx, birth, PAD, y, '400 22px ' + F.mono, C.fg2); y += 46;
          y += pillars(ctx, PAD, y, w, R) + 34;
          y += elbar(ctx, PAD, y, w, R.scores) + 30;
          facts(ctx, PAD, y, w, [
            ['격국', R.gyeok, C.gold],
            ['일간 강약', R.strength.label + ' ' + Math.round(R.strength.pct), C.fg],
            ['용신 / 기신', S.EL[R.yongsin.main] + ' / ' + S.EL[R.yongsin.gi], ELC[R.yongsin.main]]
          ]);
        }
      };

      var parts = shinsalParts(R);
      parts.push({ t: 'gap', h: 10 }, { t: 'rule' });
      (defs || []).forEach(function (d) {
        var body = (store && store[d.id]) || (global.Rules ? global.Rules.solo(R, d.id) : '');
        if (!body) return;
        parts.push({ t: 'eyebrow', s: d.title, color: ELC[d.el] });
        parts.push({ t: 'h', s: d.title, size: 34 });
        parts = parts.concat(mdParts(body));
        parts.push({ t: 'gap', h: 16 }, { t: 'rule' });
      });

      var blocks = buildBlocks(mc, w, parts);
      return paint(blocks, header, '띠 ' + R.zodiac + ' · 공망 ' + R.gongmang.map(function (b) { return S.BRANCH_H[b]; }).join(''), person.name + ' 사주');
    });
  }

  /** 궁합 — 전체 */
  function matchFull(list, Rs, G, stores, groupStore, pairDefs, groupDefs) {
    return fontsReady().then(function () {
      var w = W - PAD * 2;
      var mc = document.createElement('canvas').getContext('2d');
      var names = list.map(function (p, i) { return p.name + ' ' + S.STEM_EMOJI[Rs[i].dm]; }).join('  ·  ');
      var headH = PAD + 110 + 50 + 110 + 40;
      var header = {
        h: headH,
        draw: function (ctx) {
          var y = PAD + 110;
          eyebrow(ctx, '궁합 · ' + list.length + '명', y); y += 46;
          ctx.font = '700 40px ' + F.serif;
          wrap(ctx, names, w).slice(0, 2).forEach(function (l) { text(ctx, l, PAD, y, '700 40px ' + F.serif, C.fg); y += 52; });
          text(ctx, '평균 ' + G.avg + '점 · 최고 ' + G.best.a + ' ↔ ' + G.best.b + ' ' + G.best.total +
            ' · 최저 ' + G.worst.a + ' ↔ ' + G.worst.b + ' ' + G.worst.total, PAD, y + 6, '400 22px ' + F.mono, C.fg2);
        }
      };

      var parts = [];
      G.pairs.forEach(function (c) {
        var key = c.i + '-' + c.j, st = stores[key] || {};
        parts.push({ t: 'gap', h: 12 }, { t: 'rule' });
        parts.push({ t: 'eyebrow', s: '쌍 · 종합 ' + c.total + '점' });
        parts.push({ t: 'h', s: c.a + ' ↔ ' + c.b, size: 38 });
        parts.push({ t: 'p', s: Object.keys(c.sub).map(function (k) { return k + ' ' + c.sub[k]; }).join('   '), size: 23, lh: 36, color: C.fg3 });
        parts.push({ t: 'p', s: '일간 ' + c.dm.label + ' — ' + c.dm.desc, size: 23, lh: 36 });
        parts.push({ t: 'p', s: '일지 ' + c.dayBranch.label + ' — ' + c.dayBranch.desc, size: 23, lh: 36 });
        if (c.relations.length) parts.push({ t: 'p', s: '합충 ' + c.relations.map(function (r) { return r.p + ' ' + r.t; }).join(' / '), size: 21, lh: 32, color: C.fg3 });
        (pairDefs || []).forEach(function (d) {
          var body = st[d.id] || (global.Rules ? global.Rules.pair(Rs[c.i], Rs[c.j], c, d.id) : '');
          if (!body) return;
          parts.push({ t: 'gap', h: 10 }, { t: 'eyebrow', s: d.title, color: ELC[d.el] });
          parts.push({ t: 'h', s: d.title, size: 30 });
          parts = parts.concat(mdParts(body));
        });
      });
      if (groupDefs && list.length > 2) {
        parts.push({ t: 'gap', h: 14 }, { t: 'rule' }, { t: 'h', s: '전체 종합', size: 38 });
        groupDefs.forEach(function (d) {
          var body = groupStore[d.id] || (global.Rules ? global.Rules.group(Rs, G, d.id) : '');
          if (!body) return;
          parts.push({ t: 'gap', h: 10 }, { t: 'eyebrow', s: d.title, color: ELC[d.el] });
          parts.push({ t: 'h', s: d.title, size: 30 });
          parts = parts.concat(mdParts(body));
        });
      }

      var blocks = buildBlocks(mc, w, parts);
      var tot = G.merged.reduce(function (a, b) { return a + b; }, 0) || 1;
      return paint(blocks, header,
        '합산 오행 ' + S.EL.map(function (e, k) { return e + Math.round(G.merged[k] / tot * 100); }).join(' '),
        list.map(function (p) { return p.name; }).join('·') + ' 궁합');
    });
  }

  /** 여러 장을 차례로 저장한다 */
  function saveAll(canvases, base) {
    var i = 0;
    function step() {
      if (i >= canvases.length) return Promise.resolve(canvases.length);
      var name = canvases.length > 1 ? base + '_' + (i + 1) + '.png' : base + '.png';
      return save(canvases[i], name).then(function () {
        i++;
        return new Promise(function (ok) { setTimeout(ok, 600); }).then(step);
      });
    }
    return step();
  }

  /* ---------- 저장 ---------- */
  function save(cv, filename) {
    return new Promise(function (ok, fail) {
      cv.toBlob(function (b) { b ? ok(b) : fail({ code: 'blob', message: 'toBlob failed' }); }, 'image/png');
    }).then(function (blob) {
      if (global.claude && global.claude.use) {
        return global.claude.use('downloads').then(function (d) {
          if (!d) throw { code: 'unavailable', message: 'downloads unavailable' };
          return d.save({ filename: filename, data: blob }).then(function () { return 'saved'; });
        });
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
      return 'saved';
    });
  }

  global.Card = {
    solo: solo, pair: pair, group: group, save: save,
    soloFull: soloFull, matchFull: matchFull, saveAll: saveAll
  };
})(typeof window !== 'undefined' ? window : this);
