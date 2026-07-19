import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, PaymentReceipt } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Receipt, Printer, Download, Eye, X, ShieldCheck, FileDown, Image as ImageIcon } from 'lucide-react';
import { LOGO_URL } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface PaymentReceiptsProps {
  user: UserProfile;
}

export default function PaymentReceipts({ user }: PaymentReceiptsProps) {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  const isLifeMember = user.membership_type === 'LIFE_MEMBER' || user.membershipType === 'Life';

  // Format date safely
  const getFormattedDate = (dateVal: any) => {
    if (!dateVal) return '';
    if (dateVal.toDate) return dateVal.toDate().toISOString().split('T')[0];
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    return new Date(dateVal).toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchReceipts = async () => {
      if (!user?.uid) {
        console.warn('PaymentReceipts: user.uid is missing or uninitialized. Skipping fetch.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        console.log(`PaymentReceipts: Fetching receipts for user UID: ${user.uid}`);
        const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'receipts'));
        const dbReceipts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PaymentReceipt[];
        console.log(`PaymentReceipts: Successfully fetched ${dbReceipts.length} receipts from database.`);

        // Generate virtual registration receipt
        const regDateStr = getFormattedDate(user.registrationDate) || new Date().toISOString().split('T')[0];
        
        const registrationReceipt: PaymentReceipt = {
          id: `reg-${user.uid}`,
          receiptNo: `HCRS-REG-${String(user.serialNo || 1000).padStart(4, '0')}`,
          receiptType: isLifeMember ? 'Life Membership' : 'Membership Fee',
          receiptLabel: isLifeMember ? 'Life Membership Receipt' : 'Membership Registration Receipt',
          amount: isLifeMember ? 300 : 200,
          status: 'Paid',
          paymentDate: regDateStr,
          createdAt: user.registrationDate
        };

        let combined = [registrationReceipt];

        // Life members never renew - only show one receipt
        if (!isLifeMember) {
          combined = [...combined, ...dbReceipts];
        }

        // Sort chronologically, newest first
        combined.sort((a, b) => {
          const dateA = new Date(a.paymentDate).getTime();
          const dateB = new Date(b.paymentDate).getTime();
          return dateB - dateA;
        });

        setReceipts(combined);
      } catch (error) {
        console.error('Error fetching receipts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [user.uid, user.registrationDate, user.serialNo, isLifeMember]);

  const convertNumberToWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + 'Hundred ' + (num % 100 !== 0 ? 'and ' + convertNumberToWords(num % 100) : '');
    return num.toString();
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-receipt-card');
    if (!printContent) return;
    
    const originalContent = document.body.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>HCRS Receipt - ${selectedReceipt?.receiptNo}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body {
                  padding: 20px;
                  background: white;
                }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="max-w-xl mx-auto p-4">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const downloadReceiptImage = async () => {
    const cardElement = document.getElementById('printable-receipt-card');
    if (!cardElement) {
      toast.error('Receipt element not found');
      return;
    }
    const loadingToast = toast.loading('Generating receipt image download...');
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await html2canvas(cardElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FFFFFF'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Receipt_${selectedReceipt?.receiptNo || 'HCRS'}.png`;
      link.href = imgData;
      link.click();
      
      toast.success('Receipt image downloaded successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating receipt image:', error);
      toast.error('Could not generate image. Please try Print/Save as PDF.', { id: loadingToast });
    }
  };

  const downloadReceiptPDF = async () => {
    const cardElement = document.getElementById('printable-receipt-card');
    if (!cardElement) {
      toast.error('Receipt element not found');
      return;
    }
    const loadingToast = toast.loading('Generating PDF document...');
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await html2canvas(cardElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FFFFFF'
      });
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate width and height in mm
      const pdfWidth = 148; // custom portrait size
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Receipt_${selectedReceipt?.receiptNo || 'HCRS'}.pdf`);
      
      toast.success('Receipt PDF downloaded successfully!', { id: loadingToast });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Could not generate PDF. Please try Print/Save as PDF instead.', { id: loadingToast });
    }
  };

  return (
    <Card className="w-full bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-3xl p-6 mt-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-brand-magenta/10 p-2.5 rounded-2xl text-brand-magenta">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 tracking-tight text-md">Payment Receipts (പേയ്‌മെന്റ് രസീതുകൾ)</h3>
          <p className="text-xs text-slate-400 font-bold">Your official financial records with HCRS.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <span className="w-8 h-8 border-4 border-brand-magenta border-t-transparent rounded-full animate-spin"></span>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3">Loading Receipts...</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 font-bold text-xs">
          No receipts found.
        </div>
      ) : (
        <div className="space-y-3.5">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-brand-magenta/25 transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-sm text-slate-500 group-hover:text-brand-magenta transition-colors">
                  <Receipt className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-950 text-xs sm:text-sm">{receipt.receiptLabel}</h4>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[10px] text-slate-400 font-bold">
                    <span>No: {receipt.receiptNo}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Date: {receipt.paymentDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm sm:text-md font-black text-brand-magenta">₹{receipt.amount}</p>
                  <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200/50 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    {receipt.status}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedReceipt(receipt)}
                  className="h-9 px-3 border-slate-200 font-black rounded-xl text-[10px] uppercase hover:bg-brand-magenta/5 hover:text-brand-magenta transition-all cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-black uppercase text-brand-magenta tracking-widest">Official Document</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-full w-8 h-8 text-slate-400 hover:text-slate-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Scrollable Container */}
            <div className="overflow-y-auto p-6 flex-1">
              <div
                id="printable-receipt-card"
                className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-6 font-sans relative overflow-hidden"
                style={{ contentVisibility: 'auto' }}
              >
                {/* Official Stamp Watermark background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none pointer-events-none">
                  <img src={LOGO_URL} alt="HCRS Logo Watermark" className="w-72 h-72 object-contain" />
                </div>

                {/* Receipt Header */}
                <div className="flex flex-col items-center text-center border-b border-slate-200 pb-4 mb-5">
                  <img src={LOGO_URL} alt="HCRS Logo" className="w-16 h-16 object-contain mb-2" />
                  <h2 className="text-md font-black text-slate-900 tracking-tight leading-none uppercase">
                    Highrich Community Revival Society
                  </h2>
                  <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
                    Reg. No: KL/MLP/2025 | www.hcrs.in
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold mt-1.5 max-w-xs leading-normal">
                    Central Accounts Division, Near Society Junction, Malappuram, Kerala - 676505
                  </p>
                </div>

                {/* Receipt Sub-header */}
                <div className="bg-slate-950 text-white text-center rounded-xl py-1.5 mb-5 font-black text-[10px] tracking-widest uppercase shadow-sm">
                  Official Payment Receipt (പേയ്‌മെന്റ് രസീത്)
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-[11px] mb-5 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Receipt Number</span>
                    <span className="font-extrabold text-slate-900 font-mono text-xs">{selectedReceipt.receiptNo}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Date of Payment</span>
                    <span className="font-extrabold text-slate-900 font-mono">{selectedReceipt.paymentDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Received From (അംഗത്തിന്റെ പേര്)</span>
                    <span className="font-black text-slate-900 uppercase text-xs">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Membership ID</span>
                    <span className="font-extrabold text-brand-blue font-mono text-xs">{user.membershipId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Mobile Number</span>
                    <span className="font-extrabold text-slate-900 font-mono">{user.mobile}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">District / Assembly</span>
                    <span className="font-extrabold text-slate-900 truncate">
                      {user.district} / {user.assemblyConstituency}
                    </span>
                  </div>
                </div>

                {/* Payment Breakdown / Items Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-500">
                        <th className="py-2 px-3">Purpose of Payment</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold text-slate-700">
                      <tr>
                        <td className="py-3 px-3">
                          <p className="font-black text-slate-900">{selectedReceipt.receiptLabel}</p>
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                            {selectedReceipt.receiptType === 'Annual Renewal' 
                              ? `HCRS Annual Membership Subscription & Support Sinking Fund Renewal`
                              : `HCRS Lifetime/Standard Membership Registration Security Fee`}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-950 font-black">₹{selectedReceipt.amount}.00</td>
                      </tr>
                      <tr className="border-t border-slate-100 bg-slate-50/40 text-slate-900 text-[11px]">
                        <td className="py-2.5 px-3 font-extrabold text-slate-500 uppercase text-[9px] text-right">Total Paid:</td>
                        <td className="py-2.5 px-3 text-right font-black text-brand-magenta text-xs">₹{selectedReceipt.amount}.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Amount in words */}
                <div className="mb-6 bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-600 font-semibold leading-relaxed">
                  <span className="font-black text-slate-400 uppercase text-[8px] block mb-0.5">Amount in Words</span>
                  Rupees <span className="font-extrabold text-slate-900">{convertNumberToWords(selectedReceipt.amount)}Only</span>
                </div>

                {/* Footer seal and verify signature block */}
                <div className="flex justify-between items-end pt-4 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Secured & Verified</span>
                  </div>
                  <div className="text-right">
                    {/* Fake stamp signature design */}
                    <div className="relative inline-block mb-1">
                      <span className="font-black text-[9px] uppercase tracking-wider text-slate-400 block">Accounts Division</span>
                      <div className="absolute -top-6 right-2 w-14 h-14 border-2 border-green-500/35 rounded-full flex items-center justify-center -rotate-12 pointer-events-none select-none">
                        <span className="text-[7px] text-green-500 font-black tracking-tighter uppercase leading-none text-center">HCRS<br/>PAID</span>
                      </div>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 px-6 py-5 border-t border-slate-100 bg-slate-50">
              <Button
                onClick={handlePrint}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </Button>
              <Button
                onClick={downloadReceiptPDF}
                className="flex-1 bg-[#0054A6] hover:bg-[#004ca0] text-white font-black text-[10px] uppercase tracking-wider h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>
              <Button
                variant="outline"
                onClick={downloadReceiptImage}
                className="flex-1 border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Download Image</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
