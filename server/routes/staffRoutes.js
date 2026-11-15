const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Staff management is restricted to Administrators only
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/', staffController.getStaffMembers);
router.post('/', staffController.createStaffMember);
router.put('/:id', staffController.updateStaffMember);
router.delete('/:id', staffController.deleteStaffMember);

module.exports = router;
