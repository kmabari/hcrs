import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, PaymentReceipt } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Receipt, Plus, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface AdminReceiptsModalProps {
  member: UserProfile;
  onClose: () => void;
}

export default function AdminReceiptsModal({ member, onClose }: AdminReceiptsModalProps) {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [receiptType, setReceiptType] = useState<'Membership Fee' | 'Annual Renewal' | 'Life Membership'>('Annual Renewal');
  const [receiptLabel, setReceiptLabel] = useState('Annual Renewal Receipt');
  const [amount, setAmount] = useState('100');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customReceiptNo, setCustomReceiptNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLifeMember = member.membership_type === 'LIFE_MEMBER' || member.membershipType === 'Life';

  // Format date safely
  const getFormattedDate = (dateVal: any) => {
    if (!dateVal) return '';
    if (dateVal.toDate) return dateVal.toDate().toISOString().split('T')[0];
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString().split('T')[0];
    return new Date(dateVal).toISOString().split('T')[0];
  };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users', member.uid, 'receipts'));
      const dbReceipts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentReceipt[];

      // Generate virtual registration receipt
      const regDateStr = getFormattedDate(member.registrationDate) || new Date().toISOString().split('T')[0];
      
      const registrationReceipt: PaymentReceipt = {
        id: `reg-${member.uid}`,
        receiptNo: `HCRS-REG-${String(member.serialNo || 1000).padStart(4, '0')}`,
        receiptType: isLifeMember ? 'Life Membership' : 'Membership Fee',
        receiptLabel: isLifeMember ? 'Life Membership Receipt' : 'Membership Registration Receipt',
        amount: isLifeMember ? 300 : 200,
        status: 'Paid',
        paymentDate: regDateStr,
        createdAt: member.registrationDate
      };

      let combined = [registrationReceipt];

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
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [member.uid, member.registrationDate, member.serialNo, isLifeMember]);

  // Handle preset values when type changes
  const handleTypeChange = (value: 'Membership Fee' | 'Annual Renewal' | 'Life Membership') => {
    setReceiptType(value);
    if (value === 'Membership Fee') {
      setReceiptLabel('Membership Registration Receipt');
      setAmount('200');
    } else if (value === 'Annual Renewal') {
      setReceiptLabel('Annual Renewal Receipt');
      setAmount('100');
    } else if (value === 'Life Membership') {
      setReceiptLabel('Life Membership Receipt');
      setAmount('300');
    }
  };

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading('Generating receipt...');

    try {
      const serialNoStr = member.serialNo ? String(member.serialNo).padStart(4, '0') : '1000';
      const randomId = Math.floor(1000 + Math.random() * 9000);
      
      const prefix = receiptType === 'Membership Fee' ? 'REG' : receiptType === 'Life Membership' ? 'LIF' : 'REN';
      const finalReceiptNo = customReceiptNo.trim().toUpperCase() || `HCRS-${prefix}-${serialNoStr}-${randomId}`;
      const year = paymentDate ? new Date(paymentDate).getFullYear() : new Date().getFullYear();

      await addDoc(collection(db, 'users', member.uid, 'receipts'), {
        receiptNo: finalReceiptNo,
        receiptType,
        receiptLabel: receiptLabel.trim(),
        amount: Number(amount),
        status: 'Paid',
        paymentDate,
        createdAt: serverTimestamp(),
        year
      });

      toast.success('Receipt generated successfully!', { id: loadingToast });
      setShowAddForm(false);
      
      // Reset form fields
      setCustomReceiptNo('');
      handleTypeChange('Annual Renewal');
      
      // Refresh receipts list
      fetchReceipts();
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast.error('Failed to generate receipt', { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (receiptId.startsWith('reg-')) {
      toast.error('The core registration receipt is virtual and cannot be deleted.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      return;
    }

    const loadingToast = toast.loading('Deleting receipt...');
    try {
      await deleteDoc(doc(db, 'users', member.uid, 'receipts', receiptId));
      toast.success('Receipt deleted successfully!', { id: loadingToast });
      fetchReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt', { id: loadingToast });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Manage Member Finances</span>
            <h3 className="font-black text-slate-900 text-sm truncate max-w-xs">{member.name} - Receipts</h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="rounded-full w-8 h-8 text-slate-400 hover:text-slate-950 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section: Receipts List */}
          {!showAddForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  Receipt History ({receipts.length})
                </h4>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  className="bg-brand-magenta hover:bg-brand-magenta/90 text-white font-black text-[10px] uppercase h-8 px-3 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Receipt</span>
                </Button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                  <span className="w-6 h-6 border-3 border-brand-magenta border-t-transparent rounded-full animate-spin"></span>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-2">Loading Receipts...</p>
                </div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl">
                  No receipts found for this member.
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150/80 rounded-2xl"
                    >
                      <div>
                        <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm">{receipt.receiptLabel}</h5>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[9px] text-slate-400 font-bold">
                          <span>No: {receipt.receiptNo}</span>
                          <span>•</span>
                          <span>Date: {receipt.paymentDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-black text-brand-magenta">₹{receipt.amount}</p>
                          <span className="inline-flex items-center gap-0.5 bg-green-50 border border-green-100 text-green-700 text-[8px] font-black px-1 rounded-full uppercase">
                            {receipt.status}
                          </span>
                        </div>

                        {!receipt.id.startsWith('reg-') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteReceipt(receipt.id)}
                            className="w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Add Receipt Form */}
          {showAddForm && (
            <form onSubmit={handleAddReceipt} className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-magenta" />
                  Generate New Receipt
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="font-black text-[10px] uppercase h-8 px-2 rounded-xl text-slate-500 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <Label htmlFor="receiptType" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Receipt Type</Label>
                  <Select
                    value={receiptType}
                    onValueChange={(val: any) => handleTypeChange(val)}
                  >
                    <SelectTrigger id="receiptType" className="h-10 bg-white border-slate-200 rounded-xl font-bold text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-[1000]">
                      <SelectItem value="Annual Renewal" className="font-bold text-xs">Annual Renewal (₹100)</SelectItem>
                      <SelectItem value="Membership Fee" className="font-bold text-xs">Membership Fee (₹200)</SelectItem>
                      <SelectItem value="Life Membership" className="font-bold text-xs">Life Membership (₹300)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiptLabel" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Receipt Label</Label>
                  <Input
                    id="receiptLabel"
                    value={receiptLabel}
                    onChange={(e) => setReceiptLabel(e.target.value)}
                    placeholder="e.g. Annual Renewal Receipt"
                    required
                    className="h-10 bg-white border-slate-200 rounded-xl font-bold text-xs px-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="amount" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100"
                      required
                      className="h-10 bg-white border-slate-200 rounded-xl font-bold text-xs px-3"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="paymentDate" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="h-10 bg-white border-slate-200 rounded-xl font-bold text-xs px-3"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customReceiptNo" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Custom Receipt No <span className="text-slate-400 font-bold lowercase">(optional)</span>
                  </Label>
                  <Input
                    id="customReceiptNo"
                    value={customReceiptNo}
                    onChange={(e) => setCustomReceiptNo(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="h-10 bg-white border-slate-200 rounded-xl font-bold text-xs px-3"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0054A6] hover:bg-[#004ca0] text-white font-black text-xs uppercase h-12 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Generate Receipt</span>
              </Button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 font-bold rounded-xl h-10 text-xs px-5 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
