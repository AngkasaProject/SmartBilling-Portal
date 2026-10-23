export type CustomerStatus = "active" | "expiring" | "isolated" | "disabled";
export type InvoiceStatus = "unpaid" | "paid" | "expired" | "canceled";
export type VoucherStatus = "pending" | "unused" | "active" | "expired";
export type PaymentTransactionStatus =
  | "pending"
  | "settlement"
  | "expired"
  | "canceled";
export type PaymentProvider =
  | "none"
  | "midtrans"
  | "doku"
  | "xendit"
  | "tripay";

export interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  pppoeUsername: string;
  pppoePassword: string;
  pppoePackageId?: string;
  servicePackageName?: string;
  profileName: string;
  bandwidthLimit: string;
  monthlyFee: number;
  billingDate: number;
  expiredDate: string;
  status: CustomerStatus;
  autoIsolir: boolean;
  routerId: string;
  ipAddress?: string;
  notes?: string;
}

export async function getPortalServerStatus(): Promise<PortalPublicStatus> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const status = await billingApiFetch<PortalPublicStatus>("/api/portal/status", {
        signal: AbortSignal.timeout(3_000),
      });
      if (status.connected) return status;
      lastError = new Error(status.error || "SmartBilling reported that the server is unavailable.");
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  console.warn("Portal server health check failed after retries:", lastError);
  return {
    connected: false,
    error: "Server tidak dapat dijangkau. Periksa BILLING_API_URL dari lingkungan Portal.",
  };
}

export interface PortalCustomer {
  id: string;
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  pppoeUsername?: string;
  profileName: string;
  bandwidthLimit: string;
  monthlyFee: number;
  billingDate?: number;
  expiredDate: string;
  status: CustomerStatus;
  dataLimitMb?: number;
  dataUsedBytes?: number;
  dataRemainingBytes?: number;
  dataUsageSampledAt?: string;
  pendingPackageName?: string;
  cancellationRequestedAt?: string;
  cancelAtExpiry?: boolean;
}

export interface PublicPppoePackage {
  id: string;
  name: string;
  speedLimit: string;
  monthlyFee: number;
  dataLimitMb?: number;
}

export interface PortalPublicStatus {
  connected: boolean;
  appName?: string;
  brandName?: string;
  companyName?: string;
  tagline?: string;
  phoneContact?: string;
  operatorWhatsapp?: string;
  error?: string;
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  profileName: string;
  periodMonth: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  latestPaymentStatus?: PaymentTransactionStatus;
  latestPaymentMethod?: string;
  latestPaymentChannel?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  profileName: string;
  periodMonth: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentChannel?: string;
  paymentRef?: string;
}

export interface HotspotProfile {
  id: string;
  name: string;
  serviceProfileId?: string;
  speedLimit: string;
  routerId?: string;
  routerProfileName?: string;
  validityDuration: string;
  validityHours: number;
  price: number;
  sharedUsers: number;
  dataLimitMb?: number;
  color: string;
  enabled?: boolean;
}

export interface PppoePackage {
  id: string;
  name: string;
  routerId: string;
  routerProfileName: string;
  speedLimit: string;
  monthlyFee: number;
  enabled: boolean;
}

export interface Voucher {
  id: string;
  code: string;
  password?: string;
  profileId: string;
  profileName: string;
  price: number;
  validityHours: number;
  validityDuration: string;
  speedLimit: string;
  status: VoucherStatus;
  batchCode: string;
  createdAt: string;
  activatedAt?: string;
  expiredAt?: string;
  customerPhone?: string;
  paymentMethod?: string;
  paymentRef?: string;
  routerId?: string;
  orderId?: string;
}

export interface ManualPaymentMethod {
  id: string;
  name: string;
  accountHolder?: string;
  serviceName?: string;
  accountNumber?: string;
  instructions: string;
  enabled: boolean;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  paymentCode?: string;
  orderType: "invoice" | "voucher";
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod: string;
  paymentChannel: string;
  status: PaymentTransactionStatus;
  qrCodeUrl?: string;
  paymentUrl?: string;
  vaNumber?: string;
  expiryMinutes: number;
  createdAt: string;
  paidAt?: string;
  voucherCode?: string;
  invoiceId?: string;
  expiresAt?: string;
  proofData?: string;
}

export interface PaymentOptionsResponse {
  automaticAvailable: boolean;
  provider: PaymentProvider;
  manualMethods: ManualPaymentMethod[];
  timeoutMinutes: number;
  operatorWhatsapp: string;
  proofRequired: boolean;
}

