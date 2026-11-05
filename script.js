/* ==========================================================================
   PULSEFORGE / 2026 · Автор: Максим Ковалишин
   Vanilla JS (ES2024). Статична архітектура (працює через file:// і HTTP).
   Жодні персональні дані не передаються на сервер.
   ========================================================================== */
'use strict';

const SESSIONS = [
  { id: 0, day: 1, dayCode: 'mon', dayName: 'Понеділок', time: '07:30', name: 'Силова база', category: 'strength', coach: 'Андрій Савчук', duration: 60 },
  { id: 1, day: 1, dayCode: 'mon', dayName: 'Понеділок', time: '18:00', name: 'Functional Burn', category: 'functional', coach: 'Дмитро Ковальчук', duration: 50 },
  { id: 2, day: 2, dayCode: 'tue', dayName: 'Вівторок', time: '08:30', name: 'Morning Flow', category: 'mind', coach: 'Олена Дорошенко', duration: 55 },
  { id: 3, day: 2, dayCode: 'tue', dayName: 'Вівторок', time: '19:00', name: 'Cardio Pulse', category: 'cardio', coach: 'Ірина Мельник', duration: 45 },
  { id: 4, day: 3, dayCode: 'wed', dayName: 'Середа', time: '09:00', name: 'Power Strength', category: 'strength', coach: 'Ірина Мельник', duration: 60 },
  { id: 5, day: 3, dayCode: 'wed', dayName: 'Середа', time: '18:30', name: 'Mobility Reset', category: 'mind', coach: 'Дмитро Ковальчук', duration: 45 },
  { id: 6, day: 4, dayCode: 'thu', dayName: 'Четвер', time: '07:30', name: 'HIIT Circuit', category: 'cardio', coach: 'Дмитро Ковальчук', duration: 45 },
  { id: 7, day: 4, dayCode: 'thu', dayName: 'Четвер', time: '19:00', name: 'Core & Balance', category: 'functional', coach: 'Олена Дорошенко', duration: 50 },
  { id: 8, day: 5, dayCode: 'fri', dayName: 'П’ятниця', time: '08:00', name: 'Iron Friday', category: 'strength', coach: 'Андрій Савчук', duration: 60 },
  { id: 9, day: 5, dayCode: 'fri', dayName: 'П’ятниця', time: '18:00', name: 'Endurance Lab', category: 'cardio', coach: 'Ірина Мельник', duration: 50 },
  { id: 10, day: 6, dayCode: 'sat', dayName: 'Субота', time: '10:00', name: 'Weekend Team', category: 'functional', coach: 'Андрій Савчук', duration: 60 },
  { id: 11, day: 0, dayCode: 'sun', dayName: 'Неділя', time: '10:30', name: 'Recovery Yoga', category: 'mind', coach: 'Олена Дорошенко', duration: 60 }
];

const THEME_META = {
  night:  { label: 'Cyber Night',   color: '#080e16', hero: 'images/theme-night.webp' },
  ember:  { label: 'Solar Rush',    color: '#130c0b', hero: 'images/theme-ember.webp' },
  forest: { label: 'Forest Motion', color: '#07120d', hero: 'images/theme-forest.webp' },
  ocean:  { label: 'Arctic Pulse',  color: '#060d18', hero: 'images/theme-ocean.webp' },
  day:    { label: 'Light Studio',  color: '#f6f5ef', hero: 'images/theme-day.webp' },
  auto:   { label: 'Auto Sync',     color: null,      hero: null }
};

const THEME_MODES = Object.keys(THEME_META);
const KEY_THEME = 'pf-theme-v1';
const KEY_GOAL  = 'pf-goal-v2';
const KEY_GOAL_LEGACY = 'pf-goal-v1';
const KEY_SAVED = 'pf-saved-v1';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let toastTimeout;
const prefetchedImages = new Set();

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('is-visible'), 3400);
}

function getStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable in restricted mode */
  }
}

