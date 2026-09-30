"use strict";

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
// O dia em que você está não depende do calendário: depende de quanto você já sabe.
// Cada 30 palavras sabidas (ou 10 phrasal verbs / frases) avançam um dia.
const PASS_RATE = 0.8;      // acertar 80% no quiz marca o dia como concluído
const REVIEW_MAX = 30;      // máximo de itens por sessão de revisão
const PRACTICE_SIZE = 20;   // itens no treino livre
// Revisão espaçada: depois de acertar, quantos dias até revisar de novo (por nível 0 a 5)
const INTERVALS = [1, 1, 3, 7, 14, 30];
const STORE_KEY = "ingles300-v1";

/* =========================================================
   TRILHAS
   Dias 1 a 10: palavras e phrasal verbs. Dias 11 a 30: frases.
   ========================================================= */
// n = posição do item na trilha (1, 2, 3...); id = chave fixa usada no progresso salvo
function buildItems(data, perDay, firstDay) {
  return data.map(([en, pt, exEn, exPt], i) => ({ id: i, n: i + 1, en, pt, exEn, exPt, day: firstDay + Math.floor(i / perDay) }));
}
// Frases e "Minhas palavras" vêm do banco de dados do navegador (db.js)
function buildDbItems(list, perDay, firstDay) {
  return list.map((f, i) => ({
    id: f.id, n: i + 1, en: f.en, pt: f.pt, exEn: f.exEn || "", exPt: f.exPt || "",
    mine: Boolean(f.mine), day: firstDay + Math.floor(i / perDay),
  }));
}
const TRACKS = {
  words: {
    name: "Palavras", tag: "Palavra", title: "300 palavras",
    sub: "As palavras mais usadas do inglês, 30 por dia, do Dia 1 ao 10.",
    noun: "palavras", learned: "aprendidas", perDay: 30, firstDay: 1,
    themes: WORD_THEMES, items: buildItems(WORDS, 30, 1), sentence: false,
  },
  phrasal: {
    name: "Phrasal verbs", tag: "Phrasal verb", title: "100 phrasal verbs",
    sub: "Os phrasal verbs mais usados, 10 por dia, do Dia 1 ao 10.",
    noun: "phrasal verbs", learned: "aprendidos", perDay: 10, firstDay: 1,
    themes: PHRASAL_THEMES, items: buildItems(PHRASALS, 10, 1), sentence: false,
  },
  frases: {
    name: "Frases", tag: "Frase", title: "", sub: "",
    noun: "frases", learned: "aprendidas", perDay: 10, firstDay: 11,
    themes: FRASE_THEMES, items: [], sentence: true,
  },
  ia: {
    name: "Minhas palavras", tag: "Minha palavra", title: "", sub: "",
    noun: "palavras", learned: "aprendidas", perDay: 10, firstDay: 31,
    themes: [], sentence: false,
    items: [],
  },
};
const TRACK_KEYS = Object.keys(TRACKS);
let TOTAL_DAYS = 0;
let TOTAL_ITEMS = 0;
// Recalcula dias e totais (roda de novo quando você adiciona ou apaga algo)
function refreshTracks() {
  for (const [key, t] of Object.entries(TRACKS)) {
    t.key = key;
    t.lastDay = t.firstDay + Math.max(1, Math.ceil(t.items.length / t.perDay)) - 1;
    t.byId = new Map(t.items.map((w) => [w.id, w]));
  }
  const f = TRACKS.frases;
  f.title = `${f.items.length} frases`;
  f.sub = `Frases prontas para conversar, 10 por dia, do Dia ${f.firstDay} ao ${f.lastDay}.`;
  const ia = TRACKS.ia;
  ia.title = "Minhas palavras";
  ia.sub = ia.items.length
    ? `${ia.items.length} palavras novas que a IA escolheu para você, 10 por dia, a partir do Dia ${ia.firstDay}.`
    : "Palavras novas que a IA escolhe com base no que você já sabe.";
  // uma trilha vazia não conta nos dias do curso
  TOTAL_DAYS = Math.max(...TRACK_KEYS.filter((k) => TRACKS[k].items.length).map((k) => TRACKS[k].lastDay));
  TOTAL_ITEMS = TRACK_KEYS.reduce((n, k) => n + TRACKS[k].items.length, 0);
}
function setDbTrack(key, list) {
  const t = TRACKS[key];
  t.items = buildDbItems(list, t.perDay, t.firstDay);
  refreshTracks();
}
setDbTrack("frases", window.FRASES_LIST || FraseDB.seedList());
setDbTrack("ia", window.PALAVRAS_LIST || []);

/* =========================================================
   DATAS
   ========================================================= */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
function addDays(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }

/* =========================================================
   ESTADO SALVO (localStorage)
   ========================================================= */
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* sem acesso ao armazenamento */ }
  return {};
}
const saved = loadState();
// a primeira versão guardava só as palavras, direto na raiz
const savedTracks = saved.tracks || { words: { known: saved.known, best: saved.best, done: saved.done } };

const state = {
  startDate: saved.startDate || todayISO(), // só informativo: quando você começou
  lastTrack: TRACKS[saved.lastTrack] ? saved.lastTrack : "words",
  showPt: saved.showPt === true, // por padrão a tradução fica escondida
  tracks: {},
  srs: saved.srs && typeof saved.srs === "object" ? saved.srs : {}, // "trilha:id" -> { b: nível, d: data da próxima revisão }
  activity: new Set(Array.isArray(saved.activity) ? saved.activity : []), // dias em que a pessoa estudou
};
for (const key of TRACK_KEYS) {
  const t = savedTracks[key] || {};
  // descarta marcações de frases que foram apagadas (se o banco não abriu, mantém tudo)
  const exists = (id) => !FraseDB.ok || TRACKS[key].byId.has(id);
  state.tracks[key] = {
    known: new Set((t.known || []).filter(exists)),
    best: t.best || {},
    done: new Set(t.done || []),
  };
}
if (FraseDB.ok) {
  for (const k of Object.keys(state.srs)) if (!parseKey(k)) delete state.srs[k];
}
// quem já tinha marcado itens antes da revisão existir: entram na revisão a partir de amanhã
for (const key of TRACK_KEYS) {
  for (const id of state.tracks[key].known) {
    const k = `${key}:${id}`;
    if (!state.srs[k]) state.srs[k] = { b: 1, d: addDays(todayISO(), 1) };
  }
}

function serialize() {
  const tracks = {};
  for (const [key, t] of Object.entries(state.tracks)) {
    tracks[key] = { known: [...t.known], best: t.best, done: [...t.done] };
  }
  return {
    app: "ingles-30-dias",
    version: 3,
    startDate: state.startDate,
    lastTrack: state.lastTrack,
    showPt: state.showPt,
    tracks,
    srs: state.srs,
    activity: [...state.activity].sort().slice(-400),
  };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(serialize())); } catch (e) { /* ignora */ }
}
save();

// Seu dia atual numa trilha: sabe 60 palavras = Dia 3 (cada 30 é um dia).
// Conta tudo o que você marcou, de qualquer dia, porque você pode já saber palavras de dias mais à frente.
function currentDay(t) {
  const known = state.tracks[t.key].known.size;
  return Math.min(t.firstDay + Math.floor(known / t.perDay), t.lastDay);
}

/* =========================================================
   REVISÃO ESPAÇADA E SEQUÊNCIA DE DIAS
   ========================================================= */
