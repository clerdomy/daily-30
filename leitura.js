"use strict";

/* =========================================================
   MODO LER
   Biblioteca com livros (.txt, .epub, .pdf) e textos gerados pela IA.
   PDF e EPUB aparecem como o livro original (página desenhada pelo pdf.js / epub.js),
   com animação de folha virando. Toque numa palavra (ou selecione uma frase) para
   ver a tradução e ouvir.
   Usa o que o app.js já tem: view, esc, speak, findItem, googleTranslate, apiFetch...
   ========================================================= */
const READ_POS_KEY = "ingles300-leitura"; // onde você parou em cada livro
const PAGE_WORDS = 220;                   // tamanho de uma página nos textos (txt e IA)
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.3.289";
const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js";
const EPUBJS = "https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js";
const LEVELS = { basico: "Básico", intermediario: "Intermediário", avancado: "Avançado" };
const TURN_MS = 240; // metade da animação de virar a página

const reader = {
  view: "library", books: null, book: null, level: "basico", busy: "", turning: false,
  page: 0,             // txt e textos da IA: índice da página (0, 1, 2...)
  pdf: null, pdfTask: null, pdfPage: 1, // PDF: documento aberto e página (1, 2, 3...)
  epub: null, rendition: null, epubLoc: null,
  gen: 0, // muda a cada livro aberto/fechado: trabalho atrasado do livro anterior é descartado
};
const trCache = new Map();
const isSpread = () => window.matchMedia("(min-width: 900px)").matches; // duas páginas lado a lado
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- onde você parou ---------- */
function readPositions() {
  try { return JSON.parse(localStorage.getItem(READ_POS_KEY)) || {}; } catch (e) { return {}; }
}
// Formato: { p: posição (página ou CFI do EPUB), label: "Página 3 de 120" }.
// Versões antigas guardavam só o número da página.
function positionOf(id) {
  const v = readPositions()[id];
  if (v == null) return null;
  return typeof v === "object" ? v : { p: v };
}
function savePosition(id, p, label) {
  const pos = readPositions();
  pos[id] = { p, label };
  try { localStorage.setItem(READ_POS_KEY, JSON.stringify(pos)); } catch (e) { /* ignora */ }
}

/* ---------- textos (txt e IA): dividir em páginas ---------- */
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

/* ---------- bibliotecas (baixadas só quando precisa) ---------- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Não foi possível baixar o leitor. Precisa de internet na primeira vez."));
    document.head.appendChild(s);
  });
}
let pdfjsLib = null;
async function loadPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import(`${PDFJS}/pdf.min.mjs`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}
async function loadEpubjs() {
  if (!window.JSZip) await loadScript(JSZIP);
  if (!window.ePub) await loadScript(EPUBJS);
  return window.ePub;
}

/* ---------- abrir um arquivo novo ---------- */
const baseName = (file) => file.name.replace(/\.[^.]+$/, "");
async function openBookFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!["txt", "pdf", "epub"].includes(ext)) { toast("Use um arquivo .txt, .epub ou .pdf."); return; }
  reader.busy = "Abrindo o livro...";
  renderRead();
  try {
    const book = { id: Date.now(), tipo: "livro", formato: ext, titulo: baseName(file), criado: new Date().toISOString() };
    if (ext === "txt") {
      book.paginas = paginate(textToParagraphs(await file.text()));
    } else if (ext === "pdf") {
      // guarda o arquivo inteiro: ele é desenhado como o original na hora de ler
      const pdfjs = await loadPdfjs();
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const doc = await task.promise;
      const meta = await doc.getMetadata().catch(() => null);
      // usa o título do PDF, a não ser que pareça nome de arquivo ("doc1.docx", "Microsoft Word - ...")
      const t = ((meta && meta.info && meta.info.Title) || "").trim();
      if (t && !/\.[a-z0-9]{2,5}$/i.test(t) && !/^microsoft/i.test(t)) book.titulo = t;
      book.totalPaginas = doc.numPages;
      book.arquivo = file;
      task.destroy();
    } else {
      const ePub = await loadEpubjs();
      const eb = ePub(await file.arrayBuffer(), { openAs: "binary" });
      const meta = await eb.loaded.metadata.catch(() => null);
      if (meta && meta.title) book.titulo = meta.title.trim();
      eb.destroy();
      book.arquivo = file;
    }
    await LivroDB.put(book);
    reader.books = null;
    reader.busy = "";
    await openBook(book);
  } catch (e) {
    reader.busy = "";
    toast(e.message || "Não foi possível abrir esse arquivo.");
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
    reader.busy = "";
    await openBook(book);
  } catch (e) {
    reader.busy = "";
    toast(e.message || "Não foi possível gerar o texto.");
    renderRead();
  }
}

