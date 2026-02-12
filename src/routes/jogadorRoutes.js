const express = require('express');
const router = express.Router();
const jogadorController = require('../controllers/jogadorController');
const auth = require('../middleware/auth');

router.post('/', auth, jogadorController.criarJogador);
router.get('/', jogadorController.listarJogadores);
router.put('/:id/estatisticas', auth, jogadorController.atualizarEstatisticas);

module.exports = router;