const express = require('express');
const router = express.Router();
// IMPORT ALL 3 FUNCTIONS
const { sendOtp, googleLogin, otpLogin } = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/google', googleLogin);
router.post('/otp-login', otpLogin); // <--- THIS LINE IS CRITICAL

module.exports = router;