/* ---------- abrir e fechar um livro ---------- */
// Livros com arquivo (PDF/EPUB) são desenhados como o original; o resto é texto em páginas
const bookKind = (b) => (b.arquivo ? b.formato : "texto");

async function openBook(book) {
  closeReader();
  const gen = reader.gen;
  reader.book = book;
  reader.view = "book";
  const pos = positionOf(book.id);
  const kind = bookKind(book);
  if (kind === "texto") reader.page = Math.min(Math.max(Number(pos && pos.p) || 0, 0), book.paginas.length - 1);
  if (kind === "pdf") reader.pdfPage = Math.max(1, Number(pos && pos.p) || 1);
  renderBook();
  document.querySelector(".top").scrollIntoView({ block: "start" });
  try {
    if (kind === "pdf") {
      const pdfjs = await loadPdfjs();
      const task = pdfjs.getDocument({ data: new Uint8Array(await book.arquivo.arrayBuffer()) });
      const pdf = await task.promise;
      if (gen !== reader.gen) { task.destroy(); return; } // saiu do livro enquanto carregava
      reader.pdfTask = task;
      reader.pdf = pdf;
      reader.pdfPage = Math.min(reader.pdfPage, reader.pdf.numPages);
      await drawPdf();
    } else if (kind === "epub") {
      if (gen === reader.gen) await openEpub(pos && typeof pos.p === "string" ? pos.p : undefined);
    } else {
      savePosition(book.id, reader.page, `Página ${reader.page + 1} de ${book.paginas.length}`);
    }
  } catch (e) {
    toast(e.message || "Não foi possível abrir o livro.");
  }
}
function closeReader() {
  reader.gen++;
  reader.turning = false;
  closeSheet();
  if (reader.rendition) { try { reader.rendition.destroy(); } catch (e) { /* ignora */ } }
  if (reader.epub) { try { reader.epub.destroy(); } catch (e) { /* ignora */ } }
  if (reader.pdfTask) { try { reader.pdfTask.destroy(); } catch (e) { /* ignora */ } }
  reader.rendition = null;
  reader.epub = null;
  reader.pdf = null;
  reader.pdfTask = null;
  reader.epubLoc = null;
}