function prefetchImage(src) {
  if (!src || prefetchedImages.has(src)) return;
  prefetchedImages.add(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
}

/* ==========================================================================
   1. Theme System (5 Photographic Themes + Auto OS Sync + View Transitions)
   ========================================================================== */
function initTheme() {
  const trigger = $('#themeTrigger');
  const panel = $('#themePanel');
  const close = $('#themeClose');
  const mediaLight = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const resolveTheme = (mode) => {
    if (mode === 'auto') {
      return mediaLight?.matches ? 'day' : 'night';
    }
    return THEME_META[mode] ? mode : 'night';
  };

  let currentMode = getStored(KEY_THEME, 'night');
  if (!THEME_MODES.includes(currentMode)) currentMode = 'night';

  const applyTheme = (mode, withTransition = false) => {
    if (!THEME_MODES.includes(mode)) return;
    currentMode = mode;
    const effective = resolveTheme(mode);

    const mutateDom = () => {
      document.documentElement.dataset.theme = effective;
      document.documentElement.dataset.themeMode = mode;
      setStored(KEY_THEME, mode);

      $$('[data-theme-choice]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === mode));
      });

      const metaColor = THEME_META[effective]?.color || '#080e16';
      $('meta[name="theme-color"]')?.setAttribute('content', metaColor);
    };

    if (withTransition && document.startViewTransition && !reducedMotion) {
      document.startViewTransition(mutateDom);
    } else {
      mutateDom();
    }
  };

  applyTheme(currentMode, false);

  mediaLight?.addEventListener?.('change', () => {
    if (currentMode === 'auto') applyTheme('auto', true);
  });

  const hidePanel = () => {
    if (!panel || !trigger) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };

  if (trigger && panel) {
    trigger.addEventListener('click', () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    close?.addEventListener('click', hidePanel);

    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !trigger.contains(e.target)) {
        hidePanel();
      }
    });
  }

  $$('[data-theme-choice]').forEach((btn) => {
    const choice = btn.dataset.themeChoice;
    const preloadTarget = () => {
      const effective = resolveTheme(choice);
      prefetchImage(THEME_META[effective]?.hero);
    };
    btn.addEventListener('mouseenter', preloadTarget, { passive: true });
    btn.addEventListener('focus', preloadTarget, { passive: true });

    btn.addEventListener('click', () => {
      applyTheme(choice, true);
      hidePanel();
      toast(`Тема: ${THEME_META[choice]?.label || choice}`);
    });
  });

  // Keyboard shortcut: Alt + T cycles themes, Escape closes panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel && !panel.hidden) {
      hidePanel();
      trigger?.focus();
      return;
    }
    if (e.altKey && (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е')) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      const nextIdx = (THEME_MODES.indexOf(currentMode) + 1) % THEME_MODES.length;
      const nextMode = THEME_MODES[nextIdx];
      prefetchImage(THEME_META[resolveTheme(nextMode)]?.hero);
      applyTheme(nextMode, true);
      toast(`Тема: ${THEME_META[nextMode].label} (Alt+T)`);
    }
  });
}

/* ==========================================================================
   2. Navigation, Sticky Header & Scroll Reveal
   ========================================================================== */
function initNav() {
  const header = $('.site-header');
  const button = $('#mobileToggle');
  const nav = $('#mainNav');

  if (header) {
    let ticking = false;
    const syncScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 18);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(syncScroll);
        ticking = true;
      }
    }, { passive: true });
    syncScroll();
  }

  if (!button || !nav) return;
  const closeNav = () => {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Відкрити меню');
  };

  button.addEventListener('click', () => {
    const opened = nav.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(opened));
    button.setAttribute('aria-label', opened ? 'Закрити меню' : 'Відкрити меню');
  });

  $$('a', nav).forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !button.contains(e.target)) {
      closeNav();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNav();
  });
}

