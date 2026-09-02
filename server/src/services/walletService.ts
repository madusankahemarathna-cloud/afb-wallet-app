import { prisma } from '../prisma';

export class WalletService {
  /**
   * Generates a unique transaction reference ID (e.g., TXN-894201)
   */
  static generateReferenceId(prefix = 'TXN'): string {
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${randomPart}`;
  }

  /**
   * Atomic QR payment transfer from Customer to Merchant
   * Enforced in an ACID transaction so double-spending or partial state changes are impossible.
   */
  static async transferPayment({
    senderUserId,
    merchantOutletQrHash,
    amount,
    description,
    metadata
  }: {
    senderUserId: string;
    merchantOutletQrHash: string;
    amount: number;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Get Sender Wallet
      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderUserId },
        include: { user: true }
      });

      if (!senderWallet) {
        throw new Error('Sender digital wallet not found');
      }

      if (senderWallet.status !== 'ACTIVE') {
        throw new Error('Sender wallet is frozen or suspended');
      }

      if (senderWallet.balance < amount) {
        throw new Error(`Insufficient wallet balance. Current balance: LKR ${senderWallet.balance.toFixed(2)}, Required: LKR ${amount.toFixed(2)}`);
      }

      // 2. Find Destination Outlet and its Merchant Wallet
      const outlet = await tx.outlet.findUnique({
        where: { qrHash: merchantOutletQrHash },
        include: {
          merchantUser: {
            include: { wallet: true }
          }
        }
      });

      if (!outlet) {
        throw new Error(`Invalid outlet QR code: ${merchantOutletQrHash}`);
      }

      if (outlet.status !== 'ACTIVE') {
        throw new Error('This merchant outlet is currently inactive');
      }

      const receiverWallet = outlet.merchantUser.wallet;
      if (!receiverWallet) {
        throw new Error('Merchant wallet not configured');
      }

      // Prevent sending to self
      if (senderWallet.id === receiverWallet.id) {
        throw new Error('Cannot transfer funds to your own wallet');
      }

      // 3. Perform atomic balance updates
      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: { decrement: amount }
        }
      });

      const updatedReceiver = await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: { increment: amount }
        }
      });

      // 4. Record Double-Entry Transaction Ledger Entry
      const referenceId = this.generateReferenceId('TXN');
      const transaction = await tx.transaction.create({
        data: {
          referenceId,
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
          amount,
          fee: 0.0,
          type: 'PURCHASE',
          status: 'SUCCESS',
          description: description || `Payment at ${outlet.name}`,
          metadata: JSON.stringify({
            outletId: outlet.id,
            outletName: outlet.name,
            outletCategory: outlet.category,
            qrHash: outlet.qrHash,
            senderName: senderWallet.user.name,
            senderServiceNo: senderWallet.user.serviceNo,
            ...(metadata || {})
          })
        },
        include: {
          senderWallet: { include: { user: true } },
          receiverWallet: { include: { user: true } }
        }
      });

      return {
        transaction,
        outlet,
        senderWallet: updatedSender,
        receiverWallet: updatedReceiver
      };
    });
  }

  /**
   * Atomic Instant Card Top-up
   */
  static async topupViaCard({
    userId,
    amount,
    cardId,
    maskedPan,
    cardType
  }: {
    userId: string;
    amount: number;
    cardId?: string;
    maskedPan: string;
    cardType: string;
  }) {
    if (amount <= 0) {
      throw new Error('Top-up amount must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        include: { user: true }
      });

      if (!wallet) {
        throw new Error('User wallet not found');
      }

      // Increment balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount }
        }
      });

      const referenceId = this.generateReferenceId('TOP');
      const transaction = await tx.transaction.create({
        data: {
          referenceId,
          senderWalletId: null,
          receiverWalletId: wallet.id,
          amount,
          fee: 0.0,
          type: 'TOPUP_CARD',
          status: 'SUCCESS',
          description: `Instant Card Top-up via ${cardType} ${maskedPan}`,
          metadata: JSON.stringify({
            paymentMethod: 'DEBIT_CREDIT_CARD',
            cardId,
            maskedPan,
            cardType,
            gatewayStatus: 'AUTHORIZED'
          })
        }
      });

      return {
        wallet: updatedWallet,
        transaction
      };
    });
  }

  /**
   * Approve Manual Bank Transfer Top-up (Admin Action)
   */
  static async approveManualTopup(topupRequestId: string, adminServiceNo: string, adminNotes?: string) {
    return await prisma.$transaction(async (tx) => {
      const req = await tx.topupRequest.findUnique({
        where: { id: topupRequestId },
        include: { wallet: true, user: true }
      });

      if (!req) {
        throw new Error('Top-up request not found');
      }

      if (req.status !== 'PENDING') {
        throw new Error(`Request is already ${req.status}`);
      }

      // Credit wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: req.walletId },
        data: { balance: { increment: req.amount } }
      });

      // Update Request status
      const updatedReq = await tx.topupRequest.update({
        where: { id: req.id },
        data: {
          status: 'APPROVED',
          adminNotes: adminNotes || 'Approved by Base Finance Section',
          reviewedBy: adminServiceNo,
          reviewedAt: new Date()
        }
      });

      // Record in ledger
      const referenceId = this.generateReferenceId('SLIP');
      const transaction = await tx.transaction.create({
        data: {
          referenceId,
          senderWalletId: null,
          receiverWalletId: req.walletId,
          amount: req.amount,
          fee: 0.0,
          type: 'TOPUP_MANUAL',
          status: 'SUCCESS',
          description: `Manual Bank Deposit Verified (Ref: ${req.bankReference})`,
          metadata: JSON.stringify({
            bankReference: req.bankReference,
            topupRequestId: req.id,
            approvedBy: adminServiceNo
          })
        }
      });

      return {
        topupRequest: updatedReq,
        wallet: updatedWallet,
        transaction
      };
    });
  }

  /**
   * Process Merchant Settlement (Cash-out to Base Bank Account)
   */
  static async approveSettlement(settlementId: string, adminServiceNo: string, adminNotes?: string) {
    return await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        include: {
          outlet: true,
          merchantUser: { include: { wallet: true } }
        }
      });

      if (!settlement) {
        throw new Error('Settlement request not found');
      }

      if (settlement.status !== 'PENDING') {
        throw new Error(`Settlement is already ${settlement.status}`);
      }

      const merchantWallet = settlement.merchantUser.wallet;
      if (!merchantWallet) {
        throw new Error('Merchant wallet not found');
      }

      if (merchantWallet.balance < settlement.amount) {
        throw new Error('Merchant wallet has insufficient balance for this settlement amount');
      }

      // Deduct merchant wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: merchantWallet.id },
        data: { balance: { decrement: settlement.amount } }
      });

      const updatedSettlement = await tx.settlement.update({
        where: { id: settlement.id },
        data: {
          status: 'APPROVED',
          adminNotes: adminNotes || 'Settlement disbursed via Base Commercial Banking Portal',
          settledAt: new Date()
        }
      });

      const referenceId = this.generateReferenceId('SETTLE');
      const transaction = await tx.transaction.create({
        data: {
          referenceId,
          senderWalletId: merchantWallet.id,
          receiverWalletId: null,
          amount: settlement.amount,
          fee: 0.0,
          type: 'CASHOUT',
          status: 'SUCCESS',
          description: `Bank Payout to ${settlement.bankName} (${settlement.accountNo}) for ${settlement.outlet.name}`,
          metadata: JSON.stringify({
            settlementId: settlement.id,
            bankName: settlement.bankName,
            accountNo: settlement.accountNo,
            approvedBy: adminServiceNo
          })
        }
      });

      return {
        settlement: updatedSettlement,
        wallet: updatedWallet,
        transaction
      };
    });
  }
}
