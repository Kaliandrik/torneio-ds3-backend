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

// ============ BANCO DE DADOS EM MEMÓRIA ============
let bancoDeDados = {
  times: [],
  partidas: [],
  artilheiros: [],
  melhoresJogadores: [],
  melhoresGoleiros: [],
  proximoId: 1
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

// ============ TIMES ============
app.get('/api/times', (req, res) => {
  res.json(bancoDeDados.times || []);
});

app.post('/api/times', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, sigla } = req.body;
    
    const novoTime = {
      id: bancoDeDados.proximoId++,
      nome,
      sigla: sigla.toUpperCase(),
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

// ============ RANKINGS - ARTILHEIROS ============
app.get('/api/ranking/artilheiros', (req, res) => {
  res.json(bancoDeDados.artilheiros || []);
});

app.post('/api/ranking/artilheiros', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols } = req.body;
    
    const novo = {
      id: bancoDeDados.proximoId++,
      nome,
      time,
      gols: parseInt(gols) || 1
    };
    
    if (!bancoDeDados.artilheiros) bancoDeDados.artilheiros = [];
    bancoDeDados.artilheiros.push(novo);
    bancoDeDados.artilheiros.sort((a, b) => b.gols - a.gols);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/ranking/artilheiros/:id/incrementar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const artilheiro = bancoDeDados.artilheiros?.find(a => a.id === id);
    
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

app.delete('/api/ranking/artilheiros/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.artilheiros = (bancoDeDados.artilheiros || []).filter(a => a.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ RANKINGS - MELHORES JOGADORES ============
app.get('/api/ranking/melhores-jogadores', (req, res) => {
  res.json(bancoDeDados.melhoresJogadores || []);
});

app.post('/api/ranking/melhores-jogadores', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, time, gols, assistencias } = req.body;
    
    const golsNum = parseInt(gols) || 0;
    const assistenciasNum = parseInt(assistencias) || 0;
    
    const novo = {
      id: bancoDeDados.proximoId++,
      nome,
      time,
      gols: golsNum,
      assistencias: assistenciasNum,
      pontuacao: golsNum + assistenciasNum
    };
    
    if (!bancoDeDados.melhoresJogadores) bancoDeDados.melhoresJogadores = [];
    bancoDeDados.melhoresJogadores.push(novo);
    bancoDeDados.melhoresJogadores.sort((a, b) => b.pontuacao - a.pontuacao);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/ranking/melhores-jogadores/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.melhoresJogadores = (bancoDeDados.melhoresJogadores || []).filter(j => j.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ RANKINGS - MELHORES GOLEIROS ============
app.get('/api/ranking/melhores-goleiros', (req, res) => {
  res.json(bancoDeDados.melhoresGoleiros || []);
});

app.post('/api/ranking/melhores-goleiros', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { nome, time, defesas } = req.body;
    
    const novo = {
      id: bancoDeDados.proximoId++,
      nome,
      time,
      defesas: parseInt(defesas) || 1
    };
    
    if (!bancoDeDados.melhoresGoleiros) bancoDeDados.melhoresGoleiros = [];
    bancoDeDados.melhoresGoleiros.push(novo);
    bancoDeDados.melhoresGoleiros.sort((a, b) => b.defesas - a.defesas);
    res.status(201).json(novo);
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/ranking/melhores-goleiros/:id/incrementar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    const goleiro = bancoDeDados.melhoresGoleiros?.find(g => g.id === id);
    
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

app.delete('/api/ranking/melhores-goleiros/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const id = parseInt(req.params.id);
    bancoDeDados.melhoresGoleiros = (bancoDeDados.melhoresGoleiros || []).filter(g => g.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ LIMPAR TODOS OS RANKINGS ============
app.delete('/api/ranking/limpar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.artilheiros = [];
    bancoDeDados.melhoresJogadores = [];
    bancoDeDados.melhoresGoleiros = [];
    res.json({ msg: 'Todos os rankings foram limpos' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ CHAVEAMENTO - PARTIDAS ============
app.get('/api/partidas', (req, res) => {
  res.json(bancoDeDados.partidas || []);
});

app.post('/api/partidas', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { fase, timeCasaId, timeVisitanteId, data, local } = req.body;
    
    const timeCasa = bancoDeDados.times.find(t => t.id == timeCasaId);
    const timeVisitante = bancoDeDados.times.find(t => t.id == timeVisitanteId);
    
    if (!timeCasa || !timeVisitante) {
      return res.status(404).json({ msg: 'Time não encontrado' });
    }
    
    const novaPartida = {
      id: bancoDeDados.proximoId++,
      fase,
      timeCasa,
      timeVisitante,
      golsCasa: 0,
      golsVisitante: 0,
      status: 'agendada',
      data: data || new Date().toISOString(),
      local: local || 'Estádio DS3',
      vencedor: null,
      perdedor: null,
      criadoEm: new Date().toISOString()
    };
    
    if (!bancoDeDados.partidas) bancoDeDados.partidas = [];
    bancoDeDados.partidas.push(novaPartida);
    res.status(201).json(novaPartida);
    
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.put('/api/partidas/:id/resultado', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    const { golsCasa, golsVisitante } = req.body;
    
    const partida = bancoDeDados.partidas?.find(p => p.id == id);
    if (!partida) {
      return res.status(404).json({ msg: 'Partida não encontrada' });
    }
    
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
      const timePerdedor = bancoDeDados.times.find(t => t.id == partida.perdedor.id);
      if (timePerdedor) timePerdedor.status = 'eliminado';
    }
    
    if (partida.fase === 'final' && partida.vencedor) {
      const timeCampeao = bancoDeDados.times.find(t => t.id == partida.vencedor.id);
      if (timeCampeao) timeCampeao.status = 'campeao';
    }
    
    res.json(partida);
    
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/partidas/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    bancoDeDados.partidas = (bancoDeDados.partidas || []).filter(p => p.id != id);
    res.json({ msg: 'Partida removida com sucesso' });
    
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

app.delete('/api/partidas', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    bancoDeDados.partidas = [];
    res.json({ msg: 'Todas as partidas foram removidas' });
    
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ ROTA DE TESTE ============
app.get('/', (req, res) => {
  res.json({ 
    message: '🔥 API Torneio DS3 funcionando!',
    admin: ADMIN_FIXO.usuario,
    endpoints: {
      auth: '/api/auth/login',
      times: '/api/times',
      artilheiros: '/api/ranking/artilheiros',
      melhoresJogadores: '/api/ranking/melhores-jogadores',
      melhoresGoleiros: '/api/ranking/melhores-goleiros',
      partidas: '/api/partidas'
    }
  });
});

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👤 Admin: ${ADMIN_FIXO.usuario} / ${ADMIN_FIXO.senha}`);
  console.log(`📊 Rankings compartilhados - TODO MUNDO VÊ OS MESMOS DADOS!`);
  console.log(`✅ Times: apenas nome e sala`);
  console.log(`✅ Rotas de ranking: artilheiros, melhores-jogadores, melhores-goleiros`);
  console.log(`✅ Rotas de partidas: GET, POST, PUT, DELETE`);
});