function initBackTop() {
  const b = $('#backTop');
  if (!b) return;
  let ticking = false;
  const update = () => {
    b.classList.toggle('is-visible', window.scrollY > 420);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
  b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initReveal() {
  const targets = $$('[data-reveal]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  document.documentElement.classList.add('js-ready');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px 40px 0px', threshold: 0.01 });

  targets.forEach((el) => io.observe(el));
}

/* ==========================================================================
   3. Club Space Gallery & Accessible Lightbox Modal
   ========================================================================== */
function initGallery() {
  const items = $$('[data-gallery-src]');
  const dialog = $('#lightboxDialog');
  if (!items.length || !dialog) return;

  const imgEl = $('#lightboxImg');
  const titleEl = $('#lightboxTitle');
  const descEl = $('#lightboxDesc');
  const counterEl = $('#lightboxCounter');
  let activeIdx = 0;

  const showSlide = (idx) => {
    activeIdx = (idx + items.length) % items.length;
    const btn = items[activeIdx];
    imgEl.src = btn.dataset.gallerySrc;
    imgEl.alt = btn.dataset.galleryTitle || 'Фото простору PULSEFORGE';
    titleEl.textContent = btn.dataset.galleryTitle || '';
    descEl.textContent = btn.dataset.galleryDesc || '';
    if (counterEl) counterEl.textContent = `${activeIdx + 1} / ${items.length}`;
  };

  items.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      showSlide(index);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  });

  $('#lightboxPrev')?.addEventListener('click', () => showSlide(activeIdx - 1));
  $('#lightboxNext')?.addEventListener('click', () => showSlide(activeIdx + 1));
  $('#lightboxClose')?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); showSlide(activeIdx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showSlide(activeIdx + 1); }
  });
}

/* ==========================================================================
   4. Home Dashboard: Activity Goal + 7-Day Streak & Circular SVG Timer
   ========================================================================== */
function initGoal() {
  const done = $('#goalDone');
  const total = $('#goalTotal');
  const bar = $('#goalBar');
  const progress = $('#goalProgress');
  const select = $('#goalSelect');
  const pctBadge = $('#goalPercent');
  if (!done || !total || !bar || !progress || !select) return;

  let state = null;
  try {
    state = JSON.parse(getStored(KEY_GOAL, 'null')) || JSON.parse(getStored(KEY_GOAL_LEGACY, 'null'));
  } catch {
    state = null;
  }

  if (!state || ![4, 8, 12, 16].includes(+state.goal) || !Number.isInteger(+state.done)) {
    state = { goal: 12, done: 3, days: [true, false, true, false, true, false, false] };
  }
  state.goal = +state.goal;
  state.done = Math.min(Math.max(0, +state.done), state.goal);
  if (!Array.isArray(state.days) || state.days.length !== 7) {
    state.days = [false, false, false, false, false, false, false];
  }

  const dayButtons = $$('[data-weekday]');

  function sync() {
    const pct = Math.round((state.done / state.goal) * 100);
    done.textContent = String(state.done);
    total.textContent = String(state.goal);
    select.value = String(state.goal);
    bar.style.width = `${pct}%`;
    if (pctBadge) pctBadge.textContent = `${pct}% МЕТИ`;
    progress.setAttribute('aria-valuenow', String(state.done));
    progress.setAttribute('aria-valuemax', String(state.goal));
    dayButtons.forEach((btn, idx) => {
      btn.setAttribute('aria-pressed', String(Boolean(state.days[idx])));
    });
    setStored(KEY_GOAL, JSON.stringify(state));
  }

  select.addEventListener('change', () => {
    state.goal = Number(select.value);
    state.done = Math.min(state.goal, state.done);
    sync();
  });

  $('#goalPlus')?.addEventListener('click', () => {
    if (state.done < state.goal) {
      state.done++;
      sync();
      if (state.done === state.goal) toast('Мета досягнута! Чудова робота ✦');
    } else {
      toast('Ти вже виконав обрану мету!');
    }
  });

  $('#goalMinus')?.addEventListener('click', () => {
    state.done = Math.max(0, state.done - 1);
    sync();
  });

  dayButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      state.days[idx] = !state.days[idx];
      sync();
    });
  });

  sync();
}

