const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/registrar', authController.registrar);
router.get('/verificar', authController.verificar);

module.exports = router;