const skey = (track, id) => `${track}:${id}`;
function parseKey(k) {
  const [track, raw] = k.split(":");
  const id = Number(raw);
  if (!TRACKS[track] || !TRACKS[track].byId.has(id)) return null;
  return { track, id };
}
// Acertou: sobe de nível (só se já estava na hora de revisar ou se é novo).
// Errou: volta para o nível 0 e aparece de novo amanhã.
function srsGrade(track, id, ok) {
  const k = skey(track, id);
  const today = todayISO();
  const cur = state.srs[k];
  if (!ok) { state.srs[k] = { b: 0, d: addDays(today, 1) }; return; }
  if (!cur) { state.srs[k] = { b: 1, d: addDays(today, INTERVALS[1]) }; return; }
  if (cur.d <= today) {
    const b = Math.min(cur.b + 1, INTERVALS.length - 1);
    state.srs[k] = { b, d: addDays(today, INTERVALS[b]) };
  }
}
function dueList() {
  const today = todayISO();
  return Object.entries(state.srs)
    .filter(([, v]) => v.d <= today)
    .sort((a, b) => a[1].d.localeCompare(b[1].d) || a[1].b - b[1].b)
    .map(([k]) => parseKey(k))
    .filter(Boolean);
}
function nextReviewDate() {
  const today = todayISO();
  const future = Object.values(state.srs).map((v) => v.d).filter((d) => d > today).sort();
  return future[0] || null;
}
function markActivity() { state.activity.add(todayISO()); }
function streak() {
  let d = todayISO();
  if (!state.activity.has(d)) d = addDays(d, -1); // ainda dá tempo de estudar hoje
  let n = 0;
  while (state.activity.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
// Registra uma resposta em qualquer lugar do app
function record(track, id, ok) {
  const s = state.tracks[track];
  if (ok) s.known.add(id); else s.known.delete(id);
  srsGrade(track, id, ok);
  markActivity();
  save();
}

/* =========================================================
   UTILIDADES
   ========================================================= */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Para comparar respostas escritas: ignora maiúsculas, pontuação e apóstrofos
const normalizeAnswer = (s) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,!?;:"'()]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
// Aceita pequenos erros de digitação e avisa
function checkTyped(typed, expected) {
  const a = normalizeAnswer(typed);
  const b = normalizeAnswer(expected);
  if (a === b) return { ok: true, typo: false };
  const allowed = b.length <= 4 ? 0 : b.length <= 8 ? 1 : b.length <= 20 ? 2 : 3;
  const dist = levenshtein(a, b);
  return { ok: dist <= allowed, typo: dist <= allowed };
}
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
const SPEAKER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
const speakBtn = (text) => `<button class="speak" data-say="${esc(text)}" aria-label="Ouvir a pronúncia de ${esc(text)}">${SPEAKER}</button>`;
const isSentence = (text) => text.trim().split(/\s+/).length > 3;

/* ---------- Palavras dos Dias 1 a 10 que aparecem em cada frase ---------- */
const WORD_INDEX = new Map(TRACKS.words.items.map((w) => [w.en.toLowerCase(), w]));
const CONTRACTIONS = { "n't": " not", "'m": " am", "'re": " are", "'ll": " will", "'ve": " have", "'d": " would", "'s": " is" };
function wordsUsed(sentence) {
  let s = sentence.toLowerCase().replace(/[’]/g, "'");
  s = s.replace(/can't/g, "can not").replace(/won't/g, "will not");
  s = s.replace(/(n't|'m|'re|'ll|'ve|'d|'s)\b/g, (m) => CONTRACTIONS[m]);
  const tokens = s.replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
  const seen = new Set();
  const words = [];
  for (const tk of tokens) {
    const w = WORD_INDEX.get(tk);
    if (w && !seen.has(w.id)) { seen.add(w.id); words.push(w); }
  }
  const lower = sentence.toLowerCase();
  const phrasal = TRACKS.phrasal.items.filter((p) => new RegExp(`\\b${p.en}\\b`).test(lower));
  return { words, phrasal };
}

/* =========================================================
   PRONÚNCIA (voz do navegador)
   ========================================================= */
let enVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices();
  enVoice = voices.find((v) => v.lang === "en-US") || voices.find((v) => v.lang.startsWith("en")) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  if (enVoice) u.voice = enVoice;
  u.rate = isSentence(text) ? 0.9 : 0.85;
  speechSynthesis.speak(u);
}

/* =========================================================
   ESTADO DA TELA
   ========================================================= */
const clampDay = (t, d) => Math.min(Math.max(d, t.firstDay), t.lastDay);
function initialTrack() {
  return state.lastTrack;
}
const ui = {
  track: initialTrack(),
  day: 1,
  mode: "list",
  hidePt: !state.showPt,
  quizType: "mean",
};
ui.day = currentDay(TRACKS[ui.track]);
// para avisar quando você sobe de dia
const levels = Object.fromEntries(TRACK_KEYS.map((k) => [k, currentDay(TRACKS[k])]));

let cards = null;  // sessão de flashcards
let quiz = null;   // sessão de quiz
let review = null; // sessão de revisão
const view = $("#view");

const T = () => TRACKS[ui.track];
const S = () => state.tracks[ui.track];
const item = (id) => T().byId.get(id);
const itemsOfDay = (d) => T().items.filter((w) => w.day === d);
// O que você não aprendeu nos dias que já passou volta no seu dia atual, até você aprender
const CARRY_MAX = 30;
function carryOver(d) {
  if (d !== currentDay(T())) return [];
  const known = S().known;
  return T().items.filter((w) => w.day < d && !known.has(w.id)).slice(0, CARRY_MAX);
}
// Tudo o que se estuda num dia: o que veio dos dias anteriores + o do próprio dia
const studyItems = (d) => [...carryOver(d), ...itemsOfDay(d)];
const knownInDay = (d) => itemsOfDay(d).filter((w) => S().known.has(w.id)).length;
const totalKnown = () => TRACK_KEYS.reduce((n, k) => n + state.tracks[k].known.size, 0);

/* =========================================================
   CABEÇALHO, DIAS E ABAS
   ========================================================= */
function renderHeader() {
  checkLevelUp();
  const inReview = ui.mode === "review";
  const t = T();
  const n = inReview ? totalKnown() : S().known.size;
  const total = inReview ? TOTAL_ITEMS : t.items.length;
  $("#trackTitle").textContent = inReview ? "Revisão" : t.title;
  $("#trackSub").textContent = inReview
    ? "Reveja o que você já estudou na hora certa, para não esquecer."
    : t.sub;
  $("#knownCount").textContent = n;
  $("#totalCount").textContent = total;
  $("#learnedWord").textContent = inReview ? "itens aprendidos no total" : t.learned;
  $("#knownBar").style.width = `${total ? (n / total) * 100 : 0}%`;
  $("#knownBarWrap").setAttribute("aria-valuenow", n);
  $("#knownBarWrap").setAttribute("aria-valuemax", total);

  const st = streak();
  const studiedToday = state.activity.has(todayISO());
  $("#streak").textContent = st
    ? `🔥 ${st} ${st === 1 ? "dia seguido" : "dias seguidos"}${studiedToday ? "" : ". Estude hoje para não perder!"}`
    : "Estude hoje para começar sua sequência de dias.";
  $("#streak").classList.toggle("is-on", st > 0);

  for (const key of TRACK_KEYS) {
    $(`#count-${key}`).textContent = `${state.tracks[key].known.size}/${TRACKS[key].items.length}`;
  }
  document.querySelectorAll(".tracks button").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.track === ui.track ? "true" : "false");
  });

  const due = dueList().length;
  const badge = $("#reviewBadge");
  badge.hidden = due === 0;
  badge.textContent = due > 99 ? "99+" : due;
  const banner = $("#reviewBanner");
  banner.hidden = due === 0 || inReview;
  $("#reviewBannerText").textContent = `Você tem ${due} ${due === 1 ? "item" : "itens"} para revisar hoje. Revisar é o que faz você não esquecer.`;

  const tw = TRACKS.words;
  $("#startInfo").textContent = `Você começou em ${parseISO(state.startDate).toLocaleDateString("pt-BR")}. `
    + `Sabe ${state.tracks.words.known.size} de ${tw.items.length} palavras: está no Dia ${currentDay(tw)}.`;
}

function renderDays() {
  const t = T();
  const cur = currentDay(t);
  let html = "";
  for (let d = t.firstDay; d <= t.lastDay; d++) {
    const cls = ["day-tile", d === cur && "is-today", d === ui.day && "is-active"].filter(Boolean).join(" ");
    const pct = (knownInDay(d) / itemsOfDay(d).length) * 100;
    const label = d === cur ? "você" : `${knownInDay(d)}/${itemsOfDay(d).length}`;
    html += `<button class="${cls}" data-day="${d}" aria-current="${d === ui.day ? "true" : "false"}" aria-label="Dia ${d}, ${label}">
      <span class="n">${d}</span>
      <span class="d">${label}</span>
      <span class="mini"><span style="width:${pct}%"></span></span>
      ${S().done.has(d) ? '<span class="check" aria-hidden="true">✓</span>' : ""}
    </button>`;
  }
  const strip = $("#days");
  strip.innerHTML = html;
  const active = $(".day-tile.is-active");
  if (active && strip.scrollWidth > strip.clientWidth) {
    strip.scrollTo({ left: active.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2, behavior: "smooth" });
  }
}