export interface PortalBillingResponse {
  customer: PortalCustomer;
  invoices: PortalInvoice[];
  paymentAvailable: boolean;
  paymentProvider?: string;
  manualPaymentOptions?: ManualPaymentMethod[];
}

export interface PortalDashboardResponse {
  customer: PortalCustomer;
  invoices: PortalInvoice[];
  upgradePackages: PublicPppoePackage[];
  paymentAvailable: boolean;
}

export interface BillingLinkResponse {
  customer: PortalCustomer;
  invoices: PortalInvoice[];
  paymentAvailable: boolean;
}

export interface VoucherProfilesResponse {
  profiles: PublicHotspotProfile[];
}

export interface PublicPppoePackagesResponse {
  packages: PublicPppoePackage[];
}

export interface PublicHotspotProfile {
  id: string;
  name: string;
  speedLimit: string;
  validityDuration: string;
  validityHours: number;
  price: number;
  sharedUsers: number;
  dataLimitMb?: number;
}

export interface VoucherOrderResponse {
  orderId: string;
  paymentCode?: string;
  status: PaymentTransactionStatus;
  method?: ManualPaymentMethod;
  amount: number;
  expiresAt?: string;
  expiresAtFormatted?: string;
  operatorUrl?: string;
  redirectUrl?: string;
  message?: string;
}

export interface PaymentRequest {
  lookupValue?: string;
  portalToken?: string;
  invoiceId: string;
  paymentMode: "automatic" | "manual";
  methodId?: string;
}

export interface PaymentResponse {
  status?: PaymentTransactionStatus;
  orderId?: string;
  paymentCode?: string;
  expiresAt?: string;
  expiresAtFormatted?: string;
  operatorUrl?: string;
  redirectUrl?: string;
  message?: string;
}

export interface VoucherOrderStatusResponse {
  status: PaymentTransactionStatus;
  expiresAt?: string;
  voucher?: Pick<Voucher, "code" | "password" | "validityDuration">;
}

export interface UpgradeRequest {
  packageId: string;
  message?: string;
}

export interface TerminationRequest {
  reason: string;
  requestedAt?: string;
}

export class BillingApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "BillingApiError";
  }
}

function getBillingApiBaseUrl(): string {
  const baseUrl = process.env.BILLING_API_URL;

  if (!baseUrl) {
    throw new Error(
      "Set BILLING_API_URL to the SmartBilling API origin reachable from the Portal server.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("BILLING_API_URL must be an absolute HTTP or HTTPS URL.");
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("BILLING_API_URL must contain only the HTTP(S) origin, without credentials or a path.");
  }
  return parsed.origin;
}

export async function billingApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, getBillingApiBaseUrl());
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal || AbortSignal.timeout(8_000),
  });
  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = responseText;
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `SmartBilling API returned HTTP ${response.status}`;
    throw new BillingApiError(message, response.status, payload);
  }

  return payload as T;
}

export function getPublicHotspotProfiles(): Promise<VoucherProfilesResponse> {
  return billingApiFetch<VoucherProfilesResponse>("/api/portal/vouchers", {
    method: "GET",
  });
}

export function getPublicPppoePackages(): Promise<PublicPppoePackagesResponse> {
  return billingApiFetch<PublicPppoePackagesResponse>("/api/portal/pppoe-packages", {
    method: "GET",
  });
}

export function getPublicPaymentOptions(): Promise<PaymentOptionsResponse> {
  return billingApiFetch<PaymentOptionsResponse>("/api/portal/payment-options", {
    method: "GET",
  });
}

export function lookupPortalBilling(
  lookupValue: string,
): Promise<PortalBillingResponse> {
  return billingApiFetch<PortalBillingResponse>("/api/portal/billing", {
    method: "POST",
    body: JSON.stringify({ lookupValue }),
  });
}

export function getPortalBillingByToken(
  token: string,
): Promise<BillingLinkResponse> {
  return billingApiFetch<BillingLinkResponse>("/api/portal/billing-link", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function createPortalPayment(
  request: PaymentRequest,
): Promise<PaymentResponse> {
  return billingApiFetch<PaymentResponse>("/api/portal/payment", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function createVoucherOrder(request: {
  profileId: string;
  customerName: string;
  phone: string;
  email?: string;
  paymentMode: "automatic" | "manual";
  methodId?: string;
}): Promise<VoucherOrderResponse> {
  return billingApiFetch<VoucherOrderResponse>("/api/portal/voucher-orders", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getVoucherOrderStatus(request: {
  orderId: string;
  phone: string;
}): Promise<VoucherOrderStatusResponse> {
  return billingApiFetch("/api/portal/voucher-orders/status", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
