const router = require('express').Router();
const ctrl = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// must stay above '/:id'
router.get('/me', authorize('patient'), ctrl.getMe);

router
  .route('/')
  .get(authorize('admin', 'receptionist', 'doctor'), ctrl.list)
  .post(authorize('admin', 'receptionist'), ctrl.create);

router
  .route('/:id')
  .get(authorize('admin', 'receptionist', 'doctor'), ctrl.getOne)
  .put(authorize('admin', 'receptionist'), ctrl.update)
  .delete(authorize('admin'), ctrl.remove);

module.exports = router;
