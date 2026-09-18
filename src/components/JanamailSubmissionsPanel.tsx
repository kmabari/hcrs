import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Download, Mail, RefreshCw, Search } from 'lucide-react';
import { db } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type JanamailSubmission = {
  id: string;
  fullName?: string;
  mobileNumber?: string;
  district?: string;
  placePost?: string;
  category?: string;
  selectedSubject?: string;
  template?: string;
  campaignId?: string;
  emailId?: string;
  status?: string;
  submissionStatus?: string;
  emailLaunchStatus?: string;
  date?: string;
  time?: string;
  submittedAt?: string;
  createdAt?: any;
  participated?: boolean;
};

const dateValue = (item: JanamailSubmission): number => {
  const value = item.createdAt || item.submittedAt;
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value.seconds) return Number(value.seconds) * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function JanamailSubmissionsPanel() {
  const [items, setItems] = useState<JanamailSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const submissionsRef = collection(db, 'claims');
    const unsubscribe = onSnapshot(submissionsRef, snapshot => {
      const rows = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as JanamailSubmission & { recordType?: string }))
        .filter(row => row.recordType === 'janamail_submission' || (
          row.id.startsWith('janamail_lock_') &&
          (row.participated === true || row.status === 'Completed')
        ));
      setItems(rows.sort((a, b) => dateValue(b) - dateValue(a)));
      setLoading(false);
      setError('');
    }, err => {
      console.error('Janamail submissions listener failed:', err);
      setError(err.message || 'Janamail submissions വായിക്കാൻ കഴിഞ്ഞില്ല.');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(item => [
      item.fullName, item.mobileNumber, item.district, item.placePost,
      item.category, item.emailId, item.selectedSubject, item.campaignId
    ].some(value => String(value || '').toLowerCase().includes(term)));
  }, [items, search]);

  const exportExcel = () => {
    const rows = filtered.map((item, index) => ({
      'Sl No': index + 1,
      'Full Name': item.fullName || '',
      'Mobile Number': item.mobileNumber || '',
      'Email ID': item.emailId || '',
      'District': item.district || '',
      'Place / Post': item.placePost || '',
      'Category': item.category || '',
      'Campaign ID': item.campaignId || '',
      'Selected Subject': item.selectedSubject || '',
      'Template': item.template || '',
      'Mail Launch Status': item.emailLaunchStatus || '',
      'Submission Status': item.submissionStatus || item.status || '',
      'Date': item.date || '',
      'Time': item.time || '',
      'Submitted At': item.submittedAt || ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [8, 24, 16, 28, 16, 20, 18, 24, 55, 24, 24, 20, 14, 14, 24].map(wch => ({ wch }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Janamail Submissions');
    XLSX.writeFile(book, `HCRS_Janamail_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card className="rounded-[28px] border-slate-200 shadow-xs overflow-hidden">
      <CardHeader className="border-b bg-slate-50/70 gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <Mail className="w-4 h-4 text-brand-magenta" /> Janamail Submissions ({items.length})
          </CardTitle>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Firestore: HCRS / claims (Janamail records)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, mobile, district..." className="pl-9 h-10 rounded-xl w-full sm:w-72" />
          </div>
          <Button onClick={exportExcel} disabled={filtered.length === 0} className="h-10 rounded-xl font-black text-xs">
            <Download className="w-4 h-4 mr-1.5" /> Excel Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-14 flex items-center justify-center gap-2 text-xs font-bold text-slate-500"><RefreshCw className="w-4 h-4 animate-spin" /> Loading submissions...</div>
        ) : error ? (
          <div className="p-6 text-xs font-bold text-red-700 bg-red-50">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-xs font-bold text-slate-400">Janamail submission records ലഭ്യമല്ല.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <tr>{['#', 'Participant', 'Mobile / Email', 'District / Place', 'Category', 'Subject / Template', 'Date & Time', 'Status'].map(h => <th key={h} className="px-4 py-3 font-black border-b">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/60 text-xs">
                    <td className="px-4 py-3 font-mono text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900">{item.fullName || 'N/A'}</td>
                    <td className="px-4 py-3"><div className="font-mono font-bold">{item.mobileNumber || 'N/A'}</div><div className="text-[10px] text-slate-500">{item.emailId || ''}</div></td>
                    <td className="px-4 py-3"><div className="font-bold">{item.district || 'N/A'}</div><div className="text-[10px] text-slate-500">{item.placePost || ''}</div></td>
                    <td className="px-4 py-3 font-semibold">{item.category || 'N/A'}</td>
                    <td className="px-4 py-3 max-w-xs"><div className="font-semibold truncate" title={item.selectedSubject}>{item.selectedSubject || 'N/A'}</div><div className="text-[10px] text-slate-500">{item.template || ''}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap"><div className="font-bold">{item.date || ''}</div><div className="text-[10px] text-slate-500">{item.time || ''}</div></td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black">{item.emailLaunchStatus || item.status || 'Recorded'}</span></td>
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
