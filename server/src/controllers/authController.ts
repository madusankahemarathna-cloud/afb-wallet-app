import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'afb_super_secure_jwt_secret_key_2026_welfare';

export class AuthController {
  /**
   * Register a new Air Force personnel account
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { serviceNo, name, phone, pin, role = 'CUSTOMER' } = req.body;

      if (!serviceNo || !name || !phone || !pin) {
        res.status(400).json({ success: false, message: 'All fields (Service No, Name, Phone, PIN) are required' });
        return;
      }

      if (pin.length < 4) {
        res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { serviceNo: serviceNo.trim().toUpperCase() }
      });

      if (existingUser) {
        res.status(409).json({ success: false, message: `Account with Service No ${serviceNo} already exists` });
        return;
      }

      const pinHash = await bcrypt.hash(pin, 10);
      const randomWalletSuffix = Math.floor(10000 + Math.random() * 90000);
      const accountNumber = `WLT-${serviceNo.replace(/[^A-Za-z0-9]/g, '') || randomWalletSuffix}`;

      const user = await prisma.user.create({
        data: {
          serviceNo: serviceNo.trim().toUpperCase(),
          name: name.trim(),
          phone: phone.trim(),
          role,
          pinHash,
          wallet: {
            create: {
              accountNumber,
              balance: 1000.00, // Welcome credit for demo
              currency: 'LKR'
            }
          }
        },
        include: { wallet: true }
      });

      const token = jwt.sign(
        { userId: user.id, serviceNo: user.serviceNo, role: user.role as any, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account registered successfully with digital wallet',
        token,
        user: {
          id: user.id,
          serviceNo: user.serviceNo,
          name: user.name,
          phone: user.phone,
          role: user.role,
          wallet: user.wallet
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
  }

  /**
   * Login using Service No and PIN
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { serviceNo, pin } = req.body;

      if (!serviceNo || !pin) {
        res.status(400).json({ success: false, message: 'Service No and PIN are required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { serviceNo: serviceNo.trim().toUpperCase() },
        include: {
          wallet: true,
          outlets: true,
          savedCards: true
        }
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid Service No or PIN' });
        return;
      }

      const isMatch = await bcrypt.compare(pin, user.pinHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid Service No or PIN' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, serviceNo: user.serviceNo, role: user.role as any, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          serviceNo: user.serviceNo,
          name: user.name,
          phone: user.phone,
          role: user.role,
          wallet: user.wallet,
          outlets: user.outlets,
          savedCards: user.savedCards
        }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
  }

  /**
   * Fast Demo Login (1-click role switcher)
   */
  static async quickLogin(req: Request, res: Response): Promise<void> {
    try {
      const { serviceNo } = req.body;
      const user = await prisma.user.findUnique({
        where: { serviceNo: serviceNo.trim().toUpperCase() },
        include: {
          wallet: true,
          outlets: true,
          savedCards: true
        }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Demo user not found' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, serviceNo: user.serviceNo, role: user.role as any, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: `Quick logged in as ${user.name}`,
        token,
        user: {
          id: user.id,
          serviceNo: user.serviceNo,
          name: user.name,
          phone: user.phone,
          role: user.role,
          wallet: user.wallet,
          outlets: user.outlets,
          savedCards: user.savedCards
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get Current Authenticated User & Fresh Wallet Balance
   */
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          wallet: true,
          outlets: true,
          savedCards: true
        }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          serviceNo: user.serviceNo,
          name: user.name,
          phone: user.phone,
          role: user.role,
          wallet: user.wallet,
          outlets: user.outlets,
          savedCards: user.savedCards
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get list of demo users for test switcher
   */
  static async getDemoUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          serviceNo: true,
          name: true,
          role: true,
          outlets: { select: { id: true, name: true, category: true, qrHash: true } },
          wallet: { select: { accountNumber: true, balance: true } }
        },
        orderBy: { serviceNo: 'asc' }
      });
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
