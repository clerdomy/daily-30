// Função da Vercel: pede à IA (OpenRouter, modelos grátis) 10 palavras ou frases novas para estudar,
// a tradução de uma palavra falada (modo Falar) ou um texto para ler no seu nível (modo Ler).
// Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   OPENROUTER_API_KEY  chave do OpenRouter (obrigatória)
//   APP_SENHA           senha para só você usar a IA (opcional, mas recomendada)
//   OPENROUTER_MODEL    modelo (opcional). "openrouter/free" escolhe sozinho um modelo grátis disponível.
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const QTD = 10;

const SCHEMA = {
  type: "object",
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          en: { type: "string", description: "a palavra ou frase em inglês" },
          pt: { type: "string", description: "tradução para o português do Brasil" },
          exEn: { type: "string", description: "exemplo curto em inglês (para frases: uma resposta natural)" },
          exPt: { type: "string", description: "tradução do exemplo" },
        },
        required: ["en", "pt", "exEn", "exPt"],
        additionalProperties: false,
      },
    },
  },
  required: ["itens"],
  additionalProperties: false,
};

const FORMATO = `Responda só com JSON, sem texto antes ou depois, neste formato:
{"itens": [{"en": "...", "pt": "...", "exEn": "...", "exPt": "..."}]}`;

// Modo Ler: um texto com título, no nível escolhido
const TEXTO_SCHEMA = {
  type: "object",
  properties: {
    titulo: { type: "string", description: "título curto em inglês" },
    texto: { type: "string", description: "o texto em inglês, parágrafos separados por linha em branco" },
  },
  required: ["titulo", "texto"],
  additionalProperties: false,
};
const NIVEIS = {
  basico: "básico (A1-A2): frases curtas, presente simples, palavras muito comuns, de 150 a 250 palavras",
  intermediario: "intermediário (B1-B2): frases variadas, passado e futuro, algumas expressões comuns, de 250 a 400 palavras",
  avancado: "avançado (C1): vocabulário rico, expressões idiomáticas e frases longas, de 400 a 600 palavras",
};
const textoPrompt = (sabe, nivel, tema) => `Escreva um texto em inglês para um brasileiro que está aprendendo inglês.
Nível: ${NIVEIS[nivel]}.
Tema: ${tema || "livre, uma história ou situação do dia a dia"}.
Use sempre que der estas palavras que a pessoa já sabe: ${sabe || "(ainda poucas)"}.
Separe os parágrafos com uma linha em branco e dê um título curto em inglês.

Responda só com JSON, sem texto antes ou depois, neste formato:
{"titulo": "...", "texto": "..."}`;

const PROMPTS = {
  palavras: (sabe, existentes) => `Sou brasileiro e estou aprendendo inglês do zero.
Palavras e phrasal verbs que eu já sei: ${sabe || "(ainda nenhuma)"}.
Palavras que já estão no meu app (não repita nenhuma): ${existentes}.

Sugira exatamente ${QTD} palavras novas em inglês, úteis no dia a dia, um passo acima do que eu já sei.
Para cada uma: a palavra (en), a tradução mais comum (pt), um exemplo curto e simples em inglês que use palavras que eu já sei (exEn) e a tradução do exemplo (exPt).

${FORMATO}`,
  traduzir: (sabe, existentes, palavra) => `Uma pessoa brasileira falou em inglês e o reconhecimento de voz entendeu: "${palavra}".

Se isso for uma palavra ou expressão curta real em inglês (pode estar no plural ou conjugada), responda com 1 item:
a forma básica em inglês (en), a tradução mais comum para o português do Brasil (pt), um exemplo curto e simples em inglês (exEn) e a tradução do exemplo (exPt).
Se não for inglês de verdade, responda {"itens": []}.

${FORMATO}`,
  frases: (sabe, existentes) => `Sou brasileiro e estou aprendendo inglês.
Palavras e phrasal verbs que eu já sei: ${sabe || "(ainda nenhuma)"}.
Frases que já estão no meu app (não repita nenhuma): ${existentes}.

Crie exatamente ${QTD} frases novas e curtas, do dia a dia, usando principalmente as palavras que eu já sei.
Para cada uma: a frase em inglês (en), a tradução (pt), uma resposta natural em inglês que alguém daria (exEn) e a tradução da resposta (exPt).

${FORMATO}`,
};

