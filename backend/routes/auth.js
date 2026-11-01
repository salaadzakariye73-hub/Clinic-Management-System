const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', ctrl.register); // public: creates a PATIENT account
router.post('/login', ctrl.login);
router.get('/me', protect, ctrl.me);
router.post('/staff', protect, authorize('admin'), ctrl.createStaff);

module.exports = router;
