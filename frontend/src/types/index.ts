export type Role = 'ADMIN' | 'KITCHEN_OWNER' | 'CUSTOMER';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER';
export type FoodType = 'VEG' | 'NON_VEG' | 'BOTH';
export type OrderStatus = 'PAYMENT_PENDING' | 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED';
export type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'COD';
export type KitchenStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'DOCS_REQUESTED';

export interface User {
  id: number; username: string; fullName: string; email?: string; phone?: string; role: Role;
  status: 'ACTIVE' | 'SUSPENDED'; address?: string; area?: string; latitude?: number; longitude?: number;
  hometown?: string; createdAt: string; phoneVerified?: boolean;
}

export interface Kitchen {
  id: number; owner: User; name: string; description?: string; coverImage?: string; galleryImages?: string;
  cuisines?: string; foodType: FoodType; state?: string; district?: string; city?: string; area?: string;
  address?: string; pincode?: string; latitude?: number; longitude?: number; deliveryRadiusKm?: number;
  openTime?: string; closeTime?: string; workingDays?: string; breakfastAvailable: boolean; lunchAvailable: boolean;
  dinnerAvailable: boolean; maxDailyOrders?: number; selfDelivery: boolean; acceptingOrders: boolean;
  avgPrepMinutes?: number; todaySpecial?: string; idProofType?: string; idProofNumber?: string; idProofUrl?: string; idProofBackUrl?: string;
  idProofStatus: string; fssaiNumber?: string; fssaiType?: string; fssaiCertificateUrl?: string; fssaiStatus: string;
  status: KitchenStatus; adminRemarks?: string; rating: number; ratingCount: number; onboardingStep: number;
  createdAt: string; submittedAt?: string; approvedAt?: string; lastInspectionAt?: string; phoneVerified?: boolean;
}

export interface KitchenCard {
  id: number; name: string; ownerName: string; coverImage?: string; area?: string; cuisines: string[];
  foodType: FoodType; rating: number; ratingCount: number; distanceKm?: number; etaMinutes: number;
  openTime?: string; closeTime?: string; openNow: boolean; acceptingOrders: boolean; acceptingNow: boolean; menuReady?: boolean; menuStatus?: string;
  todaySpecial?: string; verified: boolean; fssaiVerified: boolean; lastVideoVerifiedOn?: string;
  minPrice?: number; itemCount: number; deliveryRadiusKm?: number; latitude?: number; longitude?: number;
}

export interface MenuItem {
  id: number; kitchenId?: number; kitchenName?: string; name: string; description?: string; imageUrl?: string;
  price: number; offerPrice?: number | null; veg: boolean; mealType: MealType; category?: string;
  quantityAvailable?: number; available: boolean; todaySpecial: boolean; availableFrom?: string | null;
  availableTo?: string | null; servingSize?: string;
}

export interface Review {
  id: number; customerName: string; customerId?: number; orderId?: number; rating: number; comment?: string;
  kitchenReply?: string; createdAt: string; kitchenName?: string;
}

export interface TrustProfile {
  identityVerified: boolean; fssaiVerified: boolean; fssaiNumber?: string; phoneVerified: boolean;
  videosApprovedLast30Days: number; lastVideoSubmittedOn?: string; lastVideoStatus?: string;
  complaintsTotal: number; complaintsResolved: number; rating: number; ratingCount: number;
  ordersCompleted: number; lastInspectionAt?: string; memberSince?: string;
}

export interface KitchenDetails extends KitchenCard {
  description?: string; gallery: string[]; address?: string; workingDays: string[];
  breakfastAvailable: boolean; lunchAvailable: boolean; dinnerAvailable: boolean; selfDelivery: boolean;
  ownerPhone?: string; withinDeliveryRange: boolean; menu: MenuItem[]; reviews: Review[]; trust: TrustProfile;
}

