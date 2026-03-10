const express = require('express');
const router = express.Router();
const { createOrUpdateUser } = require('../controllers/userController');

// Route POST: /api/users
router.post('/', createOrUpdateUser);

module.exports = router;