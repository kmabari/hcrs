import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, Download, FileSearch, Loader2, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

export default function DuplicateSerialDryRunReport({ members, claims, canApply = false }: DuplicateSerialDryRunReportProps) {
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isApplying, setIsApplying] = useState(false);
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

  const report = useMemo(() => {
    const eligibleMembers = members.filter(member => member.role !== 'admin' && member.role !== 'operator');
    const maximumSerial = eligibleMembers.reduce((maximum, member) => {
      const serial = extractSerial(member);
      return serial ? Math.max(maximum, serial) : maximum;
    }, 1000);
    // The correction sequence must never start below the current member total.
    // This also protects against a stale system/totals counter (the original cause
    // of repeated 1001 values).
    const correctionBase = Math.max(maximumSerial, eligibleMembers.length);

    const serial1001Members = eligibleMembers
      .filter(member => extractSerial(member) === 1001)
      .sort((left, right) => {
        const leftDate = toDate(left.registrationDate || (left as any).createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDate = toDate(right.registrationDate || (right as any).createdAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (leftDate !== rightDate) return leftDate - rightDate;
        return String(left.uid || '').localeCompare(String(right.uid || ''));
      });

    return serial1001Members.map((member, index) => {
      const keepOriginal = index === 0;
      const proposedSerial = keepOriginal ? 1001 : correctionBase + index;
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
        keepOriginal,
        proposedSerial,
        proposedMembershipId: keepOriginal
          ? member.membershipId || ''
          : replaceMembershipSuffix(member.membershipId, proposedSerial),
        matchingClaims
      };
    });
  }, [members, claims]);

  const maximumSerial = useMemo(
    () => members.reduce((maximum, member) => Math.max(maximum, extractSerial(member) || 0), 1000),
    [members]
  );
  const migrationCount = Math.max(0, report.length - 1);

  const exportDryRun = () => {
    const rows = report.map((row, index) => ({
      'Sl No': index + 1,
      'Firestore UID': row.member.uid || '',
      'Name': row.member.name || '',
      'Mobile': row.member.mobile || '',
      'District': row.member.district || row.member.districtCode || '',
      'Old Serial': 1001,
      'Old Membership ID': row.member.membershipId || '',
      'Action': row.keepOriginal ? 'KEEP ORIGINAL 1001' : 'PROPOSE NUMBER CHANGE',
      'Proposed Serial': row.proposedSerial,
      'Proposed Membership ID': row.proposedMembershipId,
      'Verification Forms Found': row.matchingClaims.length,
      'Verification Form IDs': row.matchingClaims.map(claim => claim.id || '').filter(Boolean).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Serial 1001 Dry Run');

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
    XLSX.writeFile(workbook, `HCRS_serial_1001_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setBackupDownloaded(true);
  };

  const applySerialCorrections = async () => {
    const corrections = report.filter(row => !row.keepOriginal);
    if (!canApply || corrections.length === 0 || confirmationText !== 'CORRECT 1001' || !backupDownloaded) return;

    const confirmed = window.confirm(
      `${corrections.length} duplicate 1001 member records correction ചെയ്യുകയും ബന്ധപ്പെട്ട verification forms update ചെയ്യുകയും ചെയ്യും. തുടരണമോ?`
    );
    if (!confirmed) return;

    setIsApplying(true);
    const toastId = toast.loading('Serial correction നടത്തുന്നു...');
    try {
      type PendingWrite = { path: string[]; data: Record<string, unknown> };
      const writes: PendingWrite[] = [];
      const correctedAt = serverTimestamp();

      corrections.forEach(row => {
        const oldMembershipId = String(row.member.membershipId || '');
        const memberUpdate: Record<string, unknown> = {
          serialNo: row.proposedSerial,
          previousSerialNo: 1001,
          serialCorrectedAt: correctedAt,
          serialCorrectionReason: 'DUPLICATE_1001'
        };
        if (row.proposedMembershipId) memberUpdate.membershipId = row.proposedMembershipId;
        writes.push({ path: ['users', row.member.uid], data: memberUpdate });

        row.matchingClaims.forEach(claim => {
          if (!claim.id) return;
          const claimUpdate: Record<string, unknown> = {
            serialNo: row.proposedSerial,
            previousSerialNo: 1001,
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

      const finalSerial = Math.max(...corrections.map(row => row.proposedSerial));
      const counterBatch = writeBatch(db);
      counterBatch.set(doc(db, 'system', 'totals'), {
        count: finalSerial,
        serialCorrectionUpdatedAt: serverTimestamp()
      }, { merge: true });
      await counterBatch.commit();

      toast.success(`${corrections.length} duplicate serial records corrected. അവസാന serial: ${finalSerial}`, { id: toastId });
      setConfirmationText('');
    } catch (error: any) {
      console.error('Duplicate serial correction failed:', error);
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
              <h3 className="text-base font-black text-slate-900">Serial 1001 — Dry-run Report</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              ഇത് preview മാത്രം ആണ്. Member, Verification Form അല്ലെങ്കിൽ Firestore data ഒന്നും മാറ്റുന്നില്ല.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={exportDryRun}
            disabled={report.length === 0}
            className="rounded-xl font-bold"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
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
            <p className="text-[10px] uppercase font-black text-slate-400">1001 Records</p>
            <p className="text-xl font-black text-slate-900">{report.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-400">Keep Original</p>
            <p className="text-xl font-black text-emerald-700">{report.length ? 1 : 0}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-400">Proposed Changes</p>
            <p className="text-xl font-black text-amber-700">{migrationCount}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-white p-3">
            <p className="text-[10px] uppercase font-black text-slate-400">Current Max Serial</p>
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
                  ആദ്യം Excel backup download ചെയ്യുക. തുടർന്ന് confirmation phrase നൽകിയാൽ duplicate 1001 records മാത്രം update ചെയ്യും.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={confirmationText}
                onChange={event => setConfirmationText(event.target.value)}
                placeholder="Type: CORRECT 1001"
                className="h-11 rounded-xl border-2 border-red-200 bg-white px-3 font-mono font-bold text-slate-950 outline-none focus:border-red-500"
                disabled={isApplying || !canApply}
              />
              <Button
                type="button"
                onClick={applySerialCorrections}
                disabled={!canApply || !backupDownloaded || confirmationText !== 'CORRECT 1001' || isApplying}
                className="h-11 rounded-xl bg-red-700 hover:bg-red-800 font-black"
              >
                {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                Apply {migrationCount} Corrections
              </Button>
            </div>
            {!canApply && <p className="text-xs font-black text-red-800">Super Admin login-ൽ മാത്രം correction അനുവദിച്ചിരിക്കുന്നു.</p>}
            {!backupDownloaded && <p className="text-xs font-bold text-red-700">Correction unlock ചെയ്യാൻ മുകളിലെ Export Excel ആദ്യം അമർത്തണം.</p>}
          </div>
        )}

        {report.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-5 text-center text-sm font-bold text-emerald-700">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-2" /> Serial 1001 records കണ്ടെത്തിയില്ല.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[980px] text-xs">
              <thead className="bg-slate-100 text-slate-600">
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
                {report.map(row => (
                  <tr key={row.member.uid || `${row.member.mobile}-${row.proposedSerial}`} className="border-t border-slate-100">
                    <td className="p-3">
                      <p className="font-black text-slate-900">{row.member.name || 'Unknown'}</p>
                      <p className="font-mono text-[11px] text-slate-500">{row.member.mobile || 'No mobile'}</p>
                    </td>
                    <td className="p-3 font-bold text-slate-700">{row.member.district || row.member.districtCode || 'N/A'}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{row.member.membershipId || '1001'}</td>
                    <td className="p-3">
                      {row.keepOriginal ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Keep 1001</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">1001 → {row.proposedSerial}</Badge>
                      )}
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
