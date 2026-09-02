export const getServerBaseUrl = (): string => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv.VITE_API_URL) {
    return metaEnv.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && localStorage.getItem('afb_server_url')) {
    return localStorage.getItem('afb_server_url')!;
  }
  const isCapacitor = typeof window !== 'undefined' && (
    !!(window as any).Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port)
  );
  if (isCapacitor) {
    return 'https://afb-wallet-app.onrender.com';
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://afb-wallet-app.onrender.com';
  }
  return '';
};

export class ApiService {
  private static getToken(): string | null {
    return localStorage.getItem('afb_auth_token');
  }

  static async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getServerBaseUrl();
    const url = `${baseUrl}/api${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'An error occurred during request');
    }
    return data;
  }

  // Auth
  static login(serviceNo: string, pin: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ serviceNo, pin })
    });
  }

  static quickLogin(serviceNo: string) {
    return this.request('/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify({ serviceNo })
    });
  }

  static getMe() {
    return this.request('/auth/me');
  }

  static getDemoUsers() {
    return this.request('/auth/demo-users');
  }

  // Wallet
  static getBalance() {
    return this.request('/wallet/balance');
  }

  static getTransactions(params?: { type?: string; limit?: number }) {
    const query = params?.type ? `?type=${params.type}` : '';
    return this.request(`/wallet/transactions${query}`);
  }

  static topupViaCard(payload: { amount: number; cardId?: string; cardNumber?: string; expiry?: string; cardHolder?: string }) {
    return this.request('/wallet/topup/card', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static submitManualTopup(payload: { amount: number; bankReference: string; notes?: string; slipImage?: string }) {
    return this.request('/wallet/topup/manual', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static getSavedCards() {
    return this.request('/wallet/cards');
  }

  static saveCard(payload: { cardNumber: string; cardHolder: string; expiry: string; isDefault?: boolean }) {
    return this.request('/wallet/cards', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static getMyTopupRequests() {
    return this.request('/wallet/topup-requests');
  }

  // Payment & QR
  static decodeQR(qrData: string) {
    return this.request('/payment/decode-qr', {
      method: 'POST',
      body: JSON.stringify({ qrData })
    });
  }

  static payQR(payload: { qrHash: string; amount: number; pin?: string; invoiceRef?: string; notes?: string }) {
    return this.request('/payment/pay-qr', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static getReceipt(referenceId: string) {
    return this.request(`/payment/receipt/${referenceId}`);
  }

  // Merchant
  static getMerchantDashboardStats() {
    return this.request('/merchant/dashboard-stats');
  }

  static generateDynamicQR(payload: { outletId?: string; amount?: number; invoiceRef?: string; items?: string[] }) {
    return this.request('/merchant/generate-qr', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static getStaticQR() {
    return this.request('/merchant/static-qr');
  }

  static requestSettlement(payload: { outletId?: string; amount: number; bankName?: string; accountNo?: string }) {
    return this.request('/merchant/settlement-request', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Admin
  static getAdminOverview() {
    return this.request('/admin/overview');
  }

  static getAdminLedger(params?: { type?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.search) searchParams.append('search', params.search);
    return this.request(`/admin/ledger?${searchParams.toString()}`);
  }

  static getAdminTopups() {
    return this.request('/admin/topup-requests');
  }

  static approveTopup(id: string, adminNotes?: string) {
    return this.request(`/admin/approve-topup/${id}`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes })
    });
  }

  static rejectTopup(id: string, adminNotes?: string) {
    return this.request(`/admin/reject-topup/${id}`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes })
    });
  }

  static getAdminSettlements() {
    return this.request('/admin/settlements');
  }

  static approveSettlement(id: string, adminNotes?: string) {
    return this.request(`/admin/approve-settlement/${id}`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes })
    });
  }

  static getAdminOutlets() {
    return this.request('/admin/outlets');
  }

  static createOutlet(payload: { name: string; category: string; merchantUserId: string; location?: string; bankName?: string; bankAccountNo?: string }) {
    return this.request('/admin/create-outlet', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
