const express = require('express');
const router = express.Router();
const timeController = require('../controllers/timeController');
const auth = require('../middleware/auth');

router.post('/', auth, timeController.criarTime);
router.get('/', timeController.listarTimes);
router.put('/:id', auth, timeController.atualizarTime);

module.exports = router;