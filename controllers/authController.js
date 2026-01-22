const nodemailer = require('nodemailer');
const User = require('../models/User'); 
const { OAuth2Client } = require('google-auth-library');
const admin = require("firebase-admin"); 
require('dotenv').config();

// --- 1. FIREBASE INITIALIZATION (VERCEL COMPATIBLE) ---
// Vercel cannot read "files", so we read the JSON string from an Env Variable
let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Parse the string back into a JSON object
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        console.error("❌ ERROR: FIREBASE_SERVICE_ACCOUNT variable is missing in Vercel!");
    }
} catch (error) {
    console.error("❌ Firebase JSON Parse Error:", error.message);
}

// Initialize only if we have the key and it's not already running
if (!admin.apps.length && serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin Initialized!");
    } catch (e) {
        console.error("❌ Firebase Init Failed:", e);
    }
}

// 2. Google Client Config
const GOOGLE_CLIENT_ID = "988012579412-sbnkvrl5makaebuvtv7jdho7su67edm3.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);


// --- 3. Send OTP Logic (BACK TO GMAIL SMTP) ---
const sendOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
    }

    // Gmail SMTP works perfectly on Vercel (Ports are open)
    let transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: process.env.EMAIL_USER, // Your Gmail
            pass: process.env.EMAIL_PASS  // Your 16-digit App Password
        }
    });

    let mailOptions = {
        from: `"Flavor Fetch" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Flavor Fetch Login Verification',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                <h2 style="color: #FF7A30;">Flavor Fetch</h2>
                <p>Your verification code is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
                <p>This code expires in 10 minutes.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP sent to ${email} via Gmail`);
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("❌ Email error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};


// --- 4. Google Login Logic ---
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


// --- 5. OTP Login ---
const otpLogin = async (req, res) => {
    const { email } = req.body;

    try {
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

        let firebaseUid = email; 

        // Ensure Firebase is initialized before using it
        if (!admin.apps.length) {
             throw new Error("Firebase Admin not initialized. Check server logs.");
        }

        try {
            const firebaseUser = await admin.auth().getUserByEmail(email);
            firebaseUid = firebaseUser.uid;
        } catch (e) {
            const newFirebaseUser = await admin.auth().createUser({
                email: email,
                emailVerified: true
            });
            firebaseUid = newFirebaseUser.uid;
        }

        const customToken = await admin.auth().createCustomToken(firebaseUid);

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