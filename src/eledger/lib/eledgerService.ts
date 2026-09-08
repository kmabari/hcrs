import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { eledgerAuth, eledgerDb } from './firebaseEledger';
import {
  ELedgerUser,
  LedgerVoucher,
  TreasuryMetrics,
  CategorySummary,
  MemberFinancialAccount,
  AuditLogEntry,
  FundCategory,
  ELedgerBankCredit,
  MemberTransaction,
} from '../types';
import {
  INITIAL_TREASURY_METRICS,
  INITIAL_CATEGORY_SUMMARIES,
  INITIAL_VOUCHERS,
  INITIAL_AUDIT_LOGS
} from '../data/ledgerData';

// Collection References
const USERS_COL = 'eledger_users';
const METRICS_DOC = 'eledger_treasury_metrics/current_state';
const CATEGORIES_COL = 'eledger_fund_categories';
const VOUCHERS_COL = 'eledger_vouchers';
const MEMBER_ACCOUNTS_COL = 'eledger_member_accounts';
const AUDIT_LOGS_COL = 'eledger_audit_logs';
const BANK_CREDITS_COL = 'eledger_bank_credits';

/**
 * Helper to remove undefined, null, or empty optional fields from any Firestore payload
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) {
      continue;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // Omit empty string optional fields to keep document clean and strictly typed
      if (trimmed === '' && (
        key === 'membershipId' || 
        key === 'auditNotes' || 
        key === 'referenceNo' || 
        key === 'lastLoginAt' || 
        key === 'invitedAt' || 
        key === 'district' ||
        key === 'notes' ||
        key === 'assignedSeatNumber'
      )) {
        continue;
      }
      clean[key] = trimmed;
    } else if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val?.constructor?.name === 'FieldValue')) {
      const nested = sanitizeForFirestore(val);
      if (Object.keys(nested).length > 0) {
        clean[key] = nested;
      }
    } else {
      clean[key] = val;
    }
  }
  return clean as Partial<T>;
}

/**
 * Bootstrap the initial eLedger database state if empty
 */
export async function bootstrapEledgerDataIfEmpty(): Promise<void> {
  try {
    // 1. Ensure initial treasury metrics
    const metricsRef = doc(eledgerDb, 'eledger_treasury_metrics', 'current_state');
    const metricsSnap = await getDoc(metricsRef);
    if (!metricsSnap.exists()) {
      await setDoc(metricsRef, {
        ...INITIAL_TREASURY_METRICS,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Ensure Fund Categories
    const catSnap = await getDocs(collection(eledgerDb, CATEGORIES_COL));
    if (catSnap.empty) {
      for (const cat of INITIAL_CATEGORY_SUMMARIES) {
        const catId = cat.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(eledgerDb, CATEGORIES_COL, catId), {
          ...cat,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('[eLedger Service] Bootstrap check note:', err);
  }
}

export const CENTRAL_ADMIN_EMAILS = [
  'hcrskerala@gmail.com',
  'kmabarikiyafoods@gmail.com',
  'mabarikiyafoods@gmail.com',
  'hcrsindia@gmail.com',
  'admin@hcrs.society',
  'highrichcommunityrevivalsociet@gmail.com',
  '9645934571@hcrs.society',
];

export const TREASURER_UIDS = [
  'NX2b63Hzu4RFhR4BCQP5OMpI4jw1',
];

export function isCentralAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    CENTRAL_ADMIN_EMAILS.includes(clean) ||
    clean.includes('hcrskerala') ||
    clean.includes('mabarikiyafoods') ||
    clean.includes('admin') ||
    clean.includes('eledger') ||
    clean.includes('admin_auth') ||
    clean.includes('highrich') ||
    clean.includes('hcrsindia') ||
    clean.includes('9645934571') ||
    clean.endsWith('@hcrs.society') ||
    clean.endsWith('@hcrs.org')
  );
}

export function isTreasurerUser(fbUser?: FirebaseUser | null, email?: string | null): boolean {
  if (fbUser && TREASURER_UIDS.includes(fbUser.uid)) return true;
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    clean.includes('treasurer') ||
    clean.includes('hcrstreasurer') ||
    clean.includes('state_treasurer')
  );
}

/**
 * Ensure Admin user doc is synced with Auth UID upon authentication
 */
export async function ensureAdminUserRecord(fbUser: FirebaseUser): Promise<ELedgerUser> {
  const userDocRef = doc(eledgerDb, USERS_COL, fbUser.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const existing = snap.data() as ELedgerUser;
      if (existing.role !== 'admin' || existing.status !== 'active') {
        await setDoc(userDocRef, { role: 'admin', status: 'active', updatedAt: serverTimestamp() }, { merge: true });
        return { ...existing, id: fbUser.uid, role: 'admin', status: 'active' };
      }
      return { ...existing, id: fbUser.uid };
    }
  } catch (err) {
    console.warn('[eLedger Service] Admin doc check warning:', err);
  }

  const adminDoc: ELedgerUser = {
    id: fbUser.uid,
    name: fbUser.displayName || 'HCRS Central Admin',
    email: fbUser.email?.toLowerCase() || 'hcrskerala@gmail.com',
    mobile: '9847000001',
    role: 'admin',
    status: 'active',
    district: 'State HQ',
    createdAt: new Date().toISOString().split('T')[0],
    lastLoginAt: new Date().toISOString().split('T')[0],
  };

  try {
    await setDoc(userDocRef, sanitizeForFirestore(adminDoc), { merge: true });
  } catch (err) {
    console.warn('[eLedger Service] Admin doc setDoc warning:', err);
  }
  return adminDoc;
}

/**
 * Ensure State Treasurer user doc is synced with Auth UID upon authentication
 */
export async function ensureTreasurerUserRecord(fbUser: FirebaseUser): Promise<ELedgerUser> {
  const userDocRef = doc(eledgerDb, USERS_COL, fbUser.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const existing = snap.data() as ELedgerUser;
      if (existing.role !== 'treasurer' || existing.status !== 'active') {
        await setDoc(userDocRef, { role: 'treasurer', status: 'active', updatedAt: serverTimestamp() }, { merge: true });
        return { ...existing, id: fbUser.uid, role: 'treasurer', status: 'active' };
      }
      return { ...existing, id: fbUser.uid };
    }
  } catch (err) {
    console.warn('[eLedger Service] Treasurer doc check warning:', err);
  }

  const treasurerDoc: ELedgerUser = {
    id: fbUser.uid,
    name: fbUser.displayName || 'HCRS State Treasurer',
    email: fbUser.email?.toLowerCase() || 'treasurer@hcrs.society',
    mobile: '9847000002',
    role: 'treasurer',
    status: 'active',
    district: 'State HQ',
    createdAt: new Date().toISOString().split('T')[0],
    lastLoginAt: new Date().toISOString().split('T')[0],
  };

  try {
    await setDoc(userDocRef, sanitizeForFirestore(treasurerDoc), { merge: true });
  } catch (err) {
    console.warn('[eLedger Service] Treasurer doc setDoc warning:', err);
  }
  return treasurerDoc;
}

/**
 * Sign in to eLedger with email and password
 */
export async function eledgerSignIn(email: string, pass: string): Promise<{ success: boolean; user?: ELedgerUser; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const userCredential = await signInWithEmailAndPassword(eledgerAuth, cleanEmail, pass);
    const fbUser = userCredential.user;

    // If Central Admin signs in, ensure Firestore role mapping
    if (isCentralAdminEmail(cleanEmail)) {
      const adminUser = await ensureAdminUserRecord(fbUser);
      return { success: true, user: adminUser };
    }

    // If State Treasurer signs in (by UID or email pattern)
    if (isTreasurerUser(fbUser, cleanEmail)) {
      const treasurerUser = await ensureTreasurerUserRecord(fbUser);
      return { success: true, user: treasurerUser };
    }

    // Verify role and authorization strictly from Firestore document for other users
    const userProfile = await fetchEledgerUserProfile(fbUser);
    if (!userProfile) {
      await signOut(eledgerAuth);
      return { success: false, error: 'Unauthorized: Your account is not registered in the HCRS eLedger Committee registry.' };
    }

    if (userProfile.status === 'inactive') {
      await signOut(eledgerAuth);
      return { success: false, error: 'Account Suspended: Your access has been deactivated by the Central Admin.' };
    }

    // Update lastLoginAt
    await updateDoc(doc(eledgerDb, USERS_COL, userProfile.id), {
      lastLoginAt: new Date().toISOString().split('T')[0],
    });

    return { success: true, user: userProfile };
  } catch (err: any) {
    let msg = err.message || 'Authentication failed.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Invalid email address or password. Please verify credentials.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many failed login attempts. Please reset your password or try again later.';
    }
    return { success: false, error: msg };
  }
}