/* ---------- PDF: página desenhada + camada de texto invisível ---------- */
async function drawPdfPage(pdf, n, slot, maxW, maxH) {
  const page = await pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(maxW / base.width, maxH / base.height);
  const vp = page.getViewport({ scale });
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(vp.width * dpr);
  canvas.height = Math.floor(vp.height * dpr);
  canvas.style.width = `${Math.floor(vp.width)}px`;
  canvas.style.height = `${Math.floor(vp.height)}px`;
  slot.style.width = canvas.style.width;
  slot.style.height = canvas.style.height;
  slot.style.setProperty("--total-scale-factor", scale);
  slot.replaceChildren(canvas);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
  // texto invisível por cima, no mesmo lugar: é nele que você toca e seleciona
  const layer = document.createElement("div");
  layer.className = "textLayer";
  slot.appendChild(layer);
  await new pdfjsLib.TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport: vp }).render();
}
async function drawPdf() {
  const sheet = document.getElementById("bookSheet");
  const pdf = reader.pdf;
  const gen = reader.gen;
  if (!sheet || !pdf) return;
  const total = pdf.numPages;
  const two = isSpread() && total > 1;
  if (two && reader.pdfPage % 2 === 0) reader.pdfPage -= 1; // pares de páginas: 1-2, 3-4...
  const pages = two && reader.pdfPage < total ? [reader.pdfPage, reader.pdfPage + 1] : [reader.pdfPage];
  const gap = 12;
  const maxW = (sheet.clientWidth - (pages.length - 1) * gap) / pages.length;
  const maxH = isSpread() ? window.innerHeight - 200 : Infinity; // no celular, a página ocupa a largura
  const slots = pages.map(() => { const d = document.createElement("div"); d.className = "pdf-page"; return d; });
  await Promise.all(pages.map((n, i) => drawPdfPage(pdf, n, slots[i], maxW, maxH)));
  if (gen !== reader.gen || !sheet.isConnected) return; // o livro foi fechado enquanto desenhava
  sheet.replaceChildren(...slots);
  const label = pages.length > 1 ? `Páginas ${pages[0]}-${pages[1]} de ${total}` : `Página ${pages[0]} de ${total}`;
  savePosition(reader.book.id, reader.pdfPage, label);
  updateNav(label, reader.pdfPage > 1, pages[pages.length - 1] < total);
}

/* ---------- EPUB: livro com a formatação original, em páginas ---------- */
async function openEpub(cfi) {
  const ePub = await loadEpubjs();
  const sheet = document.getElementById("bookSheet");
  reader.epub = ePub(await reader.book.arquivo.arrayBuffer(), { openAs: "binary" });
  reader.rendition = reader.epub.renderTo(sheet, {
    width: "100%", height: "100%", flow: "paginated", spread: isSpread() ? "auto" : "none", allowScriptedContent: false,
  });
  reader.rendition.hooks.content.register(attachEpubEvents);
  reader.rendition.on("relocated", (loc) => {
    reader.epubLoc = loc;
    const pct = reader.epub.locations.length() ? Math.round(reader.epub.locations.percentageFromCfi(loc.start.cfi) * 100) : null;
    const label = pct != null ? `${pct}% do livro` : `Página ${loc.start.displayed.page} de ${loc.start.displayed.total} do capítulo`;
    savePosition(reader.book.id, loc.start.cfi, label);
    updateNav(label, !loc.atStart, !loc.atEnd);
  });
  reader.rendition.on("selected", (cfiRange, contents) => {
    const text = contents.window.getSelection().toString().replace(/\s+/g, " ").trim();
    if (text.includes(" ")) showSelection(text.slice(0, 500));
  });
  await reader.rendition.display(cfi);
  // calcula as posições do livro todo (para mostrar a porcentagem) sem travar a leitura
  reader.epub.ready.then(() => reader.epub.locations.generate(1200)).then(() => {
    if (reader.epubLoc) reader.rendition.emit("relocated", reader.epubLoc);
  }).catch(() => {});
}
function attachEpubEvents(contents) {
  const doc = contents.document;
  doc.addEventListener("click", (e) => {
    const sel = contents.window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const hit = wordAt(doc, e.clientX, e.clientY);
    if (!hit) return;
    const block = hit.node.parentElement.closest("p, li, h1, h2, h3, h4, h5, blockquote, div") || doc.body;
    showWordText(hit.word, sentenceAround(block, hit.node, hit.start));
  });
  addSwipe(doc);
}

/* ---------- virar a página ---------- */
function updateNav(label, canPrev, canNext) {
  const c = document.getElementById("readCount");
  if (!c) return;
  c.textContent = label;
  document.querySelector('[data-read-page="-1"]').disabled = !canPrev;
  document.querySelector('[data-read-page="1"]').disabled = !canNext;
}
async function turnPage(dir) {
  const b = reader.book;
  if (!b || reader.turning) return;
  const kind = bookKind(b);
  let swap;
  if (kind === "texto") {
    const p = reader.page + dir;
    if (p < 0 || p >= b.paginas.length) return;
    swap = async () => {
      reader.page = p;
      savePosition(b.id, p, `Página ${p + 1} de ${b.paginas.length}`);
      document.getElementById("bookSheet").innerHTML = textPageHTML(b.paginas[p]);
      updateNav(`${p + 1} / ${b.paginas.length}`, p > 0, p < b.paginas.length - 1);
    };
  } else if (kind === "pdf") {
    if (!reader.pdf) return;
    const step = isSpread() ? 2 : 1;
    const p = reader.pdfPage + dir * step;
    if (p < 1 || p > reader.pdf.numPages) return;
    swap = async () => { reader.pdfPage = p; await drawPdf(); };
  } else {
    if (!reader.rendition) return;
    swap = () => (dir > 0 ? reader.rendition.next() : reader.rendition.prev());
  }
  reader.turning = true;
  closeSheet();
  markActivity();
  save();
  const sheet = document.getElementById("bookSheet");
  const anim = !reduceMotion();
  try {
    // folha virando: a página sai girando pela lombada e a nova entra pelo outro lado
    if (anim) { sheet.classList.add(dir > 0 ? "turn-out-next" : "turn-out-prev"); await sleep(TURN_MS); }
    await swap();
    if (anim) {
      sheet.classList.remove("turn-out-next", "turn-out-prev");
      sheet.classList.add(dir > 0 ? "turn-in-next" : "turn-in-prev");
      await sleep(TURN_MS);
    }
  } finally {
    sheet.classList.remove("turn-out-next", "turn-out-prev", "turn-in-next", "turn-in-prev");
    reader.turning = false;
  }
}
// Deslizar o dedo para o lado vira a página (só toque, para não atrapalhar o mouse)
function addSwipe(target) {
  let start = null;
  target.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    start = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, { passive: true });
  target.addEventListener("touchend", (e) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const quick = Date.now() - start.time < 800;
    start = null;
    if (quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) turnPage(dx < 0 ? 1 : -1);
  }, { passive: true });
}

