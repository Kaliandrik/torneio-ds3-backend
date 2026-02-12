const { admin, db } = require('../firebase');

exports.criarTime = async (req, res) => {
  try {
    const { nome, sigla, cidade, tecnico, fundacao } = req.body;
    const adminId = req.admin.id;

    // Verificar se time já existe
    const timesSnapshot = await db.collection('times')
      .where('nome', '==', nome)
      .get();
    
    if (!timesSnapshot.empty) {
      return res.status(400).json({ msg: 'Time já cadastrado' });
    }

    // Criar time
    const novoTime = {
      nome,
      sigla: sigla.toUpperCase(),
      cidade: cidade || '',
      tecnico: tecnico || '',
      fundacao: fundacao || '',
      status: 'ativo',
      jogadores: [],
      criadoPor: adminId,
      criadoEm: new Date().toISOString(),
      escudo: 'default-shield.png'
    };

    const docRef = await db.collection('times').add(novoTime);
    
    res.status(201).json({ id: docRef.id, ...novoTime });

  } catch (err) {
    console.error('Erro ao criar time:', err);
    res.status(500).json({ msg: 'Erro ao criar time' });
  }
};

exports.listarTimes = async (req, res) => {
  try {
    const timesSnapshot = await db.collection('times')
      .orderBy('nome')
      .get();
    
    const times = [];
    timesSnapshot.forEach(doc => {
      times.push({ id: doc.id, ...doc.data() });
    });

    res.json(times);
  } catch (err) {
    console.error('Erro ao listar times:', err);
    res.status(500).json({ msg: 'Erro ao listar times' });
  }
};

exports.atualizarTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, sigla, cidade, tecnico, status } = req.body;

    const timeRef = db.collection('times').doc(id);
    const timeDoc = await timeRef.get();

    if (!timeDoc.exists) {
      return res.status(404).json({ msg: 'Time não encontrado' });
    }

    const updateData = {
      ...(nome && { nome }),
      ...(sigla && { sigla: sigla.toUpperCase() }),
      ...(cidade && { cidade }),
      ...(tecnico && { tecnico }),
      ...(status && { status }),
      atualizadoEm: new Date().toISOString()
    };

    await timeRef.update(updateData);
    
    const timeAtualizado = await timeRef.get();
    res.json({ id: timeAtualizado.id, ...timeAtualizado.data() });

  } catch (err) {
    console.error('Erro ao atualizar time:', err);
    res.status(500).json({ msg: 'Erro ao atualizar time' });
  }
};