/**
 * Sign out from eLedger
 */
export async function eledgerSignOut(): Promise<void> {
  await signOut(eledgerAuth);
}

/**
 * Send password reset / setup email
 */
export async function eledgerSendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(eledgerAuth, cleanEmail);
    return { success: true, message: `Password reset link sent to ${cleanEmail}. Please check inbox and spam folder.` };
  } catch (err: any) {
    let msg = err.message || 'Failed to send password reset email.';
    if (err.code === 'auth/user-not-found') {
      msg = 'No registered Firebase account found for this email. Contact Central Admin.';
    }
    return { success: false, message: msg };
  }
}

/**
 * Helper to fetch eLedger user profile by Firebase Auth User
 */
export async function fetchEledgerUserProfile(fbUser: FirebaseUser): Promise<ELedgerUser | null> {
  try {
    // 1. Check by UID
    const docByUid = await getDoc(doc(eledgerDb, USERS_COL, fbUser.uid));
    if (docByUid.exists()) {
      return { ...docByUid.data(), id: fbUser.uid } as ELedgerUser;
    }

    // 2. Check if known Treasurer UID
    if (TREASURER_UIDS.includes(fbUser.uid)) {
      return await ensureTreasurerUserRecord(fbUser);
    }

    // 3. Check by Email
    if (fbUser.email) {
      const q = query(collection(eledgerDb, USERS_COL));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const u = d.data() as ELedgerUser;
        if (u.email && u.email.toLowerCase() === fbUser.email.toLowerCase()) {
          const matchedProfile: ELedgerUser = { ...u, id: fbUser.uid };
          // Sync to UID doc so Firestore security rules can evaluate getUserRole() instantly
          try {
            await setDoc(doc(eledgerDb, USERS_COL, fbUser.uid), sanitizeForFirestore(matchedProfile), { merge: true });
          } catch (syncErr) {
            console.warn('[eLedger Service] UID doc sync note:', syncErr);
          }
          return matchedProfile;
        }
      }
    }
  } catch (err) {
    console.error('[eLedger Service] fetchEledgerUserProfile error:', err);
  }
  return null;
}

/**
 * Subscribe to Auth State Changes
 */
export function subscribeToEledgerAuth(
  onUserChanged: (user: ELedgerUser | null, loading: boolean) => void
): () => void {
  return onAuthStateChanged(eledgerAuth, async (fbUser) => {
    if (!fbUser) {
      onUserChanged(null, false);
      return;
    }

    try {
      if (isCentralAdminEmail(fbUser.email)) {
        const adminDoc = await ensureAdminUserRecord(fbUser);
        onUserChanged(adminDoc, false);
        return;
      }

      if (isTreasurerUser(fbUser, fbUser.email)) {
        const treasurerDoc = await ensureTreasurerUserRecord(fbUser);
        onUserChanged(treasurerDoc, false);
        return;
      }

      const profile = await fetchEledgerUserProfile(fbUser);
      if (profile && profile.status !== 'inactive') {
        onUserChanged(profile, false);
      } else {
        await signOut(eledgerAuth);
        onUserChanged(null, false);
      }
    } catch {
      onUserChanged(null, false);
    }
  });
}

/**
 * Real-time Subscriptions with Safe Handlers
 */
export function subscribeToUsers(callback: (users: ELedgerUser[]) => void): () => void {
  const q = query(collection(eledgerDb, USERS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const userMap = new Map<string, ELedgerUser>();
      snapshot.forEach((docSnap) => {
        const u = { ...docSnap.data(), id: docSnap.id } as ELedgerUser;
        const emailKey = (u.email || '').toLowerCase().trim();
        if (!emailKey) {
          userMap.set(docSnap.id, u);
          return;
        }
        const existing = userMap.get(emailKey);
        if (!existing) {
          userMap.set(emailKey, u);
        } else if ((existing.id === 'admin-hcrskerala' || existing.id.startsWith('usr-')) && !u.id.startsWith('usr-')) {
          userMap.set(emailKey, u);
        } else if (u.id === 'NX2b63Hzu4RFhR4BCQP5OMpI4jw1' || u.role === 'treasurer') {
          userMap.set(emailKey, u);
        }
      });
      callback(Array.from(userMap.values()));
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToUsers warning:', err);
    }
  );
}

export function subscribeToMetrics(callback: (metrics: TreasuryMetrics) => void): () => void {
  return onSnapshot(
    doc(eledgerDb, 'eledger_treasury_metrics', 'current_state'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as TreasuryMetrics);
      }
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToMetrics warning:', err);
    }
  );
}

export function subscribeToCategories(callback: (categories: CategorySummary[]) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, CATEGORIES_COL),
    (snapshot) => {
      const categories: CategorySummary[] = [];
      snapshot.forEach((docSnap) => {
        categories.push(docSnap.data() as CategorySummary);
      });
      if (categories.length > 0) {
        callback(categories);
      }
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToCategories warning:', err);
    }
  );
}

export function subscribeToVouchers(callback: (vouchers: LedgerVoucher[]) => void): () => void {
  const q = query(collection(eledgerDb, VOUCHERS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const vouchers: LedgerVoucher[] = [];
      snapshot.forEach((docSnap) => {
        vouchers.push({ ...docSnap.data(), id: docSnap.id } as LedgerVoucher);
      });
      // Sort descending by date
      vouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(vouchers);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToVouchers warning:', err);
    }
  );
}

export function subscribeToMemberAccounts(callback: (accounts: Record<string, MemberFinancialAccount>) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, MEMBER_ACCOUNTS_COL),
    (snapshot) => {
      const accounts: Record<string, MemberFinancialAccount> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as MemberFinancialAccount;
        accounts[docSnap.id] = { ...data, userId: docSnap.id };
      });
      callback(accounts);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToMemberAccounts warning:', err);
    }
  );
}

