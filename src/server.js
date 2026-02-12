const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// DADOS FIXOS DO ADMIN
const ADMIN_FIXO = {
  usuario: 'adminmaster',
  senha: 'torneiods3rachas',
  nome: 'Admin Master'
};

const SECRET = 'ds3-torneio-secret-key';

// BANCO DE DADOS EM MEMÓRIA (COMPARTILHADO!)
let bancoDeDados = {
  times: [],
  jogadores: [],
  partidas: [],
  proximoId: 1,
  
  // ===== RANKINGS COMPARTILHADOS =====
  artilheiros: [
    // Exemplo inicial (opcional)
    // { id: 1, nome: "Cristiano Ronaldo", time: "DS3 FC", gols: 5 },
    // { id: 2, nome: "Lionel Messi", time: "Code FC", gols: 4 }
  ],
  melhoresJogadores: [
    // { id: 1, nome: "Neymar Jr", time: "Dev United", gols: 3, assistencias: 2, pontuacao: 5 }
  ],
  melhoresGoleiros: [
    // { id: 1, nome: "Alisson", time: "DS3 FC", defesas: 10 }
  ]
};

// ============ AUTENTICAÇÃO ============
app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body;
  
  if (usuario === ADMIN_FIXO.usuario && senha === ADMIN_FIXO.senha) {
    const token = jwt.sign(
      { usuario: ADMIN_FIXO.usuario, nome: ADMIN_FIXO.nome },
      SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      admin: { nome: ADMIN_FIXO.nome, usuario: ADMIN_FIXO.usuario }
    });
  } else {
    res.status(401).json({ msg: 'Usuário ou senha inválidos' });
  }
});

app.get('/api/auth/verificar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ msg: 'Token não encontrado' });
  }
  
  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ nome: decoded.nome, usuario: decoded.usuario });
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
});

// ============ TIMES ============
app.get('/api/times', (req, res) => {
  res.json(bancoDeDados.times);
});

app.post('/api/times', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, sigla, cidade, tecnico } = req.body;
    
    const novoTime = {
      id: bancoDeDados.proximoId++,
      nome,
      sigla: sigla.toUpperCase(),
      cidade: cidade || '',
      tecnico: tecnico || '',
      status: 'ativo',
      jogadores: [],
      criadoEm: new Date().toISOString()
    };
    
    bancoDeDados.times.push(novoTime);
    res.status(201).json(novoTime);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ RANKINGS ============
// GET - Buscar rankings (PÚBLICO - não precisa de token)
app.get('/api/ranking/artilheiros', (req, res) => {
  res.json(bancoDeDados.artilheiros);
});

app.get('/api/ranking/melhores-jogadores', (req, res) => {
  res.json(bancoDeDados.melhoresJogadores);
});

app.get('/api/ranking/melhores-goleiros', (req, res) => {
  res.json(bancoDeDados.melhoresGoleiros);
});

// POST - Adicionar artilheiro (SÓ ADMIN)
app.post('/api/ranking/artilheiros', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols } = req.body;
    
    const novoArtilheiro = {
      id: bancoDeDados.proximoId++,
      nome,
      time,
      gols: parseInt(gols) || 1
    };
    
    bancoDeDados.artilheiros.push(novoArtilheiro);
    // Ordenar por gols
    bancoDeDados.artilheiros.sort((a, b) => b.gols - a.gols);
    
    res.status(201).json(novoArtilheiro);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// POST - Adicionar melhor jogador (SÓ ADMIN)
app.post('/api/ranking/melhores-jogadores', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols, assistencias } = req.body;
    
    const golsNum = parseInt(gols) || 0;
    const assistenciasNum = parseInt(assistencias) || 0;
    
    const novoJogador = {
      id: bancoDeDados.proximoId++,
      nome,
      time,
      gols: golsNum,
      assistencias: assistenciasNum,
      pontuacao: golsNum + assistenciasNum
    };
    
    bancoDeDados.melhoresJogadores.push(novoJogador);
    // Ordenar por pontuação
    bancoDeDados.melhoresJogadores.sort((a, b) => b.pontuacao - a.pontuacao);
    
    res.status(201).json(novoJogador);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// POST - Adicionar goleiro (SÓ ADMIN)
app.post('/api/ranking/melhores-goleiros', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, time, defesas } = req.body;
    
    const novoGoleiro = {
      id: bancoDeDados.proximoId++,
      nome,
      time,
      defesas: parseInt(defesas) || 1
    };
    
    bancoDeDados.melhoresGoleiros.push(novoGoleiro);
    // Ordenar por defesas
    bancoDeDados.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
    
    res.status(201).json(novoGoleiro);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// PUT - Incrementar gols (SÓ ADMIN)
app.put('/api/ranking/artilheiros/:id/incrementar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const artilheiro = bancoDeDados.artilheiros.find(a => a.id === id);
    
    if (artilheiro) {
      artilheiro.gols += 1;
      bancoDeDados.artilheiros.sort((a, b) => b.gols - a.gols);
      res.json(artilheiro);
    } else {
      res.status(404).json({ msg: 'Artilheiro não encontrado' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// PUT - Incrementar defesas (SÓ ADMIN)
app.put('/api/ranking/melhores-goleiros/:id/incrementar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const goleiro = bancoDeDados.melhoresGoleiros.find(g => g.id === id);
    
    if (goleiro) {
      goleiro.defesas += 1;
      bancoDeDados.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
      res.json(goleiro);
    } else {
      res.status(404).json({ msg: 'Goleiro não encontrado' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// DELETE - Remover do ranking (SÓ ADMIN)
app.delete('/api/ranking/artilheiros/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.artilheiros = bancoDeDados.artilheiros.filter(a => a.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/ranking/melhores-jogadores/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.melhoresJogadores = bancoDeDados.melhoresJogadores.filter(j => j.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/ranking/melhores-goleiros/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.melhoresGoleiros = bancoDeDados.melhoresGoleiros.filter(g => g.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// DELETE - Limpar todos os rankings (SÓ ADMIN)
app.delete('/api/ranking/limpar', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.artilheiros = [];
    bancoDeDados.melhoresJogadores = [];
    bancoDeDados.melhoresGoleiros = [];
    res.json({ msg: 'Rankings limpos com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ CHAVEAMENTO ============
app.post('/api/partidas/chaveamento', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    
    const timesAtivos = bancoDeDados.times.filter(t => t.status === 'ativo').slice(0, 8);
    
    if (timesAtivos.length < 8) {
      return res.status(400).json({ msg: `É necessário 8 times ativos. Você tem ${timesAtivos.length}` });
    }
    
    const times = [...timesAtivos].sort(() => Math.random() - 0.5);
    
    const quartas = [];
    for (let i = 0; i < 4; i++) {
      const partida = {
        id: bancoDeDados.proximoId++,
        fase: 'quartas',
        timeCasa: times[i*2],
        timeVisitante: times[i*2 + 1],
        golsCasa: 0,
        golsVisitante: 0,
        status: 'agendada',
        data: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
        local: 'Estádio DS3'
      };
      bancoDeDados.partidas.push(partida);
      quartas.push(partida);
    }
    
    res.json({ message: 'Chaveamento gerado!', partidas: quartas });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.get('/api/partidas', (req, res) => {
  res.json(bancoDeDados.partidas);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👤 Admin: ${ADMIN_FIXO.usuario} / ${ADMIN_FIXO.senha}`);
  console.log(`📊 Rankings compartilhados - TODO MUNDO VÊ OS MESMOS DADOS!`);
});