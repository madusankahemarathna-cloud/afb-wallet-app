import { Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';

export class MerchantController {
  /**
   * Get Merchant Dashboard Sales Summary & Stats
   */
  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      // Find outlets owned by merchant
      const outlets = await prisma.outlet.findMany({
        where: { merchantUserId: req.user.userId }
      });

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { wallet: true }
      });

      const wallet = user?.wallet;
      if (!wallet) {
        res.status(404).json({ success: false, message: 'Merchant wallet not found' });
        return;
      }

      // Calculate Today's Stats (since start of current day)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayTransactions = await prisma.transaction.findMany({
        where: {
          receiverWalletId: wallet.id,
          type: 'PURCHASE',
          createdAt: { gte: startOfDay }
        },
        include: {
          senderWallet: {
            include: { user: { select: { name: true, serviceNo: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const todaySales = todayTransactions.reduce((acc, t) => acc + t.amount, 0);
      const todayCount = todayTransactions.length;
      const averageBill = todayCount > 0 ? todaySales / todayCount : 0;

      // Pending Settlements
      const pendingSettlements = await prisma.settlement.findMany({
        where: {
          merchantUserId: req.user.userId,
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
      });

      const allSettlements = await prisma.settlement.findMany({
        where: { merchantUserId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Recent 20 transactions
      const recentSales = await prisma.transaction.findMany({
        where: { receiverWalletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          senderWallet: {
            include: { user: { select: { name: true, serviceNo: true } } }
          }
        }
      });

      res.json({
        success: true,
        stats: {
          walletBalance: wallet.balance,
          currency: wallet.currency,
          todaySales,
          todayCount,
          averageBill,
          outlets,
          pendingSettlementTotal: pendingSettlements.reduce((acc, s) => acc + s.amount, 0),
          recentSales: recentSales.map(t => ({
            id: t.id,
            referenceId: t.referenceId,
            amount: t.amount,
            customerName: t.senderWallet?.user?.name || 'Customer',
            customerServiceNo: t.senderWallet?.user?.serviceNo || 'N/A',
            description: t.description,
            metadata: t.metadata ? JSON.parse(t.metadata) : null,
            createdAt: t.createdAt
          })),
          settlements: allSettlements
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Generate Dynamic QR Code (with pre-filled amount and invoice ref)
   */
  static async generateDynamicQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { outletId, amount, invoiceRef, items } = req.body;
      const numAmount = parseFloat(amount);

      let outlet;
      if (outletId) {
        outlet = await prisma.outlet.findFirst({
          where: { id: outletId, merchantUserId: req.user.userId }
        });
      } else {
        outlet = await prisma.outlet.findFirst({
          where: { merchantUserId: req.user.userId }
        });
      }

      if (!outlet) {
        res.status(404).json({ success: false, message: 'Merchant outlet not found' });
        return;
      }

      const ref = invoiceRef || `INV-${Date.now().toString().slice(-6)}`;

      const qrPayload = {
        type: 'DYNAMIC',
        qrHash: outlet.qrHash,
        outletId: outlet.id,
        outletName: outlet.name,
        category: outlet.category,
        amount: isNaN(numAmount) ? null : numAmount,
        invoiceRef: ref,
        items: items || [],
        timestamp: Date.now()
      };

      const qrJsonString = JSON.stringify(qrPayload);
      const qrDataUrl = await QRCode.toDataURL(qrJsonString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#072849',
          light: '#ffffff'
        }
      });

      res.json({
        success: true,
        qrPayload,
        qrJsonString,
        qrDataUrl
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Generate Static QR Code for Outlet display
   */
  static async getStaticQR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const outlet = await prisma.outlet.findFirst({
        where: { merchantUserId: req.user.userId }
      });

      if (!outlet) {
        res.status(404).json({ success: false, message: 'Merchant outlet not found' });
        return;
      }

      const qrPayload = {
        type: 'STATIC',
        qrHash: outlet.qrHash,
        outletId: outlet.id,
        outletName: outlet.name,
        category: outlet.category
      };

      const qrJsonString = JSON.stringify(qrPayload);
      const qrDataUrl = await QRCode.toDataURL(qrJsonString, {
        width: 360,
        margin: 2,
        color: {
          dark: '#072849',
          light: '#ffffff'
        }
      });

      res.json({
        success: true,
        outlet,
        qrJsonString,
        qrDataUrl
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Request End-of-Day Settlement (Cashout)
   */
  static async requestSettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { outletId, amount, bankName, accountNo } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({ success: false, message: 'Valid settlement amount is required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { wallet: true, outlets: true }
      });

      if (!user || !user.wallet) {
        res.status(404).json({ success: false, message: 'Merchant wallet not found' });
        return;
      }

      if (user.wallet.balance < numAmount) {
        res.status(400).json({
          success: false,
          message: `Insufficient balance. Available: LKR ${user.wallet.balance.toFixed(2)}, Requested: LKR ${numAmount.toFixed(2)}`
        });
        return;
      }

      const outlet = user.outlets.find(o => o.id === outletId) || user.outlets[0];
      if (!outlet) {
        res.status(400).json({ success: false, message: 'Merchant outlet not found' });
        return;
      }

      const settlement = await prisma.settlement.create({
        data: {
          outletId: outlet.id,
          merchantUserId: user.id,
          amount: numAmount,
          bankName: bankName || outlet.bankName || 'Bank of Ceylon',
          accountNo: accountNo || outlet.bankAccountNo || '8004523910',
          status: 'PENDING'
        }
      });

      res.status(201).json({
        success: true,
        message: 'Settlement request submitted successfully. Awaiting Base Finance Section disbursement.',
        settlement
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
