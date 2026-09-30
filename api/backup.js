// Função da Vercel: guarda e devolve o backup do progresso (Vercel Blob, arquivo privado).
// Cada aparelho tem um código de backup; o arquivo fica em backups/<código>.json.
// Precisa de um Blob Store ligado ao projeto (Vercel > Storage > Create > Blob),
// que cria a variável BLOB_READ_WRITE_TOKEN sozinho. APP_SENHA vale aqui também.
import { get, put } from "@vercel/blob";

const CODE = /^[a-z0-9]{12,40}$/;
const MAX_BYTES = 2_000_000;

export default async function handler(req, res) {
  const senha = process.env.APP_SENHA;
  if (senha && req.headers["x-app-senha"] !== senha) return res.status(401).json({ erro: "Senha errada." });

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return res.status(503).json({ erro: "Backup online não configurado: crie um Blob Store na Vercel." });
  }

  const raw = req.method === "GET" ? req.query.codigo : req.body && req.body.codigo;
  const codigo = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!CODE.test(codigo)) return res.status(400).json({ erro: "Código de backup inválido." });
  const path = `backups/${codigo}.json`;

  try {
    if (req.method === "POST") {
      const dados = req.body && req.body.dados;
      if (!dados || typeof dados !== "object" || !dados.tracks) return res.status(400).json({ erro: "Backup vazio." });
      const json = JSON.stringify(dados);
      if (json.length > MAX_BYTES) return res.status(413).json({ erro: "Backup grande demais." });
      await put(path, json, { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });
      return res.status(200).json({ ok: true, em: new Date().toISOString() });
    }
    if (req.method === "GET") {
      const r = await get(path, { access: "private", useCache: false });
      if (!r || r.statusCode !== 200) return res.status(404).json({ erro: "Nenhum backup com esse código." });
      const dados = JSON.parse(await new Response(r.stream).text());
      return res.status(200).json({ dados });
    }
    return res.status(405).json({ erro: "Use GET ou POST." });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ erro: "Não foi possível acessar o backup online." });
  }
}
