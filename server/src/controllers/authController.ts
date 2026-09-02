import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { AuthenticatedRequest } from '../types';
import { EmailService } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'afb_super_secure_jwt_secret_key_2026_welfare';

function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class AuthController {
  /**
   * STEP 1 of Registration: Send OTP to Gmail
   */
  static async registerSendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { serviceNo, name, phone, email, pin, role = 'CUSTOMER' } = req.body;

      if (!serviceNo || !name || !phone || !email || !pin) {
        res.status(400).json({
          success: false,
          message: 'All fields (Service No, Full Name, Phone, Gmail Address, and PIN) are required'
        });
        return;
      }

      const cleanServiceNo = serviceNo.trim().toUpperCase();
      const cleanEmail = email.trim().toLowerCase();

      // Email format check
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        res.status(400).json({ success: false, message: 'Please enter a valid Gmail / Email address' });
        return;
      }

      if (pin.length < 4) {
        res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
        return;
      }

      // Check if serviceNo exists
      const existingService = await prisma.user.findUnique({
        where: { serviceNo: cleanServiceNo }
      });
      if (existingService) {
        res.status(409).json({
          success: false,
          message: `Account with Service No ${cleanServiceNo} already exists`
        });
        return;
      }

      // Check if email exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail }
      });
      if (existingEmail) {
        res.status(409).json({
          success: false,
          message: `An account with email ${cleanEmail} is already registered`
        });
        return;
      }

      // Generate 6-digit OTP
      const otp = generate6DigitOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const pinHash = await bcrypt.hash(pin, 10);

      // Clean old OTPs for this email
      await prisma.otpVerification.deleteMany({
        where: { target: cleanEmail, type: 'REGISTRATION' }
      });

      // Store pending registration metadata & OTP (expires in 10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.otpVerification.create({
        data: {
          target: cleanEmail,
          otpHash,
          type: 'REGISTRATION',
          metadata: JSON.stringify({
            serviceNo: cleanServiceNo,
            name: name.trim(),
            phone: phone.trim(),
            email: cleanEmail,
            pinHash,
            role
          }),
          expiresAt
        }
      });

      // Send OTP to Gmail
      const emailResult = await EmailService.sendRegistrationOtp(cleanEmail, otp, name.trim());

      res.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
        targetEmail: cleanEmail,
        expiresInSeconds: 600,
        simulated: !process.env.GMAIL_USER,
        otpPreview: !process.env.GMAIL_USER ? otp : undefined
      });
    } catch (err: any) {
      console.error('Registration send OTP error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to send OTP' });
    }
  }

  /**
   * STEP 2 of Registration: Verify OTP & Create User with Wallet
   */
  static async registerVerifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.toString().trim();

      const record = await prisma.otpVerification.findFirst({
        where: {
          target: cleanEmail,
          type: 'REGISTRATION',
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!record || !record.metadata) {
        res.status(400).json({
          success: false,
          message: 'Verification code has expired or is invalid. Please request a new code.'
        });
        return;
      }

      const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Invalid 6-digit verification code' });
        return;
      }

      const userData = JSON.parse(record.metadata);
      const randomWalletSuffix = Math.floor(10000 + Math.random() * 90000);
      const accountNumber = `WLT-${userData.serviceNo.replace(/[^A-Za-z0-9]/g, '') || randomWalletSuffix}`;

      // Create User and Wallet in database
      const user = await prisma.user.create({
        data: {
          serviceNo: userData.serviceNo,
          name: userData.name,
          phone: userData.phone,
          email: userData.email,
          role: userData.role || 'CUSTOMER',
          pinHash: userData.pinHash,
          wallet: {
            create: {
              accountNumber,
              balance: 1000.00, // Welcome bonus
              currency: 'LKR'
            }
          }
        },
        include: { wallet: true }
      });

      // Cleanup used OTP
      await prisma.otpVerification.delete({ where: { id: record.id } });

      const token = jwt.sign(
        { userId: user.id, serviceNo: user.serviceNo, role: user.role as any, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Account verified and registered successfully!',
        token,
        user: {
          id: user.id,
          serviceNo: user.serviceNo,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          wallet: user.wallet
        }
      });
    } catch (err: any) {
      console.error('Registration verify OTP error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to complete registration' });
    }
  }

  /**
   * STEP 1 of Forgot Password: Send Reset OTP to Gmail
   */
  static async forgotPasswordSendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.body; // Can be Service No or Email

      if (!identifier) {
        res.status(400).json({ success: false, message: 'Service Number or Gmail address is required' });
        return;
      }

      const cleanIdentifier = identifier.trim();

      // Find user by either serviceNo or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { serviceNo: cleanIdentifier.toUpperCase() },
            { email: cleanIdentifier.toLowerCase() }
          ]
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'No registered user found with the provided Service Number or Gmail address'
        });
        return;
      }

      const targetEmail = user.email || `${user.serviceNo.toLowerCase()}@afb-wallet.mil`;

      // Generate 6-digit OTP
      const otp = generate6DigitOtp();
      const otpHash = await bcrypt.hash(otp, 10);

      // Clean old reset OTPs
      await prisma.otpVerification.deleteMany({
        where: { target: user.id, type: 'PASSWORD_RESET' }
      });

      // Store OTP
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.otpVerification.create({
        data: {
          target: user.id,
          otpHash,
          type: 'PASSWORD_RESET',
          metadata: JSON.stringify({ userId: user.id, email: targetEmail, serviceNo: user.serviceNo }),
          expiresAt
        }
      });

      // Send Email
      await EmailService.sendPasswordResetOtp(targetEmail, otp, user.name);

      // Mask email for security e.g. "m***@gmail.com"
      const maskedEmail = targetEmail.includes('@')
        ? targetEmail.replace(/(.{2})(.*)(?=@)/, (_match, p1, p2) => p1 + '*'.repeat(p2.length))
        : targetEmail;

      res.json({
        success: true,
        message: `A password reset code has been sent to ${maskedEmail}`,
        userId: user.id,
        maskedEmail,
        expiresInSeconds: 600,
        simulated: !process.env.GMAIL_USER,
        otpPreview: !process.env.GMAIL_USER ? otp : undefined
      });
    } catch (err: any) {
      console.error('Forgot password send OTP error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to send reset code' });
    }
  }

  /**
   * STEP 2 of Forgot Password: Verify OTP and Set New Password / PIN
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId, otp, newPin } = req.body;

      if (!userId || !otp || !newPin) {
        res.status(400).json({ success: false, message: 'User ID, OTP code, and New PIN/Password are required' });
        return;
      }

      if (newPin.length < 4) {
        res.status(400).json({ success: false, message: 'New PIN must be at least 4 digits' });
        return;
      }

      const cleanOtp = otp.toString().trim();

      const record = await prisma.otpVerification.findFirst({
        where: {
          target: userId,
          type: 'PASSWORD_RESET',
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!record) {
        res.status(400).json({
          success: false,
          message: 'Reset code has expired or is invalid. Please request a new code.'
        });
        return;
      }

      const isMatch = await bcrypt.compare(cleanOtp, record.otpHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Invalid 6-digit authorization code' });
        return;
      }

      const newPinHash = await bcrypt.hash(newPin, 10);

      // Update User PIN in database
      await prisma.user.update({
        where: { id: userId },
        data: { pinHash: newPinHash }
      });

      // Clean up used OTP
      await prisma.otpVerification.delete({ where: { id: record.id } });

      res.json({
        success: true,
        message: 'Security PIN has been reset successfully! You can now log in with your new PIN.'
      });
    } catch (err: any) {
      console.error('Reset password error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to reset PIN' });
    }
  }

  /**
   * Standard Login using Service No or Email and PIN
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { serviceNo, pin } = req.body;

      if (!serviceNo || !pin) {
        res.status(400).json({ success: false, message: 'Service No / Email and PIN are required' });
        return;
      }

      const cleanIdentifier = serviceNo.trim();

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { serviceNo: cleanIdentifier.toUpperCase() },
            { email: cleanIdentifier.toLowerCase() }
          ]
        },
        include: {
          wallet: true,
          outlets: true,
          savedCards: true
        }
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(pin, user.pinHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid PIN or credentials.' });
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
          email: user.email,
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
          email: user.email,
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
          email: user.email,
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
          email: true,
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
