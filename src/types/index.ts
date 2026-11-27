export type ServiceType = 'RAC' | 'EMERGENCY' | 'OUTSTATION' | 'PACKAGE' | 'ETS';
export type TripStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'TRIP_CREATED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type TransactionType = 'CREDIT' | 'DEBIT';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VENDOR_ADMIN' | 'DRIVER';

export interface User {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  isActive: boolean;
  vehicleId?: string;
  vehicleRegNo?: string;
  vehicleModel?: string;
  activeTrips?: number;
  companyId: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  registrationNo: string;
  type: string;
  model: string;
  capacity: number;
  isActive: boolean;
  driverId?: string;
  driverName?: string;
  companyId: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  tripNo: string;
  serviceType: ServiceType;
  passengerName: string;
  passengerPhone: string;
  pickup: string;
  drop: string;
  scheduledDate: string;
  scheduledTime: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleRegNo?: string;
  tripAmount: number;
  commissionRate: number;
  commissionAmount: number;
  driverPayable: number;
  tripStatus: TripStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: TripStatusHistory[];
}

export interface TripStatusHistory {
  id: string;
  fromStatus?: TripStatus;
  toStatus: TripStatus;
  changedAt: string;
  notes?: string;
}

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  reference?: string;
  relatedTripId?: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  balance: number;
  entityType: 'VENDOR' | 'COMPANY';
  entityId: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedEntity?: string;
  relatedId?: string;
  createdAt: string;
}

export interface DashboardData {
  todayTrips: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  walletBalance: number;
  lowBalanceThreshold: number;
  activeDrivers: number;
  totalDrivers: number;
  upcomingTrips: Trip[];
  recentTrips: Trip[];
  recentTransactions: WalletTransaction[];
}

export interface RechargeOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  driverId?: string;
  serviceType?: ServiceType;
  status?: TripStatus;
}

export interface TripSummaryReport {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
  byService: Record<ServiceType, { count: number; revenue: number }>;
  byStatus: Record<TripStatus, number>;
}

export interface FinancialSummaryReport {
  totalRevenue: number;
  totalCommission: number;
  totalDriverPayable: number;
  netEarnings: number;
  byDate: Array<{ date: string; revenue: number; commission: number; driverPayable: number }>;
}

export interface DriverPerformance {
  driverId: string;
  driverName: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalEarnings: number;
  rating?: number;
}
