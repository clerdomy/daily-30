// Função da Vercel: pede ao Gemini 10 palavras ou frases novas para estudar.
// Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   GEMINI_API_KEY  chave grátis do Google AI Studio (obrigatória)
//   APP_SENHA       senha para só você usar a IA (opcional, mas recomendada)
//   GEMINI_MODEL    modelo do Gemini (opcional, padrão abaixo)
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const QTD = 10;

const SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      en: { type: "STRING", description: "a palavra ou frase em inglês" },
      pt: { type: "STRING", description: "tradução para o português do Brasil" },
      exEn: { type: "STRING", description: "exemplo curto em inglês (para frases: uma resposta natural)" },
      exPt: { type: "STRING", description: "tradução do exemplo" },
    },
    required: ["en", "pt", "exEn", "exPt"],
  },
};

const PROMPTS = {
  palavras: (sabe, existentes) => `Sou brasileiro e estou aprendendo inglês do zero.
Palavras e phrasal verbs que eu já sei: ${sabe || "(ainda nenhuma)"}.
Palavras que já estão no meu app (não repita nenhuma): ${existentes}.

Sugira exatamente ${QTD} palavras novas em inglês, úteis no dia a dia, um passo acima do que eu já sei.
Para cada uma: a palavra (en), a tradução mais comum (pt), um exemplo curto e simples em inglês que use palavras que eu já sei (exEn) e a tradução do exemplo (exPt).`,
  frases: (sabe, existentes) => `Sou brasileiro e estou aprendendo inglês.
Palavras e phrasal verbs que eu já sei: ${sabe || "(ainda nenhuma)"}.
Frases que já estão no meu app (não repita nenhuma): ${existentes}.

Crie exatamente ${QTD} frases novas e curtas, do dia a dia, usando principalmente as palavras que eu já sei.
Para cada uma: a frase em inglês (en), a tradução (pt), uma resposta natural em inglês que alguém daria (exEn) e a tradução da resposta (exPt).`,
};

const cleanList = (v, max) => (Array.isArray(v) ? v : [])
  .filter((x) => typeof x === "string")
  .map((x) => x.trim().slice(0, 120))
  .filter(Boolean)
  .slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." });

  const senha = process.env.APP_SENHA;
  if (senha && req.headers["x-app-senha"] !== senha) return res.status(401).json({ erro: "Senha errada." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ erro: "Falta configurar GEMINI_API_KEY na Vercel." });

  const body = req.body || {};
  const tipo = body.tipo === "frases" ? "frases" : "palavras";
  const sabe = cleanList(body.conhecidas, 800).join(", ");
  const existentes = cleanList(body.existentes, 1500).join(" | ");

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPTS[tipo](sabe, existentes) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.9 },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      const limite = r.status === 429;
      console.error("Gemini", r.status, data.error && data.error.message);
      return res.status(502).json({ erro: limite ? "Limite grátis da IA atingido. Tente mais tarde." : "A IA deu erro. Tente de novo." });
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "[]";
    const itens = JSON.parse(text)
      .filter((f) => f && typeof f.en === "string" && typeof f.pt === "string")
      .slice(0, QTD);
    return res.status(200).json({ itens });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ erro: "Não foi possível falar com a IA. Tente de novo." });
  }
}
