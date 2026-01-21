const nodemailer = require('nodemailer');
const User = require('../models/User'); 
const { OAuth2Client } = require('google-auth-library');
const admin = require("firebase-admin"); // <--- NEW IMPORT
require('dotenv').config();

// --- CONFIGURATION ---
// 1. Initialize Firebase Admin SDK
// Make sure serviceAccountKey.json is in your backend folder!
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 2. Google Client Config
const GOOGLE_CLIENT_ID = "988012579412-sbnkvrl5makaebuvtv7jdho7su67edm3.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);


// --- 1. Send OTP Logic ---
const sendOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
    }

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    let mailOptions = {
        from: `"Flavor Fetch" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Login Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Flavor Fetch Verification</h2>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="color: #FF7A30; letter-spacing: 5px;">${otp}</h1>
                <p>This code is valid for 10 minutes.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};


// --- 2. Google Login Logic ---
const googleLogin = async (req, res) => {
    const { idToken } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_CLIENT_ID, 
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await User.findOne({ email });

        if (user) {
            console.log("Google User Login:", email);
            res.status(200).json({ 
                message: "Login Success", 
                user: { email: user.email, name: user.name, _id: user._id } 
            });
        } else {
            console.log("Creating new Google User:", email);
            user = new User({
                name: name,
                email: email,
                password: "",
                isGoogleUser: true
            });
            await user.save();
            res.status(201).json({ 
                message: "User Created", 
                user: { email: user.email, name: user.name, _id: user._id } 
            });
        }

    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(400).json({ message: "Invalid Google Token" });
    }
};


// --- 3. OTP Login (UPDATED: Returns Custom Token) ---
const otpLogin = async (req, res) => {
    const { email } = req.body;

    try {
        // A. Ensure User exists in MongoDB
        let user = await User.findOne({ email });
        
        if (!user) {
            console.log("Creating new OTP User in DB:", email);
            user = new User({
                name: "User", 
                email: email,
                password: "",
                isGoogleUser: false
            });
            await user.save();
        }

        // B. Generate Firebase Custom Token
        // This token allows the Android app to login WITHOUT a password
        let firebaseUid = email; 

        try {
            // Check if user exists in Firebase
            const firebaseUser = await admin.auth().getUserByEmail(email);
            firebaseUid = firebaseUser.uid;
        } catch (e) {
            // If not, create them in Firebase
            const newFirebaseUser = await admin.auth().createUser({
                email: email,
                emailVerified: true
            });
            firebaseUid = newFirebaseUser.uid;
        }

        // Generate the magic token
        const customToken = await admin.auth().createCustomToken(firebaseUid);

        // Send token back to Android
        res.status(200).json({ 
            message: "Login Success", 
            token: customToken, 
            user: { email: user.email, name: user.name, _id: user._id } 
        });

    } catch (error) {
        console.error("OTP Login Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { sendOtp, googleLogin, otpLogin };