function initTimer() {
  const el = $('#timerDisplay');
  const start = $('#timerStart');
  const reset = $('#timerReset');
  const ring = $('#timerRingProgress');
  const sub = $('#timerSub');
  if (!el || !start || !reset) return;

  const CIRCUMFERENCE = 2 * Math.PI * 92; // r=92 => ~578.05
  const defaultTitle = document.title;
  let duration = 45;
  let remaining = 45;
  let rounds = 0;
  let tick = null;
  let endAt = 0;

  function format(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function paint(exactRemaining = remaining) {
    const formatted = format(exactRemaining);
    el.textContent = formatted;
    if (ring) {
      const ratio = duration > 0 ? Math.max(0, Math.min(1, exactRemaining / duration)) : 0;
      ring.style.strokeDasharray = `${CIRCUMFERENCE.toFixed(2)}`;
      ring.style.strokeDashoffset = `${(CIRCUMFERENCE * (1 - ratio)).toFixed(2)}`;
    }
    if (tick) {
      document.title = `${formatted} · Таймер PULSEFORGE`;
    } else {
      document.title = defaultTitle;
    }
  }

  function chime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = ctx.currentTime + i * 0.14;
        gain.gain.setValueAtTime(0.05, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
        osc.start(t0);
        osc.stop(t0 + 0.25);
        if (i === 1) osc.onended = () => ctx.close();
      });
    } catch {
      /* Audio blocked by browser policy */
    }
  }

  function pause() {
    clearInterval(tick);
    tick = null;
    start.textContent = '▶ Продовжити';
    document.title = defaultTitle;
  }

  function update() {
    const exact = Math.max(0, (endAt - Date.now()) / 1000);
    remaining = Math.ceil(exact);
    paint(exact);
    if (exact <= 0) {
      clearInterval(tick);
      tick = null;
      rounds++;
      document.title = defaultTitle;
      start.textContent = '↻ Ще раунд';
      if (sub) sub.textContent = `Завершено раундів за сесію: ${rounds}`;
      chime();
      toast('Інтервал завершено! Відпочинь ✦');
    }
  }

  start.addEventListener('click', () => {
    if (tick) {
      remaining = Math.max(0, (endAt - Date.now()) / 1000);
      pause();
      return;
    }
    if (remaining <= 0) remaining = duration;
    endAt = Date.now() + remaining * 1000;
    start.textContent = 'Ⅱ Пауза';
    tick = setInterval(update, 100);
    update();
  });

  function restart() {
    clearInterval(tick);
    tick = null;
    remaining = duration;
    start.textContent = '▶ Почати';
    paint(duration);
  }

  reset.addEventListener('click', restart);

  $$('[data-duration]').forEach((b) => {
    b.addEventListener('click', () => {
      duration = Number(b.dataset.duration);
      $$('[data-duration]').forEach((x) => x.classList.toggle('is-active', x === b));
      restart();
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && tick) update();
  });

  paint(duration);
}

/* ==========================================================================
   5. Schedule: Filters, Today Badge, Saved Bookmarks & Batch .ICS Export
   ========================================================================== */
