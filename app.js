/* =========================================================================
   Lingua — приложение для изучения английского
   Чистый JavaScript (ES6+), без сборки. Данные — в localStorage.

   Структура файла:
     1. Утилиты
     2. Хранилище (localStorage)
     3. Слова, деки и SRS (интервальное повторение)
     4. Активность и стрик
     5. Озвучка, иконки, общие классы
     6. Разделы: Главная · Карточки · Тренажёры · Грамматика · Словарь
     7. Роутер, обработчики событий, запуск
   ========================================================================= */
(() => {
  'use strict';

  const DATA = window.APP_DATA;
  const KEY = 'lingua.v1';
  const DAY = 86400000;
  /** Интервалы повторения (в днях) для каждой «коробки» Лейтнера */
  const INTERVALS = [0, 1, 3, 7, 16, 35, 75];
  const MAX_BOX = INTERVALS.length - 1;
  /** С этой коробки слово считается «в долгой памяти» (интервал ≥ 7 дней) */
  const LONG_BOX = 3;

  /* ===================================================================== */
  /* 1. Утилиты                                                             */
  /* ===================================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const norm = (s) => String(s).toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
  const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const plural = (n, [one, few, many]) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };
  const WORD = ['слово', 'слова', 'слов'];
  const DAYW = ['день', 'дня', 'дней'];
  const CARD = ['карточка', 'карточки', 'карточек'];
  const CARD_ACC = ['карточку', 'карточки', 'карточек'];
  const n = (num, forms) => `${num} ${plural(num, forms)}`;

  function relDays(ts) {
    const d = Math.round((new Date(ts).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
    if (d <= 0) return 'сегодня';
    if (d === 1) return 'завтра';
    return `через ${n(d, DAYW)}`;
  }

  /* ===================================================================== */
  /* 2. Хранилище                                                           */
  /* ===================================================================== */
  const defaults = () => ({
    version: 1,
    theme: null,
    cards: {},          // id слова → { box, due, reps, lapses }
    custom: [],         // слова пользователя
    activity: {},       // 'YYYY-MM-DD' → число действий за день
    grammar: {},        // id темы → лучший результат, %
    stats: { reviews: 0, quizzes: 0, answers: 0, correct: 0, bestStreak: 0 },
    settings: { newPerSession: 10, dailyGoal: 20, deck: 'b1', quizDeck: 'b1' }
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return merge(JSON.parse(raw));
    } catch (e) {
      console.warn('Не удалось прочитать прогресс:', e);
      return defaults();
    }
  }
  function merge(d) {
    const def = defaults();
    // Миграция с первой версии: набор «B1–B2» влился в новый «B2»
    if (d.cards) for (const k of Object.keys(d.cards)) {
      if (k.startsWith('b1b2:')) { d.cards['b2:' + k.slice(5)] = d.cards[k]; delete d.cards[k]; }
    }
    if (d.settings) for (const k of ['deck', 'quizDeck']) if (d.settings[k] === 'b1b2') d.settings[k] = 'b2';
    return {
      ...def, ...d,
      cards: d.cards || {}, custom: Array.isArray(d.custom) ? d.custom : [],
      activity: d.activity || {}, grammar: d.grammar || {},
      stats: { ...def.stats, ...(d.stats || {}) },
      settings: { ...def.settings, ...(d.settings || {}) }
    };
  }
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) {
      if (!saveWarned) { toast('Браузер не даёт сохранить прогресс (localStorage недоступен)', 'error'); saveWarned = true; }
    }
  }
  let S = load();

  /* ===================================================================== */
  /* 3. Слова, деки, SRS                                                    */
  /* ===================================================================== */
  const DECK_ORDER = ['b1', 'b2', 'c1', 'a1a2', 'it'];
  const BASE_WORDS = [...DATA.decks].sort((a, b) => (DECK_ORDER.indexOf(a.id) + 1 || 99) - (DECK_ORDER.indexOf(b.id) + 1 || 99)).flatMap((d) =>
    d.words.map(([en, tr, ru, ex]) => ({ id: `${d.id}:${en}`, deck: d.id, en, tr, ru, ex })));

  const DECKS = [
    ...DATA.decks.map(({ words, ...d }) => d)
      .sort((a, b) => (DECK_ORDER.indexOf(a.id) + 1 || 99) - (DECK_ORDER.indexOf(b.id) + 1 || 99)),
    { id: 'custom', name: 'Мои слова', short: 'Мои', icon: '✍️', desc: 'Слова, которые вы добавили сами' }
  ];
  const deckById = (id) => (id === 'all'
    ? { id: 'all', name: 'Все слова', short: 'Все', icon: '🌍', desc: 'Слова из всех наборов' }
    : DECKS.find((d) => d.id === id)) || DECKS[0];

  const allWords = () => [...BASE_WORDS, ...S.custom.map((w) => ({ ...w, deck: 'custom' }))];
  const wordsOf = (deck) => (deck === 'all' ? allWords() : allWords().filter((w) => w.deck === deck));
  const wordById = (id) => allWords().find((w) => w.id === id);

  function statusOf(id) {
    const c = S.cards[id];
    if (!c) return 'new';
    return c.box >= LONG_BOX ? 'long' : c.box >= 1 ? 'known' : 'learning';
  }
  const STATUS = {
    new: ['Новое', 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'],
    learning: ['Учу', 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'],
    known: ['Знаю', 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300'],
    long: ['Выучено', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300']
  };

  function deckCounts(deck) {
    const now = Date.now();
    const r = { total: 0, due: 0, fresh: 0, known: 0, long: 0, nextDue: Infinity };
    for (const w of wordsOf(deck)) {
      r.total++;
      const c = S.cards[w.id];
      if (!c) { r.fresh++; continue; }
      if (c.due <= now) r.due++; else r.nextDue = Math.min(r.nextDue, c.due);
      if (c.box >= 1) r.known++;
      if (c.box >= LONG_BOX) r.long++;
    }
    return r;
  }

  /** Обновить расписание слова. know = true → коробка выше, false → в начало */
  function schedule(id, know) {
    const c = S.cards[id] || { box: 0, due: 0, reps: 0, lapses: 0 };
    c.reps++;
    if (know) {
      c.box = Math.min(c.box + 1, MAX_BOX);
      c.due = Date.now() + INTERVALS[c.box] * DAY;
    } else {
      c.box = 0;
      c.due = Date.now();
      c.lapses++;
    }
    S.cards[id] = c;
    return c;
  }

  /* ===================================================================== */
  /* 4. Активность и стрик                                                  */
  /* ===================================================================== */
  function streak() {
    const d = new Date();
    if (!S.activity[todayKey(d)]) d.setDate(d.getDate() - 1); // стрик ещё «жив», если вчера занимались
    let count = 0;
    while (S.activity[todayKey(d)]) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }

  function logActivity(amount = 1) {
    const k = todayKey();
    const before = S.activity[k] || 0;
    S.activity[k] = before + amount;
    const s = streak();
    if (s > (S.stats.bestStreak || 0)) S.stats.bestStreak = s;
    if (before === 0) toast(`🔥 Стрик: ${n(s, DAYW)} подряд!`, 'streak');
    if (before < S.settings.dailyGoal && S.activity[k] >= S.settings.dailyGoal) toast('🎉 Дневная цель выполнена!', 'success');
    const keys = Object.keys(S.activity).sort();
    while (keys.length > 400) delete S.activity[keys.shift()];
  }

  function recordAnswer(correct) {
    buzz(correct ? 12 : [30, 50, 30]);
    S.stats.answers++;
    if (correct) S.stats.correct++;
    logActivity();
    save();
  }

  /* ===================================================================== */
  /* 5. Озвучка, иконки, общие классы, тосты                                */
  /* ===================================================================== */
  let voice = null;
  const canSpeak = 'speechSynthesis' in window;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /Google|Samantha|Natural|Aria|Jenny/i.test(v.name))
      || vs.find((v) => /en[-_](US|GB)/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if (canSpeak) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!canSpeak) return toast('Ваш браузер не поддерживает озвучку');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice ? voice.lang : 'en-US';
    if (voice) u.voice = voice;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  const ICON = {
    speaker: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
  };

  const C = {
    card: 'rounded-3xl border border-stone-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.035] shadow-[0_1px_2px_rgba(0,0,0,.04)]',
    btn: 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none select-none',
    primary: 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400 shadow-sm shadow-teal-600/20',
    ghost: 'bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-white/[0.06] dark:hover:bg-white/10 dark:text-stone-100',
    input: 'w-full rounded-xl border border-stone-300 dark:border-white/15 bg-white dark:bg-white/[0.04] px-3.5 py-2.5 text-[15px] outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 placeholder:text-stone-400',
    label: 'text-[11px] font-bold uppercase tracking-[.12em] text-stone-500 dark:text-stone-400',
    h1: 'font-display text-3xl sm:text-4xl font-semibold tracking-tight',
    muted: 'text-stone-500 dark:text-stone-400',
    chip: 'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition whitespace-nowrap'
  };

  const speakBtn = (text, extra = '') =>
    `<button type="button" data-action="speak" data-text="${esc(text)}" title="Произнести" aria-label="Произнести"
      class="inline-grid place-items-center w-9 h-9 rounded-full text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition ${extra}">${ICON.speaker}</button>`;

  const progressBar = (pct, color = 'bg-teal-500') =>
    `<div class="h-2 rounded-full bg-stone-200/80 dark:bg-white/10 overflow-hidden"><div class="progress-fill h-full rounded-full ${color}" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;

  const pageHead = (title, sub) =>
    `<div class="mb-6 sm:mb-8"><h1 class="${C.h1}">${title}</h1>${sub ? `<p class="mt-2 ${C.muted}">${sub}</p>` : ''}</div>`;

  function toast(msg, kind = 'info') {
    const box = $('#toasts');
    if (!box) return;
    const colors = {
      info: 'bg-stone-900 text-white dark:bg-white dark:text-stone-900',
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      streak: 'bg-orange-500 text-white'
    };
    const el = document.createElement('div');
    el.className = `toast pointer-events-auto rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${colors[kind] || colors.info}`;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 2600);
  }

  /** Лёгкая вибрация на телефонах (если поддерживается) */
  function buzz(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* не важно */ }
  }

  /** Диалог подтверждения в виде нижней шторки (замена confirm(), работает и в установленном приложении) */
  function ask({ title, text = '', ok = 'OK', danger = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'sheet-backdrop fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-3';
      wrap.style.paddingBottom = 'max(12px, env(safe-area-inset-bottom))';
      wrap.innerHTML = `<div class="sheet w-full max-w-sm rounded-[1.75rem] bg-white dark:bg-[#1b1f25] p-6 shadow-2xl" role="dialog" aria-modal="true">
          <div class="sm:hidden mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-stone-300 dark:bg-white/20"></div>
          <h3 class="font-display text-xl font-semibold">${esc(title)}</h3>
          ${text ? `<p class="mt-2 text-sm ${C.muted}">${esc(text)}</p>` : ''}
          <div class="mt-6 grid grid-cols-2 gap-2">
            <button type="button" data-r="0" class="${C.btn} ${C.ghost} !py-3">Отмена</button>
            <button type="button" data-r="1" class="${C.btn} !py-3 ${danger ? 'bg-rose-600 text-white hover:bg-rose-700' : C.primary}">${esc(ok)}</button>
          </div>
        </div>`;
      const close = (v) => {
        wrap.classList.add('out');
        setTimeout(() => wrap.remove(), 200);
        document.removeEventListener('keydown', onKey, true);
        resolve(v);
      };
      const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } };
      wrap.addEventListener('click', (e) => {
        if (e.target === wrap) return close(false);
        const b = e.target.closest('[data-r]');
        if (b) close(b.dataset.r === '1');
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(wrap);
      wrap.querySelector('[data-r="1"]').focus();
    });
  }

  /* ---------- Установка приложения (PWA) ---------- */
  let installEvent = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isTouch = matchMedia('(pointer: coarse)').matches;

  function installCard() {
    if (isStandalone() || S.settings.hideInstall) return '';
    let body;
    if (installEvent) {
      body = `<p class="text-sm opacity-90">Иконка на главном экране, полный экран и работа без интернета.</p>
        <button data-action="install" class="${C.btn} mt-4 bg-white text-stone-900 hover:bg-stone-100">📲 Установить</button>`;
    } else if (isIOS) {
      body = `<p class="text-sm opacity-90">Нажмите <b>«Поделиться»</b> <span class="inline-block rounded-md bg-white/20 px-1.5">⬆︎</span> внизу Safari, затем <b>«На экран „Домой“»</b>.</p>`;
    } else if (isTouch) {
      body = `<p class="text-sm opacity-90">Откройте меню браузера <b>⋮</b> и выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</p>`;
    } else return '';
    return `<section class="relative mb-4 rounded-3xl p-5 bg-stone-900 text-white dark:bg-white/[0.06] dark:border dark:border-white/10">
        <button data-action="hide-install" class="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full hover:bg-white/10" aria-label="Скрыть">✕</button>
        <div class="flex items-start gap-3 pr-8">
          <span class="text-3xl">📱</span>
          <div><h2 class="font-semibold">Установите Lingua как приложение</h2>${body}</div>
        </div>
      </section>`;
  }

  /* ===================================================================== */
  /* 6. Разделы                                                             */
  /* ===================================================================== */
  const UI = {
    session: null,                                   // текущая сессия карточек
    quiz: { tab: 'fill', fill: null, match: null, build: null },
    gq: null,                                        // тест по грамматике
    words: { q: '', deck: 'all', limit: 80 }
  };

  const NAV = [
    ['dashboard', 'Главная', '🏠'],
    ['cards', 'Карточки', '🃏'],
    ['quiz', 'Тренажёры', '🎯'],
    ['grammar', 'Грамматика', '📘'],
    ['words', 'Словарь', '📚']
  ];

  /* ------------------------------ Главная ------------------------------ */
  function viewDashboard() {
    const all = deckCounts('all');
    const s = streak();
    const todayDone = S.activity[todayKey()] || 0;
    const goal = S.settings.dailyGoal;
    const goalPct = Math.min(100, Math.round((todayDone / goal) * 100));
    const acc = S.stats.answers ? Math.round((S.stats.correct / S.stats.answers) * 100) : 0;
    const hour = new Date().getHours();
    const hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    const dateStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

    const days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { v: S.activity[todayKey(d)] || 0, label: d.toLocaleDateString('ru-RU', { weekday: 'short' }), today: i === 6 };
    });
    const max = Math.max(goal, ...days.map((d) => d.v));

    let cta;
    if (all.due > 0) cta = { text: `Повторить ${n(all.due, CARD_ACC)}`, deck: 'all', sub: 'Карточки ждут повторения — лучше не откладывать.' };
    else if (all.fresh > 0) cta = { text: 'Учить новые слова', deck: S.settings.deck, sub: `В наборе «${deckById(S.settings.deck).name}» ещё есть новые слова.` };
    else cta = { text: 'Свободная тренировка', deck: 'all', sub: 'Всё повторено! Можно потренироваться в тренажёрах.' };

    const R = 34, CIRC = 2 * Math.PI * R;

    const stat = (value, label, icon, tone) => `
      <div class="${C.card} p-4 sm:p-5">
        <div class="flex items-center justify-between"><span class="${C.label}">${label}</span><span class="text-lg">${icon}</span></div>
        <div class="mt-2 font-display text-3xl font-semibold ${tone || ''}">${value}</div>
      </div>`;

    const deckRows = DECKS.filter((d) => d.id !== 'custom' || S.custom.length).map((d) => {
      const c = deckCounts(d.id);
      const pct = c.total ? Math.round((c.known / c.total) * 100) : 0;
      return `
        <div class="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
          <div class="grid place-items-center w-11 h-11 rounded-2xl bg-stone-100 dark:bg-white/[0.06] text-xl shrink-0">${d.icon}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-semibold truncate">${esc(d.name)}</span>
              <span class="text-xs ${C.muted} shrink-0">${c.known}/${c.total}${c.due ? ` · <b class="text-orange-600 dark:text-orange-400">${c.due} к повтору</b>` : ''}</span>
            </div>
            <div class="mt-2">${progressBar(pct)}</div>
          </div>
          <button data-action="start-deck" data-deck="${d.id}" class="${C.btn} ${C.ghost} !px-3 shrink-0">Учить</button>
        </div>`;
    }).join('');

    const tiles = [
      ['cards', '🃏', 'Карточки', 'Интервальное повторение слов'],
      ['quiz', '🎯', 'Тренажёры', 'Пропуски, пары, конструктор'],
      ['grammar', '📘', 'Грамматика', `${DATA.grammar.length} темы с тестами`],
      ['words', '📚', 'Словарь', 'Добавить свои слова']
    ].map(([r, i, t, d]) => `
      <a href="#${r}" class="group ${C.card} p-5 hover:-translate-y-0.5 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-500/40 transition">
        <div class="text-2xl">${i}</div>
        <div class="mt-3 font-semibold">${t}</div>
        <div class="text-sm ${C.muted}">${d}</div>
      </a>`).join('');

    return `${installCard()}
      <div class="grid gap-4 md:grid-cols-3">
        <section class="md:col-span-2 relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-teal-600 to-emerald-700 dark:from-teal-600/90 dark:to-emerald-800 text-white">
          <div class="absolute -right-8 -top-10 text-[9rem] opacity-15 select-none rotate-12">Aa</div>
          <p class="text-sm/none font-semibold opacity-80 capitalize">${dateStr}</p>
          <h1 class="mt-3 font-display text-3xl sm:text-4xl font-semibold">${hello}! 👋</h1>
          <p class="mt-2 max-w-md opacity-90">${cta.sub}</p>
          <button data-action="start-deck" data-deck="${cta.deck}" class="${C.btn} mt-6 bg-white text-teal-800 hover:bg-teal-50 !px-5 !py-3">${cta.text} →</button>
        </section>

        <section class="${C.card} p-6 flex flex-col">
          <span class="${C.label}">Дней подряд</span>
          <div class="mt-3 flex items-end gap-3">
            <span class="text-5xl ${s ? '' : 'grayscale opacity-50'}">🔥</span>
            <span class="font-display text-6xl font-semibold leading-none">${s}</span>
          </div>
          <p class="mt-3 text-sm ${C.muted}">${s ? (todayDone ? 'Сегодня вы уже занимались — так держать!' : 'Позанимайтесь сегодня, чтобы не прервать серию.') : 'Начните серию — выполните любое упражнение.'}</p>
          <p class="mt-auto pt-4 text-xs ${C.muted}">Рекорд: <b>${n(S.stats.bestStreak || 0, DAYW)}</b></p>
        </section>
      </div>

      <div class="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${stat(all.known, 'Выучено слов', '✅')}
        ${stat(all.long, 'В долгой памяти', '🧠')}
        ${stat(S.stats.quizzes, 'Тестов пройдено', '🏆')}
        ${stat(S.stats.answers ? acc + '%' : '—', 'Точность ответов', '🎯')}
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-5">
        <section class="${C.card} p-6 md:col-span-2">
          <div class="flex items-center justify-between"><span class="${C.label}">Цель на сегодня</span><span class="text-xs ${C.muted}">${todayDone}/${goal}</span></div>
          <div class="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 80 80" class="w-24 h-24 -rotate-90 shrink-0">
              <circle cx="40" cy="40" r="${R}" fill="none" stroke-width="8" class="stroke-stone-200 dark:stroke-white/10"/>
              <circle cx="40" cy="40" r="${R}" fill="none" stroke-width="8" stroke-linecap="round" class="ring-progress stroke-teal-500"
                stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - goalPct / 100)}"/>
            </svg>
            <div>
              <div class="font-display text-3xl font-semibold">${goalPct}%</div>
              <p class="text-sm ${C.muted}">${goalPct >= 100 ? 'Цель выполнена! 🎉' : `Ещё ${goal - todayDone} ответов или повторений`}</p>
            </div>
          </div>
          <div class="mt-6 flex items-end justify-between gap-2 h-24">
            ${days.map((d) => `
              <div class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title="${d.v}">
                <div class="bar w-full max-w-[28px] rounded-md ${d.today ? 'bg-teal-500' : d.v ? 'bg-teal-300 dark:bg-teal-700' : 'bg-stone-200 dark:bg-white/10'}"
                  style="height:${Math.max(6, (d.v / max) * 100)}%"></div>
                <span class="text-[10px] uppercase ${d.today ? 'font-bold text-teal-600 dark:text-teal-400' : C.muted}">${d.label}</span>
              </div>`).join('')}
          </div>
        </section>

        <section class="${C.card} p-6 md:col-span-3">
          <div class="flex items-center justify-between mb-4"><span class="${C.label}">Наборы слов</span><a href="#words" class="text-sm font-semibold text-teal-700 dark:text-teal-400 hover:underline">+ Добавить слово</a></div>
          <div class="divide-y divide-stone-100 dark:divide-white/5">${deckRows}</div>
        </section>
      </div>

      <h2 class="mt-10 mb-4 ${C.label}">Быстрый доступ</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">${tiles}</div>`;
  }

  /* ------------------------------ Карточки ----------------------------- */
  function deckChips(active, action, includeAll = true) {
    const list = [...(includeAll ? [deckById('all')] : []), ...DECKS.filter((d) => d.id !== 'custom' || S.custom.length)];
    return `<div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
      ${list.map((d) => {
        const c = deckCounts(d.id);
        const on = d.id === active;
        return `<button data-action="${action}" data-deck="${d.id}"
          class="${C.chip} ${on ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-white dark:bg-white/[0.05] border border-stone-200 dark:border-white/10 hover:border-stone-400 dark:hover:border-white/25'}">
          <span>${d.icon}</span>${esc(d.short)}
          ${c.due ? `<span class="ml-0.5 rounded-full px-1.5 text-[11px] ${on ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'}">${c.due}</span>` : ''}
        </button>`;
      }).join('')}
    </div>`;
  }

  function startSession(deck, practice = false) {
    const now = Date.now();
    const ws = wordsOf(deck);
    let queue;
    if (practice) {
      queue = sample(ws, 15).map((w) => w.id);
    } else {
      const due = ws.filter((w) => S.cards[w.id] && S.cards[w.id].due <= now)
        .sort((a, b) => S.cards[a.id].due - S.cards[b.id].due).map((w) => w.id);
      const fresh = ws.filter((w) => !S.cards[w.id]).slice(0, S.settings.newPerSession).map((w) => w.id);
      queue = [...due, ...fresh];
    }
    UI.session = { deck, practice, queue, total: queue.length, done: 0, known: 0, forgot: 0, flipped: false, fresh: true };
  }

  function viewCards() {
    const deck = S.settings.deck;
    const d = deckById(deck);
    const sess = UI.session && UI.session.deck === deck ? UI.session : null;
    const head = `${pageHead('Карточки', 'Переверните карточку, вспомните перевод и честно оцените себя.')}
      <div class="mb-6">${deckChips(deck, 'select-deck')}</div>`;

    // --- Стартовый экран набора ---
    if (!sess) {
      const c = deckCounts(deck);
      const toLearn = c.due + Math.min(c.fresh, S.settings.newPerSession);
      return `${head}
        <section class="${C.card} p-6 sm:p-10 max-w-2xl mx-auto text-center">
          <div class="text-5xl">${d.icon}</div>
          <h2 class="mt-4 font-display text-2xl font-semibold">${esc(d.name)}</h2>
          <p class="mt-1 ${C.muted}">${esc(d.desc)}</p>
          <div class="mt-6 grid grid-cols-3 gap-3 text-center">
            <div class="rounded-2xl bg-orange-50 dark:bg-orange-500/10 p-3"><div class="font-display text-2xl font-semibold text-orange-600 dark:text-orange-300">${c.due}</div><div class="text-xs ${C.muted}">к повтору</div></div>
            <div class="rounded-2xl bg-sky-50 dark:bg-sky-500/10 p-3"><div class="font-display text-2xl font-semibold text-sky-600 dark:text-sky-300">${c.fresh}</div><div class="text-xs ${C.muted}">новых</div></div>
            <div class="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-3"><div class="font-display text-2xl font-semibold text-emerald-600 dark:text-emerald-300">${c.known}</div><div class="text-xs ${C.muted}">знаю</div></div>
          </div>
          ${c.total === 0
            ? `<p class="mt-8 ${C.muted}">В этом наборе пока нет слов.</p><a href="#words" class="${C.btn} ${C.primary} mt-4">Добавить слова</a>`
            : toLearn > 0
              ? `<button data-action="start-session" data-autofocus class="${C.btn} ${C.primary} mt-8 !px-6 !py-3 text-base">Начать · ${n(toLearn, CARD)}</button>
                 <p class="mt-3 text-xs ${C.muted}">${c.due} на повторение + ${Math.min(c.fresh, S.settings.newPerSession)} новых (лимит новых меняется в «Словаре»)</p>`
              : `<p class="mt-8 font-semibold">На сегодня всё повторено 🎉</p>
                 <p class="text-sm ${C.muted}">${c.nextDue < Infinity ? `Следующее повторение — ${relDays(c.nextDue)}.` : ''}</p>
                 <button data-action="start-practice" class="${C.btn} ${C.ghost} mt-5">Свободная тренировка (без влияния на расписание)</button>`}
        </section>`;
    }

    // --- Итоги сессии ---
    if (!sess.queue.length) {
      return `${head}
        <section class="${C.card} p-8 sm:p-10 max-w-xl mx-auto text-center card-in">
          <div class="text-6xl">🎉</div>
          <h2 class="mt-4 font-display text-3xl font-semibold">Сессия завершена!</h2>
          <p class="mt-2 ${C.muted}">${sess.total ? `Пройдено ${n(sess.total, CARD)}` : 'Нечего повторять'}</p>
          <div class="mt-6 grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4"><div class="font-display text-3xl font-semibold text-emerald-600 dark:text-emerald-300">${sess.known}</div><div class="text-xs ${C.muted}">«Знаю»</div></div>
            <div class="rounded-2xl bg-rose-50 dark:bg-rose-500/10 p-4"><div class="font-display text-3xl font-semibold text-rose-600 dark:text-rose-300">${sess.forgot}</div><div class="text-xs ${C.muted}">«Забыл»</div></div>
          </div>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <button data-action="end-session" data-autofocus class="${C.btn} ${C.primary}">Готово</button>
            <a href="#quiz" class="${C.btn} ${C.ghost}">Закрепить в тренажёрах →</a>
          </div>
        </section>`;
    }

    // --- Карточка ---
    const w = wordById(sess.queue[0]);
    if (!w) { sess.queue.shift(); return viewCards(); }
    const st = statusOf(w.id);
    const nextBox = Math.min((S.cards[w.id]?.box ?? 0) + 1, MAX_BOX);
    const pct = sess.total ? (sess.done / sess.total) * 100 : 0;
    const anim = sess.fresh ? 'card-in' : '';
    sess.fresh = false;

    return `${head}
      <div class="max-w-xl mx-auto">
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="${C.muted}">${sess.practice ? 'Тренировка · ' : ''}Осталось: <b class="text-stone-800 dark:text-stone-100">${sess.queue.length}</b></span>
          <span class="flex items-center gap-3"><span class="text-emerald-600 dark:text-emerald-400 font-semibold">✓ ${sess.known}</span><span class="text-rose-600 dark:text-rose-400 font-semibold">↺ ${sess.forgot}</span>
            <button data-action="end-session" class="${C.muted} hover:text-stone-900 dark:hover:text-white underline-offset-2 hover:underline">Завершить</button></span>
        </div>
        ${progressBar(pct)}

        <div class="flip-card relative h-[22rem] sm:h-[24rem] mt-6 ${anim}" data-action="flip" tabindex="0" role="button" aria-label="Перевернуть карточку">
          <span class="swipe-tag know">✓ Знаю</span>
          <span class="swipe-tag forgot">↺ Забыл</span>
          <div class="flip-inner ${sess.flipped ? 'is-flipped' : ''}">
            <div class="flip-face front ${C.card} !rounded-[2rem] flex flex-col items-center justify-center p-8 text-center">
              <span class="absolute top-5 left-5 text-xs font-semibold ${C.muted}">${deckById(w.deck).icon} ${esc(deckById(w.deck).short)}</span>
              <span class="absolute top-5 right-5 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS[st][1]}">${STATUS[st][0]}</span>
              <div class="font-display text-4xl sm:text-5xl font-semibold tracking-tight break-words max-w-full">${esc(w.en)}</div>
              <div class="mt-3">${speakBtn(w.en)}</div>
              <p class="absolute bottom-5 text-xs ${C.muted}">${isTouch ? 'Нажмите, чтобы перевернуть · свайп ← →' : 'Нажмите или <kbd>Пробел</kbd>, чтобы перевернуть'}</p>
            </div>
            <div class="flip-face back rounded-[2rem] flex flex-col items-center justify-center p-8 text-center bg-stone-900 text-white dark:bg-[#1b2026] border border-transparent dark:border-white/10">
              <div class="flex items-center gap-1 text-stone-300">
                <span class="font-semibold">${esc(w.en)}</span>
                ${w.tr ? `<span class="font-mono text-sm opacity-80">${esc(w.tr)}</span>` : ''}
                ${speakBtn(w.en, '!text-teal-300 hover:!bg-white/10')}
              </div>
              <div class="mt-3 font-display text-3xl sm:text-4xl font-semibold text-teal-300">${esc(w.ru)}</div>
              ${w.ex ? `<div class="mt-6 max-w-sm rounded-2xl bg-white/[0.07] px-4 py-3 text-[15px] italic text-stone-200 flex items-center gap-2">
                  <span class="flex-1">«${esc(w.ex)}»</span>${speakBtn(w.ex, '!text-stone-300 hover:!bg-white/10 shrink-0')}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-6">
          <button data-action="rate" data-know="0" ${sess.flipped ? '' : 'disabled'}
            class="rate-btn ${C.btn} !py-4 text-base bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20">
            ↺ Забыл <kbd class="hidden sm:inline">1</kbd></button>
          <button data-action="rate" data-know="1" ${sess.flipped ? '' : 'disabled'}
            class="rate-btn ${C.btn} !py-4 text-base bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400">
            ✓ Знаю <kbd class="hidden sm:inline">2</kbd></button>
        </div>
        <p class="mt-3 text-center text-xs ${C.muted}">
          ${sess.practice ? '«Забыл» вернёт слово в начало расписания' : `«Знаю» — следующий показ ${INTERVALS[nextBox] === 1 ? 'завтра' : `через ${n(INTERVALS[nextBox], DAYW)}`}; «Забыл» — карточка вернётся через пару шагов`}
        </p>
      </div>`;
  }

  /** Оценить текущую карточку (кнопками, клавишами или свайпом) */
  function rateCard(know) {
    const s = UI.session;
    if (!s || !s.queue.length) return;
    const id = s.queue.shift();
    if (know) {
      if (!s.practice) schedule(id, true);
      s.known++; s.done++;
      buzz(12);
    } else {
      schedule(id, false);
      s.forgot++;
      s.queue.splice(Math.min(3, s.queue.length), 0, id); // вернуть карточку через пару шагов
      s.total++; s.done++;
      buzz([20, 40, 20]);
    }
    S.stats.reviews++;
    logActivity();
    save();
    s.flipped = false; s.fresh = true;
    refresh();
  }

  /* ------------------------------ Тренажёры ---------------------------- */
  const QUIZ_TABS = [
    ['fill', '✏️', 'Пропущенное слово'],
    ['match', '🔗', 'Найди пару'],
    ['build', '🧩', 'Конструктор']
  ];

  function blankOf(w) {
    if (!w.ex) return null;
    const m = w.ex.match(new RegExp(`(^|[^A-Za-z'])(${reEsc(w.en)})(?![A-Za-z])`, 'i'));
    if (!m) return null;
    const start = m.index + m[1].length;
    return { before: w.ex.slice(0, start), answer: m[2], after: w.ex.slice(start + m[2].length) };
  }

  const quizPool = () => wordsOf(S.settings.quizDeck);

  function finishQuiz() {
    S.stats.quizzes++;
    save();
  }

  function viewQuiz() {
    const tab = UI.quiz.tab;
    const deckOptions = [deckById('all'), ...DECKS.filter((d) => d.id !== 'custom' || S.custom.length)]
      .map((d) => `<option value="${d.id}" ${d.id === S.settings.quizDeck ? 'selected' : ''}>${d.icon} ${esc(d.name)}</option>`).join('');

    const body = tab === 'fill' ? fillView() : tab === 'match' ? matchView() : buildView();

    return `${pageHead('Тренажёры', 'Закрепляйте слова в контексте: вписывайте, сопоставляйте и собирайте предложения.')}
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div class="inline-flex p-1 rounded-2xl bg-stone-200/60 dark:bg-white/[0.06] overflow-x-auto no-scrollbar">
          ${QUIZ_TABS.map(([id, i, t]) => `<button data-action="quiz-tab" data-tab="${id}"
            class="${C.chip} !rounded-xl ${tab === id ? 'bg-white dark:bg-white/15 shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'}">${i} ${t}</button>`).join('')}
        </div>
        <label class="sm:ml-auto flex items-center gap-2 text-sm">
          <span class="${C.muted} shrink-0">Набор:</span>
          <select id="quiz-deck" class="${C.input} !py-2 !w-auto">${deckOptions}</select>
        </label>
      </div>
      <div class="max-w-2xl mx-auto">${body}</div>`;
  }

  const resultCard = (score, total, again, extra = '', attrs = '') => {
    const pct = total ? Math.round((score / total) * 100) : 0;
    const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '📚';
    const msg = pct === 100 ? 'Идеально!' : pct >= 70 ? 'Отличный результат!' : pct >= 40 ? 'Неплохо, продолжайте!' : 'Стоит повторить слова';
    return `<section class="${C.card} p-8 sm:p-10 text-center card-in">
      <div class="text-6xl">${emoji}</div>
      <h2 class="mt-4 font-display text-3xl font-semibold">${msg}</h2>
      <p class="mt-2 ${C.muted}">Результат: <b class="text-stone-900 dark:text-white">${score} из ${total}</b> (${pct}%)</p>
      ${extra}
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button data-action="${again}" ${attrs} data-autofocus class="${C.btn} ${C.primary}">Ещё раунд</button>
        <a href="#cards" class="${C.btn} ${C.ghost}">К карточкам</a>
      </div>
    </section>`;
  };

  const notEnough = (need) => `<section class="${C.card} p-8 text-center">
      <div class="text-4xl">🤏</div>
      <p class="mt-3 font-semibold">В этом наборе мало подходящих слов</p>
      <p class="text-sm ${C.muted}">Нужно хотя бы ${need}. Выберите другой набор или добавьте слова с примерами в «Словаре».</p>
    </section>`;

  /* --- Fill in the blank --- */
  function newFill() {
    const qs = sample(quizPool().map((w) => ({ w, b: blankOf(w) })).filter((x) => x.b), 10);
    UI.quiz.fill = { qs, i: 0, score: 0, hint: 0, checked: false, ok: false, value: '', finished: false };
  }

  function fillView() {
    if (!UI.quiz.fill) newFill();
    const f = UI.quiz.fill;
    if (f.qs.length < 3) return notEnough(3);
    if (f.i >= f.qs.length) return resultCard(f.score, f.qs.length, 'fill-restart');
    const { w, b } = f.qs[f.i];
    const width = Math.max(5, b.answer.length + 2);
    const inputCls = f.checked
      ? (f.ok ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 shake')
      : 'border-stone-300 dark:border-white/20 bg-stone-50 dark:bg-white/5 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15';

    return `
      <div class="flex items-center justify-between text-sm mb-2"><span class="${C.muted}">Вопрос ${f.i + 1} из ${f.qs.length}</span><span class="font-semibold text-emerald-600 dark:text-emerald-400">✓ ${f.score}</span></div>
      ${progressBar((f.i / f.qs.length) * 100)}
      <form data-form="fill" class="${C.card} mt-6 p-6 sm:p-8 ${f.i && !f.checked && !f.value ? 'card-in' : ''}" autocomplete="off">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="rounded-full px-3 py-1 font-semibold bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">Подсказка: ${esc(w.ru)}</span>
          ${w.tr ? `<span class="font-mono ${C.muted}">${esc(w.tr)}</span>` : ''}
        </div>
        <p class="mt-6 text-xl sm:text-2xl leading-[2.4] font-medium">
          ${esc(b.before)}<input id="fill-input" name="answer" value="${esc(f.value)}" ${f.checked ? 'disabled' : 'data-autofocus'}
            spellcheck="false" autocapitalize="off" aria-label="Пропущенное слово"
            class="mx-1 px-2 py-0.5 rounded-lg border-2 outline-none text-center font-semibold transition ${inputCls}" style="width:${width}ch">${esc(b.after)}
        </p>

        ${f.checked ? `
          <div class="mt-6 rounded-2xl p-4 ${f.ok ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}">
            <div class="font-semibold ${f.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">${f.ok ? '✓ Верно!' : '✗ Не совсем'}</div>
            <div class="mt-1 flex items-center gap-1 text-sm">${f.ok ? '' : `Правильно: <b>${esc(b.answer)}</b> — `}${esc(w.ex)} ${speakBtn(w.ex, '!w-8 !h-8')}</div>
          </div>
          <div class="mt-6 flex justify-end"><button type="submit" data-autofocus class="${C.btn} ${C.primary}">${f.i + 1 < f.qs.length ? 'Дальше →' : 'Результат'} <kbd class="hidden sm:inline !border-white/50">Enter</kbd></button></div>`
        : `
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" data-action="fill-hint" class="${C.btn} ${C.ghost}" ${f.hint >= b.answer.length - 1 ? 'disabled' : ''}>💡 Буква</button>
            <button type="button" data-action="fill-skip" class="${C.btn} ${C.ghost}">Не знаю</button>
            <button type="submit" class="${C.btn} ${C.primary} ml-auto">Проверить <kbd class="hidden sm:inline !border-white/50">Enter</kbd></button>
          </div>`}
      </form>`;
  }

  function fillCheck(value, skipped = false) {
    const f = UI.quiz.fill;
    const { b } = f.qs[f.i];
    f.value = skipped ? '' : value;
    f.ok = !skipped && norm(value) === norm(b.answer);
    f.checked = true;
    if (f.ok) f.score++;
    recordAnswer(f.ok);
    refresh();
  }

  /* --- Matching --- */
  function newMatch() {
    const ws = sample(quizPool(), 6);
    UI.quiz.match = {
      ws, left: shuffle(ws.map((w) => w.id)), right: shuffle(ws.map((w) => w.id)),
      sel: null, done: [], errors: 0, wrong: null, finished: false
    };
  }

  function matchView() {
    if (!UI.quiz.match) newMatch();
    const m = UI.quiz.match;
    if (m.ws.length < 4) return notEnough(4);
    const byId = Object.fromEntries(m.ws.map((w) => [w.id, w]));
    if (m.finished) {
      const score = Math.max(0, m.ws.length - m.errors);
      return resultCard(score, m.ws.length, 'match-restart', `<p class="text-sm ${C.muted}">Ошибок: ${m.errors}</p>`);
    }
    const cell = (id, side) => {
      const w = byId[id];
      const done = m.done.includes(id);
      const sel = side === 'l' && m.sel === id;
      const wrong = m.wrong && m.wrong[side] === id;
      let cls = 'bg-white dark:bg-white/[0.04] border-stone-200 dark:border-white/10 hover:border-teal-400 dark:hover:border-teal-500/60';
      if (done) cls = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 opacity-60';
      else if (wrong) cls = 'bg-rose-50 dark:bg-rose-500/10 border-rose-400 text-rose-700 dark:text-rose-300 shake';
      else if (sel) cls = 'bg-teal-50 dark:bg-teal-500/15 border-teal-500 ring-4 ring-teal-500/15';
      return `<button data-action="match-pick" data-side="${side}" data-id="${esc(id)}" ${done ? 'disabled' : ''}
        class="w-full min-h-[3.5rem] rounded-2xl border-2 px-4 py-3 text-left font-semibold transition ${cls} ${done ? 'pointer-events-none' : ''}">
        ${side === 'l' ? esc(w.en) : esc(w.ru)}</button>`;
    };
    return `
      <div class="flex items-center justify-between text-sm mb-2"><span class="${C.muted}">Выберите английское слово, затем его перевод</span><span class="font-semibold text-rose-600 dark:text-rose-400">Ошибок: ${m.errors}</span></div>
      ${progressBar((m.done.length / m.ws.length) * 100)}
      <div class="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <div class="space-y-3">${m.left.map((id) => cell(id, 'l')).join('')}</div>
        <div class="space-y-3">${m.right.map((id) => cell(id, 'r')).join('')}</div>
      </div>`;
  }

  function matchPick(side, id) {
    const m = UI.quiz.match;
    if (side === 'l') {
      m.sel = m.sel === id ? null : id;
      return refresh();
    }
    if (!m.sel) return toast('Сначала выберите английское слово слева');
    if (m.sel === id) {
      m.done.push(id);
      m.sel = null;
      recordAnswer(true);
      if (m.done.length === m.ws.length) { m.finished = true; finishQuiz(); }
      refresh();
    } else {
      m.errors++;
      m.wrong = { l: m.sel, r: id };
      recordAnswer(false);
      refresh();
      setTimeout(() => { if (UI.quiz.match === m) { m.wrong = null; refresh(); } }, 500);
    }
  }

  /* --- Sentence builder --- */
  function newBuild() {
    const cand = quizPool().filter((w) => w.ex && w.ex.split(/\s+/).length >= 4 && w.ex.split(/\s+/).length <= 11);
    const qs = sample(cand, 5).map((w) => {
      const tokens = w.ex.split(/\s+/);
      let order = shuffle(tokens.map((_, i) => i));
      for (let t = 0; t < 5 && order.every((v, i) => v === i); t++) order = shuffle(order);
      return { w, tokens, order };
    });
    UI.quiz.build = { qs, i: 0, picked: [], checked: false, ok: false, score: 0 };
  }

  function buildView() {
    if (!UI.quiz.build) newBuild();
    const b = UI.quiz.build;
    if (b.qs.length < 3) return notEnough(3);
    if (b.i >= b.qs.length) return resultCard(b.score, b.qs.length, 'build-restart');
    const q = b.qs[b.i];
    const tokenBtn = (idx, where) => `<button data-action="build-${where}" data-idx="${idx}" ${b.checked ? 'disabled' : ''}
      class="rounded-xl border-2 px-3 py-2 font-semibold transition active:scale-95 disabled:pointer-events-none
      ${where === 'pick' ? 'bg-white dark:bg-white/[0.05] border-stone-200 dark:border-white/10 hover:border-teal-400 hover:-translate-y-0.5 border-b-4' : 'bg-teal-50 dark:bg-teal-500/15 border-teal-200 dark:border-teal-500/30 text-teal-900 dark:text-teal-100'}">
      ${esc(q.tokens[idx])}</button>`;
    const remaining = q.order.filter((i) => !b.picked.includes(i));
    const boxCls = b.checked ? (b.ok ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-rose-400 bg-rose-50/50 dark:bg-rose-500/5 shake') : 'border-stone-300 dark:border-white/15';

    return `
      <div class="flex items-center justify-between text-sm mb-2"><span class="${C.muted}">Предложение ${b.i + 1} из ${b.qs.length}</span><span class="font-semibold text-emerald-600 dark:text-emerald-400">✓ ${b.score}</span></div>
      ${progressBar((b.i / b.qs.length) * 100)}
      <section class="${C.card} mt-6 p-6 sm:p-8">
        <div class="text-sm">Соберите предложение со словом <b>${esc(q.w.en)}</b> <span class="${C.muted}">— ${esc(q.w.ru)}</span></div>
        <div class="mt-5 min-h-[4.5rem] rounded-2xl border-2 border-dashed p-3 flex flex-wrap gap-2 items-start ${boxCls}">
          ${b.picked.length ? b.picked.map((i) => tokenBtn(i, 'unpick')).join('') : `<span class="m-auto text-sm ${C.muted}">Нажимайте на слова ниже по порядку</span>`}
        </div>
        <div class="mt-5 flex flex-wrap gap-2 min-h-[3rem]">${remaining.map((i) => tokenBtn(i, 'pick')).join('')}</div>

        ${b.checked ? `
          <div class="mt-6 rounded-2xl p-4 ${b.ok ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}">
            <div class="font-semibold ${b.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">${b.ok ? '✓ Верно!' : '✗ Порядок другой'}</div>
            <div class="mt-1 flex items-center gap-1 text-sm">${esc(q.w.ex)} ${speakBtn(q.w.ex, '!w-8 !h-8')}</div>
          </div>
          <div class="mt-6 flex justify-end"><button data-action="build-next" data-autofocus class="${C.btn} ${C.primary}">${b.i + 1 < b.qs.length ? 'Дальше →' : 'Результат'}</button></div>`
        : `
          <div class="mt-6 flex items-center gap-3">
            <button data-action="build-reset" class="${C.btn} ${C.ghost}" ${b.picked.length ? '' : 'disabled'}>Сбросить</button>
            <button data-action="build-check" class="${C.btn} ${C.primary} ml-auto" ${remaining.length ? 'disabled' : ''}>Проверить</button>
          </div>`}
      </section>`;
  }

  /* ------------------------------ Грамматика --------------------------- */
  function viewGrammar(topicId) {
    const topic = DATA.grammar.find((t) => t.id === topicId);
    if (topic) return grammarTopic(topic);

    return `${pageHead('Грамматика', 'Короткие шпаргалки с примерами и мини-тест после каждой темы.')}
      <div class="grid gap-4 sm:grid-cols-2">
        ${DATA.grammar.map((t) => {
          const best = S.grammar[t.id];
          return `<a href="#grammar-${t.id}" class="group ${C.card} p-6 flex flex-col hover:-translate-y-0.5 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-500/40 transition">
            <div class="flex items-start justify-between">
              <span class="text-3xl">${t.icon}</span>
              <span class="rounded-full px-2.5 py-1 text-[11px] font-bold bg-stone-100 dark:bg-white/[0.06] ${C.muted}">${t.level}</span>
            </div>
            <h2 class="mt-4 font-display text-xl font-semibold">${esc(t.title)}</h2>
            <p class="mt-1 text-sm ${C.muted}">${esc(t.summary)}</p>
            <div class="mt-5 pt-4 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-sm">
              ${best == null ? `<span class="${C.muted}">Тест не пройден</span>` : `<span class="font-semibold ${best >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">Лучший результат: ${best}%</span>`}
              <span class="font-semibold text-teal-700 dark:text-teal-400 group-hover:translate-x-1 transition">Открыть →</span>
            </div>
          </a>`;
        }).join('')}
      </div>`;
  }

  function grammarTopic(t) {
    const sections = t.sections.map((s, i) => `
      <section class="${C.card} p-6 sm:p-7">
        <div class="flex items-center gap-3">
          <span class="grid place-items-center w-8 h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white dark:text-stone-950 text-sm font-bold">${i + 1}</span>
          <h2 class="font-display text-xl font-semibold">${esc(s.title)}</h2>
        </div>
        <p class="mt-3 leading-relaxed">${esc(s.rule)}</p>
        ${s.formula ? `<pre class="mt-4 whitespace-pre-wrap rounded-2xl bg-stone-900 text-teal-200 dark:bg-black/40 px-4 py-3 text-[13px] leading-relaxed font-mono">${esc(s.formula)}</pre>` : ''}
        ${s.markers && s.markers.length ? `<div class="mt-4 flex flex-wrap gap-1.5"><span class="text-xs ${C.muted} mr-1 self-center">Маркеры:</span>${s.markers.map((m) => `<span class="rounded-lg px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">${esc(m)}</span>`).join('')}</div>` : ''}
        <ul class="mt-5 space-y-2">
          ${s.examples.map(([en, ru]) => `<li class="flex items-start gap-2 rounded-2xl bg-stone-50 dark:bg-white/[0.03] px-3 py-2.5">
            ${speakBtn(en, 'shrink-0 !w-8 !h-8')}
            <div><div class="font-semibold">${esc(en)}</div><div class="text-sm ${C.muted}">${esc(ru)}</div></div></li>`).join('')}
        </ul>
      </section>`).join('');

    return `
      <a href="#grammar" class="inline-flex items-center gap-1 text-sm font-semibold ${C.muted} hover:text-stone-900 dark:hover:text-white mb-4">${ICON.back} Все темы</a>
      <div class="flex items-start gap-4 mb-8">
        <span class="text-4xl">${t.icon}</span>
        <div><h1 class="${C.h1}">${esc(t.title)}</h1><p class="mt-2 ${C.muted}">${esc(t.summary)} · ${t.level}</p></div>
      </div>
      <div class="space-y-4">${sections}</div>
      <div class="mt-4 rounded-3xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-5 flex gap-3">
        <span class="text-2xl">💡</span><p class="leading-relaxed"><b>Совет.</b> ${esc(t.tip)}</p>
      </div>
      <div id="gq" class="mt-10 scroll-mt-24">${grammarQuiz(t)}</div>`;
  }

  function grammarQuiz(t) {
    const g = UI.gq && UI.gq.topic === t.id ? UI.gq : null;
    if (!g) {
      return `<section class="${C.card} p-8 text-center">
        <div class="text-4xl">📝</div>
        <h2 class="mt-3 font-display text-2xl font-semibold">Проверьте себя</h2>
        <p class="mt-1 ${C.muted}">${t.quiz.length} вопросов по теме. Объяснение — после каждого ответа.</p>
        <button data-action="gq-start" data-topic="${t.id}" class="${C.btn} ${C.primary} mt-6 !px-6 !py-3">Начать тест</button>
      </section>`;
    }
    if (g.i >= t.quiz.length) {
      const pct = Math.round((g.score / t.quiz.length) * 100);
      return resultCard(g.score, t.quiz.length, 'gq-start',
        `<p class="text-sm ${C.muted}">Лучший результат по теме: ${S.grammar[t.id]}%</p>${pct < 80 ? `<p class="mt-2 text-sm">Совет: перечитайте правила выше и попробуйте снова.</p>` : ''}`,
        `data-topic="${t.id}"`);
    }
    const q = t.quiz[g.i];
    const answered = g.picked != null;
    return `
      <div class="flex items-center justify-between text-sm mb-2"><span class="${C.muted}">Вопрос ${g.i + 1} из ${t.quiz.length}</span><span class="font-semibold text-emerald-600 dark:text-emerald-400">✓ ${g.score}</span></div>
      ${progressBar((g.i / t.quiz.length) * 100)}
      <section class="${C.card} mt-4 p-6 sm:p-8">
        <p class="text-xl sm:text-2xl font-semibold leading-snug">${esc(q.q).replace(/___/g, '<span class="inline-block min-w-[3.5rem] border-b-[3px] border-teal-500 mx-1"></span>')}</p>
        <div class="mt-6 grid gap-3">
          ${q.options.map((o, i) => {
            let cls = 'border-stone-200 dark:border-white/10 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-500/5';
            if (answered) {
              if (i === q.answer) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 pop';
              else if (i === g.picked) cls = 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200 shake';
              else cls = 'border-stone-200 dark:border-white/10 opacity-50';
            }
            return `<button data-action="gq-pick" data-i="${i}" ${answered ? 'disabled' : ''}
              class="flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-semibold transition ${cls}">
              <span class="grid place-items-center w-7 h-7 rounded-lg bg-stone-100 dark:bg-white/10 text-xs font-bold shrink-0">${'ABCD'[i]}</span>${esc(o)}</button>`;
          }).join('')}
        </div>
        ${answered ? `
          <div class="mt-5 rounded-2xl p-4 ${g.picked === q.answer ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}">
            <b class="${g.picked === q.answer ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">${g.picked === q.answer ? '✓ Верно!' : '✗ Неверно.'}</b>
            <span class="ml-1">${esc(q.explain)}</span>
          </div>
          <div class="mt-6 flex justify-end"><button data-action="gq-next" data-autofocus class="${C.btn} ${C.primary}">${g.i + 1 < t.quiz.length ? 'Следующий вопрос →' : 'Результат'}</button></div>` : ''}
      </section>`;
  }

  /* ------------------------------ Словарь ------------------------------ */
  function wordListHtml() {
    const q = norm(UI.words.q);
    const list = wordsOf(UI.words.deck).filter((w) => !q || norm(w.en).includes(q) || norm(w.ru).includes(q));
    if (!list.length) return `<p class="py-10 text-center ${C.muted}">Ничего не найдено</p>`;
    const rest = list.length - UI.words.limit;
    return list.slice(0, UI.words.limit).map((w) => {
      const st = statusOf(w.id);
      const c = S.cards[w.id];
      return `<div class="flex items-center gap-3 py-3">
        ${speakBtn(w.en, 'shrink-0')}
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-baseline gap-x-2"><span class="font-semibold">${esc(w.en)}</span>${w.tr ? `<span class="font-mono text-xs ${C.muted}">${esc(w.tr)}</span>` : ''}</div>
          <div class="text-sm ${C.muted} truncate">${esc(w.ru)}</div>
        </div>
        <div class="text-right shrink-0">
          <span class="rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[st][1]}">${STATUS[st][0]}</span>
          ${c && c.due > Date.now() ? `<div class="mt-1 text-[11px] ${C.muted}">${relDays(c.due)}</div>` : ''}
        </div>
        ${w.deck === 'custom' ? `<button data-action="delete-word" data-id="${esc(w.id)}" title="Удалить" class="grid place-items-center w-8 h-8 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shrink-0">${ICON.trash}</button>` : ''}
      </div>`;
    }).join('') + (rest > 0
      ? `<div class="pt-4 text-center"><button data-action="more-words" class="${C.btn} ${C.ghost}">Показать ещё (${rest})</button></div>`
      : '');
  }

  function viewWords() {
    const wide = window.innerWidth >= 1024;
    const summary = (icon, title, sub) => `<summary class="flex items-center gap-3 cursor-pointer list-none select-none">
        <span class="grid place-items-center w-10 h-10 rounded-2xl bg-stone-100 dark:bg-white/[0.06] text-lg">${icon}</span>
        <span class="flex-1"><span class="block font-display text-lg font-semibold">${title}</span><span class="block text-xs ${C.muted}">${sub}</span></span>
        <span class="chev text-stone-400 transition">▾</span></summary>`;
    const deckOptions = [deckById('all'), ...DECKS].map((d) =>
      `<option value="${d.id}" ${d.id === UI.words.deck ? 'selected' : ''}>${d.icon} ${esc(d.name)} (${wordsOf(d.id).length})</option>`).join('');
    const sel = (id, values, cur, fmt) => `<select id="${id}" class="${C.input} !py-2">${values.map((v) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${fmt(v)}</option>`).join('')}</select>`;

    return `${pageHead('Словарь', `Все слова и их статус. Всего: ${n(allWords().length, WORD)}.`)}
      <div class="grid gap-4 lg:grid-cols-5 items-start">
        <div class="lg:col-span-2 space-y-4 lg:sticky lg:top-24">
          <details class="${C.card} p-5" ${wide ? 'open' : ''}>
          ${summary('✍️', 'Добавить слово', 'Попадёт в набор «Мои слова» и в карточки')}
          <form data-form="add-word" class="mt-4" autocomplete="off">
            <div class="space-y-3">
              <label class="block"><span class="${C.label}">Английский *</span><input name="en" required maxlength="60" class="${C.input} mt-1" placeholder="e.g. serendipity"></label>
              <label class="block"><span class="${C.label}">Перевод *</span><input name="ru" required maxlength="80" class="${C.input} mt-1" placeholder="счастливая случайность"></label>
              <label class="block"><span class="${C.label}">Транскрипция</span><input name="tr" maxlength="60" class="${C.input} mt-1 font-mono" placeholder="/ˌserənˈdɪpəti/"></label>
              <label class="block"><span class="${C.label}">Пример</span><textarea name="ex" rows="2" maxlength="200" class="${C.input} mt-1 resize-none" placeholder="Meeting her was pure serendipity."></textarea>
                <span class="text-xs ${C.muted}">Если пример содержит слово — оно появится в тренажёрах.</span></label>
            </div>
            <button type="submit" class="${C.btn} ${C.primary} w-full mt-5">+ Добавить</button>
          </form>
          </details>

          <details class="${C.card} p-5" ${wide ? 'open' : ''}>
            ${summary('⚙️', 'Настройки и данные', 'Лимит новых слов, цель, экспорт и импорт')}
            <div class="mt-4 grid grid-cols-2 gap-3">
              <label class="block"><span class="${C.label}">Новых за сессию</span>${sel('set-new', [5, 10, 15, 20, 30], S.settings.newPerSession, (v) => v)}</label>
              <label class="block"><span class="${C.label}">Цель в день</span>${sel('set-goal', [10, 20, 30, 50, 100], S.settings.dailyGoal, (v) => v)}</label>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-2">
              <button data-action="export" class="${C.btn} ${C.ghost}">⬇ Экспорт</button>
              <button data-action="import" class="${C.btn} ${C.ghost}">⬆ Импорт</button>
            </div>
            <button data-action="reset" class="${C.btn} w-full mt-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">Сбросить весь прогресс</button>
            <p class="mt-3 text-xs ${C.muted}">Прогресс хранится только на этом устройстве. Экспорт пригодится для переноса на другой телефон или компьютер.</p>
          </details>
        </div>

        <section class="${C.card} p-6 lg:col-span-3">
          <div class="flex flex-col sm:flex-row gap-2">
            <input id="word-search" type="search" value="${esc(UI.words.q)}" placeholder="Поиск по слову или переводу…" class="${C.input}">
            <select id="word-deck" class="${C.input} sm:!w-56">${deckOptions}</select>
          </div>
          <div id="word-list" class="mt-3 divide-y divide-stone-100 dark:divide-white/5">${wordListHtml()}</div>
        </section>
      </div>`;
  }

  /* ===================================================================== */
  /* 7. Роутер, события, запуск                                             */
  /* ===================================================================== */
  const VIEWS = { dashboard: viewDashboard, cards: viewCards, quiz: viewQuiz, grammar: viewGrammar, words: viewWords };

  function parseRoute() {
    // Поддерживаются «#cards», «#grammar-articles» и старый формат «#/grammar/articles»
    const [name, param] = location.hash.replace(/^#\/?/, '').split(/[/-](.*)/);
    return { name: VIEWS[name] ? name : 'dashboard', param };
  }

  function render(animate = false) {
    const { name, param } = parseRoute();
    const el = $('#view');
    el.innerHTML = VIEWS[name](param);
    if (animate) {
      el.classList.remove('view-enter'); void el.offsetWidth; el.classList.add('view-enter');
      window.scrollTo({ top: 0 });
    }
    renderChrome(name);
    const af = el.querySelector('[data-autofocus]');
    if (af && (animate || !matchMedia('(hover: none)').matches)) af.focus({ preventScroll: true });
  }
  const refresh = () => render(false);
  const go = (hash) => { if (location.hash === hash) render(true); else location.hash = hash; };

  function renderChrome(active) {
    $('#nav-desktop').innerHTML = NAV.map(([id, t]) => `<a href="#${id}"
      class="rounded-xl px-3 py-2 text-sm font-semibold transition ${active === id ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:text-white dark:hover:bg-white/10'}">${t}</a>`).join('');
    $('#nav-mobile').innerHTML = NAV.map(([id, t, i]) => `<a href="#${id}"
      class="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${active === id ? 'text-teal-700 dark:text-teal-400' : 'text-stone-500 dark:text-stone-400'}">
      <span class="text-xl ${active === id ? '' : 'grayscale opacity-70'}">${i}</span>${t}</a>`).join('');
    const s = streak();
    $('#header-streak').textContent = `🔥 ${s}`;
    $('#header-streak').title = `${n(s, DAYW)} подряд`;
    $('#theme-toggle').innerHTML = document.documentElement.classList.contains('dark') ? ICON.sun : ICON.moon;
  }

  /* ---------- Действия по клику (data-action) ---------- */
  const actions = {
    'toggle-theme'() {
      const dark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', dark);
      S.theme = dark ? 'dark' : 'light';
      save();
      syncThemeColor();
      renderChrome(parseRoute().name);
    },
    speak(el) { speak(el.dataset.text); },

    // Карточки
    'start-deck'(el) {
      S.settings.deck = el.dataset.deck; save();
      startSession(el.dataset.deck);
      go('#cards');
    },
    'select-deck'(el) { S.settings.deck = el.dataset.deck; UI.session = null; save(); render(true); },
    'start-session'() { startSession(S.settings.deck); refresh(); },
    'start-practice'() { startSession(S.settings.deck, true); refresh(); },
    'end-session'() { UI.session = null; refresh(); },
    flip() {
      const s = UI.session;
      if (!s || !s.queue.length) return;
      s.flipped = !s.flipped;
      const inner = $('.flip-inner');
      if (inner) inner.classList.toggle('is-flipped', s.flipped);
      document.querySelectorAll('.rate-btn').forEach((b) => { b.disabled = !s.flipped; });
    },
    rate(el) {
      const s = UI.session;
      if (!s || !s.queue.length || !s.flipped) return;
      rateCard(el.dataset.know === '1');
    },

    // Тренажёры
    'quiz-tab'(el) { UI.quiz.tab = el.dataset.tab; refresh(); },
    'fill-hint'() {
      const f = UI.quiz.fill; const ans = f.qs[f.i].b.answer;
      f.hint = Math.min(f.hint + 1, ans.length - 1);
      f.value = ans.slice(0, f.hint);
      refresh();
      const inp = $('#fill-input'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    },
    'fill-skip'() { fillCheck('', true); },
    'fill-restart'() { newFill(); refresh(); },
    'match-pick'(el) { matchPick(el.dataset.side, el.dataset.id); },
    'match-restart'() { newMatch(); refresh(); },
    'build-pick'(el) { UI.quiz.build.picked.push(+el.dataset.idx); refresh(); },
    'build-unpick'(el) { const b = UI.quiz.build; b.picked = b.picked.filter((i) => i !== +el.dataset.idx); refresh(); },
    'build-reset'() { UI.quiz.build.picked = []; refresh(); },
    'build-check'() {
      const b = UI.quiz.build; const q = b.qs[b.i];
      b.ok = b.picked.map((i) => q.tokens[i]).join(' ') === q.tokens.join(' ');
      b.checked = true;
      if (b.ok) b.score++;
      recordAnswer(b.ok);
      refresh();
    },
    'build-next'() {
      const b = UI.quiz.build;
      b.i++; b.picked = []; b.checked = false; b.ok = false;
      if (b.i >= b.qs.length) finishQuiz();
      refresh();
    },
    'build-restart'() { newBuild(); refresh(); },

    // Грамматика
    'gq-start'(el) {
      UI.gq = { topic: el.dataset.topic, i: 0, score: 0, picked: null };
      refresh();
      $('#gq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    'gq-pick'(el) {
      const g = UI.gq; const t = DATA.grammar.find((x) => x.id === g.topic);
      g.picked = +el.dataset.i;
      const ok = g.picked === t.quiz[g.i].answer;
      if (ok) g.score++;
      recordAnswer(ok);
      refresh();
    },
    'gq-next'() {
      const g = UI.gq; const t = DATA.grammar.find((x) => x.id === g.topic);
      g.i++; g.picked = null;
      if (g.i >= t.quiz.length) {
        const pct = Math.round((g.score / t.quiz.length) * 100);
        S.grammar[t.id] = Math.max(S.grammar[t.id] ?? 0, pct);
        finishQuiz();
      }
      refresh();
      $('#gq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // Словарь
    async 'delete-word'(el) {
      const w = wordById(el.dataset.id);
      if (!w || !(await ask({ title: `Удалить «${w.en}»?`, text: 'Слово и его прогресс будут удалены.', ok: 'Удалить', danger: true }))) return;
      S.custom = S.custom.filter((x) => x.id !== w.id);
      delete S.cards[w.id];
      save(); refresh();
      toast('Слово удалено');
    },
    async export() {
      if (window.LINGUA_EMBED) {
        try { await navigator.clipboard.writeText(JSON.stringify(S)); toast('Прогресс скопирован — сохраните текст в заметках', 'success'); }
        catch (e) { toast('Не удалось скопировать прогресс', 'error'); }
        return;
      }
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lingua-progress-${todayKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Файл с прогрессом сохранён', 'success');
    },
    import() { $('#import-file').click(); },
    async reset() {
      if (!(await ask({ title: 'Сбросить весь прогресс?', text: 'Статистика, расписание повторений и ваши слова будут удалены. Это нельзя отменить.', ok: 'Сбросить', danger: true }))) return;
      const theme = S.theme;
      S = defaults(); S.theme = theme;
      UI.session = null; UI.gq = null; UI.quiz = { tab: 'fill', fill: null, match: null, build: null };
      save(); render(true);
      toast('Прогресс сброшен');
    },
    async install() {
      if (!installEvent) return;
      installEvent.prompt();
      try { await installEvent.userChoice; } catch (e) { /* пользователь закрыл окно */ }
      installEvent = null;
      refresh();
    },
    'hide-install'() { S.settings.hideInstall = true; save(); refresh(); },
    'more-words'() { UI.words.limit += 150; $('#word-list').innerHTML = wordListHtml(); }
  };

  /* ---------- Формы ---------- */
  const forms = {
    fill(form) {
      const f = UI.quiz.fill;
      if (f.checked) {
        f.i++; f.checked = false; f.ok = false; f.hint = 0; f.value = '';
        if (f.i >= f.qs.length) finishQuiz();
        return refresh();
      }
      const v = form.elements.answer.value;
      if (!v.trim()) { toast('Впишите слово или нажмите «Не знаю»'); return; }
      fillCheck(v);
    },
    'add-word'(form) {
      const get = (k) => form.elements[k].value.trim();
      const en = get('en'), ru = get('ru');
      if (!en || !ru) return toast('Заполните слово и перевод', 'error');
      if (allWords().some((w) => norm(w.en) === norm(en))) return toast(`Слово «${en}» уже есть в словаре`, 'error');
      const tr = get('tr');
      S.custom.push({ id: `custom:${Date.now().toString(36)}`, en, ru, tr: tr && !tr.startsWith('/') ? `/${tr}/` : tr, ex: get('ex') });
      save();
      UI.quiz.fill = UI.quiz.match = UI.quiz.build = null;
      refresh();
      toast(`«${en}» добавлено в «Мои слова»`, 'success');
      $('form[data-form="add-word"] input[name="en"]')?.focus();
    }
  };

  /* ---------- Глобальные слушатели ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    forms[f.dataset.form]?.(f);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'word-search') {
      UI.words.q = e.target.value; UI.words.limit = 80;
      $('#word-list').innerHTML = wordListHtml();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'word-deck') { UI.words.deck = t.value; UI.words.limit = 80; $('#word-list').innerHTML = wordListHtml(); }
    else if (t.id === 'quiz-deck') { S.settings.quizDeck = t.value; save(); UI.quiz.fill = UI.quiz.match = UI.quiz.build = null; refresh(); }
    else if (t.id === 'set-new') { S.settings.newPerSession = +t.value; save(); toast('Сохранено'); }
    else if (t.id === 'set-goal') { S.settings.dailyGoal = +t.value; save(); toast('Сохранено'); }
    else if (t.id === 'import-file' && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const d = JSON.parse(reader.result);
          if (!d || typeof d !== 'object' || !('cards' in d)) throw new Error('bad');
          S = merge(d); save();
          UI.session = null; UI.quiz = { tab: UI.quiz.tab, fill: null, match: null, build: null };
          document.documentElement.classList.toggle('dark', S.theme === 'dark' || (!S.theme && matchMedia('(prefers-color-scheme: dark)').matches));
          syncThemeColor();
          render(true);
          toast('Прогресс импортирован', 'success');
        } catch (err) { toast('Не удалось прочитать файл — это не экспорт Lingua', 'error'); }
        t.value = '';
      };
      reader.readAsText(t.files[0]);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (parseRoute().name !== 'cards') return;
    const s = UI.session;
    if (!s || !s.queue.length) return;
    if (e.code === 'Space' || (e.key === 'Enter' && !e.target.closest('button, a'))) {
      if (e.target.closest('button, a') && !e.target.closest('.flip-card')) return;
      e.preventDefault(); actions.flip();
    } else if (s.flipped && (e.key === '1' || e.key === '2')) {
      e.preventDefault(); actions.rate({ dataset: { know: e.key === '2' ? '1' : '0' } });
    }
  });

  /* ---------- Свайпы карточек: вправо — «Знаю», влево — «Забыл» ---------- */
  let drag = null;
  let swallowClick = false;
  document.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.flip-card');
    if (!card || e.button > 0 || e.target.closest('[data-action="speak"]')) return;
    if (!UI.session || !UI.session.queue.length) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, card, active: false };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // вертикальная прокрутка
      drag.active = true;
      drag.card.classList.remove('card-in');
      drag.card.style.transition = 'none';
      try { drag.card.setPointerCapture(e.pointerId); } catch (err) { /* ок */ }
    }
    drag.dx = dx;
    drag.card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    drag.card.dataset.swipe = dx > 70 ? 'know' : dx < -70 ? 'forgot' : '';
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { card, dx, active } = drag;
    drag = null;
    if (!active) return;
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 60);
    card.style.transition = 'transform .25s ease, opacity .25s ease';
    if (Math.abs(dx) > 90) {
      const know = dx > 0;
      card.style.transform = `translateX(${know ? 130 : -130}vw) rotate(${know ? 25 : -25}deg)`;
      card.style.opacity = '0';
      setTimeout(() => rateCard(know), 180);
    } else {
      card.style.transform = '';
      card.dataset.swipe = '';
    }
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('click', (e) => {
    if (swallowClick && e.target.closest('.flip-card')) { e.stopPropagation(); e.preventDefault(); swallowClick = false; }
  }, true);

  /* ---------- PWA: установка, офлайн-режим, цвет системной панели ---------- */
  function syncThemeColor() {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', document.documentElement.classList.contains('dark') ? '#0e1013' : '#fafaf9');
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
    if (parseRoute().name === 'dashboard') refresh();
  });
  window.addEventListener('appinstalled', () => { installEvent = null; toast('Приложение установлено 🎉', 'success'); refresh(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.LINGUA_NO_SW) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* офлайн-режим недоступен */ }));
  }
  syncThemeColor();

  window.addEventListener('hashchange', () => render(true));

  // Если Tailwind не загрузился (нет интернета при первом запуске) — показываем подсказку
  window.addEventListener('load', () => {
    if (!window.tailwind) {
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99;padding:10px 16px;background:#b45309;color:#fff;font:14px system-ui;text-align:center';
      b.textContent = 'Не удалось загрузить стили (Tailwind CDN). Подключитесь к интернету и обновите страницу — после этого всё будет красиво.';
      document.body.prepend(b);
    }
  });

  render(true);
})();
