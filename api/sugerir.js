// Função da Vercel: pede à IA (OpenRouter, modelos grátis) 10 palavras ou frases novas para estudar.
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
  const data = JSON.parse(text.slice(start, end + 1));
  return Array.isArray(data) ? data : Array.isArray(data.itens) ? data.itens : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });

  const senha = process.env.APP_SENHA;
  if (senha && req.headers["x-app-senha"] !== senha) return res.status(401).json({ erro: "Senha errada." });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ erro: "Falta configurar OPENROUTER_API_KEY na Vercel." });

  const body = req.body || {};
  const tipo = ["frases", "traduzir"].includes(body.tipo) ? body.tipo : "palavras";
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
        messages: [{ role: "user", content: PROMPTS[tipo](sabe, existentes, palavra) }],
        response_format: { type: "json_schema", json_schema: { name: "itens", strict: true, schema: SCHEMA } },
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