export interface OrderItem { id: number; menuItemId?: number; name: string; imageUrl?: string; veg: boolean; unitPrice: number; quantity: number; lineTotal: number; }

export interface Order {
  id: number; orderNumber: string; customer: User; kitchen: Kitchen; orderType: 'DAILY_MENU' | 'CUSTOM_REQUEST';
  customRequestId?: number; items: OrderItem[]; foodTotal: number; deliveryCharge: number; platformFee: number;
  discount: number; totalAmount: number; commission: number; kitchenEarning: number; couponCode?: string;
  status: OrderStatus; paymentStatus: string; paymentMethod?: PaymentMethod; paymentReference?: string;
  deliveryAddress?: string; deliveryArea?: string; distanceKm?: number; mealSlot?: MealType; notes?: string;
  cancelReason?: string; createdAt: string; estimatedDeliveryAt?: string; confirmedAt?: string; preparingAt?: string;
  readyAt?: string; outForDeliveryAt?: string; deliveredAt?: string; reviewed: boolean;
  riderLatitude?: number; riderLongitude?: number; riderUpdatedAt?: string; deliveryLatitude?: number; deliveryLongitude?: number;
}

export interface CustomRequest {
  id: number; requestNumber: string; customer?: User; dishName: string; quantity: string; servings?: number;
  spiceLevel?: string; veg: boolean; cuisineStyle?: string; requiredDate: string; mealSlot: MealType;
  preferredTime?: string; instructions?: string; budget?: number; deliveryAddress?: string; deliveryArea?: string;
  latitude?: number; longitude?: number; status: string; selectedQuotationId?: number; orderId?: number;
  offerCount?: number; createdAt: string;
}

export interface Quotation {
  id: number; request: CustomRequest; kitchen: Kitchen; price: number; prepTimeMinutes: number; note?: string; unavailableItems?: string;
  distanceKm?: number; status: 'PENDING' | 'SELECTED' | 'NOT_SELECTED' | 'DECLINED'; createdAt: string;
}

export interface CookingVideo {
  id: number; kitchen: Kitchen; videoUrl?: string; thumbnailUrl?: string; preparationDate: string; description?: string;
  durationSeconds?: number; status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  cleanlinessOk?: boolean; storageOk?: boolean; hygieneOk?: boolean; adminRemarks?: string; reviewedBy?: string;
  reviewedAt?: string; createdAt: string;
}

export interface Subscription {
  id: number; kitchen: Kitchen; planName: string; planId?: number; amount: number; startDate: string; endDate: string;
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'; paymentReference?: string; paymentMethod?: string; createdAt: string;
}

export interface SubscriptionPlan { id: number; name: string; description?: string; price: number; durationDays: number; features?: string; active: boolean; popular: boolean; }

export interface Complaint {
  id: number; customer: User; kitchen?: Kitchen; orderId?: number; category: string; subject: string; description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; priority: string; resolution?: string; createdAt: string; resolvedAt?: string;
}

export interface Offer { id: number; code: string; description?: string; discountPercent: number; maxDiscount?: number; minOrder?: number; validTill?: string; active: boolean; usageCount: number; }

export interface PlatformSettings {
  freeTrialDays: number; monthlyPrice: number; annualPrice: number; commissionPercent: number; deliveryCharge: number;
  platformFee: number; freeDeliveryAbove: number; discoveryRadiusKm: number; customLunchCutoff: string;
  customDinnerCutoff: string; gracePeriodDays: number; requireDailyVideo: boolean; requireMenuVerification?: boolean; supportPhone: string; supportEmail: string;
}

export interface PublicConfig {
  discoveryRadiusKm: number; customLunchCutoff: string; customDinnerCutoff: string; deliveryCharge: number;
  platformFee: number; freeDeliveryAbove: number; freeTrialDays: number; supportPhone: string; supportEmail: string;
  serverTime: string; lunchCutoffPassed: boolean; cuisines: string[]; areas: { name: string; lat: number; lng: number }[];
}