function renderDayHead() {
  const t = T();
  const cur = currentDay(t);
  const total = S().known.size;
  const dayItems = itemsOfDay(ui.day);
  const first = dayItems[0].n;
  const last = dayItems[dayItems.length - 1].n;
  let when;
  if (ui.day === cur) when = `É o seu dia atual: você já sabe ${total} ${t.noun} no total.`;
  else if (ui.day > cur) {
    const need = (ui.day - t.firstDay) * t.perDay;
    when = `Você chega aqui quando souber ${need} ${t.noun} (sabe ${total}). Pode adiantar se já conhece algumas.`;
  } else when = "Você já passou deste dia. Bom momento para revisar.";
  const noun = t.noun.charAt(0).toUpperCase() + t.noun.slice(1);
  $("#dayTitle").textContent = `Dia ${ui.day}`;
  $("#dayTheme").textContent = t.themes[ui.day - t.firstDay]
    || (ui.track === "frases" ? "Frases que você adicionou" : ui.track === "ia" ? "Palavras escolhidas pela IA" : "");
  const carry = carryOver(ui.day).length;
  const extra = carry ? ` Mais ${carry} de dias anteriores que você ainda não sabe.` : "";
  $("#dayMeta").textContent = `${noun} ${first} a ${last}. ${when} Neste dia você sabe ${knownInDay(ui.day)} de ${dayItems.length}.${extra}`;
}

function renderModes() {
  document.querySelectorAll(".modes button").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.mode === ui.mode ? "true" : "false");
  });
}

function render() {
  document.body.classList.toggle("is-review", ui.mode === "review");
  // "Minhas palavras" ainda vazia: mostra só o convite para gerar com a IA
  const empty = !T().items.length && ui.mode !== "review";
  document.body.classList.toggle("is-empty", empty);
  if (empty) { renderHeader(); renderModes(); view.innerHTML = IA_EMPTY; return; }
  renderHeader();
  renderDays();
  renderDayHead();
  renderModes();
  if (ui.mode === "list") renderList();
  if (ui.mode === "cards") { if (!cards) startCards(); renderCards(); }
  if (ui.mode === "quiz") { if (!quiz) startQuiz(); renderQuiz(); }
  if (ui.mode === "review") { if (!review) startReview(false); renderReview(); }
}
function refreshProgress() { renderHeader(); if (T().items.length) { renderDays(); renderDayHead(); } }
// Avisa quando o que você sabe faz você subir de dia (roda a cada atualização do cabeçalho)
function checkLevelUp() {
  for (const k of TRACK_KEYS) {
    const t = TRACKS[k];
    const cur = currentDay(t);
    if (cur > levels[k] && t.items.length) toast(`Você chegou ao Dia ${cur} ${k === "words" ? "das palavras" : `de ${t.name}`}! 🎉`);
    levels[k] = cur;
  }
}

/* =========================================================
   MODO LISTA
   ========================================================= */
const PHRASAL_NOTE = `
  <div class="note">
    <p><b>O que é phrasal verb?</b> É um verbo junto com uma partícula (up, out, on, off...) que, juntos, ganham outro sentido.</p>
    <p><span lang="en">look</span> = olhar, mas <span lang="en">look for</span> = procurar. <span lang="en">give</span> = dar, mas <span lang="en">give up</span> = desistir.</p>
  </div>`;
const FRASES_NOTE = `
  <div class="note">
    <p><b>Agora é hora de juntar tudo.</b> Estas frases usam as palavras e os phrasal verbs dos Dias 1 a 10. Cada uma vem com uma resposta, para você treinar a conversa dos dois lados.</p>
    <p>Quer treinar outras frases? <button class="link-btn inline" data-action="open-mine">Adicione as suas</button>. Elas entram depois do Dia 30.</p>
  </div>`;

const IA_BUTTON = `<button class="btn primary ai-btn" data-action="ai-words">Gerar 10 palavras novas com IA</button>`;
const IA_EMPTY = `
  <div class="result">
    <h3>Palavras novas escolhidas para você</h3>
    <p>A IA olha as palavras que você marcou como <b>Já sei</b> e sugere 10 palavras novas, com tradução e exemplo. Elas ficam salvas neste aparelho.</p>
    <div class="answer-row">${IA_BUTTON}</div>
  </div>`;
const IA_NOTE = `
  <div class="note">
    <p><b>Palavras escolhidas pela IA</b> com base no que você já sabe. Quer mais? Gere outras 10 quando quiser.</p>
    <div class="answer-row">${IA_BUTTON}</div>
  </div>`;

function usesHTML(w) {
  const { words, phrasal } = wordsUsed(w.en);
  if (!words.length && !phrasal.length) return "";
  const chips = [
    ...phrasal.map((p) => `<span class="uchip pv" lang="en">${esc(p.en)}</span>`),
    ...words.slice(0, 10).map((x) => `<span class="uchip" lang="en">${esc(x.en)}</span>`),
  ].join("");
  return `<p class="uses"><span class="uses-label">Você já viu:</span> ${chips}</p>`;
}

function renderList() {
  const t = T();
  const known = S().known;
  // o que você ainda não sabe fica em cima; o que já marcou vai para baixo
  const words = [...itemsOfDay(ui.day)].sort((a, b) => known.has(a.id) - known.has(b.id));
  const carry = carryOver(ui.day);
  const listCls = `wordlist ${ui.hidePt ? "hide-pt" : ""} ${t.sentence ? "is-sentences" : ""}`;
  const itemLI = (w) => `
        <li class="word ${known.has(w.id) ? "is-known" : ""}" data-id="${w.id}">
          ${speakBtn(w.en)}
          <div class="word-text" ${ui.hidePt ? `data-reveal role="button" tabindex="0" aria-expanded="false" aria-label="Ver a tradução de ${esc(w.en)}"` : ""}>
            <span class="en" lang="en">${esc(w.en)}</span>
            <span class="pt">${esc(w.pt)}</span>
          </div>
          <label class="knew"><input type="checkbox" data-known="${w.id}" ${known.has(w.id) ? "checked" : ""}> Já sei</label>
          <div class="ex" ${ui.hidePt ? "data-reveal" : ""}>
            ${w.exEn ? `
            ${t.sentence ? '<span class="ex-label">Uma resposta:</span>' : ""}
            <span class="ex-en" lang="en">${esc(w.exEn)}</span>
            <span class="ex-pt">${esc(w.exPt)}</span>` : ""}
            ${t.sentence ? usesHTML(w) : ""}
          </div>
          ${ui.track === "ia" ? `<button class="link-btn remove-word" data-remove-word="${w.id}" aria-label="Remover ${esc(w.en)}">Remover</button>` : ""}
        </li>`;
  const note = { phrasal: PHRASAL_NOTE, frases: FRASES_NOTE, ia: IA_NOTE }[ui.track] || "";
  const noun = ui.track === "phrasal" ? "um phrasal verb" : ui.track === "frases" ? "uma frase" : "uma palavra";
  view.innerHTML = `
    ${note}
    <div class="list-tools">
      <label class="toggle"><input type="checkbox" id="showPt" ${ui.hidePt ? "" : "checked"}> Mostrar todas as traduções</label>
      ${ui.hidePt ? `<p class="list-hint">Tente lembrar o significado. Toque em ${noun} para conferir e marque <b>Já sei</b> se acertou.</p>` : ""}
      <p class="list-hint small">Suas marcações ficam salvas neste aparelho.</p>
    </div>
    ${carry.length ? `
      <h3 class="list-section">Ainda não sabe, de dias anteriores <span>(${carry.length})</span></h3>
      <ul class="${listCls} is-carry">${carry.map(itemLI).join("")}</ul>
      <h3 class="list-section">${t.noun.charAt(0).toUpperCase() + t.noun.slice(1)} do Dia ${ui.day}</h3>` : ""}
    <ul class="${listCls}">${words.map(itemLI).join("")}</ul>`;
}

