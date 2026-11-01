const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'receptionist'));

router.get('/status', ctrl.status);
router.post('/send', ctrl.sendCustom);
router.post('/appointments/:id/resend', ctrl.resend);

module.exports = router;
