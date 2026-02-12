const express = require('express');
const router = express.Router();
const partidaController = require('../controllers/partidaController');
const auth = require('../middleware/auth');

router.post('/', auth, partidaController.criarPartida);
router.post('/chaveamento', auth, partidaController.gerarChaveamento);
router.get('/', partidaController.listarPartidas);
router.put('/:id/resultado', auth, partidaController.atualizarResultado);

module.exports = router;