// Depois de marcar "Já sei", o item desce para o fim da lista (e sobe de volta se desmarcar)
function moveWord(li, isKnown) {
  setTimeout(() => {
    const list = li.parentElement;
    if (!list || li.classList.contains("is-known") !== isKnown) return;
    if (isKnown) list.appendChild(li);
    else list.insertBefore(li, [...list.children].find((x) => x !== li && x.classList.contains("is-known")) || null);
    li.classList.add("flash");
    setTimeout(() => li.classList.remove("flash"), 1200);
  }, 350);
}

function toggleReveal(word) {
  if (!word) return;
  const open = word.classList.toggle("reveal");
  const btn = word.querySelector(".word-text");
  if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
}

/* =========================================================
   CARTAS (usadas pelos Flashcards e pela Revisão)
   ========================================================= */
function cardHTML(w, flipped, { tag = "", sentence = false, againLabel = "Não sei", goodLabel = "Já sei", info = "" } = {}) {
  const long = sentence || w.en.length > 9;
  return `
    <div class="stage">
      <p class="stage-info">${info}</p>
      <div class="card-wrap">
        <button class="card ${flipped ? "flipped" : ""}" id="card" aria-label="Virar a carta">
          <div class="face front">
            ${tag ? `<span class="card-tag">${esc(tag)}</span>` : ""}
            <span class="big-word ${sentence ? "sentence" : long ? "long" : ""}" lang="en"><span class="hl">${esc(w.en)}</span></span>
            <span class="hint">Toque na carta para ver a tradução</span>
          </div>
          <div class="face back">
            ${tag ? `<span class="card-tag">${esc(tag)}</span>` : ""}
            <span class="pt-big ${sentence ? "sentence" : ""}">${esc(w.pt)}</span>
            <span class="en-small" lang="en">${esc(w.en)}</span>
            ${w.exEn ? `<p class="ex">${sentence ? '<span class="ex-label">Uma resposta:</span>' : ""}<span lang="en">${esc(w.exEn)}</span><span class="ex-pt">${esc(w.exPt)}</span></p>` : ""}
            <span class="hint touch-only">Arraste para a direita se sabia, para a esquerda se não</span>
          </div>
        </button>
      </div>
      <div class="answer-row">
        ${speakBtn(w.en)}
        <button class="btn again" data-answer="0" ${flipped ? "" : "disabled"}>${againLabel}</button>
        <button class="btn good" data-answer="1" ${flipped ? "" : "disabled"}>${goodLabel}</button>
      </div>
      <p class="kbd-help">Teclado: <kbd>espaço</kbd> vira, <kbd>←</kbd> ${againLabel.toLowerCase()}, <kbd>→</kbd> ${goodLabel.toLowerCase()}</p>
      <button class="link-btn" data-action="end-deck">Encerrar agora</button>
    </div>`;
}
// sessão de cartas ativa (flashcards ou revisão)
const activeDeck = () => (ui.mode === "review" ? review : ui.mode === "cards" ? cards : null);

function flipCard() {
  const deck = activeDeck();
  if (!deck) return;
  deck.flipped = !deck.flipped;
  const el = $("#card");
  if (el) el.classList.toggle("flipped", deck.flipped);
  document.querySelectorAll("[data-answer]").forEach((b) => { b.disabled = !deck.flipped; });
}
function answerActive(knew) {
  if (ui.mode === "review") answerReview(knew);
  else if (ui.mode === "cards") answerCard(knew);
}

/* =========================================================
   MODO FLASHCARDS
   ========================================================= */
function startCards() {
  const known = S().known;
  const ids = studyItems(ui.day).map((w) => w.id);
  // primeiro o que você ainda não sabe
  const deck = [...shuffle(ids.filter((id) => !known.has(id))), ...shuffle(ids.filter((id) => known.has(id)))];
  cards = { deck, pos: 0, flipped: false, got: new Set() };
}

function renderCards() {
  if (cards.pos >= cards.deck.length) return renderCardsEnd();
  const w = item(cards.deck[cards.pos]);
  const left = cards.deck.length - cards.pos;
  view.innerHTML = cardHTML(w, cards.flipped, {
    sentence: T().sentence,
    info: `Faltam ${left} ${left === 1 ? "carta" : "cartas"}. Nesta rodada você já sabe ${cards.got.size}.`,
  });
  if (!cards.flipped) speak(w.en);
}

function answerCard(knew) {
  const id = cards.deck[cards.pos];
  record(ui.track, id, knew);
  if (knew) cards.got.add(id);
  else { cards.got.delete(id); cards.deck.push(id); } // volta para o fim do monte
  cards.pos++;
  cards.flipped = false;
  refreshProgress();
  renderCards();
}

function renderCardsEnd() {
  const total = itemsOfDay(ui.day).length;
  const k = knownInDay(ui.day);
  view.innerHTML = `
    <div class="result">
      <p class="score">${k}<small> / ${total}</small></p>
      <h3>${k === total ? "Dia dominado!" : "Rodada terminada"}</h3>
      <p>${k === total ? "Você marcou tudo deste dia como aprendido. Agora confirme no quiz." : "Repita os flashcards até marcar tudo, depois teste no quiz."}</p>
      <div class="answer-row">
        <button class="btn" data-action="restart-cards">Estudar de novo</button>
        <button class="btn primary" data-action="go-quiz">Fazer o quiz</button>
      </div>
    </div>`;
}

/* =========================================================
   MODO QUIZ
   ========================================================= */
const QUIZ_TYPES = [
  { key: "mean", label: "Significado" },
  { key: "en", label: "Em inglês" },
  { key: "listen", label: "Ouvir" },
  { key: "write", label: "Escrever" },
  { key: "build", label: "Montar a frase", sentenceOnly: true },
];
const quizTypes = () => QUIZ_TYPES.filter((q) => !q.sentenceOnly || T().sentence);
function ensureQuizType() {
  if (!quizTypes().some((q) => q.key === ui.quizType)) ui.quizType = "mean";
}
function makeTokens(sentence) {
  const base = sentence.split(" ").map((w, i) => ({ w, i }));
  let tokens = shuffle(base);
  for (let tries = 0; tries < 6 && base.length > 2 && tokens.every((t, i) => t.i === i); tries++) tokens = shuffle(base);
  return tokens;
}

function startQuiz(onlyIds) {
  ensureQuizType();
  const dayIds = studyItems(ui.day).map((w) => w.id);
  const ids = shuffle(onlyIds || dayIds);
  quiz = {
    retry: Boolean(onlyIds),
    pos: 0,
    score: 0,
    wrong: [],
    qs: ids.map((id) => ({
      id,
      options: shuffle([id, ...shuffle(dayIds.filter((x) => x !== id)).slice(0, 3)]),
      tokens: T().sentence ? makeTokens(item(id).en) : null,
      built: [],
      chosen: null,
      typed: "",
      done: false,
      ok: false,
      typo: false,
    })),
  };
}

function optionsHTML(q, labelOf, labelLang) {
  return `<div class="options">
    ${q.options.map((id) => {
      let cls = "option";
      if (q.done) {
        if (id === q.id) cls += " correct";
        else if (id === q.chosen) cls += " wrong";
      }
      return `<button class="${cls}" data-opt="${id}" ${q.done ? "disabled" : ""} ${labelLang ? `lang="${labelLang}"` : ""}>${esc(labelOf(id))}</button>`;
    }).join("")}
  </div>`;
}