function initSchedule() {
  const body = $('#scheduleBody');
  if (!body) return;

  const search = $('#scheduleSearch');
  const day = $('#dayFilter');
  const count = $('#resultsCount');
  const empty = $('#scheduleEmpty');
  const savedCountEl = $('#savedCount');
  const exportSavedBtn = $('#exportSavedIcs');
  let type = 'all';

  let savedIds = new Set();
  try {
    const parsed = JSON.parse(getStored(KEY_SAVED, '[]'));
    if (Array.isArray(parsed)) savedIds = new Set(parsed.map(Number));
  } catch {
    savedIds = new Set();
  }

  // Highlight today's rows
  const todayJs = new Date().getDay(); // 0=Sun..6=Sat
  const dayCodeMap = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
  const todayCode = dayCodeMap[todayJs];

  $$('tr', body).forEach((row) => {
    if (row.dataset.day === todayCode) {
      row.classList.add('is-today');
      const daySpan = $('.day-name', row);
      if (daySpan && !$('.today-pill', row)) {
        const pill = document.createElement('span');
        pill.className = 'today-pill';
        pill.textContent = 'Сьогодні';
        daySpan.after(pill);
      }
    }
  });

  const syncSavedUi = () => {
    setStored(KEY_SAVED, JSON.stringify([...savedIds]));
    if (savedCountEl) savedCountEl.textContent = String(savedIds.size);
    if (exportSavedBtn) exportSavedBtn.hidden = savedIds.size === 0;
    $$('[data-save]', body).forEach((btn) => {
      const id = Number(btn.dataset.save);
      const isSaved = savedIds.has(id);
      btn.setAttribute('aria-pressed', String(isSaved));
      btn.textContent = isSaved ? '★' : '☆';
      btn.title = isSaved ? 'Прибрати з обраного' : 'Зберегти до мого плану';
    });
  };

  const apply = () => {
    const term = (search.value || '').trim().toLocaleLowerCase('uk');
    let visible = 0;
    $$('tr', body).forEach((row, idx) => {
      const rowId = Number($('[data-calendar]', row)?.dataset.calendar ?? idx);
      const matchesType =
        type === 'all' ||
        (type === 'saved' ? savedIds.has(rowId) : row.dataset.category === type);
      const matchesDay = day.value === 'all' || row.dataset.day === day.value;
      const matchesTerm = !term || row.dataset.search.includes(term);
      const show = matchesType && matchesDay && matchesTerm;
      row.hidden = !show;
      if (show) visible++;
    });
    count.textContent = String(visible);
    empty.hidden = visible !== 0;
  };

  search.addEventListener('input', apply);
  day.addEventListener('change', apply);

  $$('[data-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      type = b.dataset.filter;
      $$('[data-filter]').forEach((x) => x.classList.toggle('active', x === b));
      apply();
    });
  });

  $$('[data-save]', body).forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.save);
      if (savedIds.has(id)) {
        savedIds.delete(id);
        toast('Прибрано з обраних занять');
      } else {
        savedIds.add(id);
        toast('Додано до твого плану ★');
      }
      syncSavedUi();
      if (type === 'saved') apply();
    });
  });

  $('#clearFilters')?.addEventListener('click', () => {
    search.value = '';
    day.value = 'all';
    type = 'all';
    $$('[data-filter]').forEach((x) => x.classList.toggle('active', x.dataset.filter === 'all'));
    apply();
    toast('Фільтри скинуто');
  });

  // URL Query Parameters (?type=strength or ?coach=Андрій)
  const params = new URLSearchParams(location.search);
  const typeParam = params.get('type');
  const coachParam = params.get('coach');
  if (['strength', 'cardio', 'functional', 'mind'].includes(typeParam)) {
    $(`[data-filter="${typeParam}"]`)?.click();
  }
  if (coachParam) {
    search.value = coachParam;
  }

  $$('[data-calendar]').forEach((b) => {
    b.addEventListener('click', () => {
      const session = SESSIONS[Number(b.dataset.calendar)];
      if (session) downloadIcs([session], `pulseforge-${session.id}.ics`);
    });
  });

  exportSavedBtn?.addEventListener('click', () => {
    const selected = SESSIONS.filter((s) => savedIds.has(s.id));
    if (selected.length) {
      downloadIcs(selected, 'pulseforge-my-plan.ics');
    }
  });

  const next = $('#nextTraining');
  if (next) {
    const now = new Date();
    const earliest = SESSIONS
      .map((s) => ({ s, start: occurrence(s, now) }))
      .sort((a, b) => a.start - b.start)[0];
    next.textContent = `Найближче: ${earliest.s.name} — ${earliest.start.toLocaleDateString('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit' })} о ${earliest.s.time}`;
  }

  syncSavedUi();
  apply();
}

function occurrence(session, reference = new Date()) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const diff = (session.day - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  const [h, m] = session.time.split(':').map(Number);
  date.setHours(h, m, 0, 0);
  if (date <= reference) date.setDate(date.getDate() + 7);
  return date;
}

