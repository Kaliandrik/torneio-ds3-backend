const mongoose = require('mongoose');

const TimeSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
  },
  sigla: {
    type: String,
    required: true,
    maxlength: 3,
  },
  escudo: {
    type: String,
    default: 'default-shield.png',
  },
  cidade: String,
  tecnico: String,
  fundacao: Date,
  jogadores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Jogador',
  }],
  status: {
    type: String,
    enum: ['ativo', 'eliminado', 'campeao'],
    default: 'ativo',
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  criadoEm: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Time', TimeSchema);