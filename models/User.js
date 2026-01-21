const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: false // Correct: False for Google/OTP users
    },
    isGoogleUser: { 
        type: Boolean, 
        default: false 
    },
    
    phone: { 
        type: String, 
        default: "" 
    },
    bio: { 
        type: String, 
        default: "" 
    },
    profileImage: { 
        type: String, 
        default: "" 
    },

    address: {
        type: String,
        default: "" 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);