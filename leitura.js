"use strict";

/* =========================================================
   MODO LER
   Biblioteca com livros (.txt, .epub, .pdf) e textos gerados pela IA.
   Na leitura: toque numa palavra (ou selecione uma frase) para ver a tradução e ouvir.
   Usa o que o app.js já tem: view, esc, speak, findItem, googleTranslate, callAI...
   ========================================================= */
const READ_POS_KEY = "ingles300-leitura"; // página em que você parou em cada livro
const PAGE_WORDS = 220;                   // tamanho de uma página nos livros sem páginas (txt, epub, IA)
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.3.289";
const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js";
const LEVELS = { basico: "Básico", intermediario: "Intermediário", avancado: "Avançado" };

const reader = { view: "library", books: null, book: null, page: 0, level: "basico", busy: "" };
const trCache = new Map();

/* ---------- página salva de cada livro ---------- */
function readPositions() {
  try { return JSON.parse(localStorage.getItem(READ_POS_KEY)) || {}; } catch (e) { return {}; }
}
function savePosition(id, page) {
  const pos = readPositions();
  pos[id] = page;
  try { localStorage.setItem(READ_POS_KEY, JSON.stringify(pos)); } catch (e) { /* ignora */ }
}

/* ---------- dividir em páginas ---------- */
const countWords = (s) => (s.match(/\S+/g) || []).length;
function splitLong(par) {
  // parágrafo gigante: quebra por frases
  if (countWords(par) <= PAGE_WORDS * 1.5) return [par];
  const out = [];
  let cur = "";
  for (const sent of par.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [par]) {
    if (cur && countWords(cur + sent) > PAGE_WORDS) { out.push(cur.trim()); cur = ""; }
    cur += sent;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function paginate(paragraphs) {
  const pages = [];
  let page = [];
  let words = 0;
  for (const par of paragraphs.flatMap(splitLong)) {
    const n = countWords(par);
    if (page.length && words + n > PAGE_WORDS) { pages.push(page); page = []; words = 0; }
    page.push(par);
    words += n;
  }
  if (page.length) pages.push(page);
  return pages;
}
const cleanPar = (s) => s.replace(/\s+/g, " ").trim();
function textToParagraphs(text) {
  const t = text.replace(/\r/g, "");
  // com linhas em branco: cada bloco é um parágrafo; sem elas: cada linha
  const blocks = /\n\s*\n/.test(t) ? t.split(/\n\s*\n/) : t.split(/\n/);
  return blocks.map(cleanPar).filter(Boolean);
}

/* ---------- abrir arquivos ---------- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Não foi possível baixar o leitor. Precisa de internet na primeira vez."));
    document.head.appendChild(s);
  });
}
async function readTxt(file) {
  return { titulo: file.name.replace(/\.[^.]+$/, ""), paginas: paginate(textToParagraphs(await file.text())) };
}
async function readPdf(file) {
  const pdfjs = await import(`${PDFJS}/pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paginas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    reader.busy = `Lendo o PDF: página ${i} de ${doc.numPages}...`;
    renderRead();
    const content = await (await doc.getPage(i)).getTextContent();
    const text = content.items.map((it) => (it.str || "") + (it.hasEOL ? "\n" : "")).join("");
    // cada página do PDF vira uma página; linhas soltas viram parágrafos
    const pars = text.split(/\n\s*\n/).map((b) => cleanPar(b)).filter(Boolean);
    if (pars.length) paginas.push(pars);
  }
  if (!paginas.length) throw new Error("Esse PDF não tem texto (parece ser só imagem).");
  return { titulo: file.name.replace(/\.[^.]+$/, ""), paginas };
}
async function readEpub(file) {
  if (!window.JSZip) await loadScript(JSZIP);
  const zip = await window.JSZip.loadAsync(file);
  const xml = (s) => new DOMParser().parseFromString(s, "application/xml");
  const container = xml(await zip.file("META-INF/container.xml").async("string"));
  const opfPath = container.querySelector("rootfile").getAttribute("full-path");
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const opf = xml(await zip.file(opfPath).async("string"));
  const titulo = (opf.getElementsByTagName("dc:title")[0] || {}).textContent || file.name.replace(/\.[^.]+$/, "");
  const manifest = new Map([...opf.getElementsByTagName("item")].map((it) => [it.getAttribute("id"), it.getAttribute("href")]));
  const paginas = [];
  for (const ref of opf.getElementsByTagName("itemref")) {
    const href = manifest.get(ref.getAttribute("idref"));
    const entry = href && zip.file(opfDir + decodeURIComponent(href));
    if (!entry) continue;
    const html = new DOMParser().parseFromString(await entry.async("string"), "text/html");
    let pars = [...html.querySelectorAll("p, h1, h2, h3, h4, li, blockquote")].map((el) => cleanPar(el.textContent)).filter(Boolean);
    if (!pars.length && html.body) pars = textToParagraphs(html.body.textContent);
    paginas.push(...paginate(pars)); // cada capítulo começa numa página nova
  }
  if (!paginas.length) throw new Error("Não achei texto nesse EPUB.");
  return { titulo: titulo.trim(), paginas };
}
async function openBookFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const readers = { txt: readTxt, pdf: readPdf, epub: readEpub };
  if (!readers[ext]) { toast("Use um arquivo .txt, .epub ou .pdf."); return; }
  reader.busy = "Abrindo o livro...";
  renderRead();
  try {
    const { titulo, paginas } = await readers[ext](file);
    const book = { id: Date.now(), titulo, tipo: "livro", formato: ext, paginas, criado: new Date().toISOString() };
    await LivroDB.put(book);
    reader.books = null;
    openBook(book, 0);
    toast(`"${titulo}" tem ${paginas.length} ${paginas.length === 1 ? "página" : "páginas"}.`);
  } catch (e) {
    toast(e.message || "Não foi possível abrir esse arquivo.");
  } finally {
    reader.busy = "";
    renderRead();
  }
}

/* ---------- texto gerado pela IA ---------- */
async function generateText(tema) {
  if (!navigator.onLine) { toast("Sem internet. A IA precisa de conexão."); return; }
  reader.busy = "A IA está escrevendo o seu texto...";
  renderRead();
  try {
    const conhecidas = TRACK_KEYS.filter((k) => k !== "frases").flatMap((k) => knownEn(k));
    const res = await apiFetch("api/sugerir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "texto", nivel: reader.level, tema, conhecidas }),
    }, true);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.texto) throw new Error(data.erro || "A IA não respondeu. Tente de novo.");
    const book = {
      id: Date.now(), titulo: data.titulo || "Texto da IA", tipo: "ia", nivel: reader.level, tema,
      paginas: paginate(textToParagraphs(data.texto)), criado: new Date().toISOString(),
    };
    await LivroDB.put(book);
    reader.books = null;
    openBook(book, 0);
  } catch (e) {
    toast(e.message || "Não foi possível gerar o texto.");
  } finally {
    reader.busy = "";
    renderRead();
  }
}

