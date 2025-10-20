import puppeteer from "puppeteer";

export async function confirmarEntrega99Food(localizador, codigo) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    const url = "https://food-b-h5.99app.com/pt-BR/v2/confirmation-entrega/locator";
    await page.goto(url, { waitUntil: "networkidle2" });

    // Campo localizador
    const locatorInput = 'input[name="locator"]';
    await page.waitForSelector(locatorInput);
    await page.type(locatorInput, localizador, { delay: 80 });

    // Continuar
    const continueButton = 'button[type="submit"]';
    await page.click(continueButton);

    // Campo código
    const codeInput = 'input[name="code"]';
    await page.waitForSelector(codeInput);
    await page.type(codeInput, codigo, { delay: 80 });

    // Confirmar entrega
    await page.click(continueButton);

    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText.toLowerCase());

    const sucesso = text.includes("confirmada") || text.includes("sucesso");

    await browser.close();

    return {
      plataforma: "99Food",
      localizador,
      sucesso,
      mensagem: sucesso ? "✅ Entrega confirmada na 99Food" : "❌ Falha na confirmação 99Food",
    };
  } catch (err) {
    await browser.close();
    throw new Error("Erro no fluxo 99Food: " + err.message);
  }
}
