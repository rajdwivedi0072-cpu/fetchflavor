const User = require('../models/User');

const saveAddress = async (req, res) => {
    const { email, address } = req.body;

    // DEBUG LOG 1: Check if request reaches here
    console.log("--- Save Address Request Received ---");
    console.log("Incoming Email:", email);
    console.log("Incoming Address:", address);

    if (!email || !address) {
        console.log("Error: Missing fields");
        return res.status(400).json({ message: "Email and Address are required" });
    }

    try {
        const user = await User.findOneAndUpdate(
            { email: email },
            { address: address },
            { new: true } 
        );

        if (!user) {
            // DEBUG LOG 2: User lookup failed
            console.log("Error: User not found in MongoDB for email:", email);
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Success: Address updated!");
        res.status(200).json({ 
            message: "Address updated successfully", 
            address: user.address 
        });

    } catch (error) {
        console.error("Save Address Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getAddress = async (req, res) => {
    const { email } = req.query; 

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ 
            address: user.address || "" 
        });

    } catch (error) {
        console.error("Get Address Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { saveAddress, getAddress };