const cleanList = (v, max) => (Array.isArray(v) ? v : [])
  .filter((x) => typeof x === "string")
  .map((x) => x.trim().slice(0, 120))
  .filter(Boolean)
  .slice(0, max);

// Alguns modelos grátis escrevem texto em volta do JSON: pega só o JSON
function parseItens(text) {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < start) return [];
  const data = parseJSON(text.slice(start, end + 1));
  return Array.isArray(data) ? data : Array.isArray(data.itens) ? data.itens : [];
}

// Modelos grátis às vezes põem quebras de linha de verdade dentro das aspas (JSON inválido):
// troca por \n só dentro das strings
function fixNewlines(json) {
  let out = "";
  let inStr = false;
  let escaped = false;
  for (const ch of json) {
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      else if (ch === "\n") { out += "\\n"; continue; }
      else if (ch === "\r") continue;
      else if (ch === "\t") { out += "\\t"; continue; }
    } else if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}
function parseJSON(json) {
  try { return JSON.parse(json); } catch (e) { return JSON.parse(fixNewlines(json)); }
}

function parseObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try { return parseJSON(text.slice(start, end + 1)); } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });

  const senha = process.env.APP_SENHA;
  if (senha && req.headers["x-app-senha"] !== senha) return res.status(401).json({ erro: "Senha errada." });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ erro: "Falta configurar OPENROUTER_API_KEY na Vercel." });

  const body = req.body || {};
  const tipo = ["frases", "traduzir", "texto"].includes(body.tipo) ? body.tipo : "palavras";
  const nivel = NIVEIS[body.nivel] ? body.nivel : "basico";
  const tema = String(body.tema || "").trim().slice(0, 80);
  const palavra = String(body.palavra || "").trim().slice(0, 60);
  if (tipo === "traduzir" && !palavra) return res.status(400).json({ erro: "Falta a palavra." });
  const sabe = cleanList(body.conhecidas, 800).join(", ");
  const existentes = cleanList(body.existentes, 1500).join(" | ");

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Title": "Ingles em 30 dias",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: tipo === "texto" ? textoPrompt(sabe, nivel, tema) : PROMPTS[tipo](sabe, existentes, palavra) }],
        response_format: tipo === "texto"
          ? { type: "json_schema", json_schema: { name: "texto", strict: true, schema: TEXTO_SCHEMA } }
          : { type: "json_schema", json_schema: { name: "itens", strict: true, schema: SCHEMA } },
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.error) {
      const status = r.ok ? data.error.code : r.status;
      console.error("OpenRouter", status, data.error && data.error.message);
      const erro = status === 429
        ? "Limite grátis da IA atingido por hoje. Tente mais tarde."
        : status === 401 ? "Chave do OpenRouter inválida." : "A IA deu erro. Tente de novo.";
      return res.status(502).json({ erro });
    }
    const text = data.choices?.[0]?.message?.content || "";
    if (tipo === "texto") {
      const obj = parseObject(text);
      if (!obj || typeof obj.texto !== "string" || !obj.texto.trim()) {
        return res.status(502).json({ erro: "A IA respondeu num formato estranho. Tente de novo." });
      }
      return res.status(200).json({ titulo: String(obj.titulo || "").slice(0, 120), texto: obj.texto.slice(0, 12000) });
    }
    const itens = parseItens(text)
      .filter((f) => f && typeof f.en === "string" && typeof f.pt === "string")
      .slice(0, QTD);
    // em "traduzir", lista vazia quer dizer que não é uma palavra em inglês
    if (!itens.length && tipo !== "traduzir") return res.status(502).json({ erro: "A IA respondeu num formato estranho. Tente de novo." });
    return res.status(200).json({ itens });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ erro: "Não foi possível falar com a IA. Tente de novo." });
  }
}
