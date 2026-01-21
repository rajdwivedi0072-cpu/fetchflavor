const express = require('express');
const router = express.Router();
// Import must match the exports from controller
const { createOrder, getOrders, getLatestOrder, getOrderById } = require('../controllers/orderController');

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/latest', getLatestOrder);
router.get('/track/:id', getOrderById);

module.exports = router;