function renderQuiz() {
  ensureQuizType();
  const typeBar = `
    <div class="quiz-types" role="group" aria-label="Tipo de quiz">
      ${quizTypes().map((q) => `<button class="chip" data-qtype="${q.key}" aria-pressed="${ui.quizType === q.key}">${q.label}</button>`).join("")}
    </div>`;
  if (quiz.pos >= quiz.qs.length) { view.innerHTML = typeBar + quizEndHTML(); return; }

  const q = quiz.qs[quiz.pos];
  const w = item(q.id);
  const type = ui.quizType;
  const sentence = T().sentence;
  const promptCls = `prompt ${sentence ? "sentence" : ""}`;
  let ask = "";
  let prompt = "";
  let body = "";

  if (type === "mean") {
    ask = "O que significa?";
    prompt = `<p class="${promptCls}" lang="en">${esc(w.en)}</p>${speakBtn(w.en)}`;
    body = optionsHTML(q, (id) => item(id).pt);
  } else if (type === "en") {
    ask = "Como se diz em inglês?";
    prompt = `<p class="${promptCls}">${esc(w.pt)}</p>`;
    body = optionsHTML(q, (id) => item(id).en, "en");
  } else if (type === "listen") {
    ask = "Ouça e escolha o significado.";
    prompt = `<button class="listen-btn" data-say="${esc(w.en)}">${SPEAKER}<span>Ouvir de novo</span></button>`;
    body = optionsHTML(q, (id) => item(id).pt);
  } else if (type === "write") {
    ask = "Escreva em inglês.";
    prompt = `<p class="${promptCls}">${esc(w.pt)}</p>`;
    body = `
      <form class="write-form" id="writeForm">
        <input id="writeInput" type="text" value="${esc(q.typed)}" placeholder="Digite em inglês" ${q.done ? "disabled" : ""}
          autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" lang="en" aria-label="Sua resposta em inglês">
        ${q.done ? "" : '<button class="btn primary" type="submit">Conferir</button>'}
      </form>`;
  } else if (type === "build") {
    ask = "Monte a frase em inglês.";
    prompt = `<p class="${promptCls}">${esc(w.pt)}</p>`;
    const line = q.built.length
      ? q.built.map((ti, pos) => `<button class="tok" data-unbuild="${pos}" ${q.done ? "disabled" : ""} lang="en">${esc(q.tokens[ti].w)}</button>`).join("")
      : '<span class="build-empty">Toque nas palavras abaixo, na ordem certa.</span>';
    const pool = q.tokens.map((t, ti) => (q.built.includes(ti)
      ? `<span class="tok ghost" aria-hidden="true">${esc(t.w)}</span>`
      : `<button class="tok" data-build="${ti}" ${q.done ? "disabled" : ""} lang="en">${esc(t.w)}</button>`)).join("");
    body = `
      <div class="build-line ${q.done ? (q.ok ? "is-ok" : "is-wrong") : ""}">${line}</div>
      ${q.done ? "" : `<div class="build-pool">${pool}</div>
      <div class="build-actions">
        <button class="btn" data-action="build-clear" ${q.built.length ? "" : "disabled"}>Limpar</button>
        <button class="btn primary" data-action="build-check" ${q.built.length === q.tokens.length ? "" : "disabled"}>Conferir</button>
      </div>`}`;
  }

  let feedback = "";
  if (q.done) {
    let title;
    if (type === "listen") title = q.ok ? `Certo! Era: ${w.en}` : `Era: ${w.en} (${w.pt})`;
    else if (type === "write" || type === "build") {
      title = q.ok ? (q.typo ? `Certo! Só confira a escrita: ${w.en}` : "Certo!") : `Resposta certa: ${w.en}`;
    } else title = q.ok ? "Certo!" : `Resposta certa: ${type === "en" ? w.en : w.pt}`;
    feedback = `
      <div class="feedback ${q.ok ? "" : "is-wrong"}" role="status">
        <p><b>${esc(title)}</b></p>
        ${w.exEn ? `${sentence ? '<p class="ex-label">Uma resposta:</p>' : ""}
        <p lang="en">${esc(w.exEn)}</p>
        <p class="ex-pt">${esc(w.exPt)}</p>` : ""}
      </div>
      <div class="next-row"><button class="btn primary" data-action="next-q" id="nextQ">${quiz.pos + 1 === quiz.qs.length ? "Ver resultado" : "Próxima"}</button></div>`;
  }

  view.innerHTML = `
    ${typeBar}
    <div class="q-progress" aria-hidden="true"><span style="width:${(quiz.pos / quiz.qs.length) * 100}%"></span></div>
    <div class="question">
      <p class="ask">Pergunta ${quiz.pos + 1} de ${quiz.qs.length}. ${ask}</p>
      <div class="prompt-row">${prompt}</div>
    </div>
    ${body}
    ${feedback}`;

  if (q.done) {
    const next = $("#nextQ");
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: "nearest", behavior: "smooth" });
  } else if (type === "listen") {
    speak(w.en);
  } else if (type === "write") {
    $("#writeInput").focus({ preventScroll: true });
  }
}

function answerQuiz(ok, extra = {}) {
  const q = quiz.qs[quiz.pos];
  if (q.done) return;
  Object.assign(q, extra, { done: true, ok });
  if (ok) quiz.score++; else quiz.wrong.push(q.id);
  record(ui.track, q.id, ok);
  speak(item(q.id).en);
  refreshProgress();
  renderQuiz();
}

function nextQuestion() {
  quiz.pos++;
  if (quiz.pos >= quiz.qs.length) finishQuiz();
  renderQuiz();
}

function finishQuiz() {
  if (quiz.retry) return;
  const s = S();
  s.best[ui.day] = Math.max(s.best[ui.day] || 0, quiz.score);
  if (quiz.score / quiz.qs.length >= PASS_RATE) s.done.add(ui.day);
  save();
  renderDays();
}

function quizEndHTML() {
  const t = T();
  const total = quiz.qs.length;
  const passed = !quiz.retry && quiz.score / total >= PASS_RATE;
  const best = S().best[ui.day];
  const isLastDayOfTrack = ui.day >= t.lastDay;
  const isEnd = isLastDayOfTrack && ui.track === "frases";
  let title, text;
  if (quiz.retry) {
    title = quiz.score === total ? "Erros corrigidos!" : "Revisão terminada";
    text = "Faça o quiz completo para marcar o dia como concluído.";
  } else if (passed) {
    title = isEnd ? `Você completou os ${TOTAL_DAYS} dias!` : `Dia ${ui.day} concluído!`;
    text = isEnd
      ? "Agora o mais importante: abra a Revisão todos os dias para não esquecer nada."
      : `Sua melhor nota neste dia é ${best} de ${total}. O que você acertou vai aparecer na Revisão nos próximos dias.`;
  } else {
    title = "Quase lá";
    text = `Acerte pelo menos ${Math.ceil(total * PASS_RATE)} de ${total} para concluir o dia. Revise os erros abaixo e tente de novo.`;
  }
  const missed = quiz.wrong.length ? `
    <ul class="missed-list">
      ${[...new Set(quiz.wrong)].map((id) => `<li><b lang="en">${esc(item(id).en)}</b><span>${esc(item(id).pt)}</span></li>`).join("")}
    </ul>` : "";
  let nextBtn = "";
  if (passed && !isEnd && !(ui.track === "ia" && isLastDayOfTrack)) {
    if (ui.track === "words") nextBtn += '<button class="btn" data-action="go-phrasal">Estudar os phrasal verbs do dia</button>';
    nextBtn += `<button class="btn primary" data-action="next-day">${isLastDayOfTrack ? "Começar as frases (Dia 11)" : "Ir para o próximo dia"}</button>`;
  }
  if (isEnd && passed) nextBtn = '<button class="btn primary" data-goto-review>Abrir a Revisão</button>';
  return `
    <div class="result">
      <p class="score">${quiz.score}<small> / ${total}</small></p>
      <h3>${title}</h3>
      <p>${text}</p>
      ${missed}
      <div class="answer-row">
        ${quiz.wrong.length ? '<button class="btn" data-action="retry-wrong">Refazer só os erros</button>' : ""}
        <button class="btn" data-action="restart-quiz">Refazer o quiz</button>
        ${nextBtn}
      </div>
    </div>`;
}

/* =========================================================
   MODO REVISÃO (revisão espaçada + treino livre)
   ========================================================= */
function startReview(practice) {
  let deck;
  if (practice) {
    deck = shuffle(Object.keys(state.srs).map(parseKey).filter(Boolean)).slice(0, PRACTICE_SIZE);
  } else {
    deck = dueList().slice(0, REVIEW_MAX);
  }
  review = { practice, deck, pos: 0, flipped: false, firstTry: 0, seen: new Set(), total: deck.length };
}

