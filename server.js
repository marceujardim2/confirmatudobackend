import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  })
);

const PORT = process.env.PORT || 10000;

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    message: "ConfirmaTudo API está rodando!",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      confirmar: "POST /confirmar-entrega",
    },
  });
});

// 🧠 Função principal de confirmação
app.post("/confirmar-entrega", async (req, res) => {
  const { localizador, codigo } = req.body;

  if (!localizador || !codigo)
    return res.status(400).json({ error: "Localizador e código são obrigatórios" });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(90000);

    // Tentativa no iFood
    const ifoodResult = await tentarIfood(page, localizador, codigo);

    if (ifoodResult.success) {
      await browser.close();
      return res.json({ plataforma: "iFood", ...ifoodResult });
    }

    // Tentativa na 99Food
    const ninetyResult = await tentar99(page, localizador, codigo);
    await browser.close();

    if (ninetyResult.success) {
      return res.json({ plataforma: "99Food", ...ninetyResult });
    }

    return res.status(404).json({
      success: false,
      message: "Localizador inválido em ambas as plataformas.",
    });
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return res.status(500).json({ error: "Erro ao confirmar entrega." });
  }
});

// 🧭 Função auxiliar – iFood
async function tentarIfood(page, localizador, codigo) {
  try {
    await page.goto(process.env.IFOOD_URL, { waitUntil: "networkidle2" });

    await page.waitForSelector('input[name="locatorNumber"]', { visible: true });
    await page.type('input[name="locatorNumber"]', localizador);
    await page.click("button[type='submit']");
    await page.waitForTimeout(3000);

    const codigoInput = await page.$('input[name="code"]');
    if (codigoInput) {
      await page.type('input[name="code"]', codigo);
      await page.click("button[type='submit']");
      await page.waitForTimeout(4000);
      return { success: true, message: "Entrega confirmada no iFood!" };
    }

    return { success: false };
  } catch (error) {
    console.log("❌ Erro no iFood:", error.message);
    return { success: false };
  }
}

// 🧭 Função auxiliar – 99Food
async function tentar99(page, localizador, codigo) {
  try {
    await page.goto(process.env.NINENINE_URL, { waitUntil: "networkidle2" });

    await page.waitForSelector('input[name="locatorNumber"]', { visible: true });
    await page.type('input[name="locatorNumber"]', localizador);
    await page.click("button");
    await page.waitForTimeout(3000);

    const codigoInput = await page.$('input[name="code"]');
    if (codigoInput) {
      await page.type('input[name="code"]', codigo);
      await page.click("button");
      await page.waitForTimeout(4000);
      return { success: true, message: "Entrega confirmada na 99Food!" };
    }

    return { success: false };
  } catch (error) {
    console.log("❌ Erro na 99Food:", error.message);
    return { success: false };
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
