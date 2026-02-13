const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// ============ CONFIGURAÇÕES ============
const ADMIN_FIXO = {
  usuario: 'adminmaster',
  senha: 'torneiods3rachas',
  nome: 'Admin Master'
};
const SECRET = 'ds3-torneio-secret-key';

// ============ BANCO DE DADOS EM MEMÓRIA - FUTSAL E VÔLEI ============
let bancoDeDados = {
  // ===== FUTSAL =====
  futsal: {
    times: [],
    partidas: [],
    artilheiros: [],
    melhoresJogadores: [],
    melhoresGoleiros: [],
    proximoId: 1
  },
  // ===== VÔLEI =====
  volei: {
    times: [],
    partidas: [],
    artilheiros: [],     // Maiores pontuadores
    melhoresJogadores: [], // Melhores jogadores
    melhoresGoleiros: [],  // Melhores defensores/líberos
    proximoId: 1
  }
};

// ============ FUNÇÃO PARA EXTRAIR TOKEN ============
const extractToken = (req) => {
  let token = req.headers.authorization;
  if (token && token.startsWith('Bearer ')) {
    return token.slice(7);
  }
  if (req.headers['x-auth-token']) {
    return req.headers['x-auth-token'];
  }
  if (req.query.token) {
    return req.query.token;
  }
  return null;
};

// ============ AUTENTICAÇÃO (igual) ============
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
      admin: { 
        nome: ADMIN_FIXO.nome, 
        usuario: ADMIN_FIXO.usuario 
      } 
    });
  } else {
    res.status(401).json({ msg: 'Usuário ou senha inválidos' });
  }
});

app.get('/api/auth/verificar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Token não encontrado' });
  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ 
      nome: decoded.nome, 
      usuario: decoded.usuario 
    });
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
});

// ======================================================================
// ==================== FUTSAL (MESMO CÓDIGO DE ANTES) ==================
// ======================================================================

// ---------- TIMES FUTSAL ----------
app.get('/api/futsal/times', (req, res) => {
  res.json(bancoDeDados.futsal.times || []);
});

app.post('/api/futsal/times', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, sigla } = req.body;
    
    const novoTime = {
      id: bancoDeDados.futsal.proximoId++,
      nome,
      sigla: sigla.toUpperCase(),
      status: 'ativo',
      jogadores: [],
      criadoEm: new Date().toISOString()
    };
    
    bancoDeDados.futsal.times.push(novoTime);
    res.status(201).json(novoTime);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ---------- RANKINGS FUTSAL ----------
app.get('/api/futsal/ranking/artilheiros', (req, res) => {
  res.json(bancoDeDados.futsal.artilheiros || []);
});