/* ---------- telas ---------- */
function openBook(book, page) {
  reader.book = book;
  reader.page = Math.min(Math.max(page, 0), book.paginas.length - 1);
  reader.view = "book";
  savePosition(book.id, reader.page);
  closeSheet();
  renderRead();
  document.querySelector(".top").scrollIntoView({ block: "start" });
}
function goPage(delta) {
  const b = reader.book;
  if (!b) return;
  const p = reader.page + delta;
  if (p < 0 || p >= b.paginas.length) return;
  reader.page = p;
  savePosition(b.id, p);
  markActivity();
  save();
  closeSheet();
  renderRead();
  document.querySelector(".top").scrollIntoView({ block: "start" });
}

// Cada frase vira um <span class="s"> e cada palavra um <span class="w"> (dá para tocar)
const WORD_RE = /([A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*)/;
function sentenceHTML(s) {
  // split com grupo: posições ímpares são palavras, as outras são espaços e pontuação
  return s.split(WORD_RE).map((part, i) => (i % 2 ? `<span class="w">${esc(part)}</span>` : esc(part))).join("");
}
function pageHTML(pars) {
  return pars.map((par) => {
    const sentences = par.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [par];
    return `<p>${sentences.map((s) => `<span class="s">${sentenceHTML(s)}</span>`).join("")}</p>`;
  }).join("");
}

function renderRead() {
  if (ui.mode !== "read") return;
  if (reader.view === "book" && reader.book) return renderBook();
  if (!reader.books) {
    view.innerHTML = '<p class="read-busy">Carregando a biblioteca...</p>';
    LivroDB.all().then((list) => { reader.books = list.sort((a, b) => b.id - a.id); renderRead(); })
      .catch(() => { reader.books = []; renderRead(); });
    return;
  }
  const pos = readPositions();
  const levelChips = Object.entries(LEVELS).map(([k, label]) =>
    `<button class="chip" data-read-level="${k}" aria-pressed="${reader.level === k}">${label}</button>`).join("");
  const list = reader.books.length ? reader.books.map((b) => {
    const p = (pos[b.id] || 0) + 1;
    const tag = b.tipo === "ia" ? `IA · ${LEVELS[b.nivel] || ""}` : `Livro · ${(b.formato || "").toUpperCase()}`;
    return `<li class="book">
      <button class="book-open" data-read-open="${b.id}">
        <span class="book-tag">${esc(tag)}</span>
        <span class="book-title">${esc(b.titulo)}</span>
        <span class="s-meta">Página ${p} de ${b.paginas.length}</span>
      </button>
      <button class="link-btn remove-word" data-read-del="${b.id}" aria-label="Apagar ${esc(b.titulo)}">Apagar</button>
    </li>`;
  }).join("") : '<li class="search-empty">Sua biblioteca está vazia. Abra um livro ou peça um texto para a IA.</li>';
  view.innerHTML = `
    ${reader.busy ? `<p class="read-busy" role="status">${esc(reader.busy)}</p>` : ""}
    <div class="read-actions">
      <section class="read-card">
        <h3>Abrir um livro</h3>
        <p class="list-hint">Arquivos .txt, .epub ou .pdf (PDF com texto, não escaneado). Fica salvo só neste aparelho.</p>
        <label class="btn primary file-btn">Escolher arquivo<input type="file" id="bookFile" accept=".txt,.epub,.pdf,text/plain,application/epub+zip,application/pdf" hidden></label>
      </section>
      <section class="read-card">
        <h3>Gerar um texto com IA</h3>
        <div class="quiz-types" role="group" aria-label="Nível">${levelChips}</div>
        <form class="write-form" id="aiTextForm">
          <input id="aiTema" type="text" placeholder="Tema (opcional): viagem, futebol, trabalho..." autocomplete="off">
          <button class="btn primary" type="submit" ${reader.busy ? "disabled" : ""}>Gerar texto</button>
        </form>
      </section>
    </div>
    <h3 class="read-list-title">Sua biblioteca</h3>
    <ul class="book-list">${list}</ul>`;
}

function renderBook() {
  const b = reader.book;
  const total = b.paginas.length;
  const nav = `
    <div class="read-nav">
      <button class="btn" data-read-page="-1" ${reader.page === 0 ? "disabled" : ""}>‹ Anterior</button>
      <span class="read-count">${reader.page + 1} / ${total}</span>
      <button class="btn" data-read-page="1" ${reader.page >= total - 1 ? "disabled" : ""}>Próxima ›</button>
    </div>`;
  view.innerHTML = `
    <div class="read-head">
      <button class="link-btn" data-read-back>‹ Biblioteca</button>
      <h3>${esc(b.titulo)}</h3>
      <p class="list-hint">Toque numa palavra para ver a tradução e ouvir. Para uma frase, selecione com o dedo.</p>
    </div>
    <article class="read-page" id="readPage" lang="en">${pageHTML(b.paginas[reader.page])}</article>
    ${nav}`;
}

/* ---------- tradução e pronúncia ---------- */
async function translate(text) {
  const key = text.toLowerCase();
  if (trCache.has(key)) return trCache.get(key);
  const found = findItem(text);
  if (found) { trCache.set(key, found.w.pt); return found.w.pt; }
  if (!navigator.onLine) throw new Error("Sem internet para traduzir.");
  const pt = await googleTranslate(text);
  if (pt) trCache.set(key, pt);
  return pt;
}
const SLOW = "🐢";
function sayButtons(text) {
  return `<button class="speak" data-sheet-say="${esc(text)}" aria-label="Ouvir">${SPEAKER}</button>
    <button class="speak slow" data-sheet-slow="${esc(text)}" aria-label="Ouvir devagar">${SLOW}</button>`;
}
function closeSheet() {
  const el = document.getElementById("sheet");
  if (el) el.hidden = true;
  document.querySelectorAll(".read-page .is-picked").forEach((x) => x.classList.remove("is-picked"));
}
function openSheet(html) {
  const el = document.getElementById("sheet");
  document.getElementById("sheetBody").innerHTML = html;
  el.hidden = false;
}
async function fillTranslation(id, text) {
  const el = document.getElementById(id);
  try {
    const pt = await translate(text);
    if (el && el.isConnected) el.textContent = pt || "Não achei a tradução.";
  } catch (e) {
    if (el && el.isConnected) el.textContent = e.message || "Não foi possível traduzir agora.";
  }
}

async function showWord(span) {
  closeSheet();
  span.classList.add("is-picked");
  const word = span.textContent.replace(/’/g, "'");
  const sentence = (span.closest(".s") || span).textContent.trim();
  const found = findItem(word);
  const inApp = found
    ? `<p class="s-meta">Já está no app: ${esc(TRACKS[found.track].name)}${state.tracks[found.track].known.has(found.w.id) ? ", você já sabe" : ""}.</p>`
    : `<button class="btn" data-sheet-add>+ Adicionar às Minhas palavras</button>`;
  openSheet(`
    <div class="sheet-word">
      <p class="sheet-en" lang="en">${esc(word)}</p>
      ${sayButtons(word)}
    </div>
    <p class="sheet-pt" id="trWord">Traduzindo...</p>
    <div class="sheet-sentence">
      <p class="ex-label">Na frase:</p>
      <p lang="en">${esc(sentence)} ${sayButtons(sentence)}</p>
      <p class="ex-pt" id="trSentence">Traduzindo...</p>
    </div>
    ${inApp}`);
  const sheet = document.getElementById("sheet");
  sheet.dataset.word = word;
  sheet.dataset.sentence = sentence;
  speak(word);
  fillTranslation("trWord", word);
  fillTranslation("trSentence", sentence);
}
function showSelection(text) {
  closeSheet();
  openSheet(`
    <p class="sheet-sel" lang="en">${esc(text)} ${sayButtons(text)}</p>
    <p class="sheet-pt" id="trSel">Traduzindo...</p>`);
  fillTranslation("trSel", text);
}
async function addReadWord() {
  const sheet = document.getElementById("sheet");
  const word = (sheet.dataset.word || "").toLowerCase();
  if (!word || !FraseDB.ok) return;
  try {
    const pt = await translate(word);
    const exPt = trCache.get((sheet.dataset.sentence || "").toLowerCase()) || "";
    await PalavraDB.addMany([{ en: word, pt, exEn: sheet.dataset.sentence || "", exPt }]);
    await reloadDbTrack("ia");
    toast(`"${word}" entrou em Minhas palavras.`);
    closeSheet();
  } catch (e) {
    toast("Não foi possível adicionar a palavra.");
  }
}

/* ---------- eventos ---------- */
view.addEventListener("click", (e) => {
  if (ui.mode !== "read") return;
  const w = e.target.closest(".read-page .w");
  if (w) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().includes(" ")) return; // está selecionando uma frase
    showWord(w);
    return;
  }
  const open = e.target.closest("[data-read-open]");
  if (open) {
    const b = reader.books.find((x) => x.id === Number(open.dataset.readOpen));
    if (b) openBook(b, readPositions()[b.id] || 0);
    return;
  }
  const del = e.target.closest("[data-read-del]");
  if (del) {
    const id = Number(del.dataset.readDel);
    const b = reader.books.find((x) => x.id === id);
    if (b && confirm(`Apagar "${b.titulo}" da biblioteca?`)) {
      LivroDB.remove(id).then(() => { reader.books = null; renderRead(); });
    }
    return;
  }
  const lvl = e.target.closest("[data-read-level]");
  if (lvl) { reader.level = lvl.dataset.readLevel; renderRead(); return; }
  const pg = e.target.closest("[data-read-page]");
  if (pg && !pg.disabled) { goPage(Number(pg.dataset.readPage)); return; }
  if (e.target.closest("[data-read-back]")) { reader.view = "library"; reader.book = null; closeSheet(); renderRead(); }
});
view.addEventListener("change", (e) => {
  if (e.target.id !== "bookFile") return;
  const file = e.target.files && e.target.files[0];
  if (file) openBookFile(file);
});
view.addEventListener("submit", (e) => {
  if (e.target.id !== "aiTextForm") return;
  e.preventDefault();
  generateText(document.getElementById("aiTema").value.trim().slice(0, 80));
});
// Selecionou um trecho no livro: mostra a tradução do trecho
let selTimer = null;
document.addEventListener("selectionchange", () => {
  if (ui.mode !== "read" || reader.view !== "book") return;
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().replace(/\s+/g, " ").trim() : "";
    const page = document.getElementById("readPage");
    if (!text || !text.includes(" ") || !page || !page.contains(sel.anchorNode)) return;
    showSelection(text.slice(0, 500));
  }, 500);
});
document.getElementById("sheet").addEventListener("click", (e) => {
  const say = e.target.closest("[data-sheet-say]");
  if (say) { speak(say.dataset.sheetSay); return; }
  const slow = e.target.closest("[data-sheet-slow]");
  if (slow) { speak(slow.dataset.sheetSlow, 0.55); return; }
  if (e.target.closest("[data-sheet-add]")) { addReadWord(); return; }
  if (e.target.closest("[data-sheet-close]")) closeSheet();
});
document.addEventListener("keydown", (e) => {
  if (ui.mode !== "read") return;
  if (e.key === "Escape") { closeSheet(); return; }
  if (e.target.matches("input, textarea") || reader.view !== "book") return;
  if (e.key === "ArrowRight") goPage(1);
  if (e.key === "ArrowLeft") goPage(-1);
});
