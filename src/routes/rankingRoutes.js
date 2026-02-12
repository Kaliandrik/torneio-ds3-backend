const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

router.get('/artilheiros', rankingController.rankingArtilheiros);
router.get('/melhores-jogadores', rankingController.rankingMelhoresJogadores);
router.get('/melhores-goleiros', rankingController.rankingMelhoresGoleiros);

module.exports = router;