function reviewInfoText() {
  const left = review.deck.length - review.pos;
  const kind = review.practice ? "Treino livre" : "Revisão de hoje";
  return `${kind}. Faltam ${left} ${left === 1 ? "carta" : "cartas"}.`;
}

function renderReview() {
  const studied = Object.keys(state.srs).length;
  if (review.total === 0) {
    if (!studied) {
      view.innerHTML = `
        <div class="result">
          <h3>Nada para revisar ainda</h3>
          <p>Tudo o que você estudar na Lista, nos Flashcards e no Quiz vai aparecer aqui para revisar em 1, 3, 7, 14 e 30 dias. É isso que faz você não esquecer.</p>
          <div class="answer-row"><button class="btn primary" data-action="go-study">Começar a estudar</button></div>
        </div>`;
      return;
    }
    const next = nextReviewDate();
    const inDays = next ? daysBetween(todayISO(), next) : null;
    const when = inDays === 1 ? "amanhã" : inDays ? `em ${inDays} dias` : "";
    view.innerHTML = `
      <div class="result">
        <p class="score">✓</p>
        <h3>Tudo revisado por hoje!</h3>
        <p>${when ? `A próxima revisão é ${when}. ` : ""}Você tem ${studied} ${studied === 1 ? "item" : "itens"} na sua memória. Se quiser treinar mais, faça um treino livre com itens aleatórios.</p>
        <div class="answer-row">
          <button class="btn" data-action="go-study">Voltar a estudar</button>
          <button class="btn primary" data-action="practice">Treino livre</button>
        </div>
      </div>`;
    return;
  }
  if (review.pos >= review.deck.length) {
    view.innerHTML = `
      <div class="result">
        <p class="score">${review.firstTry}<small> / ${review.total}</small></p>
        <h3>${review.practice ? "Treino terminado!" : "Revisão de hoje concluída!"}</h3>
        <p>Você lembrou de ${review.firstTry} de ${review.total} logo de primeira. O que você esqueceu volta amanhã, e o que lembrou só aparece de novo daqui a alguns dias.</p>
        <div class="answer-row">
          <button class="btn" data-action="go-study">Voltar a estudar</button>
          <button class="btn primary" data-action="practice">Treino livre</button>
        </div>
      </div>`;
    return;
  }
  const c = review.deck[review.pos];
  const tr = TRACKS[c.track];
  const w = tr.byId.get(c.id);
  view.innerHTML = cardHTML(w, review.flipped, {
    tag: `${tr.tag}, Dia ${w.day}`,
    sentence: tr.sentence,
    againLabel: "Não lembrei",
    goodLabel: "Lembrei",
    info: reviewInfoText(),
  });
  if (!review.flipped) speak(w.en);
}

function answerReview(ok) {
  const c = review.deck[review.pos];
  const k = skey(c.track, c.id);
  if (!review.seen.has(k)) { review.seen.add(k); if (ok) review.firstTry++; }
  if (review.practice && ok) {
    // treino livre não adianta a próxima revisão, só registra que você estudou
    state.tracks[c.track].known.add(c.id);
    markActivity();
    save();
  } else {
    record(c.track, c.id, ok);
  }
  if (!ok) review.deck.push(c); // aparece de novo no fim desta sessão
  review.pos++;
  review.flipped = false;
  renderHeader();
  renderReview();
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
const isPhone = () => window.matchMedia("(max-width: 719px)").matches;
function scrollToContent(force) {
  const target = ui.mode === "review" ? document.querySelector(".top") : document.querySelector(".day-head");
  if (!target) return;
  const top = target.getBoundingClientRect().top;
  if (top < 0 || (force && isPhone() && top > 8)) target.scrollIntoView({ behavior: "smooth", block: "start" });
}
function resetSessions() { cards = null; quiz = null; }
function setDay(d) {
  ui.day = clampDay(T(), d);
  resetSessions();
  if (ui.mode === "review") ui.mode = "list";
  render();
  scrollToContent();
}
function setMode(m) {
  ui.mode = m;
  if (m === "review") review = null; // sempre recalcula o que venceu
  render();
  scrollToContent(true);
}
function setTrack(key, day) {
  if (!TRACKS[key]) return;
  const changed = key !== ui.track;
  ui.track = key;
  state.lastTrack = key;
  save();
  const t = TRACKS[key];
  if (day !== undefined) ui.day = clampDay(t, day);
  // cada trilha tem o seu progresso: ao trocar, vai para o seu dia atual nela
  else if (changed) ui.day = currentDay(t);
  if (ui.mode === "review") ui.mode = "list";
  resetSessions();
  render();
}

/* =========================================================
   BUSCA
   ========================================================= */
const buildSearchIndex = () => TRACK_KEYS.flatMap((k) => TRACKS[k].items.map((w) => ({
  track: k, w, hay: stripAccents(`${w.en} ${w.pt}`.toLowerCase()),
})));
let SEARCH_INDEX = buildSearchIndex();
function openSearch() {
  $("#search").hidden = false;
  document.body.classList.add("no-scroll");
  const input = $("#searchInput");
  input.value = "";
  renderSearch("");
  setTimeout(() => input.focus(), 30);
}
function closeSearch() {
  $("#search").hidden = true;
  document.body.classList.remove("no-scroll");
  $("#searchOpen").focus({ preventScroll: true });
}
function renderSearch(q) {
  const list = $("#searchResults");
  const query = stripAccents(q.trim().toLowerCase());
  if (query.length < 2) {
    list.innerHTML = '<li class="search-empty">Digite pelo menos 2 letras. Dá para buscar em inglês ou em português.</li>';
    return;
  }
  const found = SEARCH_INDEX.filter((x) => x.hay.includes(query));
  // resultados que começam com o texto buscado vêm primeiro
  found.sort((a, b) => (b.w.en.toLowerCase().startsWith(query) - a.w.en.toLowerCase().startsWith(query)));
  if (!found.length) {
    list.innerHTML = `<li class="search-empty">Nada encontrado para "${esc(q)}".</li>`;
    return;
  }
  list.innerHTML = found.slice(0, 40).map((x) => `
    <li><button class="search-item" data-go="${x.track}:${x.w.id}">
      <span class="s-en" lang="en">${esc(x.w.en)}</span>
      <span class="s-pt">${esc(x.w.pt)}</span>
      <span class="s-meta">Dia ${x.w.day}, ${TRACKS[x.track].name}${state.tracks[x.track].known.has(x.w.id) ? ", já sei" : ""}</span>
    </button></li>`).join("") + (found.length > 40 ? `<li class="search-empty">Mostrando 40 de ${found.length}. Digite mais para filtrar.</li>` : "");
}
function goToItem(track, id) {
  closeSearch();
  const w = TRACKS[track].byId.get(id);
  if (!w) return;
  ui.mode = "list";
  setTrack(track, w.day);
  const li = view.querySelector(`.word[data-id="${id}"]`);
  if (li) {
    if (ui.hidePt) toggleReveal(li);
    li.classList.add("flash");
    li.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => li.classList.remove("flash"), 1800);
  }
}

/* =========================================================
   MINHAS FRASES (adicionar e apagar, salvas no banco do navegador)
   ========================================================= */
