const router = require('express').Router();
const ctrl = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// must stay above '/:id'
router.get('/me', authorize('doctor'), ctrl.getMe);

router.route('/').get(ctrl.list).post(authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);

module.exports = router;
