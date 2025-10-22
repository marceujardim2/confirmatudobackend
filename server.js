// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { confirmOnIfood, confirmOn99 } from "./integrations/sites.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 30,
});
app.use(limiter);

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    message: "ConfirmaTudo API está rodando!",
    version: "1.0.0",
    endpoints: { health: "/health", confirmar: "POST /confirmar-entrega" },
  });
});

/**
 * POST /confirmar-entrega
 * Body: { localizador: string, codigo: string }
 *
 * O endpoint tenta iFood primeiro; se não aceitar o localizador,
 * tenta 99Food. Retorna o site que aceitou ou erro.
 */
app.post("/confirmar-entrega", async (req, res) => {
  try {
    const { localizador, codigo } = req.body;
    if (!localizador || !codigo) {
      return res.status(400).json({ mensagem: "Informe localizador (8 dígitos) e codigo (4 dígitos)." });
    }

    // normaliza (strings)
    const loc = String(localizador).trim();
    const cod = String(codigo).trim();

    // Tentativa iFood
    const ifoodResult = await confirmOnIfood({ localizador: loc, codigo: cod, env: process.env });
    if (ifoodResult && ifoodResult.success) {
      return res.json({ mensagem: ifoodResult.mensagem, plataforma: "iFood", details: ifoodResult.details || null });
    }

    // Se iFood não aceitou, tenta 99
    const n99Result = await confirmOn99({ localizador: loc, codigo: cod, env: process.env });
    if (n99Result && n99Result.success) {
      return res.json({ mensagem: n99Result.mensagem, plataforma: "99Food", details: n99Result.details || null });
    }

    // Nenhuma das plataformas aceitou
    return res.status(400).json({
      mensagem:
        ifoodResult?.mensagem ||
        n99Result?.mensagem ||
        "Nenhuma plataforma aceitou o localizador/código. Verifique se o localizador e o código estão corretos.",
      plataforma: "nenhuma",
      details: { ifood: ifoodResult, n99: n99Result },
    });
  } catch (err) {
    console.error("Erro /confirmar-entrega:", err);
    return res.status(500).json({ mensagem: "Erro interno no servidor." });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
