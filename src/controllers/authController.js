const { admin, db } = require('../firebase');

exports.registrar = async (req, res) => {
  try {
    const { nome, email, senha, codigoAdmin } = req.body;

    // Verificar código admin
    const configDoc = await db.collection('config').doc('admin').get();
    const configData = configDoc.data();
    
    // Se não existir config, cria com código padrão
    if (!configData) {
      await db.collection('config').doc('admin').set({
        adminCode: 'DS3ADMIN2024',
        criadoEm: new Date().toISOString()
      });
    }
    
    const adminCode = configData?.adminCode || 'DS3ADMIN2024';
    
    if (codigoAdmin !== adminCode) {
      return res.status(401).json({ msg: 'Código de administrador inválido' });
    }

    // Criar usuário no Firebase Auth
    const user = await admin.auth().createUser({
      email,
      password: senha,
      displayName: nome,
      emailVerified: false
    });

    // Salvar dados extras no Firestore
    await db.collection('admins').doc(user.uid).set({
      nome,
      email,
      uid: user.uid,
      role: 'admin',
      criadoEm: new Date().toISOString(),
      ultimoAcesso: null
    });

    // Criar token customizado
    const token = await admin.auth().createCustomToken(user.uid);

    res.json({ 
      token, 
      admin: { 
        id: user.uid, 
        nome, 
        email 
      } 
    });

  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ msg: 'Erro ao registrar', error: err.message });
  }
};

exports.verificar = async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ msg: 'Token não encontrado' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userDoc = await db.collection('admins').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ msg: 'Usuário não encontrado' });
    }

    // Atualizar último acesso
    await db.collection('admins').doc(decodedToken.uid).update({
      ultimoAcesso: new Date().toISOString()
    });

    res.json(userDoc.data());
  } catch (err) {
    console.error('Erro na verificação:', err);
    res.status(401).json({ msg: 'Token inválido' });
  }
};