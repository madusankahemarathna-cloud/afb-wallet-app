import { Request } from 'express';

export interface AuthUser {
  userId: string;
  serviceNo: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface QRPayload {
  type: 'STATIC' | 'DYNAMIC';
  outletId?: string;
  qrHash: string;
  amount?: number;
  invoiceRef?: string;
  outletName?: string;
  category?: string;
  timestamp?: number;
}
