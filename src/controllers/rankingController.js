const { db } = require('../firebase');

exports.rankingArtilheiros = async (req, res) => {
  try {
    const jogadoresSnapshot = await db.collection('jogadores')
      .where('gols', '>', 0)
      .orderBy('gols', 'desc')
      .limit(10)
      .get();
    
    const artilheiros = [];
    for (const doc of jogadoresSnapshot.docs) {
      const jogador = { id: doc.id, ...doc.data() };
      
      // Buscar dados do time
      if (jogador.time) {
        const timeDoc = await db.collection('times').doc(jogador.time).get();
        jogador.time = { id: timeDoc.id, ...timeDoc.data() };
      }
      
      artilheiros.push(jogador);
    }

    res.json(artilheiros);
  } catch (err) {
    console.error('Erro ao buscar artilheiros:', err);
    res.status(500).json({ msg: 'Erro ao buscar artilheiros' });
  }
};

exports.rankingMelhoresJogadores = async (req, res) => {
  try {
    const jogadoresSnapshot = await db.collection('jogadores')
      .get();
    
    const jogadores = [];
    for (const doc of jogadoresSnapshot.docs) {
      const jogador = { id: doc.id, ...doc.data() };
      
      // Buscar dados do time
      if (jogador.time) {
        const timeDoc = await db.collection('times').doc(jogador.time).get();
        jogador.time = { id: timeDoc.id, ...timeDoc.data() };
      }
      
      // Calcular pontuação (gols + assistencias)
      jogador.pontuacao = (jogador.gols || 0) + (jogador.assistencias || 0);
      jogadores.push(jogador);
    }

    // Ordenar por pontuação
    const melhores = jogadores
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, 10);

    res.json(melhores);
  } catch (err) {
    console.error('Erro ao buscar melhores jogadores:', err);
    res.status(500).json({ msg: 'Erro ao buscar melhores jogadores' });
  }
};

exports.rankingMelhoresGoleiros = async (req, res) => {
  try {
    const goleirosSnapshot = await db.collection('jogadores')
      .where('posicao', '==', 'goleiro')
      .where('defesas', '>', 0)
      .orderBy('defesas', 'desc')
      .limit(10)
      .get();
    
    const goleiros = [];
    for (const doc of goleirosSnapshot.docs) {
      const goleiro = { id: doc.id, ...doc.data() };
      
      // Buscar dados do time
      if (goleiro.time) {
        const timeDoc = await db.collection('times').doc(goleiro.time).get();
        goleiro.time = { id: timeDoc.id, ...timeDoc.data() };
      }
      
      goleiros.push(goleiro);
    }

    res.json(goleiros);
  } catch (err) {
    console.error('Erro ao buscar melhores goleiros:', err);
    res.status(500).json({ msg: 'Erro ao buscar melhores goleiros' });
  }
};