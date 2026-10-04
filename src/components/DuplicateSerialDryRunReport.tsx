import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, Download, FileSearch, Loader2, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, db } from '../lib/firebase';
import { doc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateNewMembershipId } from '../constants';

interface DuplicateSerialDryRunReportProps {
  members: UserProfile[];
  claims: any[];
  canApply?: boolean;
}

const cleanMobile = (value: unknown) => String(value || '').replace(/\D/g, '').slice(-10);

const extractSerial = (member: UserProfile): number | null => {
  const direct = Number((member as any).serialNo);
  if (Number.isInteger(direct) && direct > 0) return direct;

  const membershipId = String(member.membershipId || '').trim();
  const suffix = membershipId.match(/(\d+)\s*$/)?.[1];
  const parsed = suffix ? Number(suffix) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toDate = (value: any): Date | null => {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const replaceMembershipSuffix = (membershipId: string | undefined, serial: number) => {
  const current = String(membershipId || '').trim();
  if (!current) return '';
  return /\d+\s*$/.test(current) ? current.replace(/\d+\s*$/, String(serial)) : current;
};

const compareMembers = (left: UserProfile, right: UserProfile) => {
  const leftDate = toDate(left.registrationDate || (left as any).createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightDate = toDate(right.registrationDate || (right as any).createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftDate !== rightDate) return leftDate - rightDate;
  return String(left.uid || '').localeCompare(String(right.uid || ''));
};

const buildMembershipId = (member: UserProfile, serial: number) => {
  const replaced = replaceMembershipSuffix(member.membershipId, serial);
  if (replaced) return replaced;
  return generateNewMembershipId(
    member.district || member.districtCode || 'MLP',
    member.assemblyConstituency || '',
    serial,
    member.stateCode || 'KL'
  );
};

export default function DuplicateSerialDryRunReport({ members, claims, canApply = false }: DuplicateSerialDryRunReportProps) {
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [deepSearchTerm, setDeepSearchTerm] = useState('');
  const [deepPayments, setDeepPayments] = useState<any[]>([]);
  const [deepPaymentsLoading, setDeepPaymentsLoading] = useState(false);
  const [deepInvestigation, setDeepInvestigation] = useState<any>(null);
  const [deepInvestigationLoading, setDeepInvestigationLoading] = useState(false);
  const [mergeKeepUid, setMergeKeepUid] = useState('');
  const [mergeBusy, setMergeBusy] = useState(false);
  const deepSearchResults = useMemo(() => {
    const raw = deepSearchTerm.trim();
    const digits = cleanMobile(raw);
    if (!raw || (digits && digits.length < 4)) return { members: [] as UserProfile[], claims: [] as any[] };

    const normalizedText = raw.toLowerCase();
    const memberMatches = members.filter(member => {
      const mobile = cleanMobile(member.mobile);
      const altMobiles = [
        (member as any).phone,
        (member as any).phoneNumber,
        (member as any).mobileNumber,
        (member as any).whatsappNumber
      ].map(cleanMobile).filter(Boolean);
      if (digits && (mobile === digits || altMobiles.includes(digits))) return true;
      return [member.name, member.membershipId, (member as any).memberId, member.email, member.uid]
        .some(value => String(value || '').toLowerCase().includes(normalizedText));
    });

    const claimMatches = claims.filter(claim => {
      const claimMobiles = [claim.userMobile, claim.mobile, claim.phone, claim.phoneNumber, claim.mobileNumber]
        .map(cleanMobile).filter(Boolean);
      if (digits && claimMobiles.includes(digits)) return true;
      return [claim.name, claim.userName, claim.memberName, claim.membershipId, claim.uid]
        .some(value => String(value || '').toLowerCase().includes(normalizedText));
    });

    return { members: memberMatches, claims: claimMatches };
  }, [members, claims, deepSearchTerm]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = deepSearchTerm.trim();
      const digits = cleanMobile(raw);
      if (!raw || (digits && digits.length < 4)) {
        setDeepPayments([]);
        return;
      }
      setDeepPaymentsLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          if (!cancelled) setDeepPayments([]);
          return;
        }
        const response = await fetch('/api/admin/payments?limit=10000', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Payment audit unavailable');
        const json = await response.json();
        const q = raw.toLowerCase();
        const rows = (Array.isArray(json.payments) ? json.payments : []).filter((payment: any) => {
          if (digits && cleanMobile(payment.mobile) === digits) return true;
          return [payment.name, payment.mobile, payment.paymentId, payment.orderId, payment.memberId, payment.membershipId, payment.utr]
            .some(value => String(value || '').toLowerCase().includes(q));
        });
        if (!cancelled) setDeepPayments(rows);
      } catch {
        if (!cancelled) setDeepPayments([]);
      } finally {
        if (!cancelled) setDeepPaymentsLoading(false);
      }
    };
    const timer = window.setTimeout(run, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [deepSearchTerm]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const mobile = cleanMobile(deepSearchTerm);
      if (mobile.length !== 10) {
        setDeepInvestigation(null);
        return;
      }
      setDeepInvestigationLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Admin authentication unavailable');
        const response = await fetch(`/api/admin/duplicate-member-investigation?mobile=${encodeURIComponent(mobile)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Investigation unavailable');
        if (!cancelled) { setDeepInvestigation(json); setMergeKeepUid(json.keepUid || ''); }
      } catch (error:any) {
        if (!cancelled) setDeepInvestigation({ error: error?.message || 'Investigation unavailable' });
      } finally {
        if (!cancelled) setDeepInvestigationLoading(false);
      }
    };
    const timer = window.setTimeout(run, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [deepSearchTerm]);

  const mergeDuplicateMembers = async () => {
    const mobile = cleanMobile(deepSearchTerm);
    if (mobile.length !== 10 || !mergeKeepUid || !deepInvestigation?.records?.some((r:any) => r.uid === mergeKeepUid)) return;
    const keep = deepInvestigation.records.find((r:any) => r.uid === mergeKeepUid);
    const ok = window.confirm(`MERGE ${deepInvestigation.records.length} records for ${mobile}? KEEP: ${keep?.membershipId || mergeKeepUid}. Other duplicate member records will be removed after backup/merge verification.`);
    if (!ok) return;
    setMergeBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Admin authentication unavailable');
      const response = await fetch('/api/admin/duplicate-member-merge', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:JSON.stringify({ mobile, keepUid:mergeKeepUid })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Merge failed');
      alert(`Merge complete. KEEP: ${keep?.membershipId || mergeKeepUid}. Removed duplicates: ${json.removedUids?.length || 0}. Receipts preserved: ${json.receiptsMoved || 0}.`);
      setDeepInvestigation(null);
      setDeepSearchTerm('');
      setMergeKeepUid('');
    } catch (error:any) {
      alert(error?.message || 'Merge failed');
    } finally { setMergeBusy(false); }
  };

  const duplicateMobileAudit = useMemo(() => {
    const groups = new Map<string, any[]>();
    members.forEach((member: any) => {
      if (member.role === 'admin' || member.role === 'operator') return;
      const mobile = cleanMobile(member.mobile || member.phone || member.phoneNumber || member.mobileNumber);
      if (mobile.length !== 10) return;
      const list = groups.get(mobile) || [];
      list.push(member);
      groups.set(mobile, list);
    });
    const duplicateGroups = Array.from(groups.entries())
      .filter(([, list]) => list.length > 1)
      .map(([mobile, list]) => {
        const ranked = [...list].map((member: any) => {
          const renewalEvidence = Boolean(member.renewalDate || member.renewalTransactionId || member.renewalPaymentId || member.lastRenewalDate);
          const lifeEvidence = String(member.membership_type || member.membershipType || member.membershipId || '').toUpperCase().includes('LIFE');
          const activeEvidence = member.status === 'active';
          const paymentEvidence = Boolean(member.paymentId || member.transactionId || member.registrationPaymentId);
          const dateValue = toDate(member.registrationDate || member.createdAt)?.getTime() || Number.MAX_SAFE_INTEGER;
          const score = (renewalEvidence ? 100 : 0) + (lifeEvidence ? 40 : 0) + (activeEvidence ? 20 : 0) + (paymentEvidence ? 10 : 0);
          return { member, renewalEvidence, lifeEvidence, activeEvidence, paymentEvidence, dateValue, score };
        }).sort((a, b) => b.score - a.score || a.dateValue - b.dateValue || (extractSerial(a.member) || 999999999) - (extractSerial(b.member) || 999999999));
        const best = ranked[0];
        const tied = ranked.length > 1 && ranked[1].score === best.score;
        return { mobile, ranked, best, safeRecommendation: !tied && (best.renewalEvidence || best.lifeEvidence || best.paymentEvidence) };
      })
      .sort((a, b) => b.ranked.length - a.ranked.length || a.mobile.localeCompare(b.mobile));
    return {
      groups: duplicateGroups,
      duplicateMobileCount: duplicateGroups.length,
      affectedRecords: duplicateGroups.reduce((sum, group) => sum + group.ranked.length, 0),
      extraRecords: duplicateGroups.reduce((sum, group) => sum + Math.max(0, group.ranked.length - 1), 0),
      reviewCount: duplicateGroups.filter(group => !group.safeRecommendation).length
    };
  }, [members]);

  const duplicateDiagnosis = useMemo(() => {
    if (deepSearchResults.members.length < 2) return null;
    const paymentKeys = new Set<string>();
    deepPayments.forEach((p: any) => {
      [p.memberId, p.membershipId, p.uid, p.userId].forEach(v => {
        const key = String(v || '').trim().toLowerCase();
        if (key) paymentKeys.add(key);
      });
    });
    const scored = deepSearchResults.members.map((member: any) => {
      const keys = [member.uid, member.membershipId, member.memberId].map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
      const linkedPayments = deepPayments.filter((p: any) => [p.memberId, p.membershipId, p.uid, p.userId]
        .some(v => keys.includes(String(v || '').trim().toLowerCase())));
      const serial = extractSerial(member);
      const statusScore = member.status === 'active' ? 30 : member.status === 'pending' ? 10 : member.status === 'deleted' ? -50 : 0;
      const paymentScore = linkedPayments.length * 100;
      const lifeScore = String(member.membership_type || member.membershipType || member.membershipId || '').toUpperCase().includes('LIFE') ? 20 : 0;
      const dateValue = toDate(member.registrationDate || member.createdAt)?.getTime() || Number.MAX_SAFE_INTEGER;
      return { member, linkedPayments, serial, score: statusScore + paymentScore + lifeScore, dateValue };
    }).sort((a, b) => b.score - a.score || a.dateValue - b.dateValue || (a.serial || 999999999) - (b.serial || 999999999));
    const best = scored[0];
    const second = scored[1];
    const decisive = best.linkedPayments.length > second.linkedPayments.length ||
      (best.score > second.score && (best.linkedPayments.length > 0 || best.member.status === 'active') && second.member.status !== 'active');
    return { scored, best, decisive };
  }, [deepSearchResults.members, deepPayments]);

  const serialAudit = useMemo(() => {
    const eligibleMembers = members.filter(member => member.role !== 'admin' && member.role !== 'operator');
    const serialCounts = new Map<number, number>();
    const invalidMembers: UserProfile[] = [];

    eligibleMembers.forEach(member => {
      const serial = extractSerial(member);
      if (!serial) {
        invalidMembers.push(member);
        return;
      }
      serialCounts.set(serial, (serialCounts.get(serial) || 0) + 1);
    });

    const duplicateSerials = Array.from(serialCounts.entries())
      .filter(([, count]) => count > 1)
      .sort(([left], [right]) => left - right);
    const missingToMemberCount: number[] = [];
    for (let serial = 1; serial <= eligibleMembers.length; serial += 1) {
      if (!serialCounts.has(serial)) missingToMemberCount.push(serial);
    }

    const rangeStart = 6000;
    const rangeEnd = 8000;
    const missingInRange: number[] = [];
    const duplicatesInRange: Array<[number, number]> = [];
    for (let serial = rangeStart; serial <= rangeEnd; serial += 1) {
      const count = serialCounts.get(serial) || 0;
      if (count === 0) missingInRange.push(serial);
      if (count > 1) duplicatesInRange.push([serial, count]);
    }

    const outOfCountRange = Array.from(serialCounts.keys())
      .filter(serial => serial > eligibleMembers.length)
      .sort((left, right) => left - right);

    return {
      eligibleCount: eligibleMembers.length,
      uniqueSerialCount: serialCounts.size,
      invalidMembers,
      duplicateSerials,
      missingToMemberCount,
      rangeStart,
      rangeEnd,
      missingInRange,
      duplicatesInRange,
      outOfCountRange
    };
  }, [members]);

  const correctionPlan = useMemo(() => {
    const eligibleMembers = members.filter(member => member.role !== 'admin' && member.role !== 'operator');
    const memberCount = eligibleMembers.length;
    const groups = new Map<number, UserProfile[]>();
    const correctionMembers: Array<{ member: UserProfile; reason: 'DUPLICATE' | 'INVALID_OR_OUT_OF_RANGE' }> = [];

    eligibleMembers.forEach(member => {
      const serial = extractSerial(member);
      if (!serial || serial > memberCount) {
        correctionMembers.push({ member, reason: 'INVALID_OR_OUT_OF_RANGE' });
        return;
      }
      const group = groups.get(serial) || [];
      group.push(member);
      groups.set(serial, group);
    });

    groups.forEach(group => {
      const sorted = [...group].sort(compareMembers);
      sorted.slice(1).forEach(member => correctionMembers.push({ member, reason: 'DUPLICATE' }));
    });

    const occupied = new Set(groups.keys());
    const missingSerials: number[] = [];
    for (let serial = 1; serial <= memberCount; serial += 1) {
      if (!occupied.has(serial)) missingSerials.push(serial);
    }

    correctionMembers.sort((left, right) => compareMembers(left.member, right.member));
    const rows = correctionMembers.map((entry, index) => {
      const member = entry.member;
      const oldSerial = extractSerial(member);
      const proposedSerial = missingSerials[index] || 0;
      const memberMobile = cleanMobile(member.mobile);
      const memberId = String(member.membershipId || '').trim().toLowerCase();
      const matchingClaims = claims.filter(claim => {
        // Prefer the strongest available identifier. Falling through only when a
        // claim does not carry that identifier prevents one duplicated old ID
        // from attaching the same verification form to multiple members.
        if (claim.uid) return Boolean(member.uid && member.uid === claim.uid);
        const claimMobile = cleanMobile(claim.userMobile || claim.mobile);
        if (claimMobile) return Boolean(memberMobile && claimMobile === memberMobile);
        return Boolean(memberId && claim.membershipId && String(claim.membershipId).trim().toLowerCase() === memberId);
      });

      return {
        member,
        reason: entry.reason,
        oldSerial,
        proposedSerial,
        proposedMembershipId: proposedSerial ? buildMembershipId(member, proposedSerial) : '',
        matchingClaims
      };
    });

    return {
      rows,
      missingSerials,
      isBalanced: rows.length === missingSerials.length
    };
  }, [members, claims]);

  const maximumSerial = useMemo(
    () => members.reduce((maximum, member) => Math.max(maximum, extractSerial(member) || 0), 1000),
    [members]
  );
  const migrationCount = correctionPlan.rows.length;

  const exportDryRun = () => {
    const rows = correctionPlan.rows.map((row, index) => ({
      'Sl No': index + 1,
      'Firestore UID': row.member.uid || '',
      'Name': row.member.name || '',
      'Mobile': row.member.mobile || '',
      'District': row.member.district || row.member.districtCode || '',
      'Old Serial': row.oldSerial || 'INVALID / NONE',
      'Old Membership ID': row.member.membershipId || '',
      'Reason': row.reason,
      'Action': 'PROPOSE NUMBER CHANGE',
      'Proposed Serial': row.proposedSerial,
      'Proposed Membership ID': row.proposedMembershipId,
      'Verification Forms Found': row.matchingClaims.length,
      'Verification Form IDs': row.matchingClaims.map(claim => claim.id || '').filter(Boolean).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Full Correction Mapping');

    const rangeAuditRows = Array.from(
      { length: serialAudit.rangeEnd - serialAudit.rangeStart + 1 },
      (_, index) => serialAudit.rangeStart + index
    ).map(serial => {
      const duplicate = serialAudit.duplicatesInRange.find(([value]) => value === serial);
      return {
        Serial: serial,
        Status: serialAudit.missingInRange.includes(serial) ? 'MISSING' : duplicate ? 'DUPLICATE' : 'OK',
        'Record Count': duplicate?.[1] || (serialAudit.missingInRange.includes(serial) ? 0 : 1)
      };
    });
    const rangeWorksheet = XLSX.utils.json_to_sheet(rangeAuditRows);
    XLSX.utils.book_append_sheet(workbook, rangeWorksheet, 'Serial 6000-8000 Audit');

    const overallAuditRows = [
      { Metric: 'Eligible Member Count', Value: serialAudit.eligibleCount },
      { Metric: 'Unique Serial Count', Value: serialAudit.uniqueSerialCount },
      { Metric: 'Members Without Valid Serial', Value: serialAudit.invalidMembers.length },
      { Metric: 'Duplicate Serial Numbers', Value: serialAudit.duplicateSerials.map(([serial, count]) => `${serial} (${count})`).join(', ') || 'None' },
      { Metric: `Missing Serials 1-${serialAudit.eligibleCount}`, Value: serialAudit.missingToMemberCount.join(', ') || 'None' },
      { Metric: 'Serials Above Member Count', Value: serialAudit.outOfCountRange.join(', ') || 'None' }
    ];
    const overallWorksheet = XLSX.utils.json_to_sheet(overallAuditRows);
    XLSX.utils.book_append_sheet(workbook, overallWorksheet, 'Overall Serial Audit');
    XLSX.writeFile(workbook, `HCRS_full_serial_correction_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setBackupDownloaded(true);
  };

  const applySerialCorrections = async () => {
    const corrections = correctionPlan.rows;
    if (!canApply || !correctionPlan.isBalanced || corrections.length === 0 || confirmationText !== 'CORRECT ALL SERIALS' || !backupDownloaded) return;

    const confirmed = window.confirm(
      `${corrections.length} duplicate/invalid member records-ന് 1–${serialAudit.eligibleCount} ഇടയിലെ missing serials നൽകുകയും verification forms update ചെയ്യുകയും ചെയ്യും. തുടരണമോ?`
    );
    if (!confirmed) return;

    setIsApplying(true);
    const toastId = toast.loading('Serial correction നടത്തുന്നു...');
    try {
      const totalsRef = doc(db, 'system', 'totals');

      // Reserve the complete existing member range before changing any member.
      // A registration occurring during the migration will therefore receive
      // eligibleCount + 1 (or higher), never one of the missing slots below it.
      await runTransaction(db, async transaction => {
        const totalsSnapshot = await transaction.get(totalsRef);
        const currentCount = Number(totalsSnapshot.data()?.count || 0);
        transaction.set(totalsRef, {
          count: Math.max(currentCount, serialAudit.eligibleCount),
          serialCorrectionInProgress: true,
          serialCorrectionStartedAt: serverTimestamp()
        }, { merge: true });
      });

      type PendingWrite = { path: string[]; data: Record<string, unknown> };
      const writes: PendingWrite[] = [];
      const correctedAt = serverTimestamp();

      corrections.forEach(row => {
        const oldMembershipId = String(row.member.membershipId || '');
        const memberUpdate: Record<string, unknown> = {
          serialNo: row.proposedSerial,
          previousSerialNo: row.oldSerial || null,
          serialCorrectedAt: correctedAt,
          serialCorrectionReason: row.reason
        };
        if (row.proposedMembershipId) memberUpdate.membershipId = row.proposedMembershipId;
        writes.push({ path: ['users', row.member.uid], data: memberUpdate });

        row.matchingClaims.forEach(claim => {
          if (!claim.id) return;
          const claimUpdate: Record<string, unknown> = {
            serialNo: row.proposedSerial,
            previousSerialNo: row.oldSerial || null,
            serialCorrectedAt: correctedAt
          };
          if (row.proposedMembershipId) claimUpdate.membershipId = row.proposedMembershipId;
          if (oldMembershipId) claimUpdate.previousMembershipId = oldMembershipId;
          writes.push({ path: ['claims', claim.id], data: claimUpdate });
        });
      });

      // Keep each batch below Firestore's 500-operation limit.
      for (let offset = 0; offset < writes.length; offset += 450) {
        const batch = writeBatch(db);
        writes.slice(offset, offset + 450).forEach(write => {
          batch.set(doc(db, ...write.path), write.data, { merge: true });
        });
        await batch.commit();
      }

      // Never lower the counter: a new registration may have incremented it
      // while the correction batches were running.
      let finalSerial = serialAudit.eligibleCount;
      await runTransaction(db, async transaction => {
        const totalsSnapshot = await transaction.get(totalsRef);
        const currentCount = Number(totalsSnapshot.data()?.count || 0);
        finalSerial = Math.max(currentCount, serialAudit.eligibleCount);
        transaction.set(totalsRef, {
          count: finalSerial,
          serialCorrectionInProgress: false,
          serialCorrectionCompletedAt: serverTimestamp(),
          serialCorrectionUpdatedAt: serverTimestamp()
        }, { merge: true });
      });

      toast.success(`${corrections.length} duplicate serial records corrected. അവസാന serial: ${finalSerial}`, { id: toastId });
      setConfirmationText('');
    } catch (error: any) {
      console.error('Duplicate serial correction failed:', error);
      try {
        const failureBatch = writeBatch(db);
        failureBatch.set(doc(db, 'system', 'totals'), {
          serialCorrectionInProgress: false,
          serialCorrectionFailedAt: serverTimestamp()
        }, { merge: true });
        await failureBatch.commit();
      } catch (statusError) {
        console.error('Could not clear serial correction status:', statusError);
      }
      toast.error(`Serial correction പരാജയപ്പെട്ടു: ${error?.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/40 rounded-2xl shadow-sm">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-amber-700" />
              <h3 className="text-base font-black text-slate-900">Complete Serial Correction — Dry-run</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              ഇത് preview മാത്രം ആണ്. Member, Verification Form അല്ലെങ്കിൽ Firestore data ഒന്നും മാറ്റുന്നില്ല.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={exportDryRun}
            disabled={migrationCount === 0}
            className="rounded-xl font-bold"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>

        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/70 p-4 space-y-3">
          <div>
            <h4 className="font-black text-slate-950">Duplicate Mobile Audit — Read Only</h4>
            <p className="text-xs font-bold text-slate-700">
              മുഴുവൻ loaded member records-ലും ഒരേ 10-digit mobile ഉള്ള records കണ്ടെത്തുന്നു. Renewal/Life/payment/status evidence ഉപയോഗിച്ച് KEEP/REVIEW recommendation മാത്രം നൽകുന്നു; ഒന്നും delete/merge ചെയ്യുന്നില്ല.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-xl bg-white border border-violet-200 p-3"><p className="text-[10px] uppercase font-black text-slate-600">Duplicate Mobiles</p><p className="text-xl font-black text-violet-800">{duplicateMobileAudit.duplicateMobileCount}</p></div>
            <div className="rounded-xl bg-white border border-violet-200 p-3"><p className="text-[10px] uppercase font-black text-slate-600">Affected Records</p><p className="text-xl font-black text-slate-950">{duplicateMobileAudit.affectedRecords}</p></div>
            <div className="rounded-xl bg-white border border-red-200 p-3"><p className="text-[10px] uppercase font-black text-slate-600">Extra Records</p><p className="text-xl font-black text-red-700">{duplicateMobileAudit.extraRecords}</p></div>
            <div className="rounded-xl bg-white border border-amber-200 p-3"><p className="text-[10px] uppercase font-black text-slate-600">Manual Review</p><p className="text-xl font-black text-amber-800">{duplicateMobileAudit.reviewCount}</p></div>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-xl border border-violet-200 bg-white">
            {duplicateMobileAudit.groups.length === 0 ? (
              <p className="p-3 text-xs font-bold text-emerald-800">Duplicate mobile records കണ്ടെത്തിയില്ല.</p>
            ) : duplicateMobileAudit.groups.map((group: any) => (
              <div key={group.mobile} className="border-b border-slate-200 p-3 last:border-b-0">
                <p className="text-sm font-black text-slate-950">{group.mobile} — {group.ranked.length} records</p>
                {group.ranked.map((item: any, index: number) => {
                  const keep = item.member.uid === group.best.member.uid;
                  const label = keep && group.safeRecommendation ? 'KEEP CANDIDATE' : keep ? 'MANUAL REVIEW — POSSIBLE KEEP' : 'POSSIBLE DUPLICATE';
                  return (
                    <div key={item.member.uid || index} className="mt-2 rounded-lg border border-slate-200 p-2 text-xs">
                      <p className="font-black text-slate-900">{label} — {item.member.name || 'Unknown'} — {item.member.membershipId || 'No Member ID'}</p>
                      <p className="mt-1 break-all text-slate-600">UID: {item.member.uid || 'N/A'} • Serial: {extractSerial(item.member) || 'None'} • Status: {item.member.status || 'N/A'} • Renewal: {item.renewalEvidence ? 'Yes' : 'No'} • Life: {item.lifeEvidence ? 'Yes' : 'No'} • Stored payment: {item.paymentEvidence ? 'Yes' : 'No'}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-xs font-black text-red-800">Safety: ഈ audit automatic delete ചെയ്യുന്നില്ല. Renewal/receipt/payment history canonical record-ലേക്ക് ഉറപ്പാക്കിയ ശേഷമേ removal അനുവദിക്കാവൂ.</p>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
          <div>
            <h4 className="font-black text-slate-950">Member Deep Search — Read Only</h4>
            <p className="text-xs font-bold text-slate-700">
              സാധാരണ Member list-ൽ മറഞ്ഞ duplicate/deleted record ഉൾപ്പെടെ loaded Users + Verification Forms-ൽ mobile/name/Member ID/UID ഉപയോഗിച്ച് പരിശോധിക്കുന്നു. Data ഒന്നും മാറ്റുന്നില്ല.
            </p>
          </div>
          <input
            value={deepSearchTerm}
            onChange={event => setDeepSearchTerm(event.target.value)}
            placeholder="Mobile / Name / Member ID / UID"
            className="h-11 w-full rounded-xl border-2 border-emerald-200 bg-white px-3 font-bold text-slate-950 outline-none focus:border-emerald-500"
          />
          {deepSearchTerm.trim() && (
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-700">
                User records: {deepSearchResults.members.length} • Verification Forms: {deepSearchResults.claims.length} • Payments: {deepPaymentsLoading ? 'Checking…' : deepPayments.length}
              </p>
              {cleanMobile(deepSearchTerm).length === 10 && (
                <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50 p-3 text-xs">
                  <p className="font-black text-indigo-950">Full Duplicate Investigation Report</p>
                  {deepInvestigationLoading ? (
                    <p className="mt-2 font-bold text-slate-700">Receipts, renewals and payment links പരിശോധിക്കുന്നു…</p>
                  ) : deepInvestigation?.error ? (
                    <p className="mt-2 font-black text-red-700">{deepInvestigation.error}</p>
                  ) : deepInvestigation?.records?.length ? (
                    <div className="mt-2 space-y-2">
                      <p className="font-black text-slate-800">
                        Decision: {deepInvestigation.recommendation === 'KEEP_AND_REVIEW_MERGE'
                          ? `KEEP ${deepInvestigation.keepMembershipId || deepInvestigation.keepUid} → verify history → merge others → archive duplicates`
                          : deepInvestigation.recommendation === 'MANUAL_REVIEW' ? 'MANUAL REVIEW — no automatic removal' : 'No duplicate'}
                      </p>
                      {deepInvestigation.records.map((record:any, index:number) => {
                        const keep = deepInvestigation.keepUid && record.uid === deepInvestigation.keepUid;
                        return (
                          <div key={record.uid || index} className={`rounded-lg border p-2 ${keep ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                            <p className="font-black text-slate-950">{keep ? 'KEEP / CANONICAL CANDIDATE' : 'MERGE / REVIEW CANDIDATE'} — {record.membershipId || record.uid}</p>
                            <p className="mt-1 break-all text-slate-600">UID: {record.uid} • Status: {record.status || 'N/A'} • Registration: {record.registrationDate || 'N/A'} • Renewal: {record.renewalDate || 'N/A'} • Expiry: {record.expiryDate || 'N/A'}</p>
                            <p className="mt-1 font-bold text-slate-700">Joining receipts: {record.joiningReceiptCount || 0} • Renewal receipts: {record.renewalReceiptCount || 0} • Directly linked payments: {record.directlyLinkedPaymentCount || 0} • Total receipts: {record.receipts?.length || 0}</p>
                            <label className="mt-2 flex items-center gap-2 font-black text-indigo-900"><input type="radio" name="mergeKeepUid" checked={mergeKeepUid === record.uid} onChange={() => setMergeKeepUid(record.uid)} /> KEEP this record</label>
                          </div>
                        );
                      })}
                      <button type="button" disabled={!mergeKeepUid || mergeBusy || deepInvestigation.records.length < 2} onClick={mergeDuplicateMembers} className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-black text-white disabled:opacity-50">{mergeBusy ? 'Merging & verifying…' : 'MERGE → Keep selected record only'}</button>
                      <p className="font-black text-red-800">Merge creates an audit backup, preserves receipts/latest renewal-expiry data, verifies KEEP, then removes redundant member records.</p>
                    </div>
                  ) : (
                    <p className="mt-2 font-bold text-slate-700">Investigation result ലഭ്യമല്ല.</p>
                  )}
                </div>
              )}
              {duplicateDiagnosis && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs">
                  <p className="font-black text-amber-950">Duplicate Diagnosis — Read Only</p>
                  <p className="mt-1 font-bold text-slate-700">
                    Payment/member evidence ഉപയോഗിച്ച് ഏത് record നിലനിർത്തണം എന്ന് പരിശോധിക്കുന്നു. ഈ screen ഒന്നും delete ചെയ്യുന്നില്ല.
                  </p>
                  <div className="mt-2 space-y-2">
                    {duplicateDiagnosis.scored.map((item: any, index: number) => {
                      const isBest = item.member.uid === duplicateDiagnosis.best.member.uid;
                      const label = isBest && duplicateDiagnosis.decisive ? 'KEEP CANDIDATE' : (isBest ? 'REVIEW — POSSIBLE ORIGINAL' : 'REVIEW — POSSIBLE DUPLICATE');
                      return (
                        <div key={item.member.uid || index} className="rounded-lg border border-amber-200 bg-white p-2">
                          <p className="font-black text-slate-950">{label}: {item.member.membershipId || item.member.uid || 'Unknown record'}</p>
                          <p className="mt-1 break-all text-slate-600">UID: {item.member.uid || 'N/A'} • Serial: {item.serial || 'None'} • Status: {item.member.status || 'N/A'} • Linked payments found: {item.linkedPayments.length}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 font-black text-red-800">
                    {duplicateDiagnosis.decisive
                      ? 'Recommendation only: linked evidence supports the KEEP candidate. Verify receipts/registration history before any removal.'
                      : 'No safe automatic winner yet. Do NOT delete either record until payment/receipt/registration evidence identifies the canonical member.'}
                  </p>
                </div>
              )}
              {deepSearchResults.members.length === 0 && deepSearchResults.claims.length === 0 && deepPayments.length === 0 && !deepPaymentsLoading ? (
                <div className="rounded-xl border border-amber-200 bg-white p-3 text-xs font-bold text-amber-800">
                  ഈ loaded database snapshot-ലും Verification Forms-ലും match കണ്ടെത്തിയില്ല. പുതിയ membership create ചെയ്യുന്നതിന് മുമ്പ് payment/import records കൂടി പരിശോധിക്കുക.
                </div>
              ) : (
                <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-white">
                  {deepSearchResults.members.map((member, index) => (
                    <div key={member.uid || `member-${index}`} className="border-b border-slate-100 p-3 text-xs last:border-b-0">
                      <p className="font-black text-slate-950">{member.name || 'Unknown Member'} — {member.mobile || 'No mobile'}</p>
                      <p className="mt-1 break-all text-slate-600">
                        UID: {member.uid || 'N/A'} • Member ID: {member.membershipId || 'N/A'} • Serial: {extractSerial(member) || 'None'} • District: {member.district || member.districtCode || 'N/A'} • Status: {member.status || 'N/A'}
                      </p>
                      {(member.status === 'deleted') && <Badge className="mt-2 bg-red-100 text-red-800 border-red-200">Hidden: deleted record</Badge>}
                    </div>
                  ))}
                  {deepSearchResults.claims.map((claim, index) => (
                    <div key={claim.id || claim.uid || `claim-${index}`} className="border-b border-slate-100 p-3 text-xs last:border-b-0">
                      <p className="font-black text-blue-900">Verification Form match</p>
                      <p className="mt-1 break-all text-slate-600">
                        Name: {claim.name || claim.userName || claim.memberName || 'N/A'} • Mobile: {claim.userMobile || claim.mobile || claim.phone || claim.phoneNumber || 'N/A'} • Member ID: {claim.membershipId || 'N/A'} • UID: {claim.uid || 'N/A'}
                      </p>
                    </div>
                  ))}
                  {deepPayments.map((payment, index) => (
                    <div key={payment.id || payment.paymentId || `payment-${index}`} className="border-b border-slate-100 p-3 text-xs last:border-b-0">
                      <p className="font-black text-emerald-900">Payment record — {payment.method || 'Stored payment'}</p>
                      <p className="mt-1 break-all text-slate-600">
                        {payment.paymentType || 'payment'} • ₹{Number(payment.amount || 0)} • {payment.paymentStatus || payment.status || 'N/A'} • Mobile: {payment.mobile || 'N/A'} • Payment ID/UTR: {payment.paymentId || payment.utr || 'N/A'}
                      </p>
                      <p className="mt-1 font-bold text-slate-700">
                        Diagnosis: {String(payment.method || '').toLowerCase().includes('razor') ? 'Razorpay verified/stored record' : 'Historical/manual payment record'}.
                        {payment.memberId || payment.membershipId ? ' Member link is present.' : ' Member link missing — review before repair.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
          <div>
            <h4 className="font-black text-slate-950">Complete Serial Audit — Read Only</h4>
            <p className="text-xs font-bold text-slate-700">
              1 മുതൽ total member count വരെയും 6000–8000 range-ലും serial continuity പരിശോധിക്കുന്നു. Data ഒന്നും മാറ്റുന്നില്ല.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-xl bg-white border border-blue-200 p-3">
              <p className="text-[10px] uppercase font-black text-slate-600">Eligible Members</p>
              <p className="text-xl font-black text-slate-950">{serialAudit.eligibleCount}</p>
            </div>
            <div className="rounded-xl bg-white border border-blue-200 p-3">
              <p className="text-[10px] uppercase font-black text-slate-600">Unique Serials</p>
              <p className="text-xl font-black text-blue-800">{serialAudit.uniqueSerialCount}</p>
            </div>
            <div className="rounded-xl bg-white border border-red-200 p-3">
              <p className="text-[10px] uppercase font-black text-slate-600">All Duplicates</p>
              <p className="text-xl font-black text-red-700">{serialAudit.duplicateSerials.length}</p>
            </div>
            <div className="rounded-xl bg-white border border-amber-200 p-3">
              <p className="text-[10px] uppercase font-black text-slate-600">Invalid / No Serial</p>
              <p className="text-xl font-black text-amber-800">{serialAudit.invalidMembers.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-slate-800">
              <span className="block text-slate-600">6000–8000 Missing</span>
              <span className="text-base font-black text-amber-800">{serialAudit.missingInRange.length}</span>
              <p className="mt-1 break-words">{serialAudit.missingInRange.slice(0, 30).join(', ') || 'None'}{serialAudit.missingInRange.length > 30 ? '…' : ''}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-slate-800">
              <span className="block text-slate-600">6000–8000 Duplicates</span>
              <span className="text-base font-black text-red-700">{serialAudit.duplicatesInRange.length}</span>
              <p className="mt-1 break-words">{serialAudit.duplicatesInRange.slice(0, 30).map(([serial, count]) => `${serial} (${count})`).join(', ') || 'None'}{serialAudit.duplicatesInRange.length > 30 ? '…' : ''}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-slate-800">
              <span className="block text-slate-600">Missing: 1–{serialAudit.eligibleCount}</span>
              <span className="text-base font-black text-amber-800">{serialAudit.missingToMemberCount.length}</span>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3 text-slate-800">
              <span className="block text-slate-600">Serials Above Member Count</span>
              <span className="text-base font-black text-purple-800">{serialAudit.outOfCountRange.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-500">Missing Slots</p>
            <p className="text-xl font-black text-slate-900">{correctionPlan.missingSerials.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-500">Mapping Balanced</p>
            <p className="text-xl font-black text-emerald-700">{correctionPlan.isBalanced ? 'YES' : 'NO'}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-500">Proposed Changes</p>
            <p className="text-xl font-black text-amber-700">{migrationCount}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-500">Current Max Serial</p>
            <p className="text-xl font-black text-blue-700">{maximumSerial}</p>
          </div>
        </div>

        {migrationCount > 0 && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-red-700 mt-0.5" />
              <div>
                <h4 className="font-black text-red-950">Controlled Serial Correction</h4>
                <p className="text-xs font-bold text-red-800">
                  ആദ്യം Excel backup download ചെയ്ത് മുഴുവൻ old → new mapping പരിശോധിക്കുക. എല്ലാ duplicate/invalid records-നും missing serials മാത്രമാണ് നൽകുക.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={confirmationText}
                onChange={event => setConfirmationText(event.target.value)}
                placeholder="Type: CORRECT ALL SERIALS"
                className="h-11 rounded-xl border-2 border-red-200 bg-white px-3 font-mono font-bold text-slate-950 outline-none focus:border-red-500"
                disabled={isApplying || !canApply}
              />
              <Button
                type="button"
                onClick={applySerialCorrections}
                disabled={!canApply || !correctionPlan.isBalanced || !backupDownloaded || confirmationText !== 'CORRECT ALL SERIALS' || isApplying}
                className="h-11 rounded-xl bg-red-700 hover:bg-red-800 font-black"
              >
                {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                Apply {migrationCount} Corrections
              </Button>
            </div>
            {!canApply && <p className="text-xs font-black text-red-800">Super Admin login-ൽ മാത്രം correction അനുവദിച്ചിരിക്കുന്നു.</p>}
            {!correctionPlan.isBalanced && <p className="text-xs font-black text-red-800">Mapping count mismatch കണ്ടെത്തി. Correction block ചെയ്തിരിക്കുന്നു.</p>}
            {!backupDownloaded && <p className="text-xs font-bold text-red-700">Correction unlock ചെയ്യാൻ മുകളിലെ Export Excel ആദ്യം അമർത്തണം.</p>}
          </div>
        )}

        {migrationCount === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-5 text-center text-sm font-bold text-emerald-700">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-2" /> Serial sequence പൂർണ്ണമാണ്. Correction ആവശ്യമില്ല.
          </div>
        ) : (
          <div
            data-scroll-lock="serial-correction-report"
            className="min-h-0 max-h-[420px] overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white [scrollbar-gutter:stable] touch-pan-x touch-pan-y"
          >
            <table className="w-full min-w-[980px] text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 shadow-sm">
                <tr>
                  <th className="p-3 text-left">Member</th>
                  <th className="p-3 text-left">District</th>
                  <th className="p-3 text-left">Old ID</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Proposed ID</th>
                  <th className="p-3 text-center">Verification Forms</th>
                </tr>
              </thead>
              <tbody>
                {correctionPlan.rows.map(row => (
                  <tr key={row.member.uid || `${row.member.mobile}-${row.proposedSerial}`} className="border-t border-slate-100">
                    <td className="p-3">
                      <p className="font-black text-slate-900">{row.member.name || 'Unknown'}</p>
                      <p className="font-mono text-[11px] text-slate-500">{row.member.mobile || 'No mobile'}</p>
                    </td>
                    <td className="p-3 font-bold text-slate-700">{row.member.district || row.member.districtCode || 'N/A'}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{row.member.membershipId || '1001'}</td>
                    <td className="p-3">
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                        {row.oldSerial || 'None'} → {row.proposedSerial}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-700">{row.proposedMembershipId || row.proposedSerial}</td>
                    <td className="p-3 text-center">
                      {row.matchingClaims.length > 0 ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">Found: {row.matchingClaims.length}</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> None
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
