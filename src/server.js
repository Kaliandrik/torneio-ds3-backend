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
  jogadores: [],
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
    res.json({ token, admin: { nome: ADMIN_FIXO.nome, usuario: ADMIN_FIXO.usuario } });
  } else {
    res.status(401).json({ msg: 'Usuário ou senha inválidos' });
  }
});

app.get('/api/auth/verificar', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Token não encontrado' });
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
  const token = extractToken(req);
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
app.get('/api/ranking/artilheiros', (req, res) => {
  res.json(bancoDeDados.artilheiros);
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
    const artilheiro = bancoDeDados.artilheiros.find(a => a.id === id);
    if (artilheiro) {
      artilheiro.gols += 1;
      bancoDeDados.artilheiros.sort((a, b) => b.gols - a.gols);
      res.json(artilheiro);
    } else {
      res.status(404).json({ msg: 'Não encontrado' });
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
    bancoDeDados.artilheiros = bancoDeDados.artilheiros.filter(a => a.id !== id);
    res.json({ msg: 'Removido com sucesso' });
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// ============ CHAVEAMENTO COMPLETO ============
// LISTAR todas as partidas
app.get('/api/partidas', (req, res) => {
  res.json(bancoDeDados.partidas);
});

// CRIAR nova partida (ADMIN)
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
    
    bancoDeDados.partidas.push(novaPartida);
    res.status(201).json(novaPartida);
    
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// LANÇAR RESULTADO (ADMIN)
app.put('/api/partidas/:id/resultado', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    const { golsCasa, golsVisitante } = req.body;
    
    const partida = bancoDeDados.partidas.find(p => p.id == id);
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

// DELETAR uma partida (ADMIN)
app.delete('/api/partidas/:id', (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: 'Não autorizado' });
  
  try {
    jwt.verify(token, SECRET);
    const { id } = req.params;
    bancoDeDados.partidas = bancoDeDados.partidas.filter(p => p.id != id);
    res.json({ msg: 'Partida removida com sucesso' });
    
  } catch (err) {
    res.status(401).json({ msg: 'Não autorizado' });
  }
});

// LIMPAR todas as partidas (ADMIN)
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

// ============ INICIAR SERVIDOR ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`👤 Admin: ${ADMIN_FIXO.usuario} / ${ADMIN_FIXO.senha}`);
  console.log(`📊 Rankings compartilhados - TODO MUNDO VÊ OS MESMOS DADOS!`);
});