const { admin, db } = require('../firebase');

exports.criarPartida = async (req, res) => {
  try {
    const { fase, timeCasa, timeVisitante, data, local } = req.body;

    const novaPartida = {
      fase,
      timeCasa,
      timeVisitante,
      golsCasa: 0,
      golsVisitante: 0,
      status: 'agendada',
      data: new Date(data).toISOString(),
      local: local || 'Estádio DS3',
      artilheiros: [],
      defesas: [],
      vencedor: null,
      criadoPor: req.admin.id,
      criadoEm: new Date().toISOString()
    };

    const docRef = await db.collection('partidas').add(novaPartida);
    res.status(201).json({ id: docRef.id, ...novaPartida });

  } catch (err) {
    console.error('Erro ao criar partida:', err);
    res.status(500).json({ msg: 'Erro ao criar partida' });
  }
};

exports.atualizarResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const { golsCasa, golsVisitante, artilheiros, defesas } = req.body;

    const partidaRef = db.collection('partidas').doc(id);
    const partidaDoc = await partidaRef.get();

    if (!partidaDoc.exists) {
      return res.status(404).json({ msg: 'Partida não encontrada' });
    }

    const partidaData = partidaDoc.data();
    
    // Determinar vencedor
    let vencedor = null;
    if (golsCasa > golsVisitante) {
      vencedor = partidaData.timeCasa;
    } else if (golsVisitante > golsCasa) {
      vencedor = partidaData.timeVisitante;
    }

    // Atualizar partida
    await partidaRef.update({
      golsCasa,
      golsVisitante,
      status: 'finalizada',
      artilheiros: artilheiros || [],
      defesas: defesas || [],
      vencedor,
      finalizadoEm: new Date().toISOString()
    });

    // Atualizar estatísticas dos artilheiros
    if (artilheiros && artilheiros.length > 0) {
      for (const artilheiro of artilheiros) {
        const jogadorRef = db.collection('jogadores').doc(artilheiro.jogador);
        const jogadorDoc = await jogadorRef.get();
        if (jogadorDoc.exists) {
          const jogadorData = jogadorDoc.data();
          await jogadorRef.update({
            gols: (jogadorData.gols || 0) + (artilheiro.gols || 1),
            jogos: (jogadorData.jogos || 0) + 1
          });
        }
      }
    }

    // Atualizar defesas dos goleiros
    if (defesas && defesas.length > 0) {
      for (const defesa of defesas) {
        const jogadorRef = db.collection('jogadores').doc(defesa.jogador);
        const jogadorDoc = await jogadorRef.get();
        if (jogadorDoc.exists) {
          const jogadorData = jogadorDoc.data();
          await jogadorRef.update({
            defesas: (jogadorData.defesas || 0) + (defesa.defesas || 1),
            jogos: (jogadorData.jogos || 0) + 1
          });
        }
      }
    }

    // Se for quartas ou semi, criar próxima fase
    if (vencedor && (partidaData.fase === 'quartas' || partidaData.fase === 'semifinal')) {
      await criarProximaFase(partidaData, vencedor, partidaData.fase);
    }

    // Atualizar status do time perdedor
    const perdedor = partidaData.timeCasa === vencedor ? partidaData.timeVisitante : partidaData.timeCasa;
    if (perdedor) {
      await db.collection('times').doc(perdedor).update({
        status: 'eliminado'
      });
    }

    res.json({ 
      id: partidaDoc.id, 
      ...partidaData, 
      golsCasa, 
      golsVisitante, 
      status: 'finalizada',
      vencedor 
    });

  } catch (err) {
    console.error('Erro ao atualizar resultado:', err);
    res.status(500).json({ msg: 'Erro ao atualizar resultado' });
  }
};

