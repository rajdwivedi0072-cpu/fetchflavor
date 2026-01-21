const Order = require('../models/Order');

// 1. CREATE ORDER (Previously placeOrder)
const createOrder = async (req, res) => {
    try {
        console.log("--- ORDER REQUEST RECEIVED ---");
        const { userEmail, address, totalPrice, items, status } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items in order" });
        }

        const newOrder = new Order({
            userEmail,
            address,
            totalPrice,
            items,
            status: status || "Pending" // Default to Pending if not sent
        });

        const savedOrder = await newOrder.save();
        console.log("--- ORDER SAVED TO DB ---", savedOrder._id);

        res.status(201).json(savedOrder);

    } catch (error) {
        console.error("Order Save Error:", error);
        res.status(500).json({ message: "Failed to place order" });
    }
};

// 2. GET ALL ORDERS (Previously getUserOrders)
const getOrders = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Find orders matching the email, sort by newest first
        const orders = await Order.find({ userEmail: email }).sort({ createdAt: -1 });
        
        res.status(200).json(orders);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// 3. GET LATEST ORDER (For Tracking)
const getLatestOrder = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const order = await Order.findOne({ userEmail: email }).sort({ createdAt: -1 });

        if (!order) {
            return res.status(404).json({ message: "No active orders found" });
        }

        res.status(200).json({
            orderId: order._id,
            status: order.status, 
            totalPrice: order.totalPrice,
            items: order.items
        });

    } catch (error) {
        console.error("Tracking Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// 4. GET SPECIFIC ORDER BY ID (For Clicking an Order)
const getOrderById = async (req, res) => {
    const { id } = req.params;

    try {
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({
            orderId: order._id,
            status: order.status,
            totalPrice: order.totalPrice,
            items: order.items
        });

    } catch (error) {
        console.error("Get Order Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};


module.exports = { 
    createOrder, 
    getOrders, 
    getLatestOrder, 
    getOrderById 
};