app.post('/api/futsal/ranking/artilheiros', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols } = req.body;
    const novo = {
      id: bancoDeDados.futsal.proximoId++,
      nome,
      time,
      gols: parseInt(gols) || 1
    };
    if (!bancoDeDados.futsal.artilheiros) bancoDeDados.futsal.artilheiros = [];
    bancoDeDados.futsal.artilheiros.push(novo);
    bancoDeDados.futsal.artilheiros.sort((a, b) => b.gols - a.gols);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/futsal/ranking/artilheiros/:id/incrementar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const artilheiro = bancoDeDados.futsal.artilheiros?.find(a => a.id === id);
    if (artilheiro) {
      artilheiro.gols += 1;
      bancoDeDados.futsal.artilheiros.sort((a, b) => b.gols - a.gols);
      res.json(artilheiro);
    } else {
      res.status(404).json({ msg: 'Artilheiro não encontrado' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/futsal/ranking/artilheiros/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.futsal.artilheiros = (bancoDeDados.futsal.artilheiros || []).filter(a => a.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// Melhores Jogadores FUTSAL
app.get('/api/futsal/ranking/melhores-jogadores', (req, res) => {
  res.json(bancoDeDados.futsal.melhoresJogadores || []);
});

app.post('/api/futsal/ranking/melhores-jogadores', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols, assistencias } = req.body;
    const golsNum = parseInt(gols) || 0;
    const assistenciasNum = parseInt(assistencias) || 0;
    const novo = {
      id: bancoDeDados.futsal.proximoId++,
      nome,
      time,
      gols: golsNum,
      assistencias: assistenciasNum,
      pontuacao: golsNum + assistenciasNum
    };
    if (!bancoDeDados.futsal.melhoresJogadores) bancoDeDados.futsal.melhoresJogadores = [];
    bancoDeDados.futsal.melhoresJogadores.push(novo);
    bancoDeDados.futsal.melhoresJogadores.sort((a, b) => b.pontuacao - a.pontuacao);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/futsal/ranking/melhores-jogadores/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.futsal.melhoresJogadores = (bancoDeDados.futsal.melhoresJogadores || []).filter(j => j.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// Melhores Goleiros FUTSAL
app.get('/api/futsal/ranking/melhores-goleiros', (req, res) => {
  res.json(bancoDeDados.futsal.melhoresGoleiros || []);
});

app.post('/api/futsal/ranking/melhores-goleiros', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, time, defesas } = req.body;
    const novo = {
      id: bancoDeDados.futsal.proximoId++,
      nome,
      time,
      defesas: parseInt(defesas) || 1
    };
    if (!bancoDeDados.futsal.melhoresGoleiros) bancoDeDados.futsal.melhoresGoleiros = [];
    bancoDeDados.futsal.melhoresGoleiros.push(novo);
    bancoDeDados.futsal.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/futsal/ranking/melhores-goleiros/:id/incrementar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const goleiro = bancoDeDados.futsal.melhoresGoleiros?.find(g => g.id === id);
    if (goleiro) {
      goleiro.defesas += 1;
      bancoDeDados.futsal.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
      res.json(goleiro);
    } else {
      res.status(404).json({ msg: 'Goleiro não encontrado' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/futsal/ranking/melhores-goleiros/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.futsal.melhoresGoleiros = (bancoDeDados.futsal.melhoresGoleiros || []).filter(g => g.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// Limpar Rankings FUTSAL
app.delete('/api/futsal/ranking/limpar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.futsal.artilheiros = [];
    bancoDeDados.futsal.melhoresJogadores = [];
    bancoDeDados.futsal.melhoresGoleiros = [];
    res.json({ msg: 'Rankings de futsal limpos' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ---------- PARTIDAS FUTSAL ----------
app.get('/api/futsal/partidas', (req, res) => {
  res.json(bancoDeDados.futsal.partidas || []);
});

app.post('/api/futsal/partidas', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { fase, timeCasaId, timeVisitanteId, data, local } = req.body;
    const timeCasa = bancoDeDados.futsal.times.find(t => t.id == timeCasaId);
    const timeVisitante = bancoDeDados.futsal.times.find(t => t.id == timeVisitanteId);
    if (!timeCasa || !timeVisitante) {
      return res.status(404).json({ msg: 'Time não encontrado' });
    }
    const novaPartida = {
      id: bancoDeDados.futsal.proximoId++,
      fase,
      timeCasa,
      timeVisitante,
      golsCasa: 0,
      golsVisitante: 0,
      status: 'agendada',
      data: data || new Date().toISOString(),
      local: local || 'Ginásio DS3',
      vencedor: null,
      perdedor: null,
      criadoEm: new Date().toISOString()
    };
    if (!bancoDeDados.futsal.partidas) bancoDeDados.futsal.partidas = [];
    bancoDeDados.futsal.partidas.push(novaPartida);
    res.status(201).json(novaPartida);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/futsal/partidas/:id/resultado', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    const { golsCasa, golsVisitante } = req.body;
    const partida = bancoDeDados.futsal.partidas?.find(p => p.id == id);
    if (!partida) return res.status(404).json({ msg: 'Partida não encontrada' });
    
    partida.golsCasa = golsCasa;
    partida.golsVisitante = golsVisitante;
    partida.status = 'finalizada';
    
    if (golsCasa > golsVisitante) {
      partida.vencedor = partida.timeCasa;
      partida.perdedor = partida.timeVisitante;
    } else if (golsVisitante > golsCasa) {
      partida.vencedor = partida.timeVisitante;
      partida.perdedor = partida.timeCasa;
    } else {
      partida.vencedor = partida.timeCasa;
      partida.perdedor = partida.timeVisitante;
    }
    
    if (partida.perdedor) {
      const timePerdedor = bancoDeDados.futsal.times.find(t => t.id == partida.perdedor.id);
      if (timePerdedor) timePerdedor.status = 'eliminado';
    }
    
    if (partida.fase === 'final' && partida.vencedor) {
      const timeCampeao = bancoDeDados.futsal.times.find(t => t.id == partida.vencedor.id);
      if (timeCampeao) timeCampeao.status = 'campeao';
    }
    
    res.json(partida);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/futsal/partidas/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    bancoDeDados.futsal.partidas = (bancoDeDados.futsal.partidas || []).filter(p => p.id != id);
    res.json({ msg: 'Partida removida com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/futsal/partidas', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.futsal.partidas = [];
    res.json({ msg: 'Todas as partidas de futsal foram removidas' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ======================================================================
// ====================== VÔLEI (ADAPTADO) ==============================
// ======================================================================

// ---------- TIMES VÔLEI ----------
app.get('/api/volei/times', (req, res) => {
  res.json(bancoDeDados.volei.times || []);
});

app.post('/api/volei/times', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, sigla } = req.body;
    const novoTime = {
      id: bancoDeDados.volei.proximoId++,
      nome,
      sigla: sigla.toUpperCase(),
      status: 'ativo',
      jogadores: [],
      criadoEm: new Date().toISOString()
    };
    bancoDeDados.volei.times.push(novoTime);
    res.status(201).json(novoTime);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ---------- RANKINGS VÔLEI ----------
// Artilheiros = Maiores pontuadores
app.get('/api/volei/ranking/artilheiros', (req, res) => {
  res.json(bancoDeDados.volei.artilheiros || []);
});

app.post('/api/volei/ranking/artilheiros', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols } = req.body; // gols = pontos
    const novo = {
      id: bancoDeDados.volei.proximoId++,
      nome,
      time,
      pontos: parseInt(gols) || 1
    };
    if (!bancoDeDados.volei.artilheiros) bancoDeDados.volei.artilheiros = [];
    bancoDeDados.volei.artilheiros.push(novo);
    bancoDeDados.volei.artilheiros.sort((a, b) => b.pontos - a.pontos);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/volei/ranking/artilheiros/:id/incrementar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const jogador = bancoDeDados.volei.artilheiros?.find(a => a.id === id);
    if (jogador) {
      jogador.pontos += 1;
      bancoDeDados.volei.artilheiros.sort((a, b) => b.pontos - a.pontos);
      res.json(jogador);
    } else {
      res.status(404).json({ msg: 'Jogador não encontrado' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/volei/ranking/artilheiros/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.volei.artilheiros = (bancoDeDados.volei.artilheiros || []).filter(a => a.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// Melhores Jogadores VÔLEI
app.get('/api/volei/ranking/melhores-jogadores', (req, res) => {
  res.json(bancoDeDados.volei.melhoresJogadores || []);
});

app.post('/api/volei/ranking/melhores-jogadores', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols, assistencias } = req.body; // pontos, saques, bloqueios
    const pontosNum = parseInt(gols) || 0;
    const saquesNum = parseInt(assistencias) || 0;
    const novo = {
      id: bancoDeDados.volei.proximoId++,
      nome,
      time,
      pontos: pontosNum,
      saques: saquesNum,
      pontuacao: pontosNum + saquesNum
    };
    if (!bancoDeDados.volei.melhoresJogadores) bancoDeDados.volei.melhoresJogadores = [];
    bancoDeDados.volei.melhoresJogadores.push(novo);
    bancoDeDados.volei.melhoresJogadores.sort((a, b) => b.pontuacao - a.pontuacao);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/volei/ranking/melhores-jogadores/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.volei.melhoresJogadores = (bancoDeDados.volei.melhoresJogadores || []).filter(j => j.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// Melhores Defensores/Líberos VÔLEI
app.get('/api/volei/ranking/melhores-goleiros', (req, res) => {
  res.json(bancoDeDados.volei.melhoresGoleiros || []);
});

app.post('/api/volei/ranking/melhores-goleiros', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { nome, time, defesas } = req.body; // defesas = defesas/recuperações
    const novo = {
      id: bancoDeDados.volei.proximoId++,
      nome,
      time,
      defesas: parseInt(defesas) || 1
    };
    if (!bancoDeDados.volei.melhoresGoleiros) bancoDeDados.volei.melhoresGoleiros = [];
    bancoDeDados.volei.melhoresGoleiros.push(novo);
    bancoDeDados.volei.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/volei/ranking/melhores-goleiros/:id/incrementar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const defensor = bancoDeDados.volei.melhoresGoleiros?.find(g => g.id === id);
    if (defensor) {
      defensor.defesas += 1;
      bancoDeDados.volei.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
      res.json(defensor);
    } else {
      res.status(404).json({ msg: 'Defensor não encontrado' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/volei/ranking/melhores-goleiros/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.volei.melhoresGoleiros = (bancoDeDados.volei.melhoresGoleiros || []).filter(g => g.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// Limpar Rankings VÔLEI
app.delete('/api/volei/ranking/limpar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.volei.artilheiros = [];
    bancoDeDados.volei.melhoresJogadores = [];
    bancoDeDados.volei.melhoresGoleiros = [];
    res.json({ msg: 'Rankings de vôlei limpos' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ---------- PARTIDAS VÔLEI ----------
app.get('/api/volei/partidas', (req, res) => {
  res.json(bancoDeDados.volei.partidas || []);
});

app.post('/api/volei/partidas', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { fase, timeCasaId, timeVisitanteId, data, local } = req.body;
    const timeCasa = bancoDeDados.volei.times.find(t => t.id == timeCasaId);
    const timeVisitante = bancoDeDados.volei.times.find(t => t.id == timeVisitanteId);
    if (!timeCasa || !timeVisitante) {
      return res.status(404).json({ msg: 'Time não encontrado' });
    }
    const novaPartida = {
      id: bancoDeDados.volei.proximoId++,
      fase,
      timeCasa,
      timeVisitante,
      setsCasa: 0,
      setsVisitante: 0,
      status: 'agendada',
      data: data || new Date().toISOString(),
      local: local || 'Quadra DS3',
      vencedor: null,
      perdedor: null,
      criadoEm: new Date().toISOString()
    };
    if (!bancoDeDados.volei.partidas) bancoDeDados.volei.partidas = [];
    bancoDeDados.volei.partidas.push(novaPartida);
    res.status(201).json(novaPartida);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/volei/partidas/:id/resultado', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    const { setsCasa, setsVisitante } = req.body;
    const partida = bancoDeDados.volei.partidas?.find(p => p.id == id);
    if (!partida) return res.status(404).json({ msg: 'Partida não encontrada' });
    
    partida.setsCasa = setsCasa;
    partida.setsVisitante = setsVisitante;
    partida.status = 'finalizada';
    
    if (setsCasa > setsVisitante) {
      partida.vencedor = partida.timeCasa;
      partida.perdedor = partida.timeVisitante;
    } else if (setsVisitante > setsCasa) {
      partida.vencedor = partida.timeVisitante;
      partida.perdedor = partida.timeCasa;
    } else {
      partida.vencedor = partida.timeCasa;
      partida.perdedor = partida.timeVisitante;
    }
    
    if (partida.perdedor) {
      const timePerdedor = bancoDeDados.volei.times.find(t => t.id == partida.perdedor.id);
      if (timePerdedor) timePerdedor.status = 'eliminado';
    }
    
    if (partida.fase === 'final' && partida.vencedor) {
      const timeCampeao = bancoDeDados.volei.times.find(t => t.id == partida.vencedor.id);
      if (timeCampeao) timeCampeao.status = 'campeao';
    }
    
    res.json(partida);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/volei/partidas/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    bancoDeDados.volei.partidas = (bancoDeDados.volei.partidas || []).filter(p => p.id != id);
    res.json({ msg: 'Partida removida com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/volei/partidas', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.volei.partidas = [];
    res.json({ msg: 'Todas as partidas de vôlei foram removidas' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ ROTA DE TESTE ============
app.get('/', (req, res) => {
  res.json({ 
    message: '🔥 API Torneio DS3 - FUTSAL + VÔLEI',
    admin: ADMIN_FIXO.usuario,
    endpoints: {
      futsal: '/api/futsal/...',
      volei: '/api/volei/...'
    }
  });
});

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👤 Admin: ${ADMIN_FIXO.usuario} / ${ADMIN_FIXO.senha}`);
  console.log(`✅ FUTSAL e VÔLEI separados!`);
  console.log(`✅ FUTSAL: /api/futsal/...`);
  console.log(`✅ VÔLEI: /api/volei/...`);
});