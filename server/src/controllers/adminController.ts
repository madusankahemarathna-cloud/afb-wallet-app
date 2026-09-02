import { Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';
import { WalletService } from '../services/walletService';
import { notifyUserTopup } from '../socket';

export class AdminController {
  /**
   * Get Master Overview & Financial Stats
   */
  static async getOverview(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usersCount = await prisma.user.count({ where: { role: 'CUSTOMER' } });
      const merchantsCount = await prisma.user.count({ where: { role: 'MERCHANT' } });
      const outletsCount = await prisma.outlet.count();

      const wallets = await prisma.wallet.findMany();
      const totalCirculatingBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

      const transactions = await prisma.transaction.findMany();
      const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);

      const pendingTopups = await prisma.topupRequest.count({ where: { status: 'PENDING' } });
      const pendingSettlements = await prisma.settlement.count({ where: { status: 'PENDING' } });

      // Breakdown by outlet
      const outlets = await prisma.outlet.findMany({
        include: {
          merchantUser: {
            include: { wallet: true }
          }
        }
      });

      res.json({
        success: true,
        overview: {
          usersCount,
          merchantsCount,
          outletsCount,
          totalCirculatingBalance,
          totalVolume,
          totalTransactions: transactions.length,
          pendingTopups,
          pendingSettlements,
          outlets: outlets.map(o => ({
            id: o.id,
            name: o.name,
            category: o.category,
            location: o.location,
            qrHash: o.qrHash,
            merchantName: o.merchantUser.name,
            walletBalance: o.merchantUser.wallet?.balance || 0,
            bankName: o.bankName,
            bankAccountNo: o.bankAccountNo
          }))
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get Master Double-Entry Ledger
   */
  static async getLedger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, search, limit = 100, offset = 0 } = req.query;

      const whereClause: any = {};
      if (type && typeof type === 'string') {
        whereClause.type = type;
      }
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { referenceId: { contains: search } },
          { description: { contains: search } }
        ];
      }

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          senderWallet: {
            include: { user: { select: { name: true, serviceNo: true, role: true } } }
          },
          receiverWallet: {
            include: { user: { select: { name: true, serviceNo: true, role: true } } }
          }
        }
      });

      const total = await prisma.transaction.count({ where: whereClause });

      res.json({
        success: true,
        total,
        transactions: transactions.map(t => ({
          id: t.id,
          referenceId: t.referenceId,
          amount: t.amount,
          fee: t.fee,
          type: t.type,
          status: t.status,
          description: t.description,
          metadata: t.metadata ? JSON.parse(t.metadata) : null,
          senderName: t.senderWallet?.user?.name || 'System / Deposit Gateway',
          senderServiceNo: t.senderWallet?.user?.serviceNo || 'N/A',
          receiverName: t.receiverWallet?.user?.name || 'Base Payout Gateway',
          receiverServiceNo: t.receiverWallet?.user?.serviceNo || 'N/A',
          createdAt: t.createdAt
        }))
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get Manual Top-up Approval Queue
   */
  static async getTopupRequests(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requests = await prisma.topupRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, serviceNo: true, phone: true }
          },
          wallet: {
            select: { accountNumber: true, balance: true }
          }
        }
      });

      res.json({ success: true, requests });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Approve Manual Top-up Deposit
   */
  static async approveTopup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminServiceNo = req.user?.serviceNo || 'AFB-ADMIN';

      const result = await WalletService.approveManualTopup(id, adminServiceNo, adminNotes);

      // Notify customer real-time
      notifyUserTopup(result.topupRequest.userId, {
        topupId: result.topupRequest.id,
        status: 'APPROVED',
        amount: result.topupRequest.amount,
        newBalance: result.wallet.balance
      });

      res.json({
        success: true,
        message: `Top-up of LKR ${result.topupRequest.amount.toFixed(2)} approved successfully`,
        result
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Reject Manual Top-up Deposit
   */
  static async rejectTopup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminServiceNo = req.user?.serviceNo || 'AFB-ADMIN';

      const reqToReject = await prisma.topupRequest.findUnique({
        where: { id }
      });

      if (!reqToReject) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }

      if (reqToReject.status !== 'PENDING') {
        res.status(400).json({ success: false, message: `Request is already ${reqToReject.status}` });
        return;
      }

      const updated = await prisma.topupRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes || 'Invalid bank reference or unclear deposit slip',
          reviewedBy: adminServiceNo,
          reviewedAt: new Date()
        }
      });

      notifyUserTopup(updated.userId, {
        topupId: updated.id,
        status: 'REJECTED',
        amount: updated.amount,
        reason: updated.adminNotes
      });

      res.json({ success: true, message: 'Top-up request rejected', topupRequest: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get Merchant Settlement Requests Queue
   */
  static async getSettlementRequests(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const settlements = await prisma.settlement.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          outlet: true,
          merchantUser: {
            select: { name: true, serviceNo: true, phone: true, wallet: true }
          }
        }
      });

      res.json({ success: true, settlements });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Approve and Process Merchant Cash-out Settlement
   */
  static async approveSettlement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminServiceNo = req.user?.serviceNo || 'AFB-ADMIN';

      const result = await WalletService.approveSettlement(id, adminServiceNo, adminNotes);

      res.json({
        success: true,
        message: `Settlement of LKR ${result.settlement.amount.toFixed(2)} marked as disbursed`,
        result
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Onboard New Merchant Outlet & Generate Physical QR Code
   */
  static async createOutlet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, category, merchantUserId, location, bankName, bankAccountNo } = req.body;

      if (!name || !category || !merchantUserId) {
        res.status(400).json({ success: false, message: 'Outlet name, category, and merchant user ID are required' });
        return;
      }

      const cleanCode = category.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'OUT';
      const randomSuffix = Math.floor(10 + Math.random() * 90);
      const qrHash = `AFB-OUTLET-${cleanCode}-${randomSuffix}`;

      const outlet = await prisma.outlet.create({
        data: {
          name,
          category,
          merchantUserId,
          location: location || 'Base Headquarters Complex',
          bankName: bankName || 'Bank of Ceylon',
          bankAccountNo: bankAccountNo || '8001002003',
          qrHash
        },
        include: { merchantUser: true }
      });

      const qrPayload = {
        type: 'STATIC',
        qrHash: outlet.qrHash,
        outletId: outlet.id,
        outletName: outlet.name,
        category: outlet.category
      };

      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 400,
        margin: 2,
        color: { dark: '#072849', light: '#ffffff' }
      });

      res.status(201).json({
        success: true,
        message: 'New outlet onboarded successfully',
        outlet,
        qrDataUrl
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get all outlets
   */
  static async getOutlets(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const outlets = await prisma.outlet.findMany({
        include: {
          merchantUser: {
            select: { name: true, serviceNo: true, phone: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json({ success: true, outlets });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
