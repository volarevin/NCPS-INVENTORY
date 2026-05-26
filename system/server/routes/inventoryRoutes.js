const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

router.use(verifyToken);
router.use(auditMiddleware);

router.get('/categories', checkRole(['Admin', 'Technician']), inventoryController.getCategories);
router.get('/items', checkRole(['Admin', 'Technician']), inventoryController.getItems);
router.get('/items/:id/transactions', checkRole(['Admin']), inventoryController.getItemTransactions);
router.post('/items', checkRole(['Admin']), inventoryController.createItem);
router.put('/items/:id', checkRole(['Admin']), inventoryController.updateItem);
router.post('/items/:id/adjust', checkRole(['Admin']), inventoryController.adjustStock);

module.exports = router;
