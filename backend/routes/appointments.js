const router = require('express').Router();
const ctrl = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/stats', authorize('admin', 'receptionist'), ctrl.getStats);

// live queue: every role (patients get an anonymised view)
router.get('/queue', ctrl.getQueue);
router.post('/queue/call-next', authorize('admin', 'receptionist', 'doctor'), ctrl.callNext);

router
  .route('/')
  .get(ctrl.list) // results are scoped by role inside the controller
  .post(authorize('admin', 'receptionist', 'patient'), ctrl.book);

router.patch('/:id/status', ctrl.updateStatus); // permissions checked inside the controller

module.exports = router;