function escapeIcs(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function downloadIcs(sessionsList, filename = 'pulseforge.ics') {
  if (!sessionsList?.length) return;
  const dt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const stamp = dt(new Date());

  const events = sessionsList.map((session) => {
    const start = occurrence(session);
    const end = new Date(start.getTime() + session.duration * 60000);
    const uid = `pf-${session.id}-${Date.now()}@pulseforge.example`;
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      `SUMMARY:${escapeIcs('PULSEFORGE — ' + session.name)}`,
      `DESCRIPTION:${escapeIcs('Навчальна демонстрація. Тренер: ' + session.coach + '. Тривалість: ' + session.duration + ' хв.')}`,
      'END:VEVENT'
    ].join('\r\n');
  });

  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PULSEFORGE//Training Demo//UK',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(sessionsList.length > 1 ? `Експортовано занять у .ics: ${sessionsList.length}` : 'Файл календаря .ics завантажено');
}

/* ==========================================================================
   6. Coaches: Native Accessible Dialog with Portrait & Filtered Schedule CTA
   ========================================================================== */
const COACHES = {
  andriy: {
    title: 'Андрій Савчук',
    role: 'СИЛОВІ ТА ФУНКЦІОНАЛЬНІ ПРОГРАМИ',
    avatar: 'images/coach-andriy-sm.webp',
    scheduleQuery: 'Андрій Савчук',
    text: 'Демонстраційний профіль тренера силових і командних програм. Заняття поєднують базову біомеханіку, вільні ваги, контроль техніки та послідовне підвищення робочого навантаження.',
    items: [
      'Суглобова розминка та активація перед основним силовим блоком',
      'Постановка безпечної техніки базових багатосуглобових рухів',
      'Масштабування ваги та вправ під поточний рівень підготовки'
    ]
  },
  dmytro: {
    title: 'Дмитро Ковальчук',
    role: 'КАРДІО, HIIT ТА ВИБУХОВИЙ ФУНКЦІОНАЛ',
    avatar: 'images/coach-dmytro-sm.webp',
    scheduleQuery: 'Дмитро Ковальчук',
    text: 'Демонстраційний профіль тренера високоінтенсивних інтервальних тренувань, швидкісно-силової витривалості та атлетичної мобільності. Динамічна робота з канатами, гирями та власною вагою.',
    items: [
      'Інтервальні протоколи HIIT та Tabata з контролем відновлення',
      'Розвиток вибухової сили, координації та функціональної витривалості',
      'Атлетична мобільність та міофасціальне розвантаження після інтенсивів'
    ]
  },
  iryna: {
    title: 'Ірина Мельник',
    role: 'КАРДІО, ВИТРИВАЛІСТЬ ТА СИЛОВИЙ ТОНУС',
    avatar: 'images/coach-iryna-sm.webp',
    scheduleQuery: 'Ірина Мельник',
    text: 'Демонстраційний профіль тренерки кардіо, силового тонусу та темпових форматів. Головний акцент — робота в цільових пульсових зонах, енергійний ритм і збалансоване навантаження.',
    items: [
      'Плавний вхід у робочий пульсовий діапазон без перевантаження',
      'Поєднання аеробної витривалості та силового зміцнення всього тіла',
      'Дихальне відновлення та заминка після основної частини'
    ]
  },
  olena: {
    title: 'Олена Дорошенко',
    role: 'МОБІЛЬНІСТЬ, БАЛАНС ТА RECOVERY YOGA',
    avatar: 'images/coach-olena-sm.webp',
    scheduleQuery: 'Олена Дорошенко',
    text: 'Демонстраційний профіль тренерки мобільності та відновлювальних практик. Заняття спрямовані на здорову амплітуду суглобів, стабілізацію корпусу та зняття м’язової напруги.',
    items: [
      'М’яка мобілізація хребта, плечового поясу та кульшових суглобів',
      'Практики рівноваги, глибокої стабілізації та усвідомленого дихання',
      'Комфортна розтяжка без болю та примусових амплітуд'
    ]
  }
};

