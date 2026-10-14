/* The Jangkar Canggu — site behaviour */
(() => {
  "use strict";
  const CFG = window.JANGKAR || {};
  const WA = CFG.whatsapp || "6281337677891";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ------------------------------------------------------------------ i18n */
  const EN = {};
  $$("[data-i18n]").forEach((el) => { EN[el.dataset.i18n] = el.innerHTML; });
  const EN_PH = {};
  $$("[data-i18n-ph]").forEach((el) => { EN_PH[el.dataset.i18nPh] = el.getAttribute("placeholder"); });
  const ID_PH = { "a.nameph": window.I18N_ID["a.nameph"], "a.noteph": window.I18N_ID["a.noteph"] };

  let lang = store.get("jangkar-lang") || ((navigator.language || "").toLowerCase().startsWith("id") ? "id" : "en");
  const T = (k) => (window.I18N_DYN[lang] || window.I18N_DYN.en)[k];
  const locale = () => (lang === "id" ? "id-ID" : "en-GB");

  function applyLang(l) {
    lang = l;
    document.documentElement.lang = l;
    $$("[data-i18n]").forEach((el) => {
      const k = el.dataset.i18n;
      const v = l === "id" ? window.I18N_ID[k] : EN[k];
      if (v != null) el.innerHTML = v;
    });
    $$("[data-i18n-ph]").forEach((el) => {
      const k = el.dataset.i18nPh;
      el.setAttribute("placeholder", (l === "id" ? ID_PH[k] : EN_PH[k]) || "");
    });
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
    $("#calPrev").setAttribute("aria-label", T("prev"));
    $("#calNext").setAttribute("aria-label", T("next"));
    store.set("jangkar-lang", l);
    refreshWaLinks();
    if (typeof renderAll === "function") renderAll();
  }
  $$(".lang button").forEach((b) => b.addEventListener("click", () => applyLang(b.dataset.lang)));

  /* -------------------------------------------------------------- WhatsApp */
  const waUrl = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  function refreshWaLinks() {
    $$(".js-wa").forEach((a) => {
      const room = a.dataset.waRoom;
      a.href = waUrl(room ? T("waRoom").replace("{room}", room) : T("waGeneral"));
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* ---------------------------------------------------------------- loader */
  const loader = $("#loader");
  let readyDone = false;
  function ready() {
    if (readyDone) return;
    readyDone = true;
    loader.classList.add("is-done");
    document.body.classList.add("is-ready");
  }
  window.addEventListener("load", () => setTimeout(ready, 350));
  setTimeout(ready, 2800);

  /* ------------------------------------------------------------------- nav */
  const nav = $("#nav"), fab = $("#fab"), mbar = $("#mbar"), hero = $("#hero");
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const heroH = hero.offsetHeight;
    nav.classList.toggle("is-solid", y > 40);
    nav.classList.toggle("is-hidden", y > heroH && y > lastY + 4 && !menu.classList.contains("is-open"));
    if (y < lastY - 4) nav.classList.remove("is-hidden");
    const past = y > heroH * 0.7;
    fab.classList.toggle("is-on", past);
    mbar.classList.toggle("is-on", past);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = $("#burger"), menu = $("#menu");
  function toggleMenu(open) {
    const o = open ?? !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", o);
    menu.setAttribute("aria-hidden", String(!o));
    burger.setAttribute("aria-expanded", String(o));
    document.body.style.overflow = o ? "hidden" : "";
  }
  burger.addEventListener("click", () => toggleMenu());
  $$("#menu a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  /* ------------------------------------------------------------ hero video */
  const video = $("#heroVideo");
  const tall = window.matchMedia("(max-aspect-ratio: 4/5)").matches;
  const variant = tall ? "tall" : "wide";
  if (tall) {
    video.poster = "assets/video/hero-mobile-poster.jpg";
    video.src = "assets/video/hero-mobile.mp4";
  }
  video.muted = true;
  const chapterData = (window.HERO_CHAPTERS && window.HERO_CHAPTERS[variant]) || { duration: 0, chapters: [] };
  const chapterEls = $$("#chapters li");
  const starts = chapterEls.map((li) => {
    const c = chapterData.chapters.find((x) => x.key === li.dataset.key);
    return c ? c.t : 0;
  });

  function tickChapters() {
    const t = video.currentTime || 0;
    const dur = video.duration || chapterData.duration || 1;
    let active = 0;
    starts.forEach((s, i) => { if (t >= s) active = i; });
    chapterEls.forEach((li, i) => {
      const bar = li.querySelector(".bar i");
      let p = 0;
      if (i < active) p = 1;
      else if (i === active) {
        const end = i + 1 < starts.length ? starts[i + 1] : dur;
        p = Math.min(1, Math.max(0, (t - starts[i]) / (end - starts[i] || 1)));
      }
      bar.style.width = (p * 100).toFixed(2) + "%";
      li.classList.toggle("is-active", i === active);
    });
  }
  let heroVisible = true, rafId = 0;
  function loop() { tickChapters(); rafId = heroVisible ? requestAnimationFrame(loop) : 0; }
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (heroVisible) { if (!reduceMotion && !userPaused) video.play().catch(() => {}); if (!rafId) loop(); }
    else video.pause();
  }).observe(hero);

  chapterEls.forEach((li, i) => li.querySelector("button").addEventListener("click", () => {
    video.currentTime = starts[i] + 0.05;
    if (!userPaused) video.play().catch(() => {});
    tickChapters();
  }));

  let userPaused = reduceMotion;
  const playBtn = $("#playToggle");
  function setPlayIcon() {
    playBtn.querySelector("use").setAttribute("href", video.paused ? "#i-play" : "#i-pause");
    playBtn.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
  }
  playBtn.addEventListener("click", () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); }
    else { userPaused = true; video.pause(); }
  });
  video.addEventListener("play", setPlayIcon);
  video.addEventListener("pause", setPlayIcon);
  if (reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
  else video.play().catch(() => {});
  setPlayIcon();

  /* --------------------------------------------------------------- reveals */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in-view");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
  $$(".rv, .rv-img, .score").forEach((el) => io.observe(el));

  // count-up for decimal stats
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = parseFloat(el.dataset.count), t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1400), k = 1 - Math.pow(1 - p, 3);
        el.textContent = (end * k).toFixed(1);
        if (p < 1) requestAnimationFrame(step);
      };
      if (!reduceMotion) requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  // gentle parallax on the final CTA
  const finalBg = $("#finalBg");
  if (!reduceMotion && finalBg) {
    window.addEventListener("scroll", () => {
      const r = finalBg.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      finalBg.style.transform = `translate3d(0,${(p * 60).toFixed(1)}px,0) scale(1.06)`;
    }, { passive: true });
  }

  /* -------------------------------------------------------------- lightbox */
  const PHOTOS = [
    ["exterior", "Exterior"], ["entrance", "Entrance"], ["pool", "Pool"], ["terrace", "Pool terrace"],
    ["room-poolview", "Villa — pool view"], ["room-villa", "Villa bedroom"], ["room-double", "Double room"],
    ["room-desk", "Work desk & wardrobe"], ["bath-shower", "Rain shower"], ["bath-vanity", "Vanity"],
    ["bath-ensuite", "Ensuite bathroom"], ["details", "Welcome details"], ["sunset", "Balcony at sunset"],
  ];
  const lb = $("#lb"), lbImg = $("#lbImg"), lbCount = $("#lbCount");
  let lbI = 0, lastFocus = null;
  function lbShow(i) {
    lbI = (i + PHOTOS.length) % PHOTOS.length;
    lbImg.src = `assets/photos/${PHOTOS[lbI][0]}.jpg`;
    lbImg.alt = PHOTOS[lbI][1];
    lbCount.textContent = `${lbI + 1} / ${PHOTOS.length} · ${PHOTOS[lbI][1]}`;
  }
  function lbOpen(i) { lastFocus = document.activeElement; lbShow(i); lb.classList.add("is-open"); document.body.style.overflow = "hidden"; $("#lbClose").focus(); }
  function lbClose() { lb.classList.remove("is-open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); }
  $$("[data-gi]").forEach((f) => {
    f.tabIndex = 0;
    f.setAttribute("role", "button");
    f.addEventListener("click", () => lbOpen(+f.dataset.gi));
    f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lbOpen(+f.dataset.gi); } });
  });
  $("#openGallery").addEventListener("click", () => lbOpen(0));
  $("#lbClose").addEventListener("click", lbClose);
  $("#lbPrev").addEventListener("click", () => lbShow(lbI - 1));
  $("#lbNext").addEventListener("click", () => lbShow(lbI + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb__img")) lbClose(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) { if (e.key === "Escape" && menu.classList.contains("is-open")) toggleMenu(false); return; }
    if (e.key === "Escape") lbClose();
    if (e.key === "ArrowLeft") lbShow(lbI - 1);
    if (e.key === "ArrowRight") lbShow(lbI + 1);
  });
  let tx = 0;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) lbShow(lbI + (d < 0 ? 1 : -1)); });

  /* ------------------------------------------------- availability calendar */
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + (CFG.monthsAhead || 12) + 1, 0);

  function expand(list) {
    const set = new Set();
    (list || []).forEach((item) => {
      const [a, b] = String(item).split("..");
      if (!b) { set.add(a.trim()); return; }
      for (let d = parse(a.trim()), end = parse(b.trim()); d <= end; d = addDays(d, 1)) set.add(key(d));
    });
    return set;
  }
  const BOOKED = { double: expand(CFG.booked && CFG.booked.double), villa: expand(CFG.booked && CFG.booked.villa) };
  BOOKED.any = new Set([...BOOKED.double].filter((d) => BOOKED.villa.has(d)));

  const S = { room: "any", checkIn: null, checkOut: null, adults: 2, kids: 0, view: new Date(today.getFullYear(), today.getMonth(), 1), hover: null };
  const isBooked = (k) => BOOKED[S.room].has(k);
  function rangeFree(a, b) { // nights a .. b-1
    for (let d = parse(a); key(d) < b; d = addDays(d, 1)) if (isBooked(key(d))) return false;
    return true;
  }
  function firstBlockedAfter(a) {
    for (let d = addDays(parse(a), 1); d <= lastDay; d = addDays(d, 1)) if (isBooked(key(d))) return key(d);
    return null;
  }
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const fmt = (s, o) => new Intl.DateTimeFormat(locale(), o).format(parse(s));
  const fmtLong = (s) => fmt(s, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const fmtShort = (s) => fmt(s, { weekday: "short", day: "numeric", month: "short" });
  const nightsLabel = (n) => `${n} ${n === 1 ? T("night") : T("nights")}`;
  const guestsLabel = () => {
    let s = `${S.adults} ${S.adults === 1 ? T("adult") : T("adults")}`;
    if (S.kids) s += `, ${S.kids} ${S.kids === 1 ? T("child") : T("children")}`;
    return s;
  };

  const monthsEl = $("#calMonths");
  function renderCalendar() {
    const pickingOut = S.checkIn && !S.checkOut;
    const limit = pickingOut ? firstBlockedAfter(S.checkIn) : null;
    const end = S.checkOut || (pickingOut && S.hover && S.hover > S.checkIn ? S.hover : null);
    const dowFmt = new Intl.DateTimeFormat(locale(), { weekday: "narrow" });
    const dows = [...Array(7)].map((_, i) => dowFmt.format(new Date(2024, 0, 1 + i))); // Mon..Sun
    let html = "";
    for (let m = 0; m < 2; m++) {
      const first = new Date(S.view.getFullYear(), S.view.getMonth() + m, 1);
      const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const lead = (first.getDay() + 6) % 7;
      html += `<div class="month"><h4>${new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }).format(first)}</h4>`;
      html += `<div class="dow">${dows.map((d) => `<span>${d}</span>`).join("")}</div><div class="days">`;
      for (let i = 0; i < lead; i++) html += `<span class="day is-empty"></span>`;
      for (let d = 1; d <= days; d++) {
        const date = new Date(first.getFullYear(), first.getMonth(), d), k = key(date);
        const past = date < today || date > lastDay;
        const booked = isBooked(k);
        let disabled = past;
        if (pickingOut) {
          if (k > S.checkIn && limit && k > limit) disabled = true;   // can't span a booked night
          if (k === limit) disabled = false;                           // ...but can check out that morning
          if (k <= S.checkIn) disabled = past || booked;               // re-pick check-in
        } else if (booked) disabled = true;
        const cls = ["day"];
        if (booked) cls.push("is-booked");
        if (k === key(today)) cls.push("is-today");
        if (k === S.checkIn) cls.push("is-start");
        if (k === end) cls.push("is-end");
        if (S.checkIn && end && k > S.checkIn && k < end) cls.push("in-range");
        if (S.checkIn && end && (k === S.checkIn || k === end)) cls.push("in-range");
        const label = fmtLong(k) + (booked ? " — booked" : "");
        html += `<button type="button" class="${cls.join(" ")}" data-k="${k}" ${disabled ? "disabled" : ""} aria-label="${label}"><span>${d}</span></button>`;
      }
      html += `</div></div>`;
    }
    monthsEl.innerHTML = html;
    $("#calPrev").disabled = S.view <= new Date(today.getFullYear(), today.getMonth(), 1);
    $("#calNext").disabled = new Date(S.view.getFullYear(), S.view.getMonth() + 1, 1) > new Date(lastDay.getFullYear(), lastDay.getMonth() - 1, 1);
    const hint = $("#calHint");
    if (!S.checkIn) hint.innerHTML = T("pickIn");
    else if (!S.checkOut) hint.innerHTML = T("pickOut");
    else hint.innerHTML = T("picked").replace("{n}", nightsLabel(nightsBetween(S.checkIn, S.checkOut)));
  }

  monthsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".day[data-k]");
    if (!b || b.disabled) return;
    const k = b.dataset.k;
    if (!S.checkIn || S.checkOut || k <= S.checkIn) {
      S.checkIn = k; S.checkOut = null;
      setStatus("info", T("pickOut").replace(/<[^>]+>/g, ""));
    } else if (rangeFree(S.checkIn, k)) {
      S.checkOut = k;
      setStatus("ok", S.room === "any" ? T("stOkAny") : T("stOk"));
    } else {
      setStatus("warn", T("stBlocked"));
      return;
    }
    S.hover = null;
    renderAll();
  });
  monthsEl.addEventListener("mouseover", (e) => {
    const b = e.target.closest(".day[data-k]");
    if (!b || !S.checkIn || S.checkOut || b.disabled) return;
    if (S.hover !== b.dataset.k) { S.hover = b.dataset.k; renderCalendar(); }
  });
  monthsEl.addEventListener("mouseleave", () => { if (S.hover) { S.hover = null; renderCalendar(); } });
  $("#calPrev").addEventListener("click", () => { S.view = new Date(S.view.getFullYear(), S.view.getMonth() - 1, 1); renderCalendar(); });
  $("#calNext").addEventListener("click", () => { S.view = new Date(S.view.getFullYear(), S.view.getMonth() + 1, 1); renderCalendar(); });

  /* form */
  function setRoom(r) {
    S.room = r;
    $$("#roomSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.room === r)));
    if (S.checkIn && S.checkOut && !rangeFree(S.checkIn, S.checkOut)) {
      S.checkIn = S.checkOut = null;
      setStatus("warn", T("stRoomChanged"));
    } else if (S.checkIn && isBooked(S.checkIn)) {
      S.checkIn = S.checkOut = null;
      setStatus("warn", T("stRoomChanged"));
    }
    renderAll();
  }
  $$("#roomSeg button").forEach((b) => b.addEventListener("click", () => setRoom(b.dataset.room)));
  $$(".room [data-room]").forEach((a) => a.addEventListener("click", () => setRoom(a.dataset.room)));

  $$("[data-step]").forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.step, d = +b.dataset.d;
    const max = f === "adults" ? CFG.maxAdults || 6 : CFG.maxChildren || 4, min = f === "adults" ? 1 : 0;
    S[f] = Math.min(max, Math.max(min, S[f] + d));
    renderAll();
  }));

  let statusState = { kind: "info", msgKey: "stInfo" };
  function setStatus(kind, msg) {
    statusState = { kind, msg };
    const el = $("#status");
    el.className = `status status--${kind}`;
    el.querySelector("use") ? el.querySelector("use").setAttribute("href", kind === "ok" ? "#i-check" : "#i-info")
      : null;
    el.querySelector("span").textContent = msg;
  }

  function renderForm() {
    const dIn = $("#dIn"), dOut = $("#dOut");
    dIn.classList.toggle("is-empty", !S.checkIn);
    dOut.classList.toggle("is-empty", !S.checkOut);
    dIn.querySelector("strong").textContent = S.checkIn ? fmtShort(S.checkIn) : "—";
    dOut.querySelector("strong").textContent = S.checkOut ? fmtShort(S.checkOut) : "—";
    $("#nightsOut").textContent = S.checkIn && S.checkOut ? nightsLabel(nightsBetween(S.checkIn, S.checkOut)) : "—";
    $("#adults").textContent = S.adults;
    $("#kids").textContent = S.kids;
    $$("[data-step]").forEach((b) => {
      const f = b.dataset.step, d = +b.dataset.d;
      const max = f === "adults" ? CFG.maxAdults || 6 : CFG.maxChildren || 4, min = f === "adults" ? 1 : 0;
      b.disabled = d < 0 ? S[f] <= min : S[f] >= max;
    });
    // quick strip in the hero
    $("#qIn").textContent = S.checkIn ? fmtShort(S.checkIn) : (lang === "id" ? window.I18N_ID["q.select"] : EN["q.select"]);
    $("#qOut").textContent = S.checkOut ? fmtShort(S.checkOut) : (lang === "id" ? window.I18N_ID["q.select"] : EN["q.select"]);
    $("#qGuests").textContent = guestsLabel();
    // status text follows language
    if (!S.checkIn && statusState.kind === "info") setStatus("info", T("stInfo"));
    else if (S.checkIn && S.checkOut && statusState.kind === "ok") setStatus("ok", S.room === "any" ? T("stOkAny") : T("stOk"));
    else if (S.checkIn && !S.checkOut && statusState.kind === "info") setStatus("info", T("pickOut").replace(/<[^>]+>/g, ""));
  }

  function renderAll() { renderCalendar(); renderForm(); }

  $("#bookForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!S.checkIn || !S.checkOut) {
      setStatus("warn", T("stNeedDates"));
      $("#cal").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return;
    }
    const roomName = S.room === "double" ? "Double Room" : S.room === "villa" ? "Villa" : T("roomAny");
    const n = nightsBetween(S.checkIn, S.checkOut);
    const name = $("#gName").value.trim(), note = $("#gNote").value.trim();
    const lines = [
      T("waTitle"),
      "",
      `• ${T("waRoomL")}: ${roomName}`,
      `• ${T("waIn")}: ${fmtLong(S.checkIn)}`,
      `• ${T("waOut")}: ${fmtLong(S.checkOut)} (${nightsLabel(n)})`,
      `• ${T("waGuests")}: ${guestsLabel()}`,
    ];
    if (name) lines.push(`• ${T("waName")}: ${name}`);
    if (note) lines.push(`• ${T("waNote")}: ${note}`);
    lines.push("", T("waEnd"));
    window.open(waUrl(lines.join("\n")), "_blank", "noopener");
  });

  /* ------------------------------------------------------------------ init */
  $("#yr").textContent = new Date().getFullYear();
  applyLang(lang);
  onScroll();
  loop();
})();