// Função auxiliar para criar próxima fase
async function criarProximaFase(partidaAtual, vencedorId, faseAtual) {
  try {
    const proximaFase = faseAtual === 'quartas' ? 'semifinal' : 'final';
    
    // Buscar partidas da mesma fase para formar o chaveamento
    const partidasSnapshot = await db.collection('partidas')
      .where('fase', '==', faseAtual)
      .where('status', '==', 'finalizada')
      .get();

    const vencedores = [];
    partidasSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.vencedor) {
        vencedores.push(data.vencedor);
      }
    });

    // Se temos 2 vencedores nas quartas, criar semi; se temos 2 nas semi, criar final
    if (vencedores.length === 2) {
      const novaPartida = {
        fase: proximaFase,
        timeCasa: vencedores[0],
        timeVisitante: vencedores[1],
        golsCasa: 0,
        golsVisitante: 0,
        status: 'agendada',
        data: new Date(Date.now() + 7 * 86400000).toISOString(), // +7 dias
        local: 'Estádio DS3',
        artilheiros: [],
        defesas: [],
        vencedor: null,
        criadoEm: new Date().toISOString()
      };

      await db.collection('partidas').add(novaPartida);
    }
  } catch (err) {
    console.error('Erro ao criar próxima fase:', err);
  }
}

exports.listarPartidas = async (req, res) => {
  try {
    const partidasSnapshot = await db.collection('partidas')
      .orderBy('data')
      .get();
    
    const partidas = [];
    for (const doc of partidasSnapshot.docs) {
      const partida = { id: doc.id, ...doc.data() };
      
      // Buscar dados dos times
      if (partida.timeCasa) {
        const timeCasaDoc = await db.collection('times').doc(partida.timeCasa).get();
        partida.timeCasa = { id: timeCasaDoc.id, ...timeCasaDoc.data() };
      }
      
      if (partida.timeVisitante) {
        const timeVisitanteDoc = await db.collection('times').doc(partida.timeVisitante).get();
        partida.timeVisitante = { id: timeVisitanteDoc.id, ...timeVisitanteDoc.data() };
      }
      
      if (partida.vencedor) {
        const vencedorDoc = await db.collection('times').doc(partida.vencedor).get();
        partida.vencedor = { id: vencedorDoc.id, ...vencedorDoc.data() };
      }
      
      partidas.push(partida);
    }

    res.json(partidas);
  } catch (err) {
    console.error('Erro ao listar partidas:', err);
    res.status(500).json({ msg: 'Erro ao listar partidas' });
  }
};

exports.gerarChaveamento = async (req, res) => {
  try {
    // Buscar 8 times ativos
    const timesSnapshot = await db.collection('times')
      .where('status', '==', 'ativo')
      .limit(8)
      .get();
    
    const times = [];
    timesSnapshot.forEach(doc => {
      times.push({ id: doc.id, ...doc.data() });
    });

    if (times.length !== 8) {
      return res.status(400).json({ 
        msg: `É necessário exatamente 8 times ativos. Você tem ${times.length} times.` 
      });
    }

    // Embaralhar times
    const timesEmbaralhados = [...times].sort(() => Math.random() - 0.5);

    // Criar quartas de final
    const quartas = [];
    for (let i = 0; i < 4; i++) {
      const partida = {
        fase: 'quartas',
        timeCasa: timesEmbaralhados[i * 2].id,
        timeVisitante: timesEmbaralhados[i * 2 + 1].id,
        golsCasa: 0,
        golsVisitante: 0,
        status: 'agendada',
        data: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
        local: 'Estádio DS3',
        artilheiros: [],
        defesas: [],
        vencedor: null,
        criadoPor: req.admin.id,
        criadoEm: new Date().toISOString()
      };

      const docRef = await db.collection('partidas').add(partida);
      quartas.push({ id: docRef.id, ...partida });
    }

    res.json({ 
      message: 'Chaveamento gerado com sucesso!',
      partidas: quartas 
    });

  } catch (err) {
    console.error('Erro ao gerar chaveamento:', err);
    res.status(500).json({ msg: 'Erro ao gerar chaveamento' });
  }
};