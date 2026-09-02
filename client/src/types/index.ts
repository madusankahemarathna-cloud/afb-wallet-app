export type Role = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

export interface User {
  id: string;
  serviceNo: string;
  name: string;
  phone: string;
  role: Role;
  wallet?: Wallet;
  outlets?: Outlet[];
  savedCards?: SavedCard[];
}

export interface Wallet {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: string;
  updatedAt?: string;
}

export interface SavedCard {
  id: string;
  gatewayToken: string;
  maskedPan: string;
  cardHolder: string;
  expiry: string;
  cardType: string;
  isDefault: boolean;
}

export interface Outlet {
  id: string;
  name: string;
  category: string;
  merchantUserId: string;
  qrHash: string;
  status: string;
  location?: string;
  bankName?: string;
  bankAccountNo?: string;
  merchantUser?: {
    name: string;
    phone: string;
    serviceNo: string;
  };
}

export interface Transaction {
  id: string;
  referenceId: string;
  amount: number;
  fee?: number;
  type: 'TOPUP_MANUAL' | 'TOPUP_CARD' | 'PURCHASE' | 'REFUND' | 'CASHOUT';
  direction?: 'DEBIT' | 'CREDIT';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  description: string;
  metadata?: any;
  counterparty?: string;
  senderName?: string;
  senderServiceNo?: string;
  receiverName?: string;
  receiverServiceNo?: string;
  createdAt: string;
}

export interface TopupRequest {
  id: string;
  userId: string;
  walletId: string;
  amount: number;
  bankReference: string;
  slipImage?: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  user?: {
    name: string;
    serviceNo: string;
    phone: string;
  };
}

export interface Settlement {
  id: string;
  outletId: string;
  merchantUserId: string;
  amount: number;
  bankName: string;
  accountNo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  settledAt?: string;
  createdAt: string;
  outlet?: Outlet;
  merchantUser?: {
    name: string;
    serviceNo: string;
    phone: string;
    wallet?: Wallet;
  };
}

export interface DecodedQR {
  outlet: {
    id: string;
    name: string;
    category: string;
    location?: string;
    qrHash: string;
    merchantName?: string;
  };
  paymentDetails: {
    type: 'STATIC' | 'DYNAMIC';
    fixedAmount?: number | null;
    invoiceRef?: string | null;
    timestamp?: number | null;
  };
}
