import puppeteer from "puppeteer";

export async function confirmarEntregaIFood(localizador, codigo) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const url = "https://confirmacao-entrega-propria.ifood.com.br/numero-pedido";
    await page.goto(url, { waitUntil: "networkidle2" });

    // Aguarda e digita o localizador (8 dígitos)
    const inputSelector = 'input[name="pedido"]';
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, localizador, { delay: 80 });

    // Avança
    const continueButton = 'button[type="submit"]';
    await page.click(continueButton);

    // Aguarda campo do código de confirmação
    const codeInput = 'input[name="codigo"]';
    await page.waitForSelector(codeInput);
    await page.type(codeInput, codigo, { delay: 80 });

    // Confirmar entrega
    const confirmButton = 'button[type="submit"]';
    await page.click(confirmButton);

    // Aguarda resposta e extrai texto
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText.toLowerCase());

    const sucesso = text.includes("entrega confirmada") || text.includes("sucesso");

    await browser.close();

    return {
      plataforma: "iFood",
      localizador,
      sucesso,
      mensagem: sucesso ? "✅ Entrega confirmada no iFood" : "❌ Falha na confirmação iFood",
    };
  } catch (err) {
    await browser.close();
    throw new Error("Erro no fluxo iFood: " + err.message);
  }
}
