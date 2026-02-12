const admin = require('firebase-admin');

// Inicializar sem service account por enquanto
admin.initializeApp({
  projectId: 'torneio-ds3'
});

const db = admin.firestore();

module.exports = { admin, db };