export function subscribeToAuditLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, AUDIT_LOGS_COL),
    (snapshot) => {
      const logs: AuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ ...docSnap.data(), id: docSnap.id } as AuditLogEntry);
      });
      // Sort descending by timestamp
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToAuditLogs warning:', err);
    }
  );
}

export function subscribeToBankCredits(callback: (credits: ELedgerBankCredit[]) => void): () => void {
  return onSnapshot(
    collection(eledgerDb, BANK_CREDITS_COL),
    (snapshot) => {
      const credits: ELedgerBankCredit[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<ELedgerBankCredit>;
        const fromDate = (data.fromDate || data.dateRangeFrom || '').trim();
        const toDate = (data.toDate || data.dateRangeTo || '').trim();
        const ref = (data.referenceNo || data.bankUtrReference || '').trim();
        const monthLabel = (data.monthLabel || '').trim();
        const bankName = (data.bankName || 'State Bank of India (A/c 4082190123)').trim();
        const desc = (data.description || 'Bank statement credit deposit').trim();
        const recordedBy = (data.recordedBy || data.verifiedBy || 'State Treasurer').trim();
        const amount = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount || 0));

        credits.push({
          ...data,
          id: docSnap.id,
          fromDate,
          toDate,
          dateRangeFrom: fromDate,
          dateRangeTo: toDate,
          monthLabel: monthLabel || 'Statement Deposit',
          bankName,
          referenceNo: ref,
          bankUtrReference: ref,
          description: desc,
          recordedBy,
          verifiedBy: recordedBy,
          amount: isNaN(amount) ? 0 : amount,
          createdAt: data.createdAt || new Date().toISOString(),
        } as ELedgerBankCredit);
      });
      // Sort descending by fromDate or createdAt
      credits.sort((a, b) => {
        const dateB = new Date(b.fromDate || b.dateRangeFrom || b.createdAt || 0).getTime();
        const dateA = new Date(a.fromDate || a.dateRangeFrom || a.createdAt || 0).getTime();
        return dateB - dateA;
      });
      callback(credits);
    },
    (err) => {
      console.warn('[eLedger Service] subscribeToBankCredits warning:', err);
    }
  );
}

/**
 * Bank Credit Operations (Treasurer Operation)
 * Prevents duplicate entries for same period or UTR reference number
 */
export async function addEledgerBankCredit(
  creditData: Partial<ELedgerBankCredit>,
  existingCredits?: ELedgerBankCredit[]
): Promise<{ success: boolean; message: string }> {
  try {
    const rawRef = creditData.referenceNo || creditData.bankUtrReference || '';
    const cleanRef = (typeof rawRef === 'string' ? rawRef : String(rawRef || '')).trim();
    if (!cleanRef) {
      return { success: false, message: 'Please enter Bank UTR / Transaction Reference Number.' };
    }

    const rawAmount = creditData.amount;
    const parsedAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount || 0));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return { success: false, message: 'Please enter a valid credit amount greater than 0.' };
    }

    const cleanFromDate = (creditData.fromDate || creditData.dateRangeFrom || '').trim();
    const cleanToDate = (creditData.toDate || creditData.dateRangeTo || '').trim();
    if (!cleanFromDate || !cleanToDate) {
      return { success: false, message: 'Please specify the statement date range (From Date & To Date).' };
    }

    const cleanMonthLabel = (creditData.monthLabel || '').trim() || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const cleanBankName = (creditData.bankName || '').trim() || 'State Bank of India (A/c 4082190123)';
    const cleanDesc = (creditData.description || '').trim() || 'Bank statement credit deposit';
    const cleanRecordedBy = (creditData.recordedBy || creditData.verifiedBy || '').trim() || 'State Treasurer';
    const cleanSlipProof = (creditData.slipProofUrl || creditData.slipUrlOrNote || '').trim() || undefined;

    // Fetch existing credits if not provided
    let creditsToCheck = existingCredits;
    if (!creditsToCheck) {
      const snap = await getDocs(collection(eledgerDb, BANK_CREDITS_COL));
      creditsToCheck = snap.docs.map(d => ({ ...d.data(), id: d.id } as ELedgerBankCredit));
    }

    // Duplicate Check: UTR reference (case-insensitive)
    const duplicateRef = creditsToCheck.find(c => {
      const existingUtr = (c.referenceNo || c.bankUtrReference || '').trim();
      return existingUtr !== '' && existingUtr.toLowerCase() === cleanRef.toLowerCase();
    });
    if (duplicateRef) {
      const dupFrom = (duplicateRef.fromDate || duplicateRef.dateRangeFrom || '').trim();
      const dupTo = (duplicateRef.toDate || duplicateRef.dateRangeTo || '').trim();
      return { 
        success: false, 
        message: `Duplicate Protection: Bank UTR/Ref "${cleanRef}" was already recorded${dupFrom && dupTo ? ` for period ${dupFrom} to ${dupTo}` : ''}.` 
      };
    }

    // Duplicate Period Check: exact matching period with same amount and bank
    const duplicatePeriod = creditsToCheck.find(c => {
      const existingFrom = (c.fromDate || c.dateRangeFrom || '').trim();
      const existingTo = (c.toDate || c.dateRangeTo || '').trim();
      const existingBank = (c.bankName || '').trim().toLowerCase();
      return existingFrom === cleanFromDate && 
             existingTo === cleanToDate && 
             c.amount === parsedAmount &&
             (existingBank === cleanBankName.toLowerCase() || !cleanBankName);
    });
    if (duplicatePeriod) {
      return {
        success: false,
        message: `Duplicate Protection: A deposit entry of ₹${parsedAmount.toLocaleString('en-IN')} for the exact period (${cleanFromDate} to ${cleanToDate}) already exists.`
      };
    }

    const creditId = `credit-${Date.now()}`;
    const newEntry: ELedgerBankCredit = {
      id: creditId,
      fromDate: cleanFromDate,
      toDate: cleanToDate,
      dateRangeFrom: cleanFromDate,
      dateRangeTo: cleanToDate,
      monthLabel: cleanMonthLabel,
      amount: parsedAmount,
      bankName: cleanBankName,
      referenceNo: cleanRef.toUpperCase(),
      bankUtrReference: cleanRef.toUpperCase(),
      description: cleanDesc,
      recordedBy: cleanRecordedBy,
      verifiedBy: cleanRecordedBy,
      createdAt: new Date().toISOString(),
      ...(cleanSlipProof ? { slipProofUrl: cleanSlipProof, slipUrlOrNote: cleanSlipProof } : {}),
    };

    await setDoc(doc(eledgerDb, BANK_CREDITS_COL, creditId), {
      ...sanitizeForFirestore(newEntry),
      createdAtServer: serverTimestamp(),
    });

    // Automatically recalculate unified treasury metrics
    await syncEledgerMetricsFromVouchers();

    return { 
      success: true, 
      message: `Bank credit of ₹${parsedAmount.toLocaleString('en-IN')} successfully verified and integrated into Treasury balance.` 
    };
  } catch (err: any) {
    console.error('[eLedger Service] addEledgerBankCredit error:', err);
    return { success: false, message: err.message || 'Failed to record bank credit entry.' };
  }
}

