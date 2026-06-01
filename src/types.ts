export interface UserProfile {
  uid: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  postOffice: string;
  assemblyConstituency: string;
  bloodGroup: string;
  gender?: string;
  dob?: string;
  membershipType?: 'Annual' | 'Life';
  photoUrl?: string;
  paymentProofUrl?: string;
  transactionId?: string;
  paymentTime?: string;
  issueDate?: any;
  expiryDate?: any;
  registrationDate: any;
  renewalDate?: any;
  renewalPending?: boolean;
  renewalTransactionId?: string;
  membershipId: string;
  status: 'pending' | 'active' | 'offline' | 'deleted';
  isPaid: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  role: 'admin' | 'operator' | 'member';
  registeredBy?: string;
  registeredByName?: string;
  certAdminName?: string;
  certAdminEmail?: string;
  certAdminPassword?: string;
  quota?: number;
  quotaUsed?: number;
  serialNo: number;
  pin?: string;
  details?: string;
  entryBy?: string;
  waStatus?: 'Pending' | 'Sent' | 'Failed';
  stateCode?: string;
  districtCode?: string;
  constituencyCode?: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  category: string;
  title: string;
  description?: string;
  createdAt: any;
  order?: number;
  district?: string;
}

export interface DistrictQuota {
  id: string; // District code
  districtName: string;
  total: number;
  used: number;
}

export interface AppState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}