function initCoaches() {
  const dialog = $('#coachDialog');
  if (!dialog) return;

  $$('[data-coach]').forEach((button) => {
    button.addEventListener('click', () => {
      const data = COACHES[button.dataset.coach];
      if (!data) return;
      $('#coachDialogTitle').textContent = data.title;
      $('#coachDialogText').textContent = data.text;
      const roleEl = $('#coachDialogRole');
      if (roleEl) roleEl.textContent = data.role;
      const imgEl = $('#coachDialogImg');
      if (imgEl) {
        imgEl.src = data.avatar;
        imgEl.alt = data.title;
      }
      const linkEl = $('#coachDialogLink');
      if (linkEl) {
        linkEl.href = `schedule.html?coach=${encodeURIComponent(data.scheduleQuery)}`;
      }
      const list = $('#coachDialogList');
      list.replaceChildren(
        ...data.items.map((t) => {
          const li = document.createElement('li');
          li.textContent = t;
          return li;
        })
      );
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  });

  $('#closeCoach')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

/* ==========================================================================
   7. Contact Draft Generator (Offline-First, Zero Server Requests)
   ========================================================================== */
function initContact() {
  const form = $('#contactForm');
  const area = $('#draftArea');
  const draft = $('#draftText');
  const msgInput = $('#contactMessage');
  const charCount = $('#charCount');
  if (!form || !area || !draft) return;

  const updateCounter = () => {
    if (msgInput && charCount) {
      charCount.textContent = `${msgInput.value.length} / 1000`;
    }
  };
  msgInput?.addEventListener('input', updateCounter);
  updateCounter();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) {
      toast('Заповни обов’язкові поля форми');
      return;
    }
    const name = $('#contactName').value.trim();
    const email = $('#contactReply').value.trim();
    const category = $('#contactCategory').value;
    const message = $('#contactMessage').value.trim();

    if (name.length < 2) {
      $('#contactName').setCustomValidity('Введіть щонайменше 2 символи');
      form.reportValidity();
      $('#contactName').setCustomValidity('');
      return;
    }

    const activeTheme = document.documentElement.dataset.themeMode || document.documentElement.dataset.theme || 'night';
    draft.value = [
      'ЗАПИТ НА ТРЕНУВАННЯ — PULSEFORGE (ДЕМО)',
      '────────────────────────────────────────',
      `Ім’я: ${name}`,
      `Електронна пошта: ${email}`,
      `Обраний напрям: ${category}`,
      `Тема інтерфейсу: ${THEME_META[activeTheme]?.label || activeTheme}`,
      '',
      'Повідомлення / ціль:',
      message || 'Деталі не вказано.',
      '',
      `Сформовано: ${new Date().toLocaleString('uk-UA')}`,
      'Примітка: цей текст створено локально в браузері й НЕ було надіслано автоматично.'
    ].join('\n');

    area.hidden = false;
    area.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Чернетку звернення сформовано ✦');
  });

  $('#copyDraft')?.addEventListener('click', async () => {
    if (!draft.value) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(draft.value);
      } else {
        draft.focus();
        draft.select();
        if (!document.execCommand('copy')) throw new Error('copy unavailable');
      }
      toast('Текст скопійовано до буфера обміну');
    } catch {
      draft.focus();
      draft.select();
      toast('Текст виділено — натисни Ctrl+C');
    }
  });

  $('#downloadDraft')?.addEventListener('click', () => {
    if (!draft.value) return;
    const url = URL.createObjectURL(new Blob([draft.value], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulseforge-zaiavka.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Файл заявки .txt збережено');
  });

  $('#resetDraft')?.addEventListener('click', () => {
    form.reset();
    area.hidden = true;
    draft.value = '';
    updateCounter();
    toast('Форму очищено');
  });
}

function main() {
  initTheme();
  initNav();
  initBackTop();
  initReveal();
  initGallery();
  initGoal();
  initTimer();
  initSchedule();
  initCoaches();
  initContact();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