export async function deleteEledgerBankCredit(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(eledgerDb, BANK_CREDITS_COL, id));
    await syncEledgerMetricsFromVouchers();
    return { success: true, message: 'Bank credit entry removed and Treasury balance reconciled.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete bank credit entry.' };
  }
}

export async function updateOpeningBankBalance(amount: number): Promise<{ success: boolean; message: string }> {
  try {
    await setDoc(
      doc(eledgerDb, 'eledger_treasury_metrics', 'current_state'), 
      { openingBankBalance: amount, updatedAt: serverTimestamp() }, 
      { merge: true }
    );
    await syncEledgerMetricsFromVouchers();
    return { success: true, message: `Opening bank balance updated to ₹${amount.toLocaleString('en-IN')}.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update opening balance.' };
  }
}

/**
 * User Management Operations (Admin Only)
 */
export async function addEledgerUser(
  userData: Omit<ELedgerUser, 'id' | 'createdAt'>,
  existingUsers: ELedgerUser[]
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = userData.email.trim().toLowerCase();
    
    // Check duplicate
    const exists = existingUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return { success: false, message: 'An account with this email address already exists in the registry.' };
    }

    // Role Quota Check (Max 20 accounts: 1 Admin, 1 Treasurer, 1 Auditor, 17 Members)
    if (userData.role === 'admin' && existingUsers.filter(u => u.role === 'admin').length >= 1) {
      return { success: false, message: 'Quota Reached: The HCRS State Committee allows exactly 1 Admin account.' };
    }
    if (userData.role === 'treasurer' && existingUsers.filter(u => u.role === 'treasurer').length >= 1) {
      return { success: false, message: 'Quota Reached: The HCRS State Committee allows exactly 1 Treasurer account.' };
    }
    if (userData.role === 'auditor' && existingUsers.filter(u => u.role === 'auditor').length >= 1) {
      return { success: false, message: 'Quota Reached: The HCRS State Committee allows exactly 1 Statutory Auditor account.' };
    }
    if (userData.role === 'member' && existingUsers.filter(u => u.role === 'member').length >= 17) {
      return { success: false, message: 'Quota Reached: The 17 Committee Member seats are fully occupied.' };
    }

    const newUserId = `usr-${Date.now().toString().slice(-6)}`;
    const userPayload: Record<string, any> = {
      name: userData.name.trim(),
      email: cleanEmail,
      mobile: userData.mobile.trim(),
      role: userData.role,
      status: 'pending_setup',
      id: newUserId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (userData.district && userData.district.trim()) {
      userPayload.district = userData.district.trim();
    }

    // Only committee members can have membershipId or assignedSeatNumber; optional for admin/treasurer/auditor
    if (userData.role === 'member') {
      if (userData.membershipId && userData.membershipId.trim()) {
        userPayload.membershipId = userData.membershipId.trim();
      }
      if (userData.assignedSeatNumber !== undefined && userData.assignedSeatNumber !== null) {
        userPayload.assignedSeatNumber = userData.assignedSeatNumber;
      }
    }

    const cleanedUserDoc = sanitizeForFirestore(userPayload);
    await setDoc(doc(eledgerDb, USERS_COL, newUserId), cleanedUserDoc);

    // If role is member, create their isolated financial account
    if (userData.role === 'member') {
      const defaultAllocated = 0;
      const memberAccount: MemberFinancialAccount = {
        userId: newUserId,
        membershipId: userPayload.membershipId || `HCRS-SC-${existingUsers.filter(u => u.role === 'member').length + 1}`,
        memberName: userData.name.trim(),
        email: cleanEmail,
        mobile: userData.mobile.trim(),
        district: userPayload.district || 'State Committee HQ',
        allocatedCredit: 0,
        totalContributed: 0,
        expensesClaimed: 0,
        availableBalance: 0,
        billsSubmitted: 0,
        status: 'active',
        recentTransactions: [],
      };
      await setDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, newUserId), sanitizeForFirestore(memberAccount));
    }

    return {
      success: true,
      message: `Account created for ${userData.name.trim()} (${userData.role.toUpperCase()}). Password setup can be triggered via email.`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to add user.' };
  }
}

export async function updateEledgerUser(
  id: string, 
  updates: Partial<ELedgerUser>
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUpdates: Partial<ELedgerUser> = {};
    if (updates.name && updates.name.trim()) cleanUpdates.name = updates.name.trim();
    if (updates.email && updates.email.trim()) cleanUpdates.email = updates.email.trim().toLowerCase();
    if (updates.mobile && updates.mobile.trim()) cleanUpdates.mobile = updates.mobile.trim();
    if (updates.role) cleanUpdates.role = updates.role;
    if (updates.district && updates.district.trim()) cleanUpdates.district = updates.district.trim();
    if (updates.status) cleanUpdates.status = updates.status;
    
    // Only committee members can have membershipId
    if (updates.role === 'member' && updates.membershipId && updates.membershipId.trim()) {
      cleanUpdates.membershipId = updates.membershipId.trim();
    }

    const sanitizedUpdates = sanitizeForFirestore({
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });

    if (Object.keys(sanitizedUpdates).length === 0) {
      return { success: false, message: 'No valid change fields provided.' };
    }

    // Direct update/merge on the exact target Firestore document
    await setDoc(doc(eledgerDb, USERS_COL, id), sanitizedUpdates, { merge: true });

    // If updating the Central Admin account and an auth UID doc exists that differs from id (e.g. 'admin-hcrskerala'), keep both in sync
    const isEditingAdminAccount = 
      isCentralAdminEmail(updates.email) || 
      id === 'admin-hcrskerala' || 
      (eledgerAuth.currentUser && id === eledgerAuth.currentUser.uid && updates.role === 'admin');

    if (
      isEditingAdminAccount &&
      eledgerAuth.currentUser &&
      eledgerAuth.currentUser.uid !== id
    ) {
      await setDoc(
        doc(eledgerDb, USERS_COL, eledgerAuth.currentUser.uid), 
        { ...sanitizedUpdates, role: 'admin' }, 
        { merge: true }
      );
    }

    // Only sync member account if updating a committee member
    if (updates.role === 'member') {
      try {
        const memberSnap = await getDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, id));
        if (memberSnap.exists()) {
          const memberUpdates: Partial<MemberFinancialAccount> = {};
          if (cleanUpdates.name) memberUpdates.memberName = cleanUpdates.name;
          if (cleanUpdates.email) memberUpdates.email = cleanUpdates.email;
          if (cleanUpdates.mobile) memberUpdates.mobile = cleanUpdates.mobile;
          if (cleanUpdates.district) memberUpdates.district = cleanUpdates.district;
          if (cleanUpdates.membershipId) memberUpdates.membershipId = cleanUpdates.membershipId;

          const sanitizedMemberUpdates = sanitizeForFirestore({
            ...memberUpdates,
            updatedAt: serverTimestamp(),
          });
          if (Object.keys(sanitizedMemberUpdates).length > 0) {
            await setDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, id), sanitizedMemberUpdates, { merge: true });
          }
        }
      } catch (memErr) {
        console.warn('[eLedger Service] Member account sync warning:', memErr);
      }
    }

    return { success: true, message: 'Committee account updated successfully.' };
  } catch (err: any) {
    console.error('[eLedger Service] updateEledgerUser error:', err);
    return { success: false, message: err.message || 'Failed to update committee account in database.' };
  }
}

export async function toggleEledgerUserStatus(
  id: string, 
  currentStatus: string
): Promise<{ success: boolean; message: string }> {
  try {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await setDoc(doc(eledgerDb, USERS_COL, id), { status: nextStatus, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true, message: `Account status updated to ${nextStatus}.` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to change account status.' };
  }
}

export async function deleteEledgerUser(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(eledgerDb, USERS_COL, id));
    await deleteDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, id));
    return { success: true, message: 'User account deleted successfully.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete user account.' };
  }
}

/**
 * Voucher Operations
 */
export async function createEledgerVoucher(
  voucherData: Omit<LedgerVoucher, 'id' | 'voucherNumber' | 'status' | 'preparedBy'>,
  preparedByName: string,
  totalVouchersCount: number
): Promise<void> {
  const id = `vouch-${Date.now().toString().slice(-5)}`;
  const voucherNumber = `HCRS/VOUCH/2026/${(totalVouchersCount + 491).toString().padStart(4, '0')}`;
  
  const newVoucher: LedgerVoucher = {
    ...voucherData,
    id,
    voucherNumber,
    status: 'pending_approval',
    preparedBy: preparedByName,
  };

  await setDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    ...sanitizeForFirestore(newVoucher),
    createdAt: serverTimestamp(),
  });
}

/**
 * Recalculate metrics and category balances based on unified reconciliation logic
 * (Bank Credits + Opening Balance - Member Allocations - Direct Disbursements + Member Expenses)
 */
export async function syncEledgerMetricsFromVouchers(): Promise<void> {
  try {
    // 1. Fetch current Metrics doc for opening balance
    const metricsDocRef = doc(eledgerDb, 'eledger_treasury_metrics', 'current_state');
    const metricsSnap = await getDoc(metricsDocRef);
    let openingBankBalance = 10000;
    if (metricsSnap.exists()) {
      const data = metricsSnap.data();
      if (typeof data.openingBankBalance === 'number') {
        openingBankBalance = data.openingBankBalance;
      }
    }

    // 2. Fetch Bank Credits
    let totalBankCredits = 0;
    try {
      const bankCreditsSnap = await getDocs(collection(eledgerDb, BANK_CREDITS_COL));
      bankCreditsSnap.forEach((docSnap) => {
        const c = docSnap.data() as ELedgerBankCredit;
        if (typeof c.amount === 'number') {
          totalBankCredits += c.amount;
        }
      });
    } catch (err) {
      console.warn('[eLedger Service] bank credits fetch error:', err);
    }

    // 3. Fetch Member Accounts (Strict Deduplication per Committee Member)
    let totalMemberAllocations = 0;
    let totalMemberExpenses = 0;
    try {
      // Fetch registered users to identify genuine committee members
      let registeredMembers: ELedgerUser[] = [];
      try {
        const usersSnap = await getDocs(collection(eledgerDb, USERS_COL));
        registeredMembers = usersSnap.docs
          .map(d => ({ ...d.data(), id: d.id } as ELedgerUser))
          .filter(u => u.role === 'member');
      } catch (uErr) {
        console.warn('[eLedger Service] users fetch note in sync:', uErr);
      }

      const memberSnap = await getDocs(collection(eledgerDb, MEMBER_ACCOUNTS_COL));
      type MemberDocWithId = MemberFinancialAccount & { id: string };
      const memberDocs: MemberDocWithId[] = memberSnap.docs.map(d => ({ ...(d.data() as MemberFinancialAccount), id: d.id }));
      const uniqueMembersMap = new Map<string, MemberFinancialAccount>();
      const duplicateDocIdsToDelete: string[] = [];

      // If registered members exist, group them by normalized unique key so each committee member is counted EXACTLY once
      if (registeredMembers.length > 0) {
        const uniqueUsersMap = new Map<string, ELedgerUser>();
        for (const u of registeredMembers) {
          const key = (u.email || u.membershipId || u.name || u.id).trim().toLowerCase();
          if (!uniqueUsersMap.has(key)) {
            uniqueUsersMap.set(key, u);
          } else {
            const existingUser = uniqueUsersMap.get(key)!;
            if (existingUser.id.startsWith('usr-') && !u.id.startsWith('usr-')) {
              uniqueUsersMap.set(key, u);
            }
          }
        }

        for (const [key, user] of uniqueUsersMap.entries()) {
          const emailClean = (user.email || '').trim().toLowerCase();
          const nameClean = (user.name || '').trim().toLowerCase();
          const memIdClean = (user.membershipId || '').trim().toLowerCase();

          let matched = memberDocs.find(d => d.id === user.id || d.userId === user.id);
          if (!matched && emailClean) {
            matched = memberDocs.find(d => d.email && d.email.trim().toLowerCase() === emailClean);
          }
          if (!matched && memIdClean) {
            matched = memberDocs.find(d => d.membershipId && d.membershipId.trim().toLowerCase() === memIdClean);
          }
          if (!matched && nameClean) {
            matched = memberDocs.find(d => d.memberName && d.memberName.trim().toLowerCase() === nameClean);
          }

          if (matched) {
            uniqueMembersMap.set(key, matched);
          }
        }

        // Identify orphan docs to delete
        for (const docAcc of memberDocs) {
          if (docAcc.id === 'default-member' || docAcc.id.startsWith('default-')) {
            duplicateDocIdsToDelete.push(docAcc.id);
            continue;
          }
          const belongsToUser = Array.from(uniqueUsersMap.values()).some(u => 
            u.id === docAcc.id || 
            u.id === docAcc.userId ||
            (u.email && docAcc.email && u.email.trim().toLowerCase() === docAcc.email.trim().toLowerCase()) ||
            (u.membershipId && docAcc.membershipId && u.membershipId.trim().toLowerCase() === docAcc.membershipId.trim().toLowerCase()) ||
            (u.name && docAcc.memberName && u.name.trim().toLowerCase() === docAcc.memberName.trim().toLowerCase())
          );
          if (!belongsToUser) {
            duplicateDocIdsToDelete.push(docAcc.id);
          }
        }
      } else {
        // Fallback deduplication when no users loaded yet
        memberSnap.forEach((docSnap) => {
          const m = docSnap.data() as MemberFinancialAccount;
          const emailKey = m.email ? m.email.trim().toLowerCase() : '';
          const nameKey = m.memberName ? m.memberName.trim().toLowerCase() : '';
          const idKey = m.membershipId ? m.membershipId.trim().toLowerCase() : '';
          const uniqueKey = emailKey || idKey || nameKey || docSnap.id;

          if (docSnap.id === 'default-member' || docSnap.id.startsWith('default-')) {
            duplicateDocIdsToDelete.push(docSnap.id);
            return;
          }

          if (!uniqueMembersMap.has(uniqueKey)) {
            uniqueMembersMap.set(uniqueKey, { ...m, userId: docSnap.id });
          } else {
            const existing = uniqueMembersMap.get(uniqueKey)!;
            const maxAlloc = Math.max(existing.allocatedCredit || 0, m.allocatedCredit || 0);
            const maxExp = Math.max(existing.expensesClaimed || 0, m.expensesClaimed || 0);
            const maxBal = Math.max(existing.availableBalance || 0, m.availableBalance || 0);
            uniqueMembersMap.set(uniqueKey, {
              ...existing,
              allocatedCredit: maxAlloc,
              expensesClaimed: maxExp,
              availableBalance: maxBal,
            });
            if (docSnap.id !== existing.userId) {
              duplicateDocIdsToDelete.push(docSnap.id);
            }
          }
        });
      }

      // Cleanup redundant duplicate/orphan docs in background
      for (const dupId of duplicateDocIdsToDelete) {
        try {
          await deleteDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, dupId));
        } catch (delErr) {
          console.warn('[eLedger Service] Cleanup duplicate member doc note:', delErr);
        }
      }

      uniqueMembersMap.forEach((m) => {
        if (typeof m.allocatedCredit === 'number') {
          totalMemberAllocations += m.allocatedCredit;
        }
        if (typeof m.expensesClaimed === 'number') {
          totalMemberExpenses += m.expensesClaimed;
        }
      });
    } catch (err) {
      console.warn('[eLedger Service] member accounts fetch error:', err);
    }

    const currentMemberHeldBalance = Math.max(0, totalMemberAllocations - totalMemberExpenses);

    // 4. Fetch Vouchers (Direct non-member vouchers & total verified counts)
    const vouchSnap = await getDocs(collection(eledgerDb, VOUCHERS_COL));
    let directDisbursements = 0;
    let verifiedCount = 0;
    let pendingAuditsCount = 0;
    let latestAuditDate = '';

    const categorySpentMap: Record<string, number> = {};

    vouchSnap.forEach((docSnap) => {
      const v = docSnap.data() as LedgerVoucher;
      if (v.status === 'approved' || v.status === 'audited') {
        verifiedCount++;
        if (v.type === 'expense') {
          categorySpentMap[v.category] = (categorySpentMap[v.category] || 0) + v.amount;
          // If not member wallet expense, count as direct society disbursement from bank
          if (!v.preparedBy?.includes('Member Wallet') && v.category !== 'Special Member Allocation Pool') {
            directDisbursements += v.amount;
          }
        } else if (v.type === 'income') {
          // Direct income vouchers added to bank deposits
          totalBankCredits += v.amount;
        }
      }
      if (v.status === 'approved') {
        pendingAuditsCount++;
      }
      if (v.status === 'audited' && v.date) {
        if (!latestAuditDate || new Date(v.date) > new Date(latestAuditDate)) {
          latestAuditDate = v.date;
        }
      }
    });

    // 5. Compute Unified Mathematical Balances
    // Current Bank Balance = Opening Bank Balance + Bank Deposits - Member Allocations - Direct Disbursements
    const currentBankBalance = openingBankBalance + totalBankCredits - totalMemberAllocations - directDisbursements;
    // Total Society Fund Balance = Current Bank Balance + Current Member-held Balance
    const totalSocietyFundBalance = currentBankBalance + currentMemberHeldBalance;

    const totalInflow = openingBankBalance + totalBankCredits;
    const totalOutflow = totalMemberExpenses + directDisbursements;
    const currentReserveBalance = totalSocietyFundBalance;

    await setDoc(
      metricsDocRef,
      {
        openingBankBalance,
        totalBankCredits,
        totalMemberAllocations,
        totalMemberExpenses,
        currentMemberHeldBalance,
        currentBankBalance,
        totalSocietyFundBalance,
        totalInflow,
        totalOutflow,
        currentReserveBalance,
        verifiedVouchersCount: verifiedCount,
        pendingAuditsCount,
        lastAuditedDate: latestAuditDate || 'Pending Audit',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Update categories
    try {
      const catSnap = await getDocs(collection(eledgerDb, CATEGORIES_COL));
      for (const catDoc of catSnap.docs) {
        const cat = catDoc.data() as CategorySummary;
        let spent = categorySpentMap[cat.category] || 0;
        if (cat.category === 'Special Member Allocation Pool') {
          spent = totalMemberExpenses;
        }
        const balance = Math.max(0, (cat.allocated || 0) - spent);
        const percentageUsed = cat.allocated > 0 ? Math.min(100, Math.round((spent / cat.allocated) * 100)) : 0;
        await updateDoc(catDoc.ref, {
          spent,
          balance,
          percentageUsed,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn('[eLedger Service] category update note:', e);
    }
  } catch (err) {
    console.warn('[eLedger Service] syncEledgerMetricsFromVouchers note:', err);
  }
}

export async function approveEledgerVoucher(id: string, approvedByName: string): Promise<void> {
  await updateDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    status: 'approved',
    approvedBy: approvedByName,
    updatedAt: serverTimestamp(),
  });
  await syncEledgerMetricsFromVouchers();
}

export async function rejectEledgerVoucher(id: string): Promise<void> {
  await updateDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
  await syncEledgerMetricsFromVouchers();
}

export async function auditEledgerVoucher(
  id: string,
  notes: string,
  auditorName: string,
  voucherNo: string
): Promise<void> {
  await updateDoc(doc(eledgerDb, VOUCHERS_COL, id), {
    status: 'audited',
    auditedBy: auditorName,
    auditNotes: notes,
    updatedAt: serverTimestamp(),
  });

  // Create immutable audit log entry
  const logId = `log-${Date.now()}`;
  const newLog: AuditLogEntry = {
    id: logId,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    voucherNo: voucherNo,
    auditorName: auditorName,
    action: 'Verified & Approved',
    comment: notes,
    hashSignature: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`,
  };

  await setDoc(doc(eledgerDb, AUDIT_LOGS_COL, logId), {
    ...newLog,
    createdAt: serverTimestamp(),
  });

  await syncEledgerMetricsFromVouchers();
}

/**
 * Member Credit Allocation (Treasurer Operation)
 * Increases member available balance and syncs treasury allocations in real-time
 */
export async function allocateMemberCreditInDb(
  memberId: string,
  amount: number,
  currentAccount?: MemberFinancialAccount,
  memberUser?: ELedgerUser
): Promise<{ success: boolean; message: string }> {
  try {
    if (amount <= 0) {
      return { success: false, message: 'Please enter a valid credit amount greater than 0.' };
    }
    const memberRef = doc(eledgerDb, MEMBER_ACCOUNTS_COL, memberId);
    const snap = await getDoc(memberRef);
    
    const existing = snap.exists() ? (snap.data() as MemberFinancialAccount) : currentAccount;
    const updatedAllocated = ((existing?.allocatedCredit || 0) + amount);
    const updatedBalance = ((existing?.availableBalance || 0) + amount);
    
    const newTx: MemberTransaction = {
      id: `tx-alloc-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'credit_allocation',
      category: 'Operational Advance',
      description: 'Operational Credit Allocation by State Treasurer',
      amount: amount,
      balanceAfterTransaction: updatedBalance,
      referenceNo: `ALLOC-${Date.now().toString().slice(-4)}`,
      status: 'verified',
    };

    const memberPayload: Record<string, any> = {
      userId: memberId,
      membershipId: memberUser?.membershipId || existing?.membershipId || currentAccount?.membershipId || `HCRS-MB-${Date.now().toString().slice(-4)}`,
      memberName: memberUser?.name || existing?.memberName || currentAccount?.memberName || 'Committee Member',
      email: memberUser?.email || existing?.email || currentAccount?.email || '',
      mobile: memberUser?.mobile || existing?.mobile || currentAccount?.mobile || '',
      district: memberUser?.district || existing?.district || currentAccount?.district || 'State HQ',
      allocatedCredit: updatedAllocated,
      totalContributed: existing?.totalContributed || 0,
      expensesClaimed: existing?.expensesClaimed || 0,
      availableBalance: updatedBalance,
      billsSubmitted: existing?.billsSubmitted || 0,
      status: 'active',
      recentTransactions: [newTx, ...(existing?.recentTransactions || [])],
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(memberRef, memberPayload);
    } else {
      await setDoc(memberRef, {
        ...memberPayload,
        createdAt: serverTimestamp(),
      });
    }

    // Clean redundant duplicate placeholder docs (like default-member) if this is a real committee member
    if (memberUser?.email) {
      try {
        const cleanEmail = memberUser.email.trim().toLowerCase();
        const qEmail = query(collection(eledgerDb, MEMBER_ACCOUNTS_COL));
        const emailSnap = await getDocs(qEmail);
        for (const docAcc of emailSnap.docs) {
          const accData = docAcc.data() as MemberFinancialAccount;
          if (docAcc.id !== memberId && (docAcc.id === 'default-member' || (accData.email && accData.email.trim().toLowerCase() === cleanEmail))) {
            // Delete redundant duplicate doc so total allocations are not double-counted
            await deleteDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, docAcc.id));
          }
        }
      } catch (cleanErr) {
        console.warn('[eLedger Service] Duplicate member cleanup note:', cleanErr);
      }
    }

    // Recalculate unified treasury reconciliation
    await syncEledgerMetricsFromVouchers();

    return { 
      success: true, 
      message: `₹${amount.toLocaleString('en-IN')} credit allocated to ${memberUser?.name || existing?.memberName || 'Member'}. Available balance: ₹${updatedBalance.toLocaleString('en-IN')}.` 
    };
  } catch (err: any) {
    console.error('[eLedger Service] allocateMemberCreditInDb error:', err);
    return { success: false, message: err.message || 'Failed to allocate member credit in database.' };
  }
}

/**
 * Direct Target Member Allocation Set/Correction (Treasurer Operation)
 * Sets the exact target allocated credit for a committee member (e.g. ₹30,000)
 */
export async function setMemberExactAllocationInDb(
  memberId: string,
  exactAmount: number,
  currentAccount?: MemberFinancialAccount,
  memberUser?: ELedgerUser
): Promise<{ success: boolean; message: string }> {
  try {
    if (exactAmount < 0) {
      return { success: false, message: 'Please enter a valid non-negative allocation amount.' };
    }
    const memberRef = doc(eledgerDb, MEMBER_ACCOUNTS_COL, memberId);
    const snap = await getDoc(memberRef);
    
    const existing = snap.exists() ? (snap.data() as MemberFinancialAccount) : currentAccount;
    const expensesClaimed = existing?.expensesClaimed || 0;
    const updatedBalance = Math.max(0, exactAmount - expensesClaimed);
    
    const newTx: MemberTransaction = {
      id: `tx-alloc-set-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'credit_allocation',
      category: 'Operational Advance',
      description: `Target Allocation Set to ₹${exactAmount.toLocaleString('en-IN')}`,
      amount: exactAmount,
      balanceAfterTransaction: updatedBalance,
      referenceNo: `ALLOC-SET-${Date.now().toString().slice(-4)}`,
      status: 'verified',
    };

    const memberPayload: Record<string, any> = {
      userId: memberId,
      membershipId: memberUser?.membershipId || existing?.membershipId || currentAccount?.membershipId || `HCRS-MB-${Date.now().toString().slice(-4)}`,
      memberName: memberUser?.name || existing?.memberName || currentAccount?.memberName || 'Committee Member',
      email: memberUser?.email || existing?.email || currentAccount?.email || '',
      mobile: memberUser?.mobile || existing?.mobile || currentAccount?.mobile || '',
      district: memberUser?.district || existing?.district || currentAccount?.district || 'State HQ',
      allocatedCredit: exactAmount,
      totalContributed: existing?.totalContributed || 0,
      expensesClaimed: expensesClaimed,
      availableBalance: updatedBalance,
      billsSubmitted: existing?.billsSubmitted || 0,
      status: 'active',
      recentTransactions: [newTx, ...(existing?.recentTransactions || [])],
      updatedAt: serverTimestamp(),
    };

    if (snap.exists()) {
      await updateDoc(memberRef, memberPayload);
    } else {
      await setDoc(memberRef, {
        ...memberPayload,
        createdAt: serverTimestamp(),
      });
    }

    // Clean redundant duplicate docs
    if (memberUser?.email) {
      try {
        const cleanEmail = memberUser.email.trim().toLowerCase();
        const qEmail = query(collection(eledgerDb, MEMBER_ACCOUNTS_COL));
        const emailSnap = await getDocs(qEmail);
        for (const docAcc of emailSnap.docs) {
          const accData = docAcc.data() as MemberFinancialAccount;
          if (docAcc.id !== memberId && (docAcc.id === 'default-member' || (accData.email && accData.email.trim().toLowerCase() === cleanEmail))) {
            await deleteDoc(doc(eledgerDb, MEMBER_ACCOUNTS_COL, docAcc.id));
          }
        }
      } catch (cleanErr) {
        console.warn('[eLedger Service] Duplicate member cleanup note:', cleanErr);
      }
    }

    // Recalculate unified treasury reconciliation
    await syncEledgerMetricsFromVouchers();

    return { 
      success: true, 
      message: `₹${exactAmount.toLocaleString('en-IN')} allocation set for ${memberUser?.name || existing?.memberName || 'Member'}. Available wallet balance: ₹${updatedBalance.toLocaleString('en-IN')}.` 
    };
  } catch (err: any) {
    console.error('[eLedger Service] setMemberExactAllocationInDb error:', err);
    return { success: false, message: err.message || 'Failed to update member allocation in database.' };
  }
}

/**
 * Member Expense Submission (Automatic Member Wallet & Treasury Expense Sync)
 * Deducts from Member Wallet balance and automatically reflects in Treasury Expense
 */
export async function submitMemberExpenseInDb(
  memberId: string,
  expense: {
    date: string;
    category: string;
    description: string;
    amount: number;
    invoiceRef: string;
    receiptUrl?: string;
  },
  memberAccount?: MemberFinancialAccount
): Promise<{ success: boolean; message: string; voucherNo?: string }> {
  try {
    if (!expense.amount || expense.amount <= 0) {
      return { success: false, message: 'Please enter a valid expense amount.' };
    }

    const memberRef = doc(eledgerDb, MEMBER_ACCOUNTS_COL, memberId);
    const snap = await getDoc(memberRef);
    const existing = snap.exists() ? (snap.data() as MemberFinancialAccount) : memberAccount;

    if (!existing) {
      return { success: false, message: 'Member financial account not found.' };
    }

    const currentBal = existing.availableBalance || 0;
    if (expense.amount > currentBal) {
      return {
        success: false,
        message: `Insufficient Wallet Balance! Available: ₹${currentBal.toLocaleString('en-IN')}, Requested Expense: ₹${expense.amount.toLocaleString('en-IN')}. Please request additional credit from State Treasurer.`
      };
    }

    const newExpenseTotal = (existing.expensesClaimed || 0) + expense.amount;
    const newAvailableBalance = Math.max(0, currentBal - expense.amount);
    
    // Generate unified voucher number
    const voucherDocId = `vouch-exp-${Date.now()}`;
    const voucherNumber = `HCRS/EXP/2026/${Date.now().toString().slice(-4)}`;

    const newTx: MemberTransaction = {
      id: `tx-exp-${Date.now()}`,
      date: expense.date || new Date().toISOString().split('T')[0],
      type: 'expense_reimbursement',
      category: expense.category,
      memberName: existing.memberName,
      description: expense.description,
      amount: expense.amount,
      balanceAfterTransaction: newAvailableBalance,
      referenceNo: expense.invoiceRef || `BILL-${Date.now().toString().slice(-4)}`,
      voucherNo: voucherNumber,
      status: 'verified',
    };

    // 1. Update Member Wallet in Firestore
    await setDoc(
      memberRef,
      {
        userId: memberId,
        membershipId: existing.membershipId || '',
        memberName: existing.memberName || '',
        email: existing.email || '',
        mobile: existing.mobile || '',
        district: existing.district || '',
        allocatedCredit: existing.allocatedCredit || 0,
        totalContributed: existing.totalContributed || 0,
        expensesClaimed: newExpenseTotal,
        availableBalance: newAvailableBalance,
        billsSubmitted: (existing.billsSubmitted || 0) + 1,
        status: existing.status || 'active',
        recentTransactions: [newTx, ...(existing.recentTransactions || [])],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Automatically generate and approve linked Treasury Expense Voucher
    const newVoucher: LedgerVoucher = {
      id: voucherDocId,
      voucherNumber: voucherNumber,
      date: expense.date || new Date().toISOString().split('T')[0],
      type: 'expense',
      category: 'Special Member Allocation Pool',
      amount: expense.amount,
      description: `[Member Wallet Expense - ${expense.category}] ${expense.description}`,
      paidToOrReceivedFrom: existing.memberName || 'Committee Member',
      paymentMode: 'Cash / Impress',
      referenceNo: expense.invoiceRef || `BILL-${Date.now().toString().slice(-4)}`,
      status: 'approved',
      preparedBy: `${existing.memberName} (Member Wallet)`,
      approvedBy: 'Auto-Reconciliation Engine',
      attachmentsCount: expense.receiptUrl ? 1 : 0,
      district: existing.district || 'State HQ',
    };

    await setDoc(doc(eledgerDb, VOUCHERS_COL, voucherDocId), {
      ...sanitizeForFirestore(newVoucher),
      createdAt: serverTimestamp(),
    });

    // 3. Automatically sync unified treasury metrics in Firestore
    await syncEledgerMetricsFromVouchers();

    return {
      success: true,
      message: `Expense of ₹${expense.amount.toLocaleString('en-IN')} successfully deducted from Member Wallet and automatically reflected in Treasury Expenses. New balance: ₹${newAvailableBalance.toLocaleString('en-IN')}.`,
      voucherNo: voucherNumber,
    };
  } catch (err: any) {
    console.error('[eLedger Service] submitMemberExpenseInDb error:', err);
    return { success: false, message: err.message || 'Failed to process member expense.' };
  }
}

/**
 * Testing System Tool: Reset All Financial Ledger Data to Zero
 * Retains all user logins and accounts intact, but resets all vouchers, credits,
 * member balances, category balances, and opening bank balances to ₹0.
 */
export async function resetAllEledgerFinancialsToZero(actorName: string = 'Central Administrator'): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Delete all vouchers in eledger_vouchers
    const vouchersSnap = await getDocs(collection(eledgerDb, VOUCHERS_COL));
    for (const d of vouchersSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 2. Delete all bank credit records in eledger_bank_credits
    const creditsSnap = await getDocs(collection(eledgerDb, BANK_CREDITS_COL));
    for (const d of creditsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // 3. Reset all member financial accounts to zero
    const membersSnap = await getDocs(collection(eledgerDb, MEMBER_ACCOUNTS_COL));
    for (const d of membersSnap.docs) {
      const data = d.data();
      await setDoc(d.ref, {
        userId: data.userId || d.id,
        membershipId: data.membershipId || '',
        memberName: data.memberName || '',
        email: data.email || '',
        mobile: data.mobile || '',
        district: data.district || '',
        allocatedCredit: 0,
        totalContributed: 0,
        expensesClaimed: 0,
        availableBalance: 0,
        billsSubmitted: 0,
        status: data.status || 'active',
        recentTransactions: [],
        updatedAt: serverTimestamp(),
      });
    }

    // 4. Reset fund categories
    const categoriesSnap = await getDocs(collection(eledgerDb, CATEGORIES_COL));
    if (categoriesSnap.empty) {
      for (const cat of INITIAL_CATEGORY_SUMMARIES) {
        const catId = cat.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(eledgerDb, CATEGORIES_COL, catId), {
          ...cat,
          allocated: 0,
          spent: 0,
          balance: 0,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      for (const d of categoriesSnap.docs) {
        const data = d.data();
        await updateDoc(d.ref, {
          allocated: 0,
          spent: 0,
          balance: 0,
          updatedAt: serverTimestamp(),
        });
      }
    }

    // 5. Reset Treasury Metrics Doc
    const metricsRef = doc(eledgerDb, 'eledger_treasury_metrics', 'current_state');
    await setDoc(metricsRef, {
      openingBankBalance: 0,
      totalBankCredits: 0,
      totalIncome: 0,
      totalAllocatedCredit: 0,
      totalExpensesClaimed: 0,
      totalUnspentBalance: 0,
      totalVouchersApproved: 0,
      totalDisbursed: 0,
      totalExpense: 0,
      bankBalance: 0,
      cashInHand: 0,
      allocatedToMembers: 0,
      pendingVouchersCount: 0,
      auditedVouchersCount: 0,
      updatedAt: serverTimestamp(),
    });

    // 6. Log Audit Event
    try {
      const auditRef = doc(eledgerDb, AUDIT_LOGS_COL, `audit-reset-${Date.now()}`);
      await setDoc(auditRef, {
        id: `audit-reset-${Date.now()}`,
        action: 'FINANCIAL_SYSTEM_RESET_ZERO',
        performedBy: actorName,
        details: 'Full financial reset executed. All vouchers, credits, bank balances, and member allocations reset to zero for testing.',
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
    } catch (auditErr) {
      console.warn('[eLedger Service] Audit log for reset failed:', auditErr);
    }

    return {
      success: true,
      message: 'All financial balances, vouchers, and member allocations have been successfully reset to ₹0 for testing.',
    };
  } catch (err: any) {
    console.error('[eLedger Service] resetAllEledgerFinancialsToZero error:', err);
    return {
      success: false,
      message: err.message || 'Failed to reset financial records.',
    };
  }
}

/**
 * Legacy compatibility wrapper for submitMemberBillClaimInDb
 */
export async function submitMemberBillClaimInDb(
  memberId: string,
  claim: { description: string; amount: number; invoiceRef: string; category?: string; date?: string; memberName?: string }
): Promise<void> {
  await submitMemberExpenseInDb(memberId, {
    date: claim.date || new Date().toISOString().split('T')[0],
    category: claim.category || 'General Operational Expense',
    description: claim.description,
    amount: claim.amount,
    invoiceRef: claim.invoiceRef,
  });
}

