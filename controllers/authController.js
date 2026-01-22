const nodemailer = require("nodemailer");
const User = require("../models/User");
const connectDB = require("../config/db");
const { OAuth2Client } = require("google-auth-library");
const admin = require("firebase-admin");
require("dotenv").config();

/* ─────────────────────────────────────────────
   1. FIREBASE INITIALIZATION (VERCEL SAFE - FIXED)
───────────────────────────────────────────── */

let serviceAccount;

try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
  }

  // 🔥 THIS LINE FIXES INVALID JWT SIGNATURE
  serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT.replace(/\\n/g, "\n")
  );
} catch (error) {
  console.error("❌ Firebase Service Account Error:", error);
}

if (!admin.apps.length && serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin Initialized");
  } catch (error) {
    console.error("❌ Firebase Init Error:", error);
  }
}

/* ─────────────────────────────────────────────
   2. GOOGLE CLIENT
───────────────────────────────────────────── */

const GOOGLE_CLIENT_ID =
  "988012579412-sbnkvrl5makaebuvtv7jdho7su67edm3.apps.googleusercontent.com";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/* ─────────────────────────────────────────────
   3. SEND OTP (EMAIL)
───────────────────────────────────────────── */

const sendOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Flavor Fetch" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Flavor Fetch Login Verification",
      html: `
        <div style="font-family: Arial; padding: 20px; text-align: center;">
          <h2 style="color:#FF7A30;">Flavor Fetch</h2>
          <p>Your verification code is</p>
          <h1 style="letter-spacing:5px;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("❌ Email Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

/* ─────────────────────────────────────────────
   4. GOOGLE LOGIN
───────────────────────────────────────────── */

const googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    await connectDB();

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const { email, name } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: "",
        isGoogleUser: true,
      });
    }

    res.status(200).json({
      message: "Login Success",
      user: { _id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("❌ Google Login Error:", error);
    res.status(401).json({ message: "Invalid Google Token" });
  }
};

/* ─────────────────────────────────────────────
   5. OTP LOGIN (FINAL FIXED)
───────────────────────────────────────────── */

const otpLogin = async (req, res) => {
  const { email } = req.body;

  try {
    await connectDB();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: "User",
        email,
        password: "",
        isGoogleUser: false,
      });
    }

    if (!admin.apps.length) {
      throw new Error("Firebase Admin not initialized");
    }

    let firebaseUid;

    try {
      const firebaseUser = await admin.auth().getUserByEmail(email);
      firebaseUid = firebaseUser.uid;
    } catch {
      const newUser = await admin.auth().createUser({
        email,
        emailVerified: true,
      });
      firebaseUid = newUser.uid;
    }

    const customToken = await admin.auth().createCustomToken(firebaseUid);

    res.status(200).json({
      message: "Login Success",
      token: customToken,
      user: { _id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("❌ OTP Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ───────────────────────────────────────────── */

module.exports = {
  sendOtp,
  googleLogin,
  otpLogin,
};
