import express from "express";
import cors from "cors";
import { confirmarEntregaIFood } from "./integrations/ifood.js";
import { confirmarEntrega99Food } from "./integrations/ninetyNineFood.js";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS LIBERADO PARA TESTES
app.use(cors({
  origin: '*',  // Aceita qualquer origem (apenas para desenvolvimento)
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware de log
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log('\n' + '='.repeat(60));
  console.log(` [${timestamp}] ${req.method} ${req.path}`);
  console.log(` Origin: ${req.headers.origin || 'Sem origin'}`);
  console.log(` Body:`, req.body);
  console.log('='.repeat(60));
  next();
});

app.get("/", (req, res) => {
  res.json({ 
    status: "online", 
    message: "ConfirmaTudo API está rodando! ",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      confirmar: "POST /confirmar-entrega"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/confirmar-entrega", async (req, res) => {
  const { localizador, codigo } = req.body;

  console.log(`\n Dados recebidos:`);
  console.log(`   Localizador: ${localizador || 'NÃO ENVIADO'}`);
  console.log(`   Código: ${codigo || 'NÃO ENVIADO'}`);

  if (!localizador || !codigo) {
    console.log(` Validação falhou: dados incompletos`);
    return res.status(400).json({ 
      sucesso: false,
      erro: "Informe o localizador e o código." 
    });
  }

  try {
    console.log(`\n Iniciando confirmação...`);
    
    const [resultadoIfood, resultado99] = await Promise.allSettled([
      confirmarEntregaIFood(localizador, codigo),
      confirmarEntrega99Food(localizador, codigo),
    ]);

    const sucessoIfood = resultadoIfood.status === "fulfilled" && resultadoIfood.value.sucesso;
    const sucesso99 = resultado99.status === "fulfilled" && resultado99.value.sucesso;

    if (sucessoIfood) {
      console.log(` [SUCCESS] Confirmado no iFood`);
      return res.json(resultadoIfood.value);
    }
    if (sucesso99) {
      console.log(` [SUCCESS] Confirmado na 99Food`);
      return res.json(resultado99.value);
    }

    console.log(` [ERROR] Nenhuma plataforma aceitou`);
    
    res.status(400).json({
      sucesso: false,
      mensagem: "Nenhuma confirmação foi aceita. Verifique os dados.",
      detalhes: {
        ifood: resultadoIfood.reason?.message || "Falhou",
        ninetyNine: resultado99.reason?.message || "Falhou",
      },
    });
  } catch (err) {
    console.error(` [ERROR] Erro no servidor:`, err);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: "Erro no servidor", 
      erro: err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ConfirmaTudo API rodando na porta ${PORT}`);
  console.log(` Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(` CORS: LIBERADO (*)  - Aceita qualquer origem`);
  console.log(` Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(` Aguardando requisições...\n`);
});