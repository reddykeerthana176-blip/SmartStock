const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../validators/authValidators');

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/settings', protect, authorize('ADMIN'), authController.updateBusinessSettings);

module.exports = router;