/* ---------- palavra tocada ---------- */
// Acha a palavra no ponto tocado (funciona no texto invisível do PDF e dentro do EPUB)
function wordAt(doc, x, y) {
  let node = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; offset = p.offset; }
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; offset = r.startOffset; }
  }
  if (!node || node.nodeType !== 3) return null;
  const text = node.textContent;
  const isW = (c) => /[A-Za-z'’-]/.test(c || "");
  let s = offset;
  let e = offset;
  while (s > 0 && isW(text[s - 1])) s--;
  while (e < text.length && isW(text[e])) e++;
  const raw = text.slice(s, e);
  const lead = raw.length - raw.replace(/^['’-]+/, "").length;
  const word = raw.replace(/^['’-]+|['’-]+$/g, "");
  if (!/[A-Za-z]/.test(word)) return null;
  return { word, node, start: s + lead };
}
// A frase em volta da posição i de um texto
function sentenceFromText(full, i) {
  const a = Math.max(full.lastIndexOf(".", i - 1), full.lastIndexOf("!", i - 1), full.lastIndexOf("?", i - 1)) + 1;
  const rel = full.slice(i).search(/[.!?]/);
  const b = rel < 0 ? full.length : i + rel + 1;
  return full.slice(a, b).replace(/\s+/g, " ").trim().slice(0, 300);
}
// A frase em volta da palavra, dentro de um parágrafo do EPUB
function sentenceAround(container, node, start) {
  const r = node.ownerDocument.createRange();
  r.setStart(container, 0);
  r.setEnd(node, start);
  return sentenceFromText(container.textContent, r.toString().length);
}
// No PDF cada linha é um pedaço separado: junta os pedaços com espaço antes de achar a frase
function pdfSentence(layer, hit) {
  const parts = [...layer.querySelectorAll("span")].filter((sp) => !sp.querySelector("span") && sp.textContent);
  let full = "";
  let i = 0;
  for (const sp of parts) {
    if (sp.contains(hit.node)) {
      const r = document.createRange();
      r.setStart(sp, 0);
      r.setEnd(hit.node, hit.start);
      i = full.length + r.toString().length;
    }
    full += `${sp.textContent} `;
  }
  return sentenceFromText(full, i);
}

/* ---------- telas ---------- */
// Textos (txt e IA): cada frase vira um <span class="s"> e cada palavra um <span class="w">
const WORD_RE = /([A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*)/;
function sentenceHTML(s) {
  // split com grupo: posições ímpares são palavras, as outras são espaços e pontuação
  return s.split(WORD_RE).map((part, i) => (i % 2 ? `<span class="w">${esc(part)}</span>` : esc(part))).join("");
}
function textPageHTML(pars) {
  return `<div class="text-page">${pars.map((par) => {
    const sentences = par.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [par];
    return `<p>${sentences.map((s) => `<span class="s">${sentenceHTML(s)}</span>`).join("")}</p>`;
  }).join("")}</div>`;
}

function renderRead() {
  if (ui.mode !== "read") return;
  if (reader.view === "book" && reader.book) {
    // o app redesenha a tela às vezes (ex.: ao adicionar uma palavra): não apaga o livro aberto
    const stage = document.getElementById("readPage");
    if (stage && stage.dataset.book === String(reader.book.id)) return;
    // voltou para a aba Ler: desenha o livro de novo onde você estava
    if (bookKind(reader.book) === "texto") renderBook(); else openBook(reader.book);
    return;
  }
  if (!reader.books) {
    view.innerHTML = '<p class="read-busy">Carregando a biblioteca...</p>';
    LivroDB.all().then((list) => { reader.books = list.sort((a, b) => b.id - a.id); renderRead(); })
      .catch(() => { reader.books = []; renderRead(); });
    return;
  }
  const levelChips = Object.entries(LEVELS).map(([k, label]) =>
    `<button class="chip" data-read-level="${k}" aria-pressed="${reader.level === k}">${label}</button>`).join("");
  const list = reader.books.length ? reader.books.map((b) => {
    const pos = positionOf(b.id);
    const tag = b.tipo === "ia" ? `IA · ${LEVELS[b.nivel] || ""}` : `Livro · ${(b.formato || "").toUpperCase()}`;
    const where = pos && pos.label ? pos.label
      : b.paginas ? `Página ${((pos && Number(pos.p)) || 0) + 1} de ${b.paginas.length}`
        : b.totalPaginas ? `${b.totalPaginas} páginas` : "Começar a ler";
    return `<li class="book">
      <button class="book-open" data-read-open="${b.id}">
        <span class="book-tag">${esc(tag)}</span>
        <span class="book-title">${esc(b.titulo)}</span>
        <span class="s-meta">${esc(where)}</span>
      </button>
      <button class="link-btn remove-word" data-read-del="${b.id}" aria-label="Apagar ${esc(b.titulo)}">Apagar</button>
    </li>`;
  }).join("") : '<li class="search-empty">Sua biblioteca está vazia. Abra um livro ou peça um texto para a IA.</li>';
  view.innerHTML = `
    ${reader.busy ? `<p class="read-busy" role="status">${esc(reader.busy)}</p>` : ""}
    <div class="read-actions">
      <section class="read-card">
        <h3>Abrir um livro</h3>
        <p class="list-hint">Arquivos .pdf, .epub ou .txt. O livro aparece como o original e fica salvo só neste aparelho.</p>
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
  const kind = bookKind(b);
  const first = kind === "texto" ? textPageHTML(b.paginas[reader.page]) : '<p class="read-busy">Abrindo...</p>';
  view.innerHTML = `
    <div class="read-head">
      <button class="link-btn" data-read-back>‹ Biblioteca</button>
      <h3>${esc(b.titulo)}</h3>
      <p class="list-hint">Toque numa palavra para traduzir e ouvir. Para uma frase, selecione com o dedo. Deslize para o lado para virar a página.</p>
    </div>
    <div class="book-stage is-${kind}" id="readPage" data-book="${b.id}" lang="en">
      <div class="book-sheet" id="bookSheet">${first}</div>
    </div>
    <div class="read-nav">
      <button class="btn" data-read-page="-1">‹ Anterior</button>
      <span class="read-count" id="readCount"></span>
      <button class="btn" data-read-page="1">Próxima ›</button>
    </div>`;
  addSwipe(document.getElementById("readPage"));
  if (kind === "texto") updateNav(`${reader.page + 1} / ${b.paginas.length}`, reader.page > 0, reader.page < b.paginas.length - 1);
  else updateNav("", false, false);
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
  document.querySelectorAll(".book-stage .is-picked").forEach((x) => x.classList.remove("is-picked"));
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

function showWordText(rawWord, sentence) {
  closeSheet();
  const word = rawWord.replace(/’/g, "'");
  const found = findItem(word);
  const inApp = found
    ? `<p class="s-meta">Já está no app: ${esc(TRACKS[found.track].name)}${state.tracks[found.track].known.has(found.w.id) ? ", você já sabe" : ""}.</p>`
    : `<button class="btn" data-sheet-add>+ Adicionar às Minhas palavras</button>`;
  const hasSentence = sentence && sentence.toLowerCase() !== word.toLowerCase();
  openSheet(`
    <div class="sheet-word">
      <p class="sheet-en" lang="en">${esc(word)}</p>
      ${sayButtons(word)}
    </div>
    <p class="sheet-pt" id="trWord">Traduzindo...</p>
    ${hasSentence ? `<div class="sheet-sentence">
      <p class="ex-label">Na frase:</p>
      <p lang="en">${esc(sentence)} ${sayButtons(sentence)}</p>
      <p class="ex-pt" id="trSentence">Traduzindo...</p>
    </div>` : ""}
    ${inApp}`);
  const sheet = document.getElementById("sheet");
  sheet.dataset.word = word;
  sheet.dataset.sentence = hasSentence ? sentence : "";
  speak(word);
  fillTranslation("trWord", word);
  if (hasSentence) fillTranslation("trSentence", sentence);
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
  // texto (txt e IA): cada palavra é um <span class="w">
  const w = e.target.closest(".text-page .w");
  if (w) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().includes(" ")) return; // está selecionando uma frase
    showWordText(w.textContent, (w.closest(".s") || w).textContent.trim());
    w.classList.add("is-picked");
    return;
  }
  // PDF: toque no texto invisível por cima da página
  const layer = e.target.closest(".textLayer");
  if (layer) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const hit = wordAt(document, e.clientX, e.clientY);
    if (hit) showWordText(hit.word, pdfSentence(layer, hit));
    return;
  }
  const open = e.target.closest("[data-read-open]");
  if (open) {
    const b = reader.books.find((x) => x.id === Number(open.dataset.readOpen));
    if (b) openBook(b);
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
  if (pg && !pg.disabled) { turnPage(Number(pg.dataset.readPage)); return; }
  if (e.target.closest("[data-read-back]")) {
    closeReader();
    reader.view = "library";
    reader.book = null;
    reader.books = null;
    renderRead();
  }
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
// Selecionou um trecho (texto ou PDF): mostra a tradução do trecho
let selTimer = null;
document.addEventListener("selectionchange", () => {
  if (ui.mode !== "read" || reader.view !== "book") return;
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().replace(/\s+/g, " ").trim() : "";
    const stage = document.getElementById("readPage");
    if (!text || !text.includes(" ") || !stage || !stage.contains(sel.anchorNode)) return;
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
  if (e.key === "ArrowRight") turnPage(1);
  if (e.key === "ArrowLeft") turnPage(-1);
});
// Girou o celular ou mudou o tamanho da janela: redesenha o PDF no novo tamanho
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (ui.mode === "read" && reader.view === "book" && reader.pdf) drawPdf();
  }, 300);
});
