const { db } = require('../firebase');

exports.criarJogador = async (req, res) => {
  try {
    const { nome, numero, posicao, timeId } = req.body;

    // Verificar se time existe
    const timeDoc = await db.collection('times').doc(timeId).get();
    if (!timeDoc.exists) {
      return res.status(404).json({ msg: 'Time não encontrado' });
    }

    // Criar jogador
    const novoJogador = {
      nome,
      numero: parseInt(numero),
      posicao,
      time: timeId,
      gols: 0,
      assistencias: 0,
      defesas: 0,
      jogos: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      foto: 'default-player.png',
      criadoEm: new Date().toISOString()
    };

    const jogadorRef = await db.collection('jogadores').add(novoJogador);
    
    // Adicionar jogador ao time
    await db.collection('times').doc(timeId).update({
      jogadores: admin.firestore.FieldValue.arrayUnion(jogadorRef.id)
    });

    res.status(201).json({ id: jogadorRef.id, ...novoJogador });

  } catch (err) {
    console.error('Erro ao criar jogador:', err);
    res.status(500).json({ msg: 'Erro ao criar jogador' });
  }
};

exports.listarJogadores = async (req, res) => {
  try {
    const jogadoresSnapshot = await db.collection('jogadores')
      .orderBy('nome')
      .get();
    
    const jogadores = [];
    for (const doc of jogadoresSnapshot.docs) {
      const jogador = { id: doc.id, ...doc.data() };
      
      // Buscar dados do time
      if (jogador.time) {
        const timeDoc = await db.collection('times').doc(jogador.time).get();
        jogador.time = { id: timeDoc.id, ...timeDoc.data() };
      }
      
      jogadores.push(jogador);
    }

    res.json(jogadores);
  } catch (err) {
    console.error('Erro ao listar jogadores:', err);
    res.status(500).json({ msg: 'Erro ao listar jogadores' });
  }
};

exports.atualizarEstatisticas = async (req, res) => {
  try {
    const { id } = req.params;
    const { gols, assistencias, defesas, cartoesAmarelos, cartoesVermelhos } = req.body;

    const jogadorRef = db.collection('jogadores').doc(id);
    const jogadorDoc = await jogadorRef.get();

    if (!jogadorDoc.exists) {
      return res.status(404).json({ msg: 'Jogador não encontrado' });
    }

    const jogadorData = jogadorDoc.data();
    
    await jogadorRef.update({
      gols: (jogadorData.gols || 0) + (gols || 0),
      assistencias: (jogadorData.assistencias || 0) + (assistencias || 0),
      defesas: (jogadorData.defesas || 0) + (defesas || 0),
      cartoesAmarelos: (jogadorData.cartoesAmarelos || 0) + (cartoesAmarelos || 0),
      cartoesVermelhos: (jogadorData.cartoesVermelhos || 0) + (cartoesVermelhos || 0),
      jogos: (jogadorData.jogos || 0) + 1,
      atualizadoEm: new Date().toISOString()
    });

    const jogadorAtualizado = await jogadorRef.get();
    res.json({ id: jogadorAtualizado.id, ...jogadorAtualizado.data() });

  } catch (err) {
    console.error('Erro ao atualizar estatísticas:', err);
    res.status(500).json({ msg: 'Erro ao atualizar estatísticas' });
  }
};