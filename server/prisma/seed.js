"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = main;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding Air Force Base Closed-Loop Wallet Database...');
    // Clean old data
    await prisma.transaction.deleteMany();
    await prisma.topupRequest.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.savedCard.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
    const defaultPinHash = await bcryptjs_1.default.hash('1234', 10);
    // 1. Admin / Finance Section
    const admin = await prisma.user.create({
        data: {
            serviceNo: 'AFB-0001',
            name: 'Sqd Ldr V. Jayawardena (Finance Officer)',
            phone: '+94771234500',
            role: 'ADMIN',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-ADMIN-01',
                    balance: 250000.00,
                    currency: 'LKR'
                }
            }
        },
        include: { wallet: true }
    });
    // 2. Merchants & Outlets
    const merchantCanteenUser = await prisma.user.create({
        data: {
            serviceNo: 'AFB-M001',
            name: 'Eagle Canteen & Bakery Manager',
            phone: '+94772345601',
            role: 'MERCHANT',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-M-CANTEEN',
                    balance: 48500.00,
                    currency: 'LKR'
                }
            },
            outlets: {
                create: {
                    name: 'Eagle Welfare Canteen & Bakery',
                    category: 'Canteen',
                    qrHash: 'AFB-OUTLET-CANTEEN-01',
                    location: 'Building B-4, Base Headquarters',
                    bankName: 'Bank of Ceylon (BOC)',
                    bankAccountNo: '8004523910'
                }
            }
        },
        include: { wallet: true, outlets: true }
    });
    const merchantYoghurtUser = await prisma.user.create({
        data: {
            serviceNo: 'AFB-M002',
            name: 'Base Yoghurt & Dairy Project In-charge',
            phone: '+94772345602',
            role: 'MERCHANT',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-M-YOGHURT',
                    balance: 29400.00,
                    currency: 'LKR'
                }
            },
            outlets: {
                create: {
                    name: 'Fresh Yoghurt & Dairy Project',
                    category: 'Yoghurt Project',
                    qrHash: 'AFB-OUTLET-YOGHURT-02',
                    location: 'Farm Sector Gate 2',
                    bankName: 'People\'s Bank',
                    bankAccountNo: '2049182375'
                }
            }
        },
        include: { wallet: true, outlets: true }
    });
    const merchantSalonUser = await prisma.user.create({
        data: {
            serviceNo: 'AFB-M003',
            name: 'Base Salon & Spa Caretaker',
            phone: '+94772345603',
            role: 'MERCHANT',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-M-SALON',
                    balance: 14200.00,
                    currency: 'LKR'
                }
            },
            outlets: {
                create: {
                    name: 'Officers\' & Airmen Grooming Salon',
                    category: 'Salon',
                    qrHash: 'AFB-OUTLET-SALON-03',
                    location: 'Recreation Complex ground floor',
                    bankName: 'Commercial Bank',
                    bankAccountNo: '1092837465'
                }
            }
        },
        include: { wallet: true, outlets: true }
    });
    const merchantTombolaUser = await prisma.user.create({
        data: {
            serviceNo: 'AFB-M004',
            name: 'Tombola & Welfare Carnival Stall',
            phone: '+94772345604',
            role: 'MERCHANT',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-M-TOMBOLA',
                    balance: 65000.00,
                    currency: 'LKR'
                }
            },
            outlets: {
                create: {
                    name: 'Annual Tombola & Raffle Stall',
                    category: 'Tombola Stall',
                    qrHash: 'AFB-OUTLET-TOMBOLA-04',
                    location: 'Main Parade Ground Carnival Arena',
                    bankName: 'Hatton National Bank (HNB)',
                    bankAccountNo: '5001928374'
                }
            }
        },
        include: { wallet: true, outlets: true }
    });
    // 3. Customers
    const customer1 = await prisma.user.create({
        data: {
            serviceNo: 'AFB-10452',
            name: 'Wg Cdr K. Perera',
            phone: '+94719876543',
            role: 'CUSTOMER',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-10452',
                    balance: 15500.00,
                    currency: 'LKR'
                }
            },
            savedCards: {
                create: [
                    {
                        gatewayToken: 'tok_visa_afb_9812',
                        maskedPan: '**** **** **** 4819',
                        cardHolder: 'K PERERA',
                        expiry: '09/28',
                        cardType: 'VISA',
                        isDefault: true
                    },
                    {
                        gatewayToken: 'tok_mc_afb_1142',
                        maskedPan: '**** **** **** 6201',
                        cardHolder: 'K PERERA',
                        expiry: '11/27',
                        cardType: 'MASTERCARD',
                        isDefault: false
                    }
                ]
            }
        },
        include: { wallet: true }
    });
    const customer2 = await prisma.user.create({
        data: {
            serviceNo: 'AFB-22819',
            name: 'Flt Lt S. Silva',
            phone: '+94765432109',
            role: 'CUSTOMER',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-22819',
                    balance: 8250.00,
                    currency: 'LKR'
                }
            },
            savedCards: {
                create: [
                    {
                        gatewayToken: 'tok_visa_afb_3390',
                        maskedPan: '**** **** **** 1093',
                        cardHolder: 'S SILVA',
                        expiry: '04/29',
                        cardType: 'VISA',
                        isDefault: true
                    }
                ]
            }
        },
        include: { wallet: true }
    });
    const customer3 = await prisma.user.create({
        data: {
            serviceNo: 'AFB-44102',
            name: 'Cpl M. Fernando',
            phone: '+94751122334',
            role: 'CUSTOMER',
            pinHash: defaultPinHash,
            wallet: {
                create: {
                    accountNumber: 'WLT-44102',
                    balance: 3400.00,
                    currency: 'LKR'
                }
            }
        },
        include: { wallet: true }
    });
    // Seed Initial Transactions
    if (customer1.wallet && merchantCanteenUser.wallet) {
        await prisma.transaction.create({
            data: {
                referenceId: 'TXN-809412',
                senderWalletId: customer1.wallet.id,
                receiverWalletId: merchantCanteenUser.wallet.id,
                amount: 450.00,
                fee: 0.0,
                type: 'PURCHASE',
                status: 'SUCCESS',
                description: 'Breakfast & Milk Coffee at Eagle Canteen',
                metadata: JSON.stringify({
                    outletName: 'Eagle Welfare Canteen & Bakery',
                    outletCategory: 'Canteen',
                    qrHash: 'AFB-OUTLET-CANTEEN-01',
                    items: ['Chicken Bun x1', 'Egg Pastry x1', 'Hot Coffee x1']
                }),
                createdAt: new Date(Date.now() - 3600000 * 4)
            }
        });
        await prisma.transaction.create({
            data: {
                referenceId: 'TXN-809413',
                senderWalletId: customer1.wallet.id,
                receiverWalletId: merchantYoghurtUser.wallet?.id,
                amount: 600.00,
                fee: 0.0,
                type: 'PURCHASE',
                status: 'SUCCESS',
                description: '4x Fresh Farm Yoghurt Cups (Vanilla & Treacle)',
                metadata: JSON.stringify({
                    outletName: 'Fresh Yoghurt & Dairy Project',
                    outletCategory: 'Yoghurt Project',
                    qrHash: 'AFB-OUTLET-YOGHURT-02',
                    items: ['Treacle Yoghurt x2', 'Vanilla Yoghurt x2']
                }),
                createdAt: new Date(Date.now() - 3600000 * 2)
            }
        });
        await prisma.transaction.create({
            data: {
                referenceId: 'TXN-TOP-001',
                senderWalletId: null,
                receiverWalletId: customer1.wallet.id,
                amount: 10000.00,
                fee: 0.0,
                type: 'TOPUP_CARD',
                status: 'SUCCESS',
                description: 'Instant Card Top-up via VISA **** 4819',
                metadata: JSON.stringify({
                    gatewayRef: 'PAY_SL_9918237',
                    cardMask: '**** **** **** 4819',
                    cardType: 'VISA'
                }),
                createdAt: new Date(Date.now() - 3600000 * 24)
            }
        });
    }
    // Seed sample Top-up Request (Pending & Approved)
    if (customer2.wallet) {
        await prisma.topupRequest.create({
            data: {
                userId: customer2.id,
                walletId: customer2.wallet.id,
                amount: 5000.00,
                bankReference: 'BOC-TX-99482103',
                notes: 'Monthly mess allowance top-up',
                slipImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="40%" font-size="14" font-weight="bold" fill="%230f172a" text-anchor="middle">BANK OF CEYLON TRANSFER SLIP</text><text x="50%" y="60%" font-size="12" fill="%23475569" text-anchor="middle">Ref: BOC-TX-99482103 | LKR 5,000.00</text><text x="50%" y="80%" font-size="10" fill="%2316a34a" text-anchor="middle">Status: Pending Verification</text></svg>',
                status: 'PENDING'
            }
        });
    }
    // Seed sample Settlement request
    if (merchantCanteenUser.outlets[0]) {
        await prisma.settlement.create({
            data: {
                outletId: merchantCanteenUser.outlets[0].id,
                merchantUserId: merchantCanteenUser.id,
                amount: 25000.00,
                bankName: 'Bank of Ceylon (BOC)',
                accountNo: '8004523910',
                status: 'PENDING',
                adminNotes: 'Awaiting finance branch end-of-day signoff'
            }
        });
    }
    console.log('Database seeded successfully with Users, Outlets, Wallets, Transactions, and Requests.');
}
if (require.main === module) {
    main()
        .catch((e) => {
        console.error('Seeding error:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
