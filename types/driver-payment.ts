/** Backend DTOs for `/support-desk/driver-payments/*`. Dates arrive as ISO strings. */

// ── Platform fees ───────────────────────────────────────────────────────────
// Fees drivers have collected from riders and owe the company. The rider pays
// the fee on top of the fare; the driver collects it and settles it with their
// next plan payment, a direct card payment, or a payment recorded here.

// Signed from the driver's side of the debt: positive rows add to what they
// owe, negative rows reduce it.
export type PlatformFeeTransactionType =
  | "ride_fee"
  | "card_ride_reversal"
  | "plan_payment"
  | "direct_payment"
  | "invoice_payment"
  | "admin_adjustment";

export interface PlatformFeeTransactionRow {
  id: number;
  type: PlatformFeeTransactionType;
  rideId: string | null;
  amountLkr: number;
  onepayOrderId: string | null;
  invoiceId: number | null;
  adminId: number | null;
  note: string | null;
  createdAt: string;
}

export interface DriverPlatformFeeBalanceRow {
  driverId: number;
  driverName: string;
  driverPhone: string;
  driverStatus: string;
  vehicleTypeName: string | null;
  // Negative = the driver is in credit (paid more than they owed).
  owedLkr: number;
  totalCollectedLkr: number;
  totalPaidLkr: number;
  feeRides: number;
  lastFeeAt: string | null;
  lastPaymentAt: string | null;
}

export interface DriverPlatformFeeBalances {
  // The System Settings master switch.
  enabled: boolean;
  drivers: DriverPlatformFeeBalanceRow[];
  totals: { owedLkr: number; totalCollectedLkr: number; totalPaidLkr: number };
}

export const PLATFORM_FEE_TRANSACTION_LABELS: Record<PlatformFeeTransactionType, string> = {
  ride_fee: "Ride fee",
  card_ride_reversal: "Rider paid by card",
  plan_payment: "Paid with plan (card)",
  direct_payment: "Paid by card",
  invoice_payment: "Paid with plan (bank transfer)",
  admin_adjustment: "Admin adjustment",
};

// ── Promotion (discount) balances ───────────────────────────────────────────
// Area-wise ride promotion discounts credited to a driver. The company owes the
// driver whatever a promotion discounted off a rider's fare; paid out through
// withdrawal requests.

export interface DriverBalanceRow {
  driverId: number;
  driverName: string;
  driverPhone: string;
  balanceLkr: number;
}

// "settlement" rows are legacy (the admin-direct settle feature was removed —
// payouts now happen only via withdrawal requests).
export type DiscountTransactionType = "ride_credit" | "settlement";

export interface DiscountTransactionRow {
  id: number;
  type: DiscountTransactionType;
  rideId: string | null;
  areaId: number | null;
  amountLkr: number;
  note: string | null;
  settledByAdminId: number | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  createdAt: string;
}

export interface DiscountSettings {
  withdrawalMinimumLkr: number;
}

export type PlanPaymentStatus = "under_review" | "approved" | "rejected";

// A driver's bank-transfer payment for a plan, sent from the app with the slip.
// Staff check the slip and approve (which starts the plan) or reject it.
export interface PlanPaymentRow {
  id: number;
  driverId: number;
  driverName: string | null;
  driverPhone: string | null;
  planName: string | null;
  // The whole transfer: the plan price plus platformFeeLkr.
  amountLkr: number | string;
  // Platform fees the driver owed when they submitted, included in amountLkr —
  // cleared from their balance when the payment is approved.
  platformFeeLkr: number | string;
  // When the plan starts if the driver still has one running at approval time.
  // Null on payments from before plans could be chosen in the app.
  applyMode: "now" | "after_current" | null;
  // Short-lived link to the slip.
  receiptUrl: string | null;
  // What the slip is, as checked by the backend at upload; null on older uploads.
  receiptContentType: string | null;
  status: PlanPaymentStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export type DiscountWithdrawalStatus = "pending" | "approved" | "rejected";

// The driver's current active bank account, shown for reference before
// approving — separate from the row's own bank fields, which stay null until
// approval.
export interface DriverBankAccountRow {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
}

export interface DiscountWithdrawalRow {
  id: number;
  driverId: number;
  amountLkr: number;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  status: DiscountWithdrawalStatus;
  rejectionReason: string | null;
  // Presigned view URL for the uploaded bank-transfer slip — null until approved.
  slipUrl: string | null;
  driverBankAccount: DriverBankAccountRow | null;
  createdAt: string;
}

// The cross-driver queue, with driver name/phone attached.
export type DiscountWithdrawalAdminRow = DiscountWithdrawalRow & {
  driverName: string | null;
  driverPhone: string | null;
};

// Per driver: everything ever credited from area promotions and where it went.
// Always reconciles as earned = withdrawable + pending + paid (a withdrawal
// request deducts from the balance immediately, and is refunded if rejected).
export interface DriverPromotionBalanceRow {
  driverId: number;
  driverName: string;
  driverPhone: string;
  driverStatus: string;
  earnedLkr: number;
  // Net of manual adjustments, already included in earnedLkr.
  adjustmentsLkr: number;
  withdrawableLkr: number;
  pendingLkr: number;
  paidLkr: number;
  creditedRides: number;
  lastCreditAt: string | null;
  hasBankAccount: boolean;
}

export interface DriverPromotionBalances {
  drivers: DriverPromotionBalanceRow[];
  totals: { earnedLkr: number; withdrawableLkr: number; pendingLkr: number; paidLkr: number };
}