function openMine() {
  $("#mine").hidden = false;
  document.body.classList.add("no-scroll");
  renderMine();
  setTimeout(() => $("#mineForm").elements.en.focus(), 30);
}
function closeMine() {
  $("#mine").hidden = true;
  document.body.classList.remove("no-scroll");
}
function renderMine() {
  const mine = TRACKS.frases.items.filter((w) => w.mine);
  $("#mineCount").textContent = !FraseDB.ok
    ? "Este navegador não deixou abrir o banco de dados, então não dá para adicionar frases aqui."
    : mine.length
      ? `Você adicionou ${mine.length} ${mine.length === 1 ? "frase" : "frases"}. Elas ficam salvas neste aparelho e vão junto no backup.`
      : "Você ainda não adicionou nenhuma frase. Elas entram depois do Dia 30, 10 por dia.";
  $("#mineList").innerHTML = mine.slice().reverse().map((w) => `
    <li class="mine-item">
      <div>
        <span class="s-en" lang="en">${esc(w.en)}</span>
        <span class="s-pt">${esc(w.pt)}</span>
        ${w.exEn ? `<span class="s-meta" lang="en">${esc(w.exEn)}${w.exPt ? ` <span lang="pt-BR">(${esc(w.exPt)})</span>` : ""}</span>` : ""}
        <span class="s-meta">Dia ${w.day}</span>
      </div>
      <button class="link-btn" data-del="${w.id}" aria-label="Apagar a frase ${esc(w.en)}">Apagar</button>
    </li>`).join("");
}
// Lê o banco de novo e atualiza o app todo
async function reloadDbTrack(key) {
  setDbTrack(key, await (key === "frases" ? FraseDB : PalavraDB).all());
  SEARCH_INDEX = buildSearchIndex();
  if (ui.track === key) { ui.day = clampDay(T(), ui.day); resetSessions(); }
  review = null;
  render();
  renderMine();
}
const reloadFrases = () => reloadDbTrack("frases");
async function addMine(form) {
  if (!FraseDB.ok) { toast("Não dá para salvar frases neste navegador."); return; }
  const f = Object.fromEntries(["en", "pt", "exEn", "exPt"].map((k) => [k, form.elements[k].value.trim()]));
  if (!f.en || !f.pt) return;
  if (TRACKS.frases.items.some((w) => normalizeAnswer(w.en) === normalizeAnswer(f.en))) {
    toast("Essa frase já está no app.");
    return;
  }
  try {
    const rec = await FraseDB.add(f);
    await reloadFrases();
    form.reset();
    form.elements.en.focus();
    toast(`Frase adicionada no Dia ${TRACKS.frases.byId.get(rec.id).day}.`);
  } catch (e) {
    toast("Não foi possível salvar a frase.");
  }
}
async function removeMine(id) {
  const w = TRACKS.frases.byId.get(id);
  if (!w || !confirm(`Apagar a frase "${w.en}"?`)) return;
  try {
    await FraseDB.remove(id);
    state.tracks.frases.known.delete(id);
    delete state.srs[skey("frases", id)];
    save();
    await reloadFrases();
    toast("Frase apagada.");
  } catch (e) {
    toast("Não foi possível apagar a frase.");
  }
}

/* =========================================================
   IA (OpenRouter, modelos grátis, pela função da Vercel em api/sugerir.js)
   Manda o que você já sabe e recebe 10 palavras ou frases novas.
   ========================================================= */
const AI_KEY = "ingles300-senha-ia";
let aiBusy = false;
const knownEn = (key) => TRACKS[key].items.filter((w) => state.tracks[key].known.has(w.id)).map((w) => w.en);

async function callAI(tipo) {
  const body = {
    tipo,
    conhecidas: [...knownEn("words"), ...knownEn("phrasal"), ...knownEn("ia")],
    existentes: tipo === "frases"
      ? TRACKS.frases.items.map((w) => w.en)
      : [...TRACKS.words.items, ...TRACKS.phrasal.items, ...TRACKS.ia.items].map((w) => w.en),
  };
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let senha = "";
    try { senha = localStorage.getItem(AI_KEY) || ""; } catch (e) { /* ignora */ }
    const res = await fetch("api/sugerir", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-App-Senha": senha },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      const nova = prompt("Digite a senha da IA (a mesma que está em APP_SENHA na Vercel):");
      if (!nova) throw new Error("Sem senha, não dá para usar a IA.");
      try { localStorage.setItem(AI_KEY, nova); } catch (e) { /* ignora */ }
      continue;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || "A IA não respondeu. Tente de novo.");
    return data.itens || [];
  }
  throw new Error("Senha errada.");
}

// Gera palavras (aba Minhas palavras) ou frases (tela Minhas frases)
async function generateWithAI(tipo, btn) {
  if (aiBusy) return;
  if (!FraseDB.ok) { toast("Este navegador não deixou abrir o banco de dados."); return; }
  if (!navigator.onLine) { toast("Sem internet. A IA precisa de conexão."); return; }
  aiBusy = true;
  const label = btn ? btn.textContent : "";
  if (btn) { btn.disabled = true; btn.textContent = "A IA está pensando..."; }
  try {
    const track = tipo === "frases" ? "frases" : "ia";
    const seen = new Set([...TRACK_KEYS.flatMap((k) => TRACKS[k].items.map((w) => normalizeAnswer(w.en)))]);
    const novos = (await callAI(tipo)).filter((f) => {
      const k = normalizeAnswer(String(f.en || ""));
      if (!k || !f.pt || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!novos.length) { toast("A IA não trouxe nada novo. Tente de novo."); return; }
    const recs = await (track === "frases" ? FraseDB : PalavraDB).addMany(novos);
    await reloadDbTrack(track);
    const day = TRACKS[track].byId.get(recs[0].id).day;
    if (track === "ia") setTrack("ia", day);
    toast(`${recs.length} ${tipo === "frases" ? "frases novas" : "palavras novas"} no Dia ${day}.`);
  } catch (e) {
    toast(e.message || "Não foi possível falar com a IA.");
  } finally {
    aiBusy = false;
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = label; }
  }
}

async function removeWord(id) {
  const w = TRACKS.ia.byId.get(id);
  if (!w || !confirm(`Remover "${w.en}" das suas palavras?`)) return;
  try {
    await PalavraDB.remove(id);
    state.tracks.ia.known.delete(id);
    delete state.srs[skey("ia", id)];
    save();
    await reloadDbTrack("ia");
  } catch (e) {
    toast("Não foi possível remover a palavra.");
  }
}

/* =========================================================
   BACKUP
   ========================================================= */
function exportBackup() {
  save();
  const data = serialize();
  // as frases que você adicionou e as palavras da IA vão junto no arquivo
  const plain = ({ id, en, pt, exEn, exPt }) => ({ id, en, pt, exEn, exPt });
  data.minhasFrases = TRACKS.frases.items.filter((w) => w.mine).map(plain);
  data.minhasPalavras = TRACKS.ia.items.map(plain);
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ingles-30-dias-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Backup baixado. Guarde o arquivo ou mande para você mesmo.");
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    let data;
    try { data = JSON.parse(reader.result); } catch (e) { data = null; }
    if (!data || typeof data !== "object" || !data.tracks || typeof data.tracks !== "object") {
      toast("Esse arquivo não é um backup deste app.");
      return;
    }
    if (!confirm("Isso substitui o seu progresso atual pelo do backup. Continuar?")) return;
    try {
      if (Array.isArray(data.minhasFrases) && FraseDB.ok) await FraseDB.replaceMine(data.minhasFrases);
      if (Array.isArray(data.minhasPalavras) && FraseDB.ok) await PalavraDB.replaceMine(data.minhasPalavras);
      delete data.minhasFrases;
      delete data.minhasPalavras;
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      location.reload();
    } catch (e) {
      toast("Não foi possível salvar o backup neste navegador.");
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   EVENTOS
   ========================================================= */
document.querySelector(".tracks").addEventListener("click", (e) => {
  const b = e.target.closest("[data-track]");
  if (b) setTrack(b.dataset.track);
});
$("#days").addEventListener("click", (e) => {
  const b = e.target.closest("[data-day]");
  if (b) setDay(Number(b.dataset.day));
});
document.querySelector(".modes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (b) setMode(b.dataset.mode);
});
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-goto-review]")) setMode("review");
});

