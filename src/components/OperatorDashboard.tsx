import { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Edit, 
  Pencil,
  Trash2, 
  ShieldCheck, 
  Download, 
  Share2, 
  CheckCircle2, 
  XCircle,
  Clock,
  MoreVertical,
  LogOut,
  MapPin,
  RefreshCw,
  UserPlus,
  ArrowRight,
  Camera,
  MessageCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserProfile } from '../types';
import Logo from '../Logo';
import { DISTRICTS, BLOOD_GROUPS, CONSTITUENCIES, SHARED_URL } from '../constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getWAMessage, sendWAMessage } from '@/src/lib/whatsapp';
import { subscribeToOrgSettings, OrgSettings, defaultSettings } from '@/src/lib/cms';
import FastMemberEntry from './FastMemberEntry';

interface OperatorDashboardProps {
  user: UserProfile;
  members: UserProfile[];
  onAddMember: (values: any) => void;
  onUpdate: (uid: string, data: Partial<UserProfile>) => void;
  onDelete?: (uid: string) => void;
  districtQuotas?: Record<string, number>;
  districtQuotasUsed?: Record<string, number>;
  handleLogout: () => void;
  isDirectManual?: boolean;
  isSecondAdmin?: boolean;
}

export default function OperatorDashboard({ 
  user,
  members, 
  onAddMember, 
  onUpdate,
  onDelete,
  districtQuotas = {},
  districtQuotasUsed = {},
  handleLogout,
  isDirectManual = false,
  isSecondAdmin = false
}: OperatorDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orgSettings, setOrgSettings] = useState<OrgSettings>(defaultSettings);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((data) => {
      setOrgSettings(data);
    });
    return () => unsub();
  }, []);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string, email: string, pin: string, mobile: string, name: string } | null>(null);
  const [formData, setFormData] = useState(() => {
    // Try to load draft from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hcrs_operator_form_draft') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.name !== undefined) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse operator form draft", e);
      }
    }

    return {
      name: '',
      mobile: '',
      state: 'Kerala',
      district: user?.district || DISTRICTS[0].code,
      assemblyConstituency: CONSTITUENCIES[user?.district || DISTRICTS[0].code]?.[0] || '',
      address: '',
      details: '',
      entryBy: user?.name || 'Operator', // Added as requested
      transactionId: 'CASH/OFFLINE',
      email: '',
      pin: '123456',
    };
  });

  // CRITICAL: Sync with current logged-in user identity. 
  // This prevents "Pisharady" or other stale names from appearing when a different operator logs in.
  useEffect(() => {
    if (user.email) {
      setFormData(prev => ({ 
        ...prev, 
        certAdminEmail: user.email || '',
        // If entryBy is empty or matches previous session default, update it to current user
        entryBy: (prev.entryBy === '' || prev.entryBy === 'Admin') ? (user.name || 'Admin') : prev.entryBy
      }));
    }
  }, [user.uid]); // Trigger on user session change

  useEffect(() => {
    if (typeof window !== 'undefined') {
       localStorage.setItem('hcrs_operator_form_draft', JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    // Force district from user if they have one assigned
    if (user.district && formData.district !== user.district) {
      setFormData(prev => ({ 
        ...prev, 
        district: user.district!,
        assemblyConstituency: CONSTITUENCIES[user.district!]?.[0] || prev.assemblyConstituency
      }));
    }
  }, [user.district]);

  const stats = useMemo(() => ({
    myEntries: members.length,
    active: members.filter(m => m.status === 'active').length
  }), [members]);

  const activeDistrict = user.district || formData.district;
  const districtName = DISTRICTS.find(d => d.code === activeDistrict)?.name || activeDistrict;

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.status !== 'deleted' && (
        (m?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m?.mobile || '').includes(searchTerm) ||
        (m?.membershipId || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [members, searchTerm]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDirectManual, setShowDirectManual] = useState(isDirectManual);

  const handleRegisterSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      toast.error('നിർബന്ധമായ കോളങ്ങൾ പൂരിപ്പിക്കുക (Please fill Name and Mobile)');
      return;
    }

    const cleanMobile = formData.mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('മൊബൈൽ നമ്പർ കൃത്യം 10 അക്കങ്ങൾ ആയിരിക്കണം. ദയവായി പരിശോധിക്കുക. (Mobile number must be exactly 10 digits. Please check.)');
      return;
    }

    setIsSubmitting(true);
    try {
      const email = `${cleanMobile}@hcrs.society`;
      
      const resultUid = await (onAddMember({
        ...formData,
        mobile: cleanMobile,
        email,
        registeredByName: formData.entryBy,
        certAdminName: formData.entryBy,
        isManual: true,
        status: 'active',
        isApproved: true,
        pin: '123456' // Force common password
      }) as unknown as Promise<string | null>);
      
      if (resultUid) {
        // Automatically trigger WhatsApp for physical registration
        if (orgSettings?.registrationMode !== 'bulk') {
          sendWAMessage({
            name: formData.name,
            mobile: cleanMobile,
            uid: resultUid,
            pin: '123456'
          });
        }

        setSuccessData({
          id: resultUid,
          email,
          pin: '123456',
          mobile: cleanMobile,
          name: formData.name
        });
        setShowSuccessModal(true);
        setIsAddingMember(false);
        // CRITICAL: Fresh form for every entry. No more sticky data. (fixes user request 2)
        setFormData({
          name: '',
          mobile: '',
          state: 'Kerala',
          email: '',
          address: '',
          pincode: '',
          postOffice: '',
          district: user.district || '',
          assemblyConstituency: user.district ? (CONSTITUENCIES[user.district]?.[0] || '') : '',
          bloodGroup: BLOOD_GROUPS[0],
          details: '',
          entryBy: user.name || 'Operator',
          transactionId: 'CASH/OFFLINE',
          pin: '123456',
        });
        localStorage.removeItem('hcrs_operator_form_draft');
      }
    } catch (err) {
      console.error("Manual entry error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const cleanMobile = (editingMember.mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('മൊബൈൽ നമ്പർ കൃത്യം 10 അക്കങ്ങൾ ആയിരിക്കണം. ദയവായി പരിശോധിക്കുക. (Mobile number must be exactly 10 digits.)');
      return;
    }
    const updatedMember = { ...editingMember, mobile: cleanMobile };
    onUpdate(updatedMember.uid, updatedMember);
    setEditingMember(null);
  };

  const baseUrl = (typeof window !== 'undefined' && !window.location.origin.includes('ais-dev') && !window.location.origin.includes('google.com'))
    ? window.location.origin 
    : SHARED_URL;

   const handleShareCard = (member: UserProfile) => {
    sendWAMessage({
      name: member.name,
      mobile: member.mobile,
      uid: member.uid,
      pin: member.pin,
      membershipId: member.membershipId
    });
  };

  if (isSecondAdmin) {
    const allowed = districtQuotas[activeDistrict] || 0;
    const created = districtQuotasUsed[activeDistrict] || 0;
    const remaining = Math.max(0, allowed - created);

    return (
      <div className="min-h-screen bg-[#FAF9FC] p-4 md:p-8 pb-32">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8 font-sans">
            <div className="flex items-center gap-5">
              <div className="bg-white p-2.5 rounded-2xl shadow-md border border-slate-100">
                <Logo size="sm" className="h-10 w-auto" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-brand-magenta uppercase leading-none tracking-tight">Fast Member Panel</h1>
                <p className="text-brand-blue mt-2 text-[10.5px] font-black tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {districtName} District Second Admin
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs font-bold text-slate-400 font-mono hidden md:inline-block leading-none">{user.email}</span>
              <Button onClick={handleLogout} variant="destructive" className="h-12 font-black rounded-xl px-6 transition-all hover:scale-102 active:scale-95 text-xs uppercase tracking-wider">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          {/* District Counter Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <Card className="border border-slate-200 bg-white rounded-3xl shadow-sm overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allowed Limit</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{allowed || '500'}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Allotted seats</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <ShieldCheck className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-brand-blue/20 bg-white rounded-3xl shadow-sm overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Created Members</p>
                  <h3 className="text-3xl font-black text-brand-blue mt-2">{created}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Fast entered profiles</p>
                </div>
                <div className="bg-brand-blue/5 p-3.5 rounded-2xl border border-brand-blue/10">
                  <Users className="w-8 h-8 text-brand-blue" />
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border bg-white rounded-3xl shadow-sm overflow-hidden",
              remaining <= 50 ? "border-amber-500/20" : remaining === 0 ? "border-rose-500/20" : "border-emerald-500/20"
            )}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Remaining Quota</p>
                  <h3 className={cn("text-3xl font-black mt-2", remaining === 0 ? "text-rose-600" : remaining <= 50 ? "text-amber-600" : "text-emerald-600")}>
                    {remaining}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-450 mt-1 uppercase tracking-wider">Remaining entries permitted</p>
                </div>
                <div className={cn("p-3.5 rounded-2xl border", remaining === 0 ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
                  <RefreshCw className="w-8 h-8" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
            {/* Left/Top: Fast Member Entry Form */}
            <div className="lg:col-span-5 space-y-4">
              <FastMemberEntry 
                adminUser={user}
                districtQuotas={districtQuotas}
                districtQuotasUsed={districtQuotasUsed}
                onMemberAdded={() => {
                  toast.success('District quota counter synchronized.');
                }}
              />
            </div>

            {/* Right/Bottom: List of Registered Members in their District */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row gap-4 justify-between items-center animate-in fade-in duration-300">
                  <div>
                    <h3 className="font-sans font-black text-slate-800 uppercase text-sm tracking-tight">District Members List</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Showing registered entries in {districtName}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    District Database Access
                  </div>
                </div>

                <div className="p-6 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <Input 
                      placeholder="Search members by name, mobile, id..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl font-bold focus:border-brand-magenta/20 text-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-slate-200">
                        <TableHead className="font-sans font-black text-slate-500 text-[10px] uppercase tracking-widest h-12">Member Details</TableHead>
                        <TableHead className="font-sans font-black text-slate-500 text-[10px] uppercase tracking-widest h-12">Membership ID</TableHead>
                        <TableHead className="font-sans font-black text-slate-500 text-[10px] uppercase tracking-widest h-12">Mandalam</TableHead>
                        <TableHead className="font-sans font-black text-slate-500 text-[10px] uppercase tracking-widest h-12 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <p className="text-sm font-bold text-slate-400 uppercase">No members found in {districtName}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow key={member.uid} className="hover:bg-slate-50/40 transition-colors border-slate-100">
                            <TableCell className="py-4 font-sans">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-slate-800 leading-tight text-sm">{member.name}</p>
                                  {member.status === 'pending' && (
                                    <span className="text-[9px] font-black bg-orange-50 text-orange-600 border border-orange-100 rounded px-1.5 py-0.5 uppercase tracking-wide">Pending</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-450 font-black font-mono mt-1 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {member.mobile}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono font-black text-brand-blue tracking-tight">
                                {member.membershipId}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-md font-sans">
                                {member.assemblyConstituency || 'General'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 font-sans">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setEditingMember(member)}
                                  className="h-9 w-9 p-0 rounded-lg text-slate-600 hover:bg-slate-100"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {onDelete && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to deactivate ${member.name}?`)) {
                                        onDelete(member.uid);
                                      }
                                    }}
                                    className="h-9 w-9 p-0 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={member.status === 'pending'}
                                  onClick={() => handleShareCard(member)}
                                  className="h-9 px-2 text-brand-blue hover:bg-brand-blue/5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 disabled:opacity-40"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  Share
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="sm:max-w-lg rounded-[32px] p-0 overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="bg-brand-blue p-8 text-white relative font-sans">
              <DialogHeader>
                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                  <Pencil className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase text-white">Edit Member</DialogTitle>
                <DialogDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest mt-1">
                  Update details for {editingMember?.name}.
                </DialogDescription>
              </DialogHeader>
            </div>
            {editingMember && (
              <form onSubmit={handleEditSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar font-sans text-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</Label>
                    <Input 
                      id="edit-name" 
                      value={editingMember.name || ""} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm"
                      onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mobile" className="text-[10px] font-black text-slate-400 uppercase ml-1">Mobile Number</Label>
                    <Input 
                      id="edit-mobile" 
                      value={editingMember.mobile || ""} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold font-mono text-sm"
                      onChange={e => setEditingMember({...editingMember, mobile: e.target.value.replace(/\D/g, '')})}
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-[10px] font-black text-slate-400 uppercase ml-1">Email / Username</Label>
                  <Input 
                    id="edit-email" 
                    value={editingMember.email || ""} 
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold font-semibold text-sm"
                    onChange={e => setEditingMember({...editingMember, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">District</Label>
                    <Select 
                      value={editingMember.district || ""} 
                      onValueChange={val => setEditingMember({...editingMember, district: val, assemblyConstituency: CONSTITUENCIES[val]?.[0] || ''})}
                      disabled // Lock district for district admins!
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm"><SelectValue placeholder="District" /></SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl font-sans font-bold text-sm">
                        {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code} className="font-bold text-sm">{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Constituency</Label>
                    <Select 
                      value={editingMember.assemblyConstituency || ""} 
                      onValueChange={val => setEditingMember({...editingMember, assemblyConstituency: val})}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl font-sans font-bold text-sm">
                        {(CONSTITUENCIES[editingMember.district] || []).map(ac => (
                          <SelectItem key={ac} value={ac} className="font-bold text-sm">{ac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address" className="text-[10px] font-black text-slate-400 uppercase ml-1">Address</Label>
                  <Input 
                    id="edit-address" 
                    value={editingMember.address || ''} 
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold text-sm"
                    onChange={e => setEditingMember({...editingMember, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-post" className="text-[10px] font-black text-slate-400 uppercase ml-1">Post Office</Label>
                    <Input 
                      id="edit-post" 
                      value={editingMember.postOffice || ''} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold text-sm"
                      onChange={e => setEditingMember({...editingMember, postOffice: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pincode" className="text-[10px] font-black text-slate-400 uppercase ml-1">PIN Code</Label>
                    <Input 
                      id="edit-pincode" 
                      value={editingMember.pincode || ''} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold font-mono text-sm"
                      onChange={e => setEditingMember({...editingMember, pincode: e.target.value})}
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Blood Group</Label>
                    <Select 
                      value={editingMember.bloodGroup || ""} 
                      onValueChange={val => setEditingMember({...editingMember, bloodGroup: val})}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl font-sans text-sm">
                        {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg} className="font-bold text-sm">{bg}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pin" className="text-[10px] font-black text-slate-400 uppercase ml-1">Password</Label>
                    <Input 
                      id="edit-pin" 
                      value={editingMember.pin || '123456'} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold font-mono text-sm"
                      onChange={e => setEditingMember({...editingMember, pin: e.target.value})}
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => setEditingMember(null)} className="flex-1 h-11 rounded-xl font-bold uppercase text-xs">Cancel</Button>
                  <Button type="submit" className="flex-1 h-11 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-black uppercase text-xs shadow-md">Save Changes</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FC] p-4 md:p-8 pb-32">
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[32px]">
          <div className="bg-brand-blue p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Registration Success!</h2>
            <p className="text-white/70 text-xs font-bold uppercase mt-1">അംഗത്തെ വിജയകരമായി ചേർത്തു</p>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Member Details</p>
                   <div className="space-y-1">
                      <div className="flex justify-between text-sm uppercase">
                         <span className="font-bold text-slate-500">Name:</span>
                         <span className="font-black text-brand-dark-purple">{successData?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm uppercase">
                         <span className="font-bold text-slate-500">User ID:</span>
                         <span className="font-black text-brand-dark-purple">{successData?.mobile}</span>
                      </div>
                      <div className="flex justify-between text-sm uppercase">
                         <span className="font-bold text-slate-500">Password:</span>
                         <span className="font-black text-brand-dark-purple">{successData?.pin}</span>
                      </div>
                   </div>
                </div>

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">{districtName} Quota Balance</p>
                       <div className="flex items-center justify-center gap-3">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span className="text-xl font-black text-emerald-700">
                             {districtQuotas[activeDistrict] > 0 
                                ? `${Math.max(0, districtQuotas[activeDistrict] - (districtQuotasUsed[activeDistrict] || 0))} Available`
                                : 'Unlimited'}
                          </span>
                       </div>
                    </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Share Membership Link (@WhatsApp)</p>
                
                <div className="grid grid-cols-2 gap-4">
                   <Button 
                      variant="secondary"
                      className="h-12 rounded-xl font-bold uppercase text-xs"
                      onClick={() => {
                        const magicLink = `${baseUrl}/?memberId=${successData?.id}`;
                        navigator.clipboard.writeText(magicLink);
                        toast.success('Link copied to clipboard!');
                      }}
                   >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Copy Link
                   </Button>
                   <Button 
                      className="h-12 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold uppercase text-xs"
                      onClick={() => {
                         if (!successData) return;
                         sendWAMessage({
                           name: successData.name,
                           mobile: successData.mobile,
                           uid: successData.id,
                           pin: successData.pin
                         });
                      }}
                   >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send WA
                   </Button>
                </div>
             </div>
             
             <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold uppercase border-slate-200"
                onClick={() => setShowSuccessModal(false)}
             >
                Close
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-10">
          <div className="flex items-center gap-5">
             <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200">
               <Logo size="sm" className="h-12 w-auto" />
             </div>
             <div>
               <h1 className="text-3xl font-black text-brand-magenta uppercase leading-none">Registration Hub</h1>
               <p className="text-brand-blue mt-2 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 {districtName} Operator Panel
               </p>
             </div>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
             <div className="hidden lg:flex flex-col items-end gap-1 px-4 border-r border-slate-200">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Main Public URL (Share this)</p>
                <p className="text-[10px] font-black text-brand-blue truncate max-w-[220px] font-mono select-all">
                  {baseUrl.replace('https://', '')}
                </p>
             </div>
             <Button 
                onClick={() => {
                    navigator.clipboard.writeText(baseUrl);
                    toast.success('Main Public Link copied!');
                }}
                variant="outline" 
                className="flex-1 md:flex-none h-14 border-2 border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm font-black rounded-2xl px-6 hover:bg-emerald-100 transition-all text-[11px] uppercase tracking-tight"
            >
              COPY PUBLIC LINK
            </Button>
             {activeDistrict && (
               <div className="bg-white border-2 border-emerald-100 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">
                      {districtName} Quota Balance
                    </p>
                    <p className="text-lg font-black text-slate-800 leading-none mt-1">
                      {districtQuotas[activeDistrict] ? (
                        <>
                          {Math.max(0, districtQuotas[activeDistrict] - (districtQuotasUsed[activeDistrict] || 0))} 
                          <span className="text-[10px] text-slate-400 ml-1 uppercase font-bold">Entries Left</span>
                        </>
                      ) : (
                        "Unlimited"
                      )}
                    </p>
                  </div>
               </div>
             )}
            <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
              <DialogTrigger 
                render={
                  <Button 
                      disabled={
                        ((districtQuotas[formData.district] !== undefined && districtQuotas[formData.district] > 0 && (districtQuotasUsed[formData.district] || 0) >= districtQuotas[formData.district]) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota))
                      }
                      className="flex-1 md:flex-none h-14 font-black rounded-2xl px-8 shadow-xl shadow-brand-magenta/20 transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-tight bg-brand-magenta text-white hover:bg-brand-magenta/90 disabled:opacity-50"
                  />
                }
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {(user.quota !== undefined && (user.quotaUsed || 0) >= user.quota) ? 'Quota Full' : 'Physical Register'}
              </DialogTrigger>
              {isDirectManual && (
                <Button 
                   onClick={() => setShowDirectManual(!showDirectManual)}
                   variant="outline" 
                   className="flex-1 md:flex-none h-14 border-2 border-brand-magenta/20 bg-brand-magenta/5 text-brand-magenta shadow-sm font-black rounded-2xl px-6 transition-all text-[11px] uppercase tracking-tight"
                >
                   {showDirectManual ? (
                     <><Users className="w-4 h-4 mr-2" /> VIEW MEMBER LIST</>
                   ) : (
                     <><UserPlus className="w-4 h-4 mr-2" /> BACK TO ENTRY</>
                   )}
                </Button>
              )}
              <DialogContent 
                className="sm:max-w-[500px] rounded-[40px] border-none p-0 overflow-hidden bg-white max-h-[90vh] flex flex-col"
              >
                <div className="bg-brand-magenta p-8 md:p-10 text-white relative flex-shrink-0">
                  <div className="bg-white/10 w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4">
                    <UserPlus className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <DialogTitle className="text-2xl md:text-3xl font-black uppercase">Manual Entry</DialogTitle>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Physical Registration Console</p>
                  <DialogClose className="absolute right-6 top-6 text-white/40 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </DialogClose>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <form onSubmit={handleRegisterSubmit} className="p-8 md:p-10 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name (പേര്)</Label>
                        <Input 
                          required
                          value={formData.name || ""}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-brand-blue/20" 
                          placeholder="Candidate Name"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">District (ജില്ല)</Label>
                          <Select 
                            value={formData.district} 
                            onValueChange={val => setFormData({...formData, district: val, assemblyConstituency: CONSTITUENCIES[val]?.[0] || ''})}
                            disabled={!!user.district}
                          >
                            <SelectTrigger className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold disabled:opacity-50">
                              <SelectValue placeholder="Select District" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Constituency (മണ്ഡലം)</Label>
                          <div key={`operator-dialog-constituency-${formData.district}`}>
                            <Select 
                              value={formData.assemblyConstituency} 
                              onValueChange={(val) => setFormData({...formData, assemblyConstituency: val})}
                            >
                              <SelectTrigger className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                                <SelectValue placeholder="Select Constituency" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60 overflow-y-auto">
                                {(CONSTITUENCIES[formData.district] || []).map(ac => (
                                  <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number (മൊബൈൽ)</Label>
                         <Input 
                          required
                          type="tel"
                          value={formData.mobile || ""}
                          onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})}
                          className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-brand-blue/20" 
                          placeholder="10 Digit Number"
                          maxLength={10}
                        />
                      </div>
                      {/* State (സംസ്ഥാനം) Selection */}
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State (സംസ്ഥാനം)</Label>
                         <Select value={formData.state || "Kerala"} onValueChange={(val) => setFormData({...formData, state: val})}>
                           <SelectTrigger className="h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 font-sans">
                             <SelectValue placeholder="Select State" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Kerala">Kerala</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting || (districtQuotas && (districtQuotas[formData.district] || 0) > 0 && (districtQuotasUsed?.[formData.district] || 0) >= (districtQuotas[formData.district] || 0)) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota)}
                      className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-wide shadow-xl shadow-brand-magenta/20 mt-4 group bg-brand-magenta text-white hover:bg-brand-magenta/90 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Processing...
                        </div>
                      ) : ((districtQuotas && (districtQuotas[formData.district] || 0) > 0 && (districtQuotasUsed?.[formData.district] || 0) >= (districtQuotas[formData.district] || 0)) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota)) ? (
                        "Quota Exhausted"
                      ) : (
                        <>
                          Register Member
                          <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="sm:max-w-lg rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-brand-blue p-8 text-white">
              <DialogHeader>
                <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                  <Pencil className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase text-white">Edit Member</DialogTitle>
                <DialogDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest mt-1">
                  Update details for {editingMember?.name}.
                </DialogDescription>
              </DialogHeader>
            </div>
            {editingMember && (
              <form onSubmit={handleEditSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</Label>
                    <Input 
                      id="edit-name" 
                      value={editingMember.name || ""} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                      onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mobile" className="text-[10px] font-black text-slate-400 uppercase ml-1">Mobile Number</Label>
                    <Input 
                      id="edit-mobile" 
                      value={editingMember.mobile || ""} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                      onChange={e => setEditingMember({...editingMember, mobile: e.target.value.replace(/\D/g, '')})}
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-[10px] font-black text-slate-400 uppercase ml-1">Email / Username</Label>
                  <Input 
                    id="edit-email" 
                    value={editingMember.email || ""} 
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                    onChange={e => setEditingMember({...editingMember, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">District</Label>
                    <Select 
                      value={editingMember.district || ""} 
                      onValueChange={val => setEditingMember({...editingMember, district: val, assemblyConstituency: CONSTITUENCIES[val]?.[0] || ''})}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold font-bold"><SelectValue placeholder="District" /></SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code} className="font-bold">{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Constituency</Label>
                    <Select 
                      value={editingMember.assemblyConstituency || ""} 
                      onValueChange={val => setEditingMember({...editingMember, assemblyConstituency: val})}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {(CONSTITUENCIES[editingMember.district] || []).map(ac => (
                          <SelectItem key={ac} value={ac} className="font-bold">{ac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address" className="text-[10px] font-black text-slate-400 uppercase ml-1">Address</Label>
                  <Input 
                    id="edit-address" 
                    value={editingMember.address || ''} 
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                    onChange={e => setEditingMember({...editingMember, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-post" className="text-[10px] font-black text-slate-400 uppercase ml-1">Post Office</Label>
                    <Input 
                      id="edit-post" 
                      value={editingMember.postOffice || ''} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                      onChange={e => setEditingMember({...editingMember, postOffice: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pincode" className="text-[10px] font-black text-slate-400 uppercase ml-1">PIN</Label>
                    <Input 
                      id="edit-pincode" 
                      value={editingMember.pincode || ''} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                      onChange={e => setEditingMember({...editingMember, pincode: e.target.value})}
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Blood Group</Label>
                    <Select 
                      value={editingMember.bloodGroup || ""} 
                      onValueChange={val => setEditingMember({...editingMember, bloodGroup: val})}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg} className="font-bold">{bg}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-pin" className="text-[10px] font-black text-slate-400 uppercase ml-1">Password</Label>
                    <Input 
                      id="edit-pin" 
                      value={editingMember.pin || '123456'} 
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                      onChange={e => setEditingMember({...editingMember, pin: e.target.value})}
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => setEditingMember(null)} className="flex-1 h-14 rounded-2xl font-bold uppercase text-xs">Cancel</Button>
                  <Button type="submit" className="flex-1 h-14 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-brand-blue/10">Save Changes</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
            <Button onClick={handleLogout} variant="destructive" className="flex-1 md:flex-none h-14 font-black rounded-2xl px-8 transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-tight">
              <LogOut className="w-5 h-5 mr-2" />
              EXIT
            </Button>
          </div>
        </header>

        {showDirectManual ? (
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
             <Card className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-white">
                <div className="bg-brand-magenta p-10 text-white relative">
                   <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                      <UserPlus className="w-8 h-8" />
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tight">Manual Entry</h2>
                   <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">{districtName} District Portal</p>
                </div>
                <div className="p-10">
                   <form onSubmit={handleRegisterSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name (പേര്)</Label>
                           <Input 
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold focus:border-brand-blue/20 px-6" 
                              placeholder="Candidate Name"
                           />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">District (ജില്ല)</Label>
                              <Select 
                                value={formData.district} 
                                onValueChange={val => setFormData({...formData, district: val, assemblyConstituency: CONSTITUENCIES[val]?.[0] || ''})}
                                disabled={!!user.district}
                              >
                                <SelectTrigger className="h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold px-6 disabled:opacity-50">
                                  <SelectValue placeholder="Select District" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 overflow-y-auto">
                                  {DISTRICTS.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Constituency (മണ്ഡലം)</Label>
                              <div key={`operator-card-constituency-${formData.district}`}>
                                <Select 
                                  value={formData.assemblyConstituency} 
                                  onValueChange={(val) => setFormData({...formData, assemblyConstituency: val})}
                                >
                                  <SelectTrigger className="h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold px-6">
                                    <SelectValue placeholder="Select Constituency" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60 overflow-y-auto">
                                    {(CONSTITUENCIES[formData.district] || []).map(ac => (
                                      <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number (മൊബൈൽ)</Label>
                           <Input 
                              required
                              type="tel"
                              value={formData.mobile}
                              onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '')})}
                              className="h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold focus:border-brand-blue/20 px-6" 
                              placeholder="10 Digit Number"
                              maxLength={10}
                           />
                        </div>
                        {/* State (സംസ്ഥാനം) Selection */}
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State (സംസ്ഥാനം)</Label>
                           <Select value={formData.state || "Kerala"} onValueChange={(val) => setFormData({...formData, state: val})}>
                             <SelectTrigger className="h-16 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold px-6 text-slate-700">
                               <SelectValue placeholder="Select State" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Kerala">Kerala</SelectItem>
                             </SelectContent>
                           </Select>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting || (districtQuotas && (districtQuotasUsed?.[activeDistrict] || 0) >= (districtQuotas[activeDistrict] || 0)) || (user.quota !== undefined && (user.quotaUsed || 0) >= user.quota)}
                        className="w-full h-20 rounded-[32px] text-xl font-black uppercase tracking-wide shadow-2xl shadow-brand-magenta/20 mt-6 group bg-brand-magenta text-white hover:bg-brand-magenta/90 disabled:opacity-50"
                      >
                         {isSubmitting ? (
                           <div className="flex items-center gap-3">
                              <RefreshCw className="w-6 h-6 animate-spin" />
                              Saving...
                           </div>
                         ) : ((districtQuotas && (districtQuotasUsed?.[activeDistrict] || 0) >= (districtQuotas[activeDistrict] || 0)) || (user.quota !== undefined && (user.quotaUsed || 0) >= user.quota)) ? (
                           "QUOTA EXHAUSTED"
                         ) : (
                           <>
                              REGISTER MEMBER
                              <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" />
                           </>
                         )}
                      </Button>
                   </form>
                   {isDirectManual && (
                      <p className="text-center mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed px-6">
                        നിങ്ങൾ നൽകുന്ന വിവരങ്ങൾ ഉപയോഗിച്ച് അഡ്മിൻ നേരിട്ട് ഈ അംഗത്തെ ആക്റ്റിവേറ്റ് ചെയ്യുന്നതാണ്. കാർഡ് ലഭിക്കുന്നതിനായി സക്സസ് വിൻഡോയിലെ വാട്സ്ആപ്പ് ബട്ടൺ ഉപയോഗിക്കുക.
                      </p>
                   )}
                </div>
             </Card>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-slate-200 bg-white rounded-[32px] shadow-sm">
                <CardContent className="p-8 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Registered by You</p>
                        <h3 className="text-5xl font-black text-brand-magenta mt-3">{stats.myEntries}</h3>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-[24px]">
                        <Users className="w-10 h-10 text-slate-400" />
                    </div>
                </CardContent>
            </Card>
            <Card className="border-2 border-green-500/20 bg-white rounded-[32px] shadow-sm">
                <CardContent className="p-8 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Verified Locally</p>
                        <h3 className="text-5xl font-black text-green-600 mt-3">{stats.active}</h3>
                    </div>
                    <div className="bg-green-500/10 p-5 rounded-[24px]">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                </CardContent>
            </Card>
            <Card className={cn(
                "border-2 bg-white rounded-[32px] shadow-sm",
                ((districtQuotas && districtQuotas[activeDistrict] > 0 && (districtQuotasUsed?.[activeDistrict] || 0) >= (districtQuotas[activeDistrict] || 0)) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota)) ? "border-red-500/20" : "border-brand-magenta/20"
            )}>
                <CardContent className="p-8 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            Available in {districtName}
                        </p>
                        <h3 className={cn(
                            "text-5xl font-black mt-3",
                            ((districtQuotas && districtQuotas[activeDistrict] > 0 && (districtQuotasUsed?.[activeDistrict] || 0) >= (districtQuotas[activeDistrict] || 0)) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota)) ? "text-red-500" : "text-brand-magenta"
                        )}>
                            {districtQuotas && districtQuotas[activeDistrict] > 0
                                ? Math.max(0, districtQuotas[activeDistrict] - (districtQuotasUsed?.[activeDistrict] || 0)) 
                                : user.quota !== undefined && user.quota > 0
                                    ? Math.max(0, user.quota - (user.quotaUsed || 0)) 
                                    : '∞'
                            }
                        </h3>
                        {districtQuotas && districtQuotas[activeDistrict] > 0 && (
                            <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tighter italic">Remaining district registration limit</p>
                        )}
                    </div>
                    <div className={cn(
                        "p-5 rounded-[24px]",
                        ((districtQuotas && districtQuotas[activeDistrict] > 0 && (districtQuotasUsed?.[activeDistrict] || 0) >= (districtQuotas[activeDistrict] || 0)) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota)) ? "bg-red-500/10" : "bg-brand-magenta/10"
                    )}>
                        <ShieldCheck className={cn(
                            "w-10 h-10",
                            ((districtQuotas && districtQuotas[activeDistrict] > 0 && (districtQuotasUsed?.[activeDistrict] || 0) >= (districtQuotas[activeDistrict] || 0)) || (user.quota !== undefined && user.quota > 0 && (user.quotaUsed || 0) >= user.quota)) ? "text-red-500" : "text-brand-magenta"
                        )} />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="bg-white rounded-[32px] border-2 border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="Search by Name, Mobile or Membership ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-white border-slate-200 rounded-2xl font-bold focus:border-brand-blue/20"
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              Live Sync
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest h-14">Member</TableHead>
                  <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest h-14">Identity</TableHead>
                  <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest h-14">District</TableHead>
                  <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest h-14">Status</TableHead>
                  <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest h-14 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.uid} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden flex-shrink-0 shadow-sm">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-black">
                              {(member.name || '?').charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 leading-tight">{member.name}</p>
                          <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                             <Phone className="w-3 h-3" />
                             {member.mobile}
                          </p>
                          {member.details && (
                            <p className="text-[9px] text-slate-500 font-bold italic truncate max-w-[150px]">
                              {member.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <p className="text-sm font-black text-brand-blue font-mono tracking-normal">{member.membershipId}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Ref: {member.transactionId || '---'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg border-slate-200 font-black text-[9px] uppercase tracking-wide">
                        {member.district}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.status === 'active' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${member.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                          {member.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => setEditingMember(member)}
                           className="h-10 w-10 p-0 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                         >
                           <Pencil className="w-4 h-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => handleShareCard(member)}
                           className="h-10 px-4 rounded-xl text-brand-blue font-black text-[10px] uppercase gap-2 hover:bg-brand-blue/5 transition-all"
                         >
                           <Share2 className="w-3.5 h-3.5" />
                           Share Card
                         </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
