const mongoose = require('mongoose');

const JogadorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  numero: {
    type: Number,
    required: true,
  },
  posicao: {
    type: String,
    enum: ['goleiro', 'defensor', 'meio-campo', 'atacante'],
    required: true,
  },
  time: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Time',
    required: true,
  },
  gols: {
    type: Number,
    default: 0,
  },
  assistencias: {
    type: Number,
    default: 0,
  },
  defesas: {
    type: Number,
    default: 0,
  },
  jogos: {
    type: Number,
    default: 0,
  },
  cartoesAmarelos: {
    type: Number,
    default: 0,
  },
  cartoesVermelhos: {
    type: Number,
    default: 0,
  },
  foto: {
    type: String,
    default: 'default-player.png',
  },
  criadoEm: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Jogador', JogadorSchema);