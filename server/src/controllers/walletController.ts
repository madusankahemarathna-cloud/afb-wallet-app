import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';
import { WalletService } from '../services/walletService';

export class WalletController {
  /**
   * Get current user's wallet balance
   */
  static async getBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const wallet = await prisma.wallet.findUnique({
        where: { userId: req.user.userId }
      });

      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      res.json({
        success: true,
        wallet: {
          id: wallet.id,
          accountNumber: wallet.accountNumber,
          balance: wallet.balance,
          currency: wallet.currency,
          status: wallet.status,
          updatedAt: wallet.updatedAt
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get wallet transaction history with pagination
   */
  static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const wallet = await prisma.wallet.findUnique({
        where: { userId: req.user.userId }
      });

      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      const { type, limit = 50, offset = 0 } = req.query;

      const whereClause: any = {
        OR: [
          { senderWalletId: wallet.id },
          { receiverWalletId: wallet.id }
        ]
      };

      if (type && typeof type === 'string') {
        whereClause.type = type;
      }

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          senderWallet: { include: { user: { select: { name: true, serviceNo: true } } } },
          receiverWallet: { include: { user: { select: { name: true, serviceNo: true } } } }
        }
      });

      const total = await prisma.transaction.count({ where: whereClause });

      res.json({
        success: true,
        total,
        transactions: transactions.map(txn => {
          const isSender = txn.senderWalletId === wallet.id;
          return {
            id: txn.id,
            referenceId: txn.referenceId,
            amount: txn.amount,
            type: txn.type,
            direction: isSender ? 'DEBIT' : 'CREDIT',
            status: txn.status,
            description: txn.description,
            metadata: txn.metadata ? JSON.parse(txn.metadata) : null,
            counterparty: isSender 
              ? (txn.receiverWallet?.user?.name || 'System / Cashier')
              : (txn.senderWallet?.user?.name || 'Bank / Card Deposit'),
            createdAt: txn.createdAt
          };
        })
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Instant Card Top-up
   */
  static async topupViaCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { amount, cardId, cardNumber, expiry, cardHolder } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Invalid top-up amount' });
        return;
      }

      let maskedPan = '**** **** **** 4819';
      let cardType = 'VISA';

      if (cardId) {
        const savedCard = await prisma.savedCard.findUnique({
          where: { id: cardId }
        });
        if (savedCard) {
          maskedPan = savedCard.maskedPan;
          cardType = savedCard.cardType;
        }
      } else if (cardNumber) {
        const cleanCard = cardNumber.replace(/\s+/g, '');
        maskedPan = `**** **** **** ${cleanCard.slice(-4)}`;
        cardType = cleanCard.startsWith('5') ? 'MASTERCARD' : 'VISA';
      }

      const result = await WalletService.topupViaCard({
        userId: req.user.userId,
        amount: numAmount,
        cardId,
        maskedPan,
        cardType
      });

      res.json({
        success: true,
        message: `Successfully topped up LKR ${numAmount.toFixed(2)} via ${cardType}`,
        wallet: result.wallet,
        transaction: result.transaction
      });
    } catch (err: any) {
      console.error('Card topup error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Submit Manual Bank Deposit Request with Slip
   */
  static async submitManualTopup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { amount, bankReference, notes, slipImage } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Valid amount is required' });
        return;
      }

      if (!bankReference) {
        res.status(400).json({ success: false, message: 'Bank transfer reference number is required' });
        return;
      }

      const wallet = await prisma.wallet.findUnique({
        where: { userId: req.user.userId }
      });

      if (!wallet) {
        res.status(404).json({ success: false, message: 'User wallet not found' });
        return;
      }

      const topupRequest = await prisma.topupRequest.create({
        data: {
          userId: req.user.userId,
          walletId: wallet.id,
          amount: numAmount,
          bankReference: bankReference.trim(),
          notes: notes || 'Bank deposit submitted for verification',
          slipImage: slipImage || null,
          status: 'PENDING'
        }
      });

      res.status(201).json({
        success: true,
        message: 'Manual deposit request submitted. Awaiting Base Finance Section verification.',
        topupRequest
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get user's saved cards
   */
  static async getSavedCards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const cards = await prisma.savedCard.findMany({
        where: { userId: req.user.userId },
        orderBy: { isDefault: 'desc' }
      });

      res.json({ success: true, cards });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Save a new card for 1-click topup
   */
  static async saveCard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { cardNumber, cardHolder, expiry, isDefault = false } = req.body;
      if (!cardNumber || !cardHolder || !expiry) {
        res.status(400).json({ success: false, message: 'Card number, holder name, and expiry are required' });
        return;
      }

      const cleanNum = cardNumber.replace(/\s+/g, '');
      const maskedPan = `**** **** **** ${cleanNum.slice(-4)}`;
      const cardType = cleanNum.startsWith('5') ? 'MASTERCARD' : 'VISA';
      const gatewayToken = `tok_${cardType.toLowerCase()}_afb_${Math.floor(1000 + Math.random() * 9000)}`;

      if (isDefault) {
        await prisma.savedCard.updateMany({
          where: { userId: req.user.userId },
          data: { isDefault: false }
        });
      }

      const card = await prisma.savedCard.create({
        data: {
          userId: req.user.userId,
          gatewayToken,
          maskedPan,
          cardHolder: cardHolder.toUpperCase(),
          expiry,
          cardType,
          isDefault
        }
      });

      res.status(201).json({ success: true, message: 'Card tokenized and saved securely', card });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get user's manual topup request history
   */
  static async getTopupRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const requests = await prisma.topupRequest.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, requests });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