view.addEventListener("click", (e) => {
  const say = e.target.closest("[data-say]");
  if (say) { e.stopPropagation(); speak(say.dataset.say); return; }

  const rev = e.target.closest("[data-reveal]");
  if (rev) { toggleReveal(rev.closest(".word")); return; }

  if (e.target.closest("#card")) { if (!suppressClick) flipCard(); return; }

  const ans = e.target.closest("[data-answer]");
  if (ans && !ans.disabled) { answerActive(ans.dataset.answer === "1"); return; }

  const opt = e.target.closest("[data-opt]");
  if (opt && !opt.disabled) {
    const q = quiz.qs[quiz.pos];
    const id = Number(opt.dataset.opt);
    answerQuiz(id === q.id, { chosen: id });
    return;
  }

  const qt = e.target.closest("[data-qtype]");
  if (qt) { ui.quizType = qt.dataset.qtype; startQuiz(); renderQuiz(); return; }

  const bld = e.target.closest("[data-build]");
  if (bld && !bld.disabled) { quiz.qs[quiz.pos].built.push(Number(bld.dataset.build)); renderQuiz(); return; }
  const unb = e.target.closest("[data-unbuild]");
  if (unb && !unb.disabled) { quiz.qs[quiz.pos].built.splice(Number(unb.dataset.unbuild), 1); renderQuiz(); return; }

  const rm = e.target.closest("[data-remove-word]");
  if (rm) { removeWord(Number(rm.dataset.removeWord)); return; }

  const act = e.target.closest("[data-action]");
  if (!act || act.disabled) return;
  switch (act.dataset.action) {
    case "end-deck": {
      const deck = activeDeck();
      if (deck) { deck.pos = deck.deck.length; ui.mode === "review" ? renderReview() : renderCards(); }
      break;
    }
    case "restart-cards": startCards(); renderCards(); break;
    case "go-quiz": quiz = null; setMode("quiz"); break;
    case "next-q": nextQuestion(); break;
    case "retry-wrong": startQuiz([...new Set(quiz.wrong)]); renderQuiz(); break;
    case "restart-quiz": startQuiz(); renderQuiz(); break;
    case "next-day":
      if (ui.day < T().lastDay) setDay(ui.day + 1);
      else { ui.mode = "list"; setTrack("frases", TRACKS.frases.firstDay); scrollToContent(true); }
      break;
    case "go-phrasal": ui.mode = "list"; setTrack("phrasal", ui.day); scrollToContent(true); break;
    case "go-study": setMode("list"); break;
    case "open-mine": openMine(); break;
    case "ai-words": generateWithAI("palavras", act); break;
    case "practice": startReview(true); renderReview(); break;
    case "build-clear": quiz.qs[quiz.pos].built = []; renderQuiz(); break;
    case "build-check": {
      const q = quiz.qs[quiz.pos];
      const answer = q.built.map((i) => q.tokens[i].w).join(" ");
      answerQuiz(normalizeAnswer(answer) === normalizeAnswer(item(q.id).en));
      break;
    }
  }
});

view.addEventListener("submit", (e) => {
  if (e.target.id !== "writeForm") return;
  e.preventDefault();
  const typed = $("#writeInput").value;
  if (!typed.trim()) return;
  const res = checkTyped(typed, item(quiz.qs[quiz.pos].id).en);
  answerQuiz(res.ok, { typed, typo: res.typo });
});

view.addEventListener("change", (e) => {
  if (e.target.id === "showPt") {
    state.showPt = e.target.checked;
    ui.hidePt = !state.showPt;
    save();
    renderList();
    return;
  }
  const k = e.target.dataset.known;
  if (k !== undefined) {
    const id = Number(k);
    const s = S();
    if (e.target.checked) {
      s.known.add(id);
      if (!state.srs[skey(ui.track, id)]) srsGrade(ui.track, id, true); // entra na revisão
      markActivity();
    } else {
      s.known.delete(id);
      delete state.srs[skey(ui.track, id)];
    }
    save();
    const li = e.target.closest(".word");
    li.classList.toggle("is-known", e.target.checked);
    moveWord(li, e.target.checked);
    refreshProgress();
  }
});

view.addEventListener("keydown", (e) => {
  const rev = e.target.closest(".word-text[data-reveal]");
  if (rev && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleReveal(rev.closest(".word")); }
});

/* ---------- Arrastar a carta (celular) ---------- */
let drag = null;
let suppressClick = false;
const SWIPE_MIN = 80;

view.addEventListener("pointerdown", (e) => {
  const wrap = e.target.closest(".card-wrap");
  if (!wrap || !activeDeck() || e.button > 0) return;
  drag = { x: e.clientX, y: e.clientY, dx: 0, wrap, id: e.pointerId, active: false };
});
view.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.active) {
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
    drag.active = true;
    drag.wrap.classList.add("dragging");
    try { drag.wrap.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
  }
  const flipped = activeDeck().flipped;
  drag.dx = dx;
  drag.wrap.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
  drag.wrap.classList.toggle("swipe-right", flipped && dx > SWIPE_MIN);
  drag.wrap.classList.toggle("swipe-left", flipped && dx < -SWIPE_MIN);
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { wrap, dx, active } = drag;
  drag = null;
  if (!active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 60);
  wrap.classList.remove("dragging");
  const deck = activeDeck();
  if (deck && e.type !== "pointercancel" && Math.abs(dx) > SWIPE_MIN) {
    if (!deck.flipped) {
      // ainda não viu a tradução: o arraste só vira a carta
      wrap.style.transform = "";
      wrap.classList.remove("swipe-left", "swipe-right");
      flipCard();
      return;
    }
    const knew = dx > 0;
    wrap.style.transform = `translateX(${knew ? 120 : -120}vw) rotate(${knew ? 20 : -20}deg)`;
    setTimeout(() => answerActive(knew), 200);
    return;
  }
  wrap.style.transform = "";
  wrap.classList.remove("swipe-left", "swipe-right");
}
view.addEventListener("pointerup", endDrag);
view.addEventListener("pointercancel", endDrag);

/* ---------- Teclado (computador) ---------- */
document.addEventListener("keydown", (e) => {
  if (!$("#search").hidden) { if (e.key === "Escape") closeSearch(); return; }
  if (!$("#mine").hidden) { if (e.key === "Escape") closeMine(); return; }
  if (e.target.matches("input, textarea")) return;
  if (e.key === "/") { e.preventDefault(); openSearch(); return; }
  const deck = activeDeck();
  if (deck && deck.pos < deck.deck.length) {
    if ((e.key === " " || e.key === "Enter") && !e.target.closest("button")) { e.preventDefault(); flipCard(); }
    else if (e.key === "ArrowRight" && deck.flipped) answerActive(true);
    else if (e.key === "ArrowLeft" && deck.flipped) answerActive(false);
  }
  if (ui.mode === "quiz" && quiz && quiz.pos < quiz.qs.length) {
    const q = quiz.qs[quiz.pos];
    if (!q.done && ["mean", "en", "listen"].includes(ui.quizType) && ["1", "2", "3", "4"].includes(e.key)) {
      const id = q.options[Number(e.key) - 1];
      if (id !== undefined) answerQuiz(id === q.id, { chosen: id });
    }
  }
});

/* ---------- Busca ---------- */
$("#searchOpen").addEventListener("click", openSearch);
$("#searchClose").addEventListener("click", closeSearch);
$("#searchInput").addEventListener("input", (e) => renderSearch(e.target.value));
$("#searchResults").addEventListener("click", (e) => {
  const b = e.target.closest("[data-go]");
  if (!b) return;
  const [track, id] = b.dataset.go.split(":");
  goToItem(track, Number(id));
});
$("#search").addEventListener("click", (e) => { if (e.target.id === "search") closeSearch(); });

/* ---------- Minhas frases ---------- */
$("#mineOpen").addEventListener("click", openMine);
$("#mineClose").addEventListener("click", closeMine);
$("#mineForm").addEventListener("submit", (e) => { e.preventDefault(); addMine(e.target); });
$("#mineAi").addEventListener("click", (e) => generateWithAI("frases", e.currentTarget));
$("#mineList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-del]");
  if (b) removeMine(Number(b.dataset.del));
});
$("#mine").addEventListener("click", (e) => { if (e.target.id === "mine") closeMine(); });

/* ---------- Backup, instalar e recomeçar ---------- */
$("#exportBtn").addEventListener("click", exportBackup);
$("#importBtn").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) importBackup(file);
  e.target.value = "";
});
$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Isso apaga todo o seu progresso e você volta para o Dia 1. Se quiser guardar, baixe um backup antes. Continuar?")) return;
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignora */ }
  location.reload();
});

let installEvent = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  $("#installBtn").hidden = false;
});
$("#installBtn").addEventListener("click", async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  $("#installBtn").hidden = true;
});
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
if (isIOS && !isStandalone) $("#iosHint").hidden = false;

// Funciona offline depois da primeira visita (precisa de http/https, por exemplo o GitHub Pages)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

// Se o app ficar aberto e virar o dia, atualiza a tela ao voltar para ele
let lastSeenDay = todayISO();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && todayISO() !== lastSeenDay) {
    lastSeenDay = todayISO();
    review = null;
    render();
  }
});

render();
