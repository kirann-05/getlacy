/* Lacy landing: all the toys. No dependencies. */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const PALETTE = ["#ff4fa3", "#ffdd33", "#3355ff", "#3ee6a8", "#ff7a1a", "#b69cff", "#7fd3ff"];
  const INK = "#15111f";
  const ic = (n, c) => `<svg class="i" aria-hidden="true"${c ? ` style="color:${c}"` : ""}><use href="#i-${n}"/></svg>`;

  const store = {
    get(k, d) { try { const v = localStorage.getItem("lacy." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("lacy." + k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  }

  /* ---------- Springs (SwiftUI-style bounce + duration) ---------- */
  class Spring {
    constructor(x, onUpdate) { this.x = x; this.v = 0; this.target = x; this.onUpdate = onUpdate; this.raf = 0; }
    to(target, { bounce = 0, duration = 0.45 } = {}, onDone) {
      this.target = target; this.onDone = onDone;
      const w = (2 * Math.PI) / duration;
      this.k = w * w;
      this.c = (4 * Math.PI * (1 - bounce)) / duration;
      if (reduce) { this.set(target); onDone && onDone(); return; }
      if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
    }
    set(x) { this.x = this.target = x; this.v = 0; cancelAnimationFrame(this.raf); this.raf = 0; this.onUpdate(x); }
    tick = (now) => {
      let dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const h = 1 / 240;
      while (dt > 0) {
        const s = Math.min(h, dt);
        const a = -this.k * (this.x - this.target) - this.c * this.v;
        this.v += a * s; this.x += this.v * s; dt -= s;
      }
      this.onUpdate(this.x);
      if (Math.abs(this.v) < 0.002 && Math.abs(this.x - this.target) < 0.0005) {
        this.x = this.target; this.v = 0; this.onUpdate(this.x); this.raf = 0;
        const d = this.onDone; this.onDone = null; d && d();
        return;
      }
      this.raf = requestAnimationFrame(this.tick);
    };
  }
  const OPEN = { bounce: 0.26, duration: 0.5 };
  const CLOSE = { bounce: 0, duration: 0.4 };

  /* ---------- Clock ---------- */
  const clock = $("#clock");
  const tickClock = () => {
    clock.textContent = new Date().toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
  };
  tickClock(); setInterval(tickClock, 15000);

  /* ---------- Googly eyes everywhere ---------- */
  let px = innerWidth / 2, py = 0;
  const eyes = $$(".eye");
  let eyeRaf = 0;
  function aimEyes() {
    eyeRaf = 0;
    for (const e of eyes) {
      const r = e.getBoundingClientRect();
      if (!r.width) continue;
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, m = r.width * 0.24;
      const k = Math.min(1, d / 120) * m;
      e.style.setProperty("--ex", (dx / d) * k + "px");
      e.style.setProperty("--ey", (dy / d) * k + "px");
    }
  }
  addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; if (!eyeRaf) eyeRaf = requestAnimationFrame(aimEyes); }, { passive: true });
  addEventListener("scroll", () => { if (!eyeRaf) eyeRaf = requestAnimationFrame(aimEyes); }, { passive: true });
  if (!reduce) setInterval(() => {
    for (const n of $$(".notch, .lnotch")) { n.classList.add("is-blink"); setTimeout(() => n.classList.remove("is-blink"), 200); }
  }, 3800);

  /* ---------- The real notch (top of the page) ---------- */
  const notch = $("#notch");
  const peekEl = $("#notchPeek");
  const narrow = () => innerWidth < 680;
  const geo = {
    closed: () => ({ w: narrow() ? 130 : 190, h: 34 }),
    peek: () => ({ w: Math.min(400, innerWidth - 24), h: 40 }),
    open: () => ({ w: Math.min(440, innerWidth - 24), h: 190 }),
  };
  let nState = "closed";
  const wS = new Spring(geo.closed().w, (v) => { notch.style.width = v + "px"; });
  const hS = new Spring(34, (v) => {
    notch.style.height = v + "px";
    notch.style.borderRadius = `0 0 ${clamp(v * 0.32, 14, 34)}px ${clamp(v * 0.32, 14, 34)}px`;
  });
  function setNotch(state) {
    nState = state;
    const g = geo[state](), s = state === "closed" ? CLOSE : OPEN;
    wS.to(g.w, s); hS.to(g.h, s);
    notch.classList.toggle("is-open", state === "open");
    notch.classList.toggle("is-peek", state === "peek");
    notch.setAttribute("aria-expanded", state === "open");
    document.dispatchEvent(new CustomEvent("notchstate", { detail: state }));
  }
  let leaveT, peekT;
  notch.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveT); clearTimeout(peekT);
    notch.classList.add("is-lifted");
    setNotch("open");
  });
  notch.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    notch.classList.remove("is-lifted");
    leaveT = setTimeout(() => setNotch("closed"), 220);
  });
  // A tap opens the notch; once open, taps inside it are for its pages (tap outside or scroll the page to close).
  notch.addEventListener("click", () => {
    if (nState === "open") return;
    clearTimeout(peekT);
    setNotch("open");
  });
  notch.addEventListener("keydown", (e) => {
    if (e.target === notch && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setNotch(nState === "open" ? "closed" : "open"); }
    if (e.key === "Escape") { setNotch("closed"); notch.focus(); }
  });
  document.addEventListener("pointerdown", (e) => { if (nState === "open" && !notch.contains(e.target)) setNotch("closed"); });
  addEventListener("resize", () => { const g = geo[nState](); wS.set(g.w); hS.set(g.h); });
  // Scrolling away closes the open notch (unless the mouse is resting on it), so it never sits over the page.
  let openScrollY = 0;
  addEventListener("scroll", () => {
    if (nState !== "open") { openScrollY = scrollY; return; }
    if (!notch.matches(":hover") && Math.abs(scrollY - openScrollY) > 40) setNotch("closed");
  }, { passive: true });

  function peek(html, ms = 2600) {
    if (nState === "open") { toast(html.replace(/<[^>]+>/g, "")); return; }
    peekEl.innerHTML = html;
    setNotch("peek");
    clearTimeout(peekT);
    peekT = setTimeout(() => { if (nState === "peek") setNotch("closed"); }, ms);
  }

  /* ---------- Notch pages: scroll, swipe, dots or arrow keys ---------- */
  const PAGES = ["Now Playing", "Calendar", "Shelf", "Ask", "Snake", "Tools"];
  const nTrack = $("#nTrack"), nView = $("#nView"), nDots = $("#nDots"), nLabel = $("#nLabel");
  let page = 0;
  const pageS = new Spring(0, (p) => { nTrack.style.transform = `translateX(${-p * 100}%)`; });
  const PAGE_SPRING = { bounce: 0.18, duration: 0.42 };
  PAGES.forEach((name, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", name);
    b.addEventListener("click", () => goPage(i));
    nDots.appendChild(b);
  });
  function goPage(i, kick = 0) {
    const to = clamp(i, 0, PAGES.length - 1);
    if (to === page && kick) pageS.v = kick;        // already at the end: bump past it and spring back
    page = to;
    pageS.to(page, PAGE_SPRING);
    nLabel.textContent = PAGES[page];
    $$("button", nDots).forEach((b, j) => b.setAttribute("aria-selected", j === page));
    miniSnake(page === 4 && nState === "open");
  }
  // Mouse wheel or trackpad over the open notch flips pages: one page per gesture, like the app.
  let wheelAcc = 0, lastWheel = 0, wheelDone = false;
  notch.addEventListener("wheel", (e) => {
    if (nState !== "open") return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel > 180) { wheelAcc = 0; wheelDone = false; }
    lastWheel = now;
    if (wheelDone) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    wheelAcc += e.deltaMode === 1 ? d * 30 : d;
    if (Math.abs(wheelAcc) > 40) { const dir = Math.sign(wheelAcc); wheelDone = true; goPage(page + dir, dir * 3); }
  }, { passive: false });
  // Touch: the pages follow the finger, rubber-banding at the ends.
  let swX = null, swY = 0, swP = 0, dragging = false;
  nView.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    swX = e.clientX; swY = e.clientY; swP = page; dragging = false;
  });
  nView.addEventListener("pointermove", (e) => {
    if (swX == null) return;
    const dx = e.clientX - swX, dy = e.clientY - swY;
    if (!dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      dragging = true; nView.setPointerCapture(e.pointerId);
    }
    const max = PAGES.length - 1;
    let p = swP - dx / nView.clientWidth;
    if (p < 0) p *= 0.3; else if (p > max) p = max + (p - max) * 0.3;
    pageS.set(p);
  });
  const swipeEnd = (e) => {
    if (swX == null) return;
    const dx = e.clientX - swX, w = nView.clientWidth;
    if (dragging) goPage(dx < -w * 0.15 ? swP + 1 : dx > w * 0.15 ? swP - 1 : swP);
    swX = null; dragging = false;
  };
  nView.addEventListener("pointerup", swipeEnd); nView.addEventListener("pointercancel", swipeEnd);
  notch.addEventListener("keydown", (e) => {
    if (nState !== "open" || e.target.matches("input")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goPage(page + 1, 3); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goPage(page - 1, -3); }
  });
  document.addEventListener("notchstate", (e) => miniSnake(e.detail === "open" && page === 4));

  // Ask and Tools pages
  $("#nAsk").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#nAskIn").value.trim();
    if (!q) return;
    toast(`Handed to Claude: "${q.slice(0, 32)}${q.length > 32 ? "…" : ""}"`);
    $("#nAskIn").value = "";
  });
  for (const t of $$(".ntool")) t.addEventListener("click", () => {
    const on = !t.classList.contains("is-on");
    $$(".ntool").forEach((x) => x.classList.remove("is-on"));
    t.classList.toggle("is-on", on);
    if (on) toast(`${t.dataset.ntool} is ready`);
  });

  // Snake page: a tiny snake that plays itself
  const ms = $("#nSnake"), mx = ms.getContext("2d");
  let mBody = [], mFood = null, mDir = { x: 1, y: 0 }, mTimer = 0, mCols = 30, mRows = 8;
  function miniReset() {
    mBody = [{ x: 6, y: 3 }, { x: 5, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 3 }]; mDir = { x: 1, y: 0 }; miniFood();
  }
  function miniFood() {
    do { mFood = { x: (Math.random() * mCols) | 0, y: (Math.random() * mRows) | 0 }; } while (mBody.some((b) => b.x === mFood.x && b.y === mFood.y));
  }
  function miniStep() {
    const h = mBody[0], wrap = (p) => ({ x: (p.x + mCols) % mCols, y: (p.y + mRows) % mRows });
    const options = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
      .filter((d) => !(d.x === -mDir.x && d.y === -mDir.y))
      .map((d) => ({ d, n: wrap({ x: h.x + d.x, y: h.y + d.y }) }))
      .filter((o) => !mBody.some((b) => b.x === o.n.x && b.y === o.n.y));
    if (!options.length) return miniReset();
    options.sort((a, b) => (Math.abs(a.n.x - mFood.x) + Math.abs(a.n.y - mFood.y)) - (Math.abs(b.n.x - mFood.x) + Math.abs(b.n.y - mFood.y)) || Math.random() - 0.5);
    mDir = options[0].d;
    mBody.unshift(options[0].n);
    if (options[0].n.x === mFood.x && options[0].n.y === mFood.y) { if (mBody.length > 22) miniReset(); else miniFood(); }
    else mBody.pop();
    miniDraw();
  }
  function miniDraw() {
    const d = Math.min(2, devicePixelRatio || 1);
    if (ms.width !== Math.round(ms.clientWidth * d)) { ms.width = Math.round(ms.clientWidth * d); ms.height = Math.round(ms.clientHeight * d); }
    const cw = ms.width / mCols, ch = ms.height / mRows;
    mx.fillStyle = "#0b0b0b"; mx.fillRect(0, 0, ms.width, ms.height);
    mx.fillStyle = "#ff4fa3"; mx.beginPath(); mx.arc((mFood.x + 0.5) * cw, (mFood.y + 0.5) * ch, Math.min(cw, ch) * 0.36, 0, 6.283); mx.fill();
    mBody.forEach((b, i) => { mx.fillStyle = i === 0 ? "#ffdd33" : "#3ee6a8"; mx.fillRect(b.x * cw + 1, b.y * ch + 1, cw - 2, ch - 2); });
  }
  function miniSnake(on) {
    clearInterval(mTimer); mTimer = 0;
    if (!on) return;
    if (!mBody.length) miniReset();
    miniDraw();
    if (!reduce) mTimer = setInterval(miniStep, 120);
  }
  goPage(0);

  /* ---------- Shared player ---------- */
  const tracks = [
    { t: "Bubblegum Sunrise", a: "The Floppy Disks", al: "Insert Disk 2", len: 238, g: ["#ff4fa3", "#b69cff", "#3355ff"], sun: "#ffdd33" },
    { t: "Dot Matrix Dreams", a: "Halftone Kids", al: "Ben-Day Nights", len: 201, g: ["#3ee6a8", "#7fd3ff", "#3355ff"], sun: "#ff4fa3" },
    { t: "Spring Loaded", a: "Bounce 0.26", al: "Overshoot", len: 176, g: ["#ffdd33", "#ff7a1a", "#ff2e6e"], sun: "#fff6e3" },
    { t: "Notch Me If You Can", a: "The Menubar Band", al: "Live at 0% CPU", len: 224, g: ["#15111f", "#3355ff", "#b69cff"], sun: "#3ee6a8" },
  ];
  // Starts paused: browsers only allow sound after a click, so play is the first thing people press.
  let ti = 0, pos = 0, playing = false, heardOnce = false;
  const chip = window.LacyChip;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function paintTrack(announce) {
    const k = tracks[ti];
    const grad = `linear-gradient(160deg, ${k.g[0]}, ${k.g[1]} 55%, ${k.g[2]})`;
    $("#npTitle").textContent = k.t; $("#npArtist").textContent = `${k.a} · ${k.al}`;
    $("#dpTitle").textContent = k.t; $("#dpArtist").textContent = k.a;
    $(".lnotch__txt b").textContent = k.t; $(".lnotch__txt small").textContent = k.a;
    $(".np__bar span:last-child").textContent = fmt(k.len);
    for (const el of $$(".np__art, .dp__art, .lnotch__art")) { el.style.background = grad; el.style.setProperty("--sun", k.sun); }
    for (const s of $$(".np__art span, .dp__art span")) s.style.background = k.sun;
    if (announce) peek(`<span>${ic("music", "#ff4fa3")} <b>${k.t}</b></span><span>${k.a}</span>`, 2200);
  }
  function paintPos() {
    const k = tracks[ti], p = (pos / k.len) * 100 + "%";
    $("#npFill").style.width = p; $("#dpFill").style.width = p; $("#npTime").textContent = fmt(pos);
  }
  let songStep = 0;
  function setPlaying(v) {
    playing = v;
    for (const b of $$('[data-np="play"]')) {
      b.innerHTML = ic(v ? "pause" : "play");
      b.setAttribute("aria-label", v ? "Pause" : "Play");
    }
    document.body.classList.toggle("is-paused", !v);
    if (!chip) return;
    if (v) {
      chip.play(ti, songStep);
      if (!heardOnce) { heardOnce = true; toast("Sound on: original chiptunes, made for Lacy"); }
    } else songStep = chip.pause();
  }
  function skip(d) {
    ti = (ti + d + tracks.length) % tracks.length; pos = 0; songStep = 0;
    paintTrack(true); paintPos();
    if (playing && chip) chip.play(ti, 0);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-np]");
    if (!b) return;
    const a = b.dataset.np;
    if (a === "play") setPlaying(!playing);
    if (a === "next") skip(1);
    if (a === "prev") {
      if (pos > 3) { pos = 0; songStep = 0; paintPos(); if (playing && chip) chip.play(ti, 0); }
      else skip(-1);
    }
  });
  setInterval(() => { if (!playing) return; pos++; if (pos >= tracks[ti].len) skip(1); paintPos(); }, 1000);
  paintTrack(false); paintPos(); setPlaying(false);
  if (chip) {
    chip.setVolume(+$("#vol").value);
    document.addEventListener("visibilitychange", () => { if (!playing) return; document.hidden ? chip.suspend() : chip.resume(); });
  }

  /* ---------- Cartoon laptop notch ---------- */
  const ln = $("#lnotch");
  let lOpen = false;
  const lS = new Spring(0, (p) => {
    ln.style.width = 26 + (68 - 26) * p + "%";
    ln.style.height = 9 + (30 - 9) * p + "%";
    ln.style.borderRadius = `0 0 ${14 + 18 * p}px ${14 + 18 * p}px`;
  });
  ln.addEventListener("click", () => {
    lOpen = !lOpen;
    ln.classList.toggle("is-open", lOpen);
    ln.setAttribute("aria-label", lOpen ? "Close the cartoon notch" : "Open the cartoon notch");
    lS.to(lOpen ? 1 : 0, lOpen ? OPEN : CLOSE);
    $(".laptop__hint").style.opacity = lOpen ? 0 : 1;
  });
  // open it once on load so people see the trick
  if (!reduce) setTimeout(() => { if (!lOpen) ln.click(); setTimeout(() => { if (lOpen) ln.click(); }, 2600); }, 1400);

  /* ---------- Split the big headline into bouncy letters ---------- */
  let ci = 0;
  for (const line of $$("[data-split]")) {
    const txt = line.textContent;
    line.setAttribute("aria-label", txt);
    line.textContent = "";
    txt.split(" ").forEach((word, wi) => {
      if (wi) line.appendChild(document.createTextNode(" "));
      const w = document.createElement("span");
      w.className = "word"; w.setAttribute("aria-hidden", "true");
      for (const ch of word) {
        const s = document.createElement("span");
        s.className = "ch"; s.style.setProperty("--i", ci++); s.textContent = ch;
        w.appendChild(s);
      }
      line.appendChild(w);
    });
  }

  /* ---------- Sparkle trail + confetti ---------- */
  const sc = $("#sparkles"), sx = sc.getContext("2d");
  let parts = [], sRaf = 0, lastSpark = { x: 0, y: 0 };
  function sizeSparkles() { const d = Math.min(2, devicePixelRatio || 1); sc.width = innerWidth * d; sc.height = innerHeight * d; sx.setTransform(d, 0, 0, d, 0, 0); }
  sizeSparkles(); addEventListener("resize", sizeSparkles);
  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 4, rr = i % 2 ? r * 0.38 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function runParts() {
    sRaf = 0;
    sx.clearRect(0, 0, innerWidth, innerHeight);
    const now = performance.now();
    parts = parts.filter((p) => now - p.b < p.life);
    for (const p of parts) {
      const k = 1 - (now - p.b) / p.life;
      p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      sx.save(); sx.globalAlpha = Math.min(1, k * 1.5); sx.fillStyle = p.c; sx.strokeStyle = INK; sx.lineWidth = 1.5;
      if (p.kind === "star") { star(sx, p.x, p.y, p.r * (0.4 + k * 0.6), p.rot); sx.fill(); sx.stroke(); }
      else { sx.translate(p.x, p.y); sx.rotate(p.rot); sx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); sx.strokeRect(-p.r, -p.r / 2, p.r * 2, p.r); }
      sx.restore();
    }
    if (parts.length) sRaf = requestAnimationFrame(runParts);
  }
  const kick = () => { if (!sRaf) sRaf = requestAnimationFrame(runParts); };
  if (finePointer && !reduce) addEventListener("pointermove", (e) => {
    if (Math.hypot(e.clientX - lastSpark.x, e.clientY - lastSpark.y) < 14 || parts.length > 90) return;
    lastSpark = { x: e.clientX, y: e.clientY };
    parts.push({ kind: "star", x: e.clientX + 10, y: e.clientY + 12, vx: (Math.random() - 0.5) * 1.6, vy: Math.random() * -1, g: 0.06, r: 5 + Math.random() * 6, rot: Math.random() * 6, vr: 0.1, c: PALETTE[(Math.random() * PALETTE.length) | 0], b: performance.now(), life: 700 });
    kick();
  }, { passive: true });
  function confetti(x, y, n = 140) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ kind: Math.random() < 0.35 ? "star" : "rect", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, g: 0.28, r: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: PALETTE[i % PALETTE.length], b: performance.now(), life: 1600 + Math.random() * 900 });
    }
    kick();
  }

  /* ---------- Draggable stickers ---------- */
  for (const s of $$(".sticker")) {
    let sxp = 0, syp = 0, dx = 0, dy = 0;
    s.addEventListener("pointerdown", (e) => {
      s.setPointerCapture(e.pointerId); s.classList.add("is-drag");
      sxp = e.clientX - dx; syp = e.clientY - dy;
    });
    s.addEventListener("pointermove", (e) => {
      if (!s.classList.contains("is-drag")) return;
      dx = e.clientX - sxp; dy = e.clientY - syp;
      s.style.setProperty("--dx", dx + "px"); s.style.setProperty("--dy", dy + "px");
    });
    const up = () => {
      if (!s.classList.contains("is-drag")) return;
      s.classList.remove("is-drag");
      s.style.setProperty("--r", (Math.random() * 30 - 15).toFixed(1) + "deg");
    };
    s.addEventListener("pointerup", up); s.addEventListener("pointercancel", up);
  }

  /* ---------- Desktop icons ---------- */
  for (const a of $$(".icons a")) a.addEventListener("click", () => {
    const t = document.querySelector(a.getAttribute("href"));
    const w = t && (t.classList.contains("win") ? t : $(".win", t));
    if (w) setTimeout(() => { w.classList.remove("is-ping"); void w.offsetWidth; w.classList.add("is-ping"); }, 650);
  });
  const trash = $("#trash");
  trash.addEventListener("click", () => {
    trash.classList.toggle("is-full");
    toast(trash.classList.contains("is-full") ? "Trash: 1 item (minimalism.css)" : "Trash emptied. Goodbye, minimalism.");
    if (!trash.classList.contains("is-full")) { const r = trash.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 20, 60); }
  });

  /* ---------- Calendar ---------- */
  const today = new Date();
  const evPool = [
    ["Design crit", "#ff4fa3"], ["Coffee", "#ff7a1a"], ["Gym", "#3ee6a8"], ["Standup", "#3355ff"],
    ["Ship it", "#ffdd33"], ["Dentist", "#b69cff"], ["Movie night", "#7fd3ff"], ["Mom's call", "#ff2e6e"],
  ];
  const evFor = (d) => (d % 4 === 1 ? [] : [0, 1, 2].slice(0, (d % 3) + 1).map((i) => evPool[(d * 3 + i) % evPool.length]));
  function renderEvents(day) {
    const box = $("#calEvents");
    const list = evFor(day);
    const dt = new Date(today.getFullYear(), today.getMonth(), day);
    $("#calWeekday").textContent = dt.toLocaleDateString([], { weekday: "long" }) + (day === today.getDate() ? "" : ` · ${day}`);
    box.innerHTML = list.length
      ? list.map(([n, c], i) => `<div class="ev" style="background:${c}33;border-left:3px solid ${c}"><span>${n}</span><span>${9 + i * 3}:${i % 2 ? "30" : "00"}</span></div>`).join("")
      : `<div class="ev ev--none"><span>Nothing. Go outside!</span></div>`;
  }
  (function buildCal() {
    const g = $("#calGrid");
    $("#calMonth").textContent = "‹ " + today.toLocaleDateString([], { month: "short" }).toUpperCase() + " ›";
    g.innerHTML = ["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span class="dow">${d}</span>`).join("");
    const first = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 0; i < first; i++) g.appendChild(document.createElement("span"));
    for (let d = 1; d <= days; d++) {
      const b = document.createElement("button");
      b.textContent = d; b.type = "button";
      const wd = (first + d - 1) % 7;
      if (wd === 0 || wd === 6) b.classList.add("wk");
      if (d === today.getDate()) b.classList.add("today");
      if (evFor(d).length > 1) b.classList.add("busy");
      b.addEventListener("click", () => { $$("button", g).forEach((x) => x.classList.remove("pick")); if (d !== today.getDate()) b.classList.add("pick"); renderEvents(d); });
      g.appendChild(b);
    }
    renderEvents(today.getDate());
    // the notch's Calendar page shows today
    $("#nCalNum").textContent = today.getDate();
    $("#nCalName").textContent = today.toLocaleDateString([], { weekday: "long" }) + " · " + today.toLocaleDateString([], { month: "short" });
    const todays = evFor(today.getDate()).slice(0, 2);
    $("#nCalEvs").innerHTML = todays.length
      ? todays.map(([n, c], i) => `<div class="ev" style="background:${c}33;border-left:3px solid ${c}"><span>${n}</span><span>${9 + i * 3}:${i % 2 ? "30" : "00"}</span></div>`).join("")
      : `<div class="ev ev--none"><span>Nothing today. Go outside!</span></div>`;
  })();

  /* ---------- Shelf (pointer drag so it works with touch too) ---------- */
  const drop = $("#shelfDrop");
  for (const f of $$(".file")) {
    f.removeAttribute("draggable");
    let ghost = null, ox = 0, oy = 0;
    f.addEventListener("pointerdown", (e) => {
      if (f.classList.contains("is-gone")) return;
      e.preventDefault(); f.setPointerCapture(e.pointerId);
      const r = f.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
      ghost = f.cloneNode(true);
      Object.assign(ghost.style, { position: "fixed", left: r.left + "px", top: r.top + "px", zIndex: 90, pointerEvents: "none", transform: "rotate(-8deg) scale(1.15)", transition: "none" });
      document.body.appendChild(ghost);
    });
    f.addEventListener("pointermove", (e) => {
      if (!ghost) return;
      ghost.style.left = e.clientX - ox + "px"; ghost.style.top = e.clientY - oy + "px";
      const r = drop.getBoundingClientRect();
      drop.classList.toggle("is-over", e.clientX > r.left && e.clientX < r.right && e.clientY > r.top - 30 && e.clientY < r.bottom);
    });
    const end = () => {
      if (!ghost) return;
      ghost.remove(); ghost = null;
      if (drop.classList.contains("is-over")) {
        drop.classList.remove("is-over");
        if (drop.firstElementChild && !drop.querySelector(".chipfile")) drop.innerHTML = "";
        const c = document.createElement("span"); c.className = "chipfile"; c.innerHTML = ic("doc") + " " + f.dataset.name;
        drop.appendChild(c); f.classList.add("is-gone");
        const ns = $("#nShelf");
        if (!ns.querySelector(".chipfile")) ns.innerHTML = "";
        ns.appendChild(c.cloneNode(true));
        if (ns.children.length > 3) ns.firstElementChild.remove();
        peek(`<span>${ic("tray", "#7fd3ff")} Shelf</span><b>${f.dataset.name}</b>`, 1800);
        if ($$(".file.is-gone").length === 3) setTimeout(() => { $$(".file").forEach((x) => x.classList.remove("is-gone")); drop.innerHTML = "<span>shelf full! drag again ↑</span>"; }, 2600);
      }
    };
    f.addEventListener("pointerup", end); f.addEventListener("pointercancel", end);
  }

  /* ---------- Ask ---------- */
  let askApp = "Claude";
  for (const c of $$(".ask__apps .chip")) c.addEventListener("click", () => {
    $$(".ask__apps .chip").forEach((x) => x.classList.toggle("is-on", x === c));
    askApp = c.textContent;
  });
  $("#askForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#askInput").value.trim() || $("#askInput").placeholder;
    const out = $("#askOut");
    out.textContent = "";
    const msg = `→ "${q.slice(0, 40)}${q.length > 40 ? "…" : ""}" handed to ${askApp}. Done.`;
    let i = 0;
    const type = () => { out.textContent = msg.slice(0, ++i); if (i < msg.length) setTimeout(type, reduce ? 0 : 18); };
    type();
    peek(`<span>${ic("sparkle", "#ff7a1a")} Ask</span><b>${askApp}</b><span>sent</span>`, 1800);
    $("#askInput").value = "";
  });

  /* ---------- Live activities + HUD ---------- */
  const live = {
    charge: `<span>${ic("bolt", "#3ee6a8")} Charging</span><span class="peek__bar"><i style="width:82%"></i></span><b>82%</b>`,
    pods: `<span>${ic("airpods")} AirPods</span><b>Connected</b><span>L 100% · R 96%</span>`,
    focus: `<span>${ic("moon", "#b69cff")} Focus</span><b>Do Not Disturb</b><span>on</span>`,
    meet: `<span>${ic("calendar", "#ff4fa3")} Design crit</span><b>in 5 min</b>`,
    low: `<span>${ic("battery-low", "#ff2e6e")} Battery</span><span class="peek__bar"><i style="width:10%;background:#ff2e6e"></i></span><b>10%</b>`,
    timer: `<span>${ic("timer", "#ff7a1a")} Timer</span><b>04:59</b><span>Pizza</span>`,
  };
  for (const b of $$("[data-live]")) b.addEventListener("click", () => { scrollPeekIntoView(); peek(live[b.dataset.live]); });
  function scrollPeekIntoView() { /* the notch is fixed, so it's always visible */ }
  $("#vol").addEventListener("input", (e) => {
    const v = +e.target.value;
    if (chip) chip.setVolume(v);
    peek(`<span>${ic(v === 0 ? "speaker-0" : v < 50 ? "speaker-1" : "speaker-3")}</span><span class="peek__bar"><i style="width:${v}%;background:#fff"></i></span><b>${v}</b>`, 1200);
  });

  /* ---------- Tools ---------- */
  for (const t of $$(".tool")) t.addEventListener("click", () => {
    const on = !t.classList.contains("is-on");
    $$(".tool").forEach((x) => x.classList.remove("is-on"));
    t.classList.toggle("is-on", on);
    if (on) peek(`<span>${ic(t.dataset.icon)} ${t.dataset.tool}</span><b>ready</b>`, 1600);
  });

  /* ---------- Spring lab ---------- */
  const labN = $("#labNotch"), lab = $(".lab"), cv = $("#curve"), cx = cv.getContext("2d");
  const bIn = $("#bounce"), dIn = $("#dur");
  const params = () => ({ bounce: +bIn.value, duration: +dIn.value });
  let pull = 0, marker = null;
  const labS = new Spring(0, (p) => {
    pull = p;
    labN.style.height = 40 + p + "px";
    labN.style.width = 160 + p * 0.7 + "px";
    labN.style.borderRadius = `0 0 ${22 + p * 0.12}px ${22 + p * 0.12}px`;
  });
  function sizeCurve() { const d = Math.min(2, devicePixelRatio || 1); cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); drawCurve(); }
  function drawCurve() {
    const W = cv.clientWidth, H = cv.clientHeight, { bounce, duration } = params();
    const k = (2 * Math.PI / duration) ** 2, c = (4 * Math.PI * (1 - bounce)) / duration;
    const T = 1.6, pad = 14, y0 = pad + 8, y1 = H - pad - 18;
    const Y = (v) => y1 + (y0 - y1) * v; // v: 0 = start, 1 = target
    cx.clearRect(0, 0, W, H);
    cx.strokeStyle = "rgba(255,246,227,.25)"; cx.setLineDash([4, 5]); cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(pad, Y(1)); cx.lineTo(W - pad, Y(1)); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = "rgba(255,246,227,.6)"; cx.font = "11px Silkscreen, monospace";
    cx.fillText("target", W - pad - 46, Y(1) - 6);
    cx.fillText(`bounce ${bounce.toFixed(2)} · ${duration.toFixed(2)}s`, pad, H - 6);
    let x = 0, v = 0; const h = 1 / 240;
    cx.strokeStyle = "#ff4fa3"; cx.lineWidth = 3; cx.beginPath();
    for (let t = 0; t <= T; t += h) {
      const a = -k * (x - 1) - c * v; v += a * h; x += v * h;
      const X = pad + (t / T) * (W - pad * 2);
      t === 0 ? cx.moveTo(X, Y(x)) : cx.lineTo(X, Y(x));
    }
    cx.stroke();
    if (marker != null) {
      const X = pad + (Math.min(marker.t, T) / T) * (W - pad * 2);
      cx.fillStyle = "#ffdd33"; cx.strokeStyle = INK; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(X, Y(marker.v), 7, 0, 6.283); cx.fill(); cx.stroke();
    }
  }
  const showParams = () => { $("#bOut").textContent = (+bIn.value).toFixed(2); $("#dOut").textContent = (+dIn.value).toFixed(2) + "s"; drawCurve(); };
  bIn.addEventListener("input", showParams); dIn.addEventListener("input", showParams);
  new ResizeObserver(sizeCurve).observe(cv);
  let dragY = null, startPull = 0;
  labN.addEventListener("pointerdown", (e) => { labN.setPointerCapture(e.pointerId); dragY = e.clientY; startPull = pull; labS.set(pull); marker = null; drawCurve(); });
  labN.addEventListener("pointermove", (e) => {
    if (dragY == null) return;
    const raw = Math.max(0, startPull + e.clientY - dragY), max = lab.clientHeight - 230;
    labS.set(raw < max ? raw : max + (raw - max) * 0.2); // rubber-band past the limit
  });
  const release = () => {
    if (dragY == null) return;
    dragY = null;
    const from = pull, t0 = performance.now();
    if (from < 4) { labS.to(0, params()); return; }
    labS.to(0, params(), () => { marker = null; drawCurve(); });
    const follow = () => {
      if (labS.raf === 0) return;
      marker = { t: (performance.now() - t0) / 1000, v: 1 - pull / from };
      drawCurve(); requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  };
  labN.addEventListener("pointerup", release); labN.addEventListener("pointercancel", release);
  labN.addEventListener("dblclick", () => { labS.to(200, params(), () => setTimeout(() => labS.to(0, params()), 400)); });

  /* ---------- LacyPaint ---------- */
  const pc = $("#paintCanvas"), pctx = pc.getContext("2d");
  const colors = [INK, "#ff4fa3", "#ff2e6e", "#ff7a1a", "#ffdd33", "#3ee6a8", "#7fd3ff", "#3355ff", "#b69cff", "#ffffff"];
  const masks = [ // 8x8 one-bit patterns, as in 1984
    [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55],
    [0x88, 0x44, 0x22, 0x11, 0x88, 0x44, 0x22, 0x11],
    [0x00, 0x22, 0x00, 0x88, 0x00, 0x22, 0x00, 0x88],
    [0xff, 0x80, 0x80, 0x80, 0xff, 0x08, 0x08, 0x08],
    [0x18, 0x24, 0x42, 0x81, 0x18, 0x24, 0x42, 0x81],
    [0xff, 0x88, 0x88, 0x88, 0xff, 0x88, 0x88, 0x88],
  ];
  let pTool = "brush", pColor = INK, pMask = 0, stampN = 0;
  function patternTile(mask, color) {
    const t = document.createElement("canvas"); t.width = t.height = 8;
    const c = t.getContext("2d"); c.fillStyle = color;
    mask.forEach((row, y) => { for (let x = 0; x < 8; x++) if (row & (0x80 >> x)) c.fillRect(x, y, 1, 1); });
    const big = document.createElement("canvas"); big.width = big.height = 16;
    const b = big.getContext("2d"); b.imageSmoothingEnabled = false; b.drawImage(t, 0, 0, 16, 16);
    return big;
  }
  const pal = $("#palette");
  colors.forEach((c, i) => {
    const b = document.createElement("button"); b.className = "sw" + (i === 0 ? " is-on" : ""); b.style.background = c; b.title = c; b.setAttribute("aria-label", "Colour " + c);
    b.addEventListener("click", () => { pColor = c; $$(".sw", pal).forEach((x) => x.classList.toggle("is-on", x === b && true)); if (pTool === "eraser") setTool("brush"); markPatterns(); });
    pal.appendChild(b);
  });
  masks.forEach((m, i) => {
    const b = document.createElement("button"); b.className = "sw sw--pat"; b.dataset.mask = i; b.setAttribute("aria-label", "Pattern " + (i + 1));
    b.style.background = `url(${patternTile(m, INK).toDataURL()}) #fff`;
    b.addEventListener("click", () => { pMask = i; setTool("pattern"); markPatterns(); });
    pal.appendChild(b);
  });
  function markPatterns() { $$(".sw--pat", pal).forEach((x) => x.classList.toggle("is-on", pTool === "pattern" && +x.dataset.mask === pMask)); }
  function setTool(t) { pTool = t; $$(".pt[data-tool]").forEach((x) => x.classList.toggle("is-on", x.dataset.tool === t)); markPatterns(); }
  for (const b of $$(".pt[data-tool]")) b.addEventListener("click", () => setTool(b.dataset.tool));

  function sizePaint() {
    const d = Math.min(2, devicePixelRatio || 1), w = pc.clientWidth, h = pc.clientHeight;
    if (!w || !h || (pc.width === Math.round(w * d) && pc.height === Math.round(h * d))) return;
    const old = document.createElement("canvas"); old.width = pc.width; old.height = pc.height;
    if (pc.width && pc.height) old.getContext("2d").drawImage(pc, 0, 0);
    pc.width = Math.round(w * d); pc.height = Math.round(h * d);
    pctx.setTransform(d, 0, 0, d, 0, 0);
    pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, w, h);
    if (old.width && old.height) pctx.drawImage(old, 0, 0, old.width / d, old.height / d);
    if (!painted && fontsReady) { pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, w, h); greet(); }
  }
  function greet() {
    const w = pc.clientWidth;
    pctx.fillStyle = "#000";
    pctx.beginPath(); pctx.roundRect(w / 2 - 90, 0, 180, 44, [0, 0, 22, 22]); pctx.fill();
    for (const ex of [-14, 14]) { pctx.fillStyle = "#fff"; pctx.beginPath(); pctx.arc(w / 2 + ex, 21, 8, 0, 6.283); pctx.fill(); pctx.fillStyle = "#000"; pctx.beginPath(); pctx.arc(w / 2 + ex + 2, 24, 3.5, 0, 6.283); pctx.fill(); }
    pctx.fillStyle = "#ff4fa3"; pctx.font = "28px 'Permanent Marker', cursive"; pctx.textAlign = "center";
    pctx.fillText("sign the guest book!", w / 2, 92);
    pctx.textAlign = "start";
  }
  let painted = false, fontsReady = false;
  sizePaint();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; greet(); });
  new ResizeObserver(sizePaint).observe(pc);

  const shapes = ["star", "heart", "smile", "bolt", "notch"];
  function stamp(x, y) {
    const s = shapes[stampN++ % shapes.length], r = 34;
    pctx.save(); pctx.translate(x, y); pctx.rotate((Math.random() - 0.5) * 0.6);
    pctx.fillStyle = pColor === "#ffffff" ? "#ffdd33" : pColor; pctx.strokeStyle = INK; pctx.lineWidth = 4; pctx.lineJoin = "round";
    pctx.beginPath();
    if (s === "star") { star(pctx, 0, 0, r, -Math.PI / 2); }
    else if (s === "heart") { pctx.moveTo(0, r * 0.9); pctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.6, -r * 1.3, 0, -r * 0.4); pctx.bezierCurveTo(r * 0.6, -r * 1.3, r * 1.6, -r * 0.2, 0, r * 0.9); }
    else if (s === "smile") { pctx.arc(0, 0, r, 0, 6.283); }
    else if (s === "bolt") { [[6, -r], [-r * 0.6, 4], [-2, 4], [-8, r], [r * 0.6, -6], [2, -6], [12, -r]].forEach(([a, b], i) => (i ? pctx.lineTo(a, b) : pctx.moveTo(a, b))); pctx.closePath(); }
    else { pctx.fillStyle = "#000"; pctx.roundRect(-r * 1.4, -r * 0.45, r * 2.8, r * 0.9, [0, 0, r * 0.45, r * 0.45]); }
    pctx.fill(); pctx.stroke();
    if (s === "smile" || s === "notch") {
      pctx.fillStyle = s === "notch" ? "#fff" : INK;
      for (const ex of [-r * 0.35, r * 0.35]) { pctx.beginPath(); pctx.arc(ex, s === "notch" ? 0 : -r * 0.2, r * 0.14, 0, 6.283); pctx.fill(); }
      if (s === "smile") { pctx.beginPath(); pctx.arc(0, r * 0.05, r * 0.55, 0.3, Math.PI - 0.3); pctx.lineWidth = 4; pctx.stroke(); }
    }
    pctx.restore();
  }
  let drawing = false, lastP = null, sprayT = 0;
  const ptPos = (e) => { const r = pc.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function strokeStyleFor() {
    if (pTool === "eraser") return ["#fff", 28];
    if (pTool === "pattern") return [pctx.createPattern(patternTile(masks[pMask], pColor), "repeat"), 26];
    return [pColor, 9];
  }
  function spray(p) { pctx.fillStyle = pColor; for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, d = Math.random() * 22; pctx.fillRect(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1.6, 1.6); } }
  pc.addEventListener("pointerdown", (e) => {
    pc.setPointerCapture(e.pointerId); const p = ptPos(e); painted = true;
    if (pTool === "stamp") { stamp(p.x, p.y); return; }
    drawing = true; lastP = p;
    if (pTool === "spray") { spray(p); sprayT = setInterval(() => lastP && spray(lastP), 30); return; }
    const [s, w] = strokeStyleFor(); pctx.fillStyle = s; pctx.beginPath(); pctx.arc(p.x, p.y, w / 2, 0, 6.283); pctx.fill();
  });
  pc.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = ptPos(e);
    if (pTool === "spray") { lastP = p; spray(p); return; }
    const [s, w] = strokeStyleFor();
    pctx.strokeStyle = s; pctx.lineWidth = w; pctx.lineCap = pctx.lineJoin = "round";
    pctx.beginPath(); pctx.moveTo(lastP.x, lastP.y); pctx.lineTo(p.x, p.y); pctx.stroke();
    lastP = p;
  });
  const stopDraw = () => { drawing = false; lastP = null; clearInterval(sprayT); };
  pc.addEventListener("pointerup", stopDraw); pc.addEventListener("pointercancel", stopDraw);
  $("#paintClear").addEventListener("click", () => { painted = false; pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, pc.clientWidth, pc.clientHeight); greet(); toast("Fresh canvas. Go wild."); });
  $("#paintSave").addEventListener("click", () => {
    pc.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "lacy-masterpiece.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
    toast("Saved lacy-masterpiece.png");
  });

  /* ---------- Snake ---------- */
  const snC = $("#snakeCanvas"), snx = snC.getContext("2d"), over = $("#snakeOver");
  const COLS = 30, ROWS = 20;
  let snake, dir, nextDir, food, score, alive = false, loop = 0, best = store.get("best", 0);
  $("#best").textContent = best;
  function sizeSnake() { const d = Math.min(2, devicePixelRatio || 1); snC.width = snC.clientWidth * d; snC.height = snC.clientHeight * d; drawSnake(); }
  function placeFood() {
    do { food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0, c: PALETTE[(Math.random() * PALETTE.length) | 0] }; }
    while (snake.some((s) => s.x === food.x && s.y === food.y));
  }
  function resetSnake() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]; dir = nextDir = { x: 1, y: 0 }; score = 0;
    $("#score").textContent = 0; placeFood();
  }
  function drawSnake() {
    if (!snake) return;
    const W = snC.width, H = snC.height, cw = W / COLS, ch = H / ROWS;
    snx.fillStyle = "#000"; snx.fillRect(0, 0, W, H);
    snx.fillStyle = "#1d1d1d";
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) snx.fillRect(x * cw + cw / 2 - 1, y * ch + ch / 2 - 1, 2, 2);
    snx.fillStyle = food.c; snx.beginPath(); snx.arc(food.x * cw + cw / 2, food.y * ch + ch / 2, cw * 0.38, 0, 6.283); snx.fill();
    snake.forEach((s, i) => {
      snx.fillStyle = i === 0 ? "#ffdd33" : i % 2 ? "#3ee6a8" : "#2fd197";
      snx.fillRect(s.x * cw + 1, s.y * ch + 1, cw - 2, ch - 2);
    });
    const h = snake[0]; snx.fillStyle = "#000";
    const ex = dir.y ? [0.3, 0.7] : [0.5, 0.5], ey = dir.x ? [0.3, 0.7] : [0.5, 0.5];
    for (let i = 0; i < 2; i++) snx.fillRect((h.x + ex[i] + dir.x * 0.15) * cw - cw * 0.08, (h.y + ey[i] + dir.y * 0.15) * ch - ch * 0.08, cw * 0.16, ch * 0.16);
  }
  function step() {
    dir = nextDir;
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || snake.some((s) => s.x === h.x && s.y === h.y)) return die();
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      score++; $("#score").textContent = score;
      const r = snC.getBoundingClientRect();
      confetti(r.left + (h.x + 0.5) * (r.width / COLS), r.top + (h.y + 0.5) * (r.height / ROWS), 18);
      placeFood();
    } else snake.pop();
    drawSnake();
  }
  function die() {
    alive = false; clearInterval(loop);
    if (score > best) { best = score; store.set("best", best); $("#best").textContent = best; toast(`New best: ${best}!`); }
    over.hidden = false; $("b", over).textContent = "GAME OVER"; $("span", over).textContent = `score ${score} · space or tap to retry`;
  }
  function startSnake() {
    resetSnake(); alive = true; over.hidden = true; snC.focus({ preventScroll: true });
    clearInterval(loop); loop = setInterval(step, 95); drawSnake();
  }
  function turn(n) {
    if (!alive) return;
    if (n.x === -dir.x && n.y === -dir.y) return;
    nextDir = n;
  }
  const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const KEYS = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  over.addEventListener("click", startSnake);
  snC.addEventListener("keydown", (e) => { if (!alive && (e.key === " " || e.key === "Enter")) { e.preventDefault(); startSnake(); } });
  addEventListener("keydown", (e) => {
    if (alive && KEYS[e.key]) { e.preventDefault(); turn(DIRS[KEYS[e.key]]); }
    else if (!alive && e.key === " " && document.activeElement === snC) { e.preventDefault(); }
  });
  for (const b of $$(".dpad button")) b.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!alive) startSnake(); else turn(DIRS[b.dataset.dir]); });
  let sw0 = null;
  snC.addEventListener("pointerdown", (e) => { sw0 = { x: e.clientX, y: e.clientY }; if (!alive) startSnake(); });
  snC.addEventListener("pointerup", (e) => {
    if (!sw0) return;
    const dx = e.clientX - sw0.x, dy = e.clientY - sw0.y; sw0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    turn(Math.abs(dx) > Math.abs(dy) ? DIRS[dx > 0 ? "right" : "left"] : DIRS[dy > 0 ? "down" : "up"]);
  });
  snC.style.touchAction = "none";
  resetSnake(); new ResizeObserver(sizeSnake).observe(snC);
  // pause when scrolled away
  new IntersectionObserver(([en]) => { if (!en.isIntersecting && alive) { alive = false; clearInterval(loop); over.hidden = false; $("b", over).textContent = "PAUSED"; $("span", over).textContent = "press space or tap"; } }).observe(snC);

  /* ---------- Download confetti ---------- */
  $("#dlBtn").addEventListener("click", (e) => { const r = e.currentTarget.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 180); });

  /* ---------- Secret: type "lacy" ---------- */
  let buf = "";
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf === "lacy") { confetti(innerWidth / 2, 40, 220); peek(`<img class="mark" src="lacy-mark.svg" alt=""><b>you found me!</b><img class="mark" src="lacy-mark.svg" alt="">`, 2400); }
  });
})();
