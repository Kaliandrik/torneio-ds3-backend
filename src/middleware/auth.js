const { admin } = require('../firebase');

module.exports = async function(req, res, next) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ msg: 'Token não encontrado' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.admin = {
      id: decodedToken.uid,
      email: decodedToken.email,
      nome: decodedToken.name
    };
    
    next();
  } catch (err) {
    console.error('Erro na autenticação:', err);
    res.status(401).json({ msg: 'Token inválido' });
  }
};