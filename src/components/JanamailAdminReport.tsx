import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Search } from 'lucide-react';

type Row = { id:string; fullName?:string; mobileNumber?:string; district?:string; placePost?:string; selectedSubject?:string; messageBody?:string; emailId?:string; submissionStatus?:string; emailLaunchStatus?:string; createdAt?:any; submittedAt?:string; date?:string; time?:string };

const todayKey=()=>{const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const localKey=(r:Row)=>{const raw=r.createdAt?.toDate?.() || (r.submittedAt?new Date(r.submittedAt):null); if(raw && !Number.isNaN(raw.getTime())) return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`; const m=String(r.date||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';};
const timeText=(r:Row)=>r.time || (r.createdAt?.toDate?.()?r.createdAt.toDate().toLocaleTimeString('en-IN'):(r.submittedAt?new Date(r.submittedAt).toLocaleTimeString('en-IN'):'-'));

export default function JanamailAdminReport(){
 const [date,setDate]=useState(todayKey()); const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [scanned,setScanned]=useState(false);
 const run=async()=>{setLoading(true);setError('');try{const snap=await getDocs(query(collection(db,'claims'),where('recordType','==','janamail_submission')));const all=snap.docs.map(d=>({id:d.id,...d.data()} as Row));setRows(all.filter(r=>localKey(r)===date).sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||''))));setScanned(true);}catch(e:any){setError(e?.message||'Janamail report failed');}finally{setLoading(false);}};
 return <Card className="border-2 border-indigo-200 bg-white"><CardContent className="p-4 space-y-3">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-black text-slate-950 flex items-center gap-2"><Mail className="w-5 h-5"/>Janamail — Daily Sending Report</h3><p className="text-xs font-bold text-slate-600">Read-only report of recorded Janamail participation.</p></div><div className="flex items-end gap-2"><label className="text-xs font-black text-slate-700">Date<Input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 bg-white text-slate-950 [color-scheme:light]"/></label><Button onClick={run} disabled={loading||!date} className="bg-indigo-700 text-white"><Search className="w-4 h-4 mr-2"/>{loading?'Loading…':'View Emails'}</Button></div></div>
  {scanned&&!error&&<div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3"><span className="text-xs font-black text-indigo-900">TOTAL EMAILS RECORDED</span><div className="text-3xl font-black text-indigo-950">{rows.length}</div></div>}
  {error&&<div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-900">{error}</div>}
  {scanned&&!loading&&!error&&rows.length===0&&<p className="text-sm font-bold text-slate-600">No Janamail records found for this date.</p>}
  {rows.length>0&&<div className="overflow-x-auto"><table className="w-full min-w-[1450px] text-xs text-left text-slate-950"><thead className="bg-slate-200"><tr>{['#','Time','Name','Mobile','District','Place / Post','Subject','Message Body','Email ID','Submission','Mail Launch','Record ID'].map(x=><th key={x} className="p-2 font-black">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id} className="border-t align-top"><td className="p-2">{i+1}</td><td className="p-2 whitespace-nowrap">{timeText(r)}</td><td className="p-2 font-black">{r.fullName||'-'}</td><td className="p-2 font-bold">{r.mobileNumber||'-'}</td><td className="p-2">{r.district||'-'}</td><td className="p-2">{r.placePost||'-'}</td><td className="p-2 max-w-72 whitespace-normal">{r.selectedSubject||'-'}</td><td className="p-2 max-w-96 whitespace-pre-wrap">{r.messageBody||'Not stored in older record'}</td><td className="p-2 break-all">{r.emailId||'-'}</td><td className="p-2"><Badge className="bg-emerald-100 text-emerald-950">{r.submissionStatus||'-'}</Badge></td><td className="p-2">{r.emailLaunchStatus||'-'}</td><td className="p-2 font-mono break-all">{r.id}</td></tr>)}</tbody></table></div>}
 </CardContent></Card>;
}
