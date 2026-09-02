import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { WalletController } from '../controllers/walletController';
import { PaymentController } from '../controllers/paymentController';
import { MerchantController } from '../controllers/merchantController';
import { AdminController } from '../controllers/adminController';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/quick-login', AuthController.quickLogin);
router.get('/auth/me', authenticateJWT, AuthController.getMe);
router.get('/auth/demo-users', AuthController.getDemoUsers);

// ==================== WALLET ROUTES ====================
router.get('/wallet/balance', authenticateJWT, WalletController.getBalance);
router.get('/wallet/transactions', authenticateJWT, WalletController.getTransactions);
router.post('/wallet/topup/card', authenticateJWT, WalletController.topupViaCard);
router.post('/wallet/topup/manual', authenticateJWT, WalletController.submitManualTopup);
router.get('/wallet/cards', authenticateJWT, WalletController.getSavedCards);
router.post('/wallet/cards', authenticateJWT, WalletController.saveCard);
router.get('/wallet/topup-requests', authenticateJWT, WalletController.getTopupRequests);

// ==================== PAYMENT & QR ROUTES ====================
router.post('/payment/decode-qr', authenticateJWT, PaymentController.decodeQR);
router.post('/payment/pay-qr', authenticateJWT, PaymentController.payQR);
router.get('/payment/receipt/:referenceId', authenticateJWT, PaymentController.getReceipt);

// ==================== MERCHANT ROUTES ====================
router.get('/merchant/dashboard-stats', authenticateJWT, requireRole(['MERCHANT', 'ADMIN']), MerchantController.getDashboardStats);
router.post('/merchant/generate-qr', authenticateJWT, requireRole(['MERCHANT', 'ADMIN']), MerchantController.generateDynamicQR);
router.get('/merchant/static-qr', authenticateJWT, requireRole(['MERCHANT', 'ADMIN']), MerchantController.getStaticQR);
router.post('/merchant/settlement-request', authenticateJWT, requireRole(['MERCHANT', 'ADMIN']), MerchantController.requestSettlement);

// ==================== ADMIN & FINANCE ROUTES ====================
router.get('/admin/overview', authenticateJWT, requireRole(['ADMIN']), AdminController.getOverview);
router.get('/admin/ledger', authenticateJWT, requireRole(['ADMIN']), AdminController.getLedger);
router.get('/admin/topup-requests', authenticateJWT, requireRole(['ADMIN']), AdminController.getTopupRequests);
router.post('/admin/approve-topup/:id', authenticateJWT, requireRole(['ADMIN']), AdminController.approveTopup);
router.post('/admin/reject-topup/:id', authenticateJWT, requireRole(['ADMIN']), AdminController.rejectTopup);
router.get('/admin/settlements', authenticateJWT, requireRole(['ADMIN']), AdminController.getSettlementRequests);
router.post('/admin/approve-settlement/:id', authenticateJWT, requireRole(['ADMIN']), AdminController.approveSettlement);
router.get('/admin/outlets', authenticateJWT, requireRole(['ADMIN']), AdminController.getOutlets);
router.post('/admin/create-outlet', authenticateJWT, requireRole(['ADMIN']), AdminController.createOutlet);

export default router;
