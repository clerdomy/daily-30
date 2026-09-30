"use strict";

/* =========================================================
   BANCO DE DADOS NO NAVEGADOR (IndexedDB)
   - frases: na primeira visita, as 200 frases de frases.js são copiadas para cá.
     As que você adicionar ficam salvas só neste aparelho.
   - palavras: as palavras novas que a IA sugeriu para você.
   - livros: livros que você abriu e textos que a IA escreveu, já divididos em páginas.
   Frases e palavras vão junto no backup do progresso; os livros ficam só neste aparelho.
   ========================================================= */
const DB_NAME = "ingles30-db";
const DB_VERSION = 3; // versão 2 criou a tabela "palavras", versão 3 a "livros"
let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of ["frases", "palavras", "livros"]) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// Formato de cada registro: { id, en, pt, exEn, exPt, mine }
// mine = true para o que você (ou a IA) adicionou
const cleanItem = (f) => ({
  en: String(f.en || "").trim(),
  pt: String(f.pt || "").trim(),
  exEn: String(f.exEn || "").trim(),
  exPt: String(f.exPt || "").trim(),
});

function makeStore(name) {
  // Roda fn dentro de uma transação e resolve com o valor de getResult() quando ela termina
  function run(mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const getResult = fn(tx.objectStore(name));
      tx.oncomplete = () => resolve(getResult ? getResult() : undefined);
      tx.onerror = tx.onabort = () => reject(tx.error);
    }));
  }
  const all = () => run("readonly", (s) => { const r = s.getAll(); return () => r.result; });
  return {
    run,
    all,
    // Adiciona vários de uma vez e devolve os registros com id
    async addMany(items) {
      const list = await all();
      let id = list.reduce((m, x) => Math.max(m, x.id), -1);
      const recs = items.map((f) => ({ id: ++id, ...cleanItem(f), mine: true }));
      await run("readwrite", (s) => { recs.forEach((r) => s.put(r)); });
      return recs;
    },
    async add(f) {
      return (await this.addMany([f]))[0];
    },
    remove(id) {
      return run("readwrite", (s) => { s.delete(id); });
    },
    // Guarda um registro inteiro como está (usado pelos livros)
    put(rec) {
      return run("readwrite", (s) => { s.put(rec); });
    },
    get(id) {
      return run("readonly", (s) => { const r = s.get(id); return () => r.result; });
    },
    // Usado ao restaurar um backup: troca os seus itens pelos do arquivo
    async replaceMine(mine) {
      const list = await all();
      await run("readwrite", (s) => {
        list.filter((x) => x.mine).forEach((x) => s.delete(x.id));
        mine.forEach((f) => { if (Number.isInteger(f.id) && f.en && f.pt) s.put({ id: f.id, ...cleanItem(f), mine: true }); });
      });
    },
  };
}

const FraseDB = {
  ...makeStore("frases"),
  ok: true,
  seedList: () => FRASES.map(([en, pt, exEn, exPt], id) => ({ id, en, pt, exEn, exPt, mine: false })),
  // Se a tabela estiver vazia, coloca as frases de frases.js
  async load() {
    const list = await this.all();
    if (list.length) return list;
    const seed = this.seedList();
    await this.run("readwrite", (s) => { seed.forEach((f) => s.put(f)); });
    return seed;
  },
};
const PalavraDB = makeStore("palavras");
const LivroDB = makeStore("livros");

// Carrega os dados do banco e só então inicia o app
(async () => {
  try {
    if (!("indexedDB" in window)) throw new Error("sem IndexedDB");
    window.FRASES_LIST = await FraseDB.load();
    window.PALAVRAS_LIST = await PalavraDB.all();
  } catch (e) {
    // navegador sem acesso ao banco (ex.: modo privado antigo): usa só o conteúdo fixo
    FraseDB.ok = false;
    window.FRASES_LIST = FraseDB.seedList();
    window.PALAVRAS_LIST = [];
  }
  // async = false mantém a ordem: primeiro app.js, depois leitura.js
  for (const src of ["app.js", "leitura.js"]) {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    document.body.appendChild(s);
  }
})();
