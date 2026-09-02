import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthenticatedRequest, QRPayload } from '../types';
import { WalletService } from '../services/walletService';
import { notifyMerchantPayment } from '../socket';

export class PaymentController {
  /**
   * Parse / Decode QR Data string (handles raw QR hashes, JSON payloads, or URL scheme)
   */
  static async decodeQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { qrData } = req.body;

      if (!qrData) {
        res.status(400).json({ success: false, message: 'QR data string is required' });
        return;
      }

      let parsed: QRPayload;

      try {
        if (typeof qrData === 'string' && (qrData.startsWith('{') || qrData.startsWith('['))) {
          parsed = JSON.parse(qrData);
        } else {
          // Plain QR hash e.g. "AFB-OUTLET-CANTEEN-01"
          parsed = {
            type: 'STATIC',
            qrHash: qrData.trim()
          };
        }
      } catch (e) {
        parsed = {
          type: 'STATIC',
          qrHash: qrData.trim()
        };
      }

      const qrHash = parsed.qrHash;

      // Find outlet
      const outlet = await prisma.outlet.findUnique({
        where: { qrHash },
        include: {
          merchantUser: {
            select: { name: true, phone: true }
          }
        }
      });

      if (!outlet) {
        res.status(404).json({ success: false, message: `No merchant outlet found matching QR hash: ${qrHash}` });
        return;
      }

      res.json({
        success: true,
        outlet: {
          id: outlet.id,
          name: outlet.name,
          category: outlet.category,
          location: outlet.location,
          qrHash: outlet.qrHash,
          merchantName: outlet.merchantUser.name
        },
        paymentDetails: {
          type: parsed.type || 'STATIC',
          fixedAmount: parsed.amount || null,
          invoiceRef: parsed.invoiceRef || null,
          timestamp: parsed.timestamp || null
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Process QR Payment (Atomic transfer from Customer to Merchant)
   */
  static async payQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { qrHash, amount, pin, invoiceRef, notes } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Invalid payment amount' });
        return;
      }

      if (!qrHash) {
        res.status(400).json({ success: false, message: 'Target Merchant QR Hash is required' });
        return;
      }

      // Verify user's PIN for security
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User account not found' });
        return;
      }

      if (pin) {
        const isPinValid = await bcrypt.compare(pin, user.pinHash);
        if (!isPinValid) {
          res.status(401).json({ success: false, message: 'Incorrect Wallet Security PIN' });
          return;
        }
      }

      // Execute atomic transfer
      const result = await WalletService.transferPayment({
        senderUserId: user.id,
        merchantOutletQrHash: qrHash,
        amount: numAmount,
        description: `Payment for ${notes || 'Goods/Services'} at ${invoiceRef ? `(Inv #${invoiceRef})` : ''}`,
        metadata: {
          invoiceRef: invoiceRef || null,
          notes: notes || null,
          channel: 'QR_SCAN'
        }
      });

      // Send Real-time notification to Merchant via WebSocket
      notifyMerchantPayment(result.outlet.id, result.outlet.merchantUserId, {
        referenceId: result.transaction.referenceId,
        amount: result.transaction.amount,
        senderName: user.name,
        senderServiceNo: user.serviceNo,
        outletId: result.outlet.id,
        outletName: result.outlet.name,
        invoiceRef: invoiceRef || null,
        timestamp: result.transaction.createdAt,
        type: 'PURCHASE'
      });

      res.status(200).json({
        success: true,
        message: 'Payment completed successfully',
        receipt: {
          referenceId: result.transaction.referenceId,
          amount: result.transaction.amount,
          outletName: result.outlet.name,
          category: result.outlet.category,
          senderName: user.name,
          senderServiceNo: user.serviceNo,
          senderWalletRemaining: result.senderWallet.balance,
          invoiceRef: invoiceRef || null,
          timestamp: result.transaction.createdAt,
          status: 'SUCCESS'
        }
      });
    } catch (err: any) {
      console.error('Payment processing error:', err);
      res.status(400).json({ success: false, message: err.message || 'Payment processing failed' });
    }
  }

  /**
   * Get Digital Receipt by Reference ID
   */
  static async getReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { referenceId } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { referenceId },
        include: {
          senderWallet: { include: { user: true } },
          receiverWallet: { include: { user: { include: { outlets: true } } } }
        }
      });

      if (!transaction) {
        res.status(404).json({ success: false, message: 'Receipt not found' });
        return;
      }

      res.json({
        success: true,
        receipt: {
          id: transaction.id,
          referenceId: transaction.referenceId,
          amount: transaction.amount,
          fee: transaction.fee,
          type: transaction.type,
          status: transaction.status,
          description: transaction.description,
          metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
          senderName: transaction.senderWallet?.user?.name || 'External / System',
          senderServiceNo: transaction.senderWallet?.user?.serviceNo || 'N/A',
          receiverName: transaction.receiverWallet?.user?.name || 'External / Bank',
          timestamp: transaction.createdAt
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
