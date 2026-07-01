import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, Save, Trash2, Plus, RefreshCw, X, AlertTriangle, Edit3, 
<<<<<<< HEAD
  Crown, MapPin, Grid, Layers, ArrowUpDown, ChevronUp, ChevronDown,
  Upload, Image as ImageIcon, Camera
=======
  Crown, MapPin, Grid, Layers, ArrowUpDown, ChevronUp, ChevronDown 
>>>>>>> new-repo/main
} from 'lucide-react';
import { 
  subscribeToCommitteeMembers, addCommitteeMember, updateCommitteeMember, 
  deleteCommitteeMember, CommitteeMember 
} from '@/src/lib/cms';
import { DISTRICTS, CONSTITUENCIES } from '@/src/constants';
<<<<<<< HEAD
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { compressImage } from '../lib/imageUtils';
import { collection, getDocs, query } from 'firebase/firestore';
=======
>>>>>>> new-repo/main

export default function CommitteeManagement({ user }: { user: any }) {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameMl, setNameMl] = useState('');
  const [designation, setDesignation] = useState('');
  const [designationMl, setDesignationMl] = useState('');
  const [level, setLevel] = useState<'state' | 'district' | 'mandalam'>('state');
  const [district, setDistrict] = useState('all');
  const [mandalam, setMandalam] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [order, setOrder] = useState<number>(0);
  
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');

<<<<<<< HEAD
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const openGallerySelector = async () => {
    setGalleryOpen(true);
    setGalleryLoading(true);
    try {
      const q = query(collection(db, 'gallery'));
      const snapshot = await getDocs(q);
      const itemsData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      // Sort items: order or createdAt desc
      itemsData.sort((a: any, b: any) => {
        const orderA = a.order !== undefined ? Number(a.order) : 0;
        const orderB = b.order !== undefined ? Number(b.order) : 0;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setGalleryItems(itemsData);
    } catch (err) {
      console.error("Error fetching gallery items:", err);
      toast.error("ഗാലറി ചിത്രങ്ങൾ ലോഡ് ചെയ്യാനായില്ല");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingImage(true);
    const progressToast = toast.loading('Uploading committee photo to Firebase Storage...');
    try {
      // 1. Compress
      const compressed = await compressImage(file, 600, 600, 0.7);
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `committees/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
      
      // 2. Upload to Firebase Storage under assets/committees
      const storageRef = ref(storage, `assets/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(uploadResult.ref);
      
      // 3. Set the imageUrl
      setImageUrl(url);
      toast.success('ഫോട്ടോ വിജയകരമായി അപ്‌ലോഡ് ചെയ്തു!', { id: progressToast });
    } catch (err: any) {
      console.error("Direct upload failed:", err);
      toast.error(`അപ്‌ലോഡ് പരാജയപ്പെട്ടു: ${err.message || err}`, { id: progressToast });
    } finally {
      setUploadingImage(false);
    }
  };

=======
>>>>>>> new-repo/main
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCommitteeMembers(
      (data) => {
        setMembers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading committee members:", err);
        toast.error("കമ്മിറ്റി അംഗങ്ങളെ ലോഡ് ചെയ്യുന്നതിൽ തടസ്സം നേരിട്ടു: " + err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setNameMl('');
    setDesignation('');
    setDesignationMl('');
    setLevel('state');
    setDistrict('all');
    setMandalam('');
    setImageUrl('');
    setOrder(0);
  };

  const handleEdit = (m: CommitteeMember) => {
    setEditingId(m.id || null);
    setName(m.name);
    setNameMl(m.nameMl || '');
    setDesignation(m.designation);
    setDesignationMl(m.designationMl || '');
    setLevel(m.level);
    setDistrict(m.district || 'all');
    setMandalam(m.mandalam || '');
    setImageUrl(m.imageUrl || '');
    setOrder(m.order || 0);
    setActiveTab('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !designation.trim()) {
      toast.error('പേര്, പദവി എന്നിവ നൽകുക! Name and Designation are required.');
      return;
    }

    setSaving(true);
    const data: Omit<CommitteeMember, 'id' | 'createdAt'> = {
      name: name.trim(),
      nameMl: nameMl.trim() || "",
      designation: designation.trim(),
      designationMl: designationMl.trim() || "",
      level,
      imageUrl: imageUrl.trim() || "",
      order: Number(order) || 0,
      district: level !== 'state' ? district : "",
      mandalam: level === 'mandalam' ? mandalam : ""
    };

    try {
      if (editingId) {
        await updateCommitteeMember(editingId, data);
        toast.success('കമ്മിറ്റി അംഗത്തെ വിജയകരമായി എഡിറ്റ് ചെയ്തു (Committee member updated successfully)');
      } else {
        await addCommitteeMember(data);
        toast.success('പുതിയ കമ്മിറ്റി അംഗത്തെ ചേർത്തു (New committee member added successfully)');
      }
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      toast.error('സേവ് ചെയ്യാൻ സാധിച്ചില്ല: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} എന്നയാളെ കമ്മിറ്റിയിൽ നിന്നും നീക്കം ചെയ്യണമെന്നു ഉറപ്പാണോ?\nAre you sure you want to remove ${name} from the committee?`)) {
      return;
    }
    try {
      await deleteCommitteeMember(id);
      toast.success('അംഗത്തെ വിജയകരമായി നീക്കം ചെയ്തു');
    } catch (err: any) {
      toast.error('നീക്കം ചെയ്യാൻ സാധിച്ചില്ല: ' + err.message);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesLevel = filterLevel === 'all' || m.level === filterLevel;
    const matchesDistrict = filterDistrict === 'all' || m.district === filterDistrict;
    return matchesLevel && matchesDistrict;
  });

  const getDistrictName = (code?: string) => {
    if (!code) return '';
    return DISTRICTS.find(d => d.code === code)?.name || code;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-magenta" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            HCRS Committee Members Management
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            ഹോംപേജിലെ കമ്മിറ്റി പാനലിലെ അംഗങ്ങളുടെ ലിങ്കും വിവരങ്ങളും ഇവിടെ നിർമ്മിക്കാം
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setActiveTab('list');
              resetForm();
            }}
            variant={activeTab === 'list' ? 'default' : 'outline'}
            className="rounded-xl h-10 text-[10px] uppercase font-bold tracking-wider px-4"
          >
            All Members ({members.length})
          </Button>
          <Button
            onClick={() => setActiveTab('form')}
            variant={activeTab === 'form' ? 'default' : 'outline'}
            className="rounded-xl h-10 text-[10px] uppercase font-bold tracking-wider px-4 flex items-center gap-1 bg-brand-blue text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            {editingId ? 'Edit Member' : 'Add New Member'}
          </Button>
        </div>
      </div>

      <Separator className="opacity-40" />

      {activeTab === 'list' ? (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Filter by Level (കമ്മിറ്റി തരം)</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels (എല്ലാ കമ്മിറ്റികളും)</SelectItem>
                  <SelectItem value="state">State Committee (സ്റ്റേറ്റ് കമ്മിറ്റി)</SelectItem>
                  <SelectItem value="district">District Committee (ജില്ലാ കമ്മിറ്റികൾ)</SelectItem>
                  <SelectItem value="mandalam">Mandalam Committee (മണ്ഡലം കമ്മിറ്റികൾ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Filter by District (ജില്ല)</Label>
              <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">All Districts (എല്ലാ ജില്ലകളും)</SelectItem>
                  {DISTRICTS.map(d => (
                    <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((m) => (
                <Card 
                  key={m.id} 
                  className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-5 flex gap-4 text-left">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 shadow-sm">
                      <img 
                        src={m.imageUrl || 'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png'} 
                        alt={m.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png';
                        }}
                      />
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${
                          m.level === 'state' ? 'bg-amber-500' : m.level === 'district' ? 'bg-brand-blue' : 'bg-brand-magenta'
                        }`}>
                          {m.level}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold">POS #{m.order || 0}</span>
                      </div>
                      
                      <h3 className="text-sm font-semibold text-slate-800 leading-snug truncate">
                        {m.name}
                      </h3>
                      {m.nameMl && (
                        <p className="text-[11px] font-bold text-slate-400 truncate leading-none malayalam-text">
                          {m.nameMl}
                        </p>
                      )}
                      
                      <p className="text-xs text-brand-blue font-bold truncate">
                        {m.designation}
                        {m.designationMl && <span className="text-slate-405 font-medium ml-1">({m.designationMl})</span>}
                      </p>

                      {m.level !== 'state' && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase pt-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{getDistrictName(m.district)}</span>
                          {m.level === 'mandalam' && m.mandalam && (
                            <span className="text-brand-magenta font-semibold ml-1">• {m.mandalam}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Order: {m.order || 0}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(m)}
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        title="Edit member details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(m.id || '', m.name)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-20 bg-white border border-dashed border-slate-200 rounded-[24px] flex flex-col items-center justify-center text-center">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-xs uppercase font-bold tracking-widest text-slate-400">No Committee Members Found</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">തന്നിരിക്കുന്ന ഫിൽട്ടറിൽ അംഗങ്ങളെ കണ്ടെത്താനായില്ല. പുതിയ ഒരാളെ ചേർക്കുക!</p>
            </div>
          )}
        </div>
      ) : (
        <Card className="border border-slate-200 rounded-[28px] overflow-hidden bg-white shadow-sm text-left">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 md:p-8">
            <CardTitle className="text-lg font-bold text-slate-850 uppercase tracking-tight">
              {editingId ? 'കമ്മിറ്റി അംഗത്തിന്റെ വിവരങ്ങൾ തിരുത്തുക' : 'കമ്മിറ്റിയിലേക്ക് പുതിയ അംഗത്തെ ചേർക്കുക'}
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {editingId ? 'Edit the selected committee member profiles and settings' : 'Fill in the details to add a state, district or mandalam committee node'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-700">English Name (പേര് ഇംഗ്ലീഷിൽ) *</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="E.g. Jayachandaran Nair"
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-700">Malayalam Name (പേര് മലയാളത്തിൽ)</Label>
                  <Input 
                    value={nameMl} 
                    onChange={e => setNameMl(e.target.value)}
                    placeholder="ഉദാ: ജയചന്ദ്രൻ നായർ"
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-700">Designation (പദവി ഇംഗ്ലീഷിൽ) *</Label>
                  <Input 
                    value={designation} 
                    onChange={e => setDesignation(e.target.value)}
                    placeholder="E.g. State President, District Treasurer"
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-700">Designation in Malayalam (പദവി മലയാളത്തിൽ)</Label>
                  <Input 
                    value={designationMl} 
                    onChange={e => setDesignationMl(e.target.value)}
                    placeholder="ഉദാ: സംസ്ഥാന പ്രസിഡന്റ്"
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-700">Committee Level (കമ്മിറ്റി തരം) *</Label>
                  <Select value={level} onValueChange={(val: any) => setLevel(val)}>
                    <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="state">State Committee (സംസ്ഥാന കമ്മിറ്റി)</SelectItem>
                      <SelectItem value="district">District Committee (ജില്ലാ കമ്മിറ്റി)</SelectItem>
                      <SelectItem value="mandalam">Mandalam Committee (മണ്ഡലം കമ്മിറ്റി)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs text-slate-700">Sort Positioning Order (ലിസ്റ്റിൽ കാണിക്കേണ്ട ക്രമം) *</Label>
                  <Input 
                    type="number" 
                    value={order} 
                    onChange={e => setOrder(Number(e.target.value))}
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase">കുറഞ്ഞ സംഖ്യകൾ ആദ്യം കാണിക്കും (Lowest values shown first. 0, 1, 2, ...)</p>
                </div>

                {level !== 'state' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-700">Select District (ജില്ല തിരഞ്ഞെടുക്കുക) *</Label>
                    <Select value={district} onValueChange={setDistrict}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl text-xs font-bold">
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {DISTRICTS.map(d => (
                          <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {level === 'mandalam' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-xs text-slate-700">Select constituency / Mandalam (മണ്ഡലം എഴുതുക) *</Label>
                    <Input 
                      value={mandalam} 
                      onChange={e => setMandalam(e.target.value)}
                      placeholder="ഉദാ: Guruvayur, Attingal (ഇംഗ്ലീഷിൽ)"
                      className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                    />
                  </div>
                )}

<<<<<<< HEAD
                <div className="space-y-4 md:col-span-2 p-5 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <ImageIcon className="w-4 h-4 text-brand-blue" />
                        Committee Photo (കമ്മിറ്റി അംഗത്തിന്റെ ഫോട്ടോ) *
                      </Label>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Choose a photo from your computer/phone, select from HCRS Gallery, or paste a web URL.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Direct File Upload button */}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50 text-slate-700 font-bold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-lg shadow-sm transition-all">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        {uploadingImage ? 'Uploading...' : 'Upload Direct (ഫയൽ അപ്‌ലോഡ്)'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          disabled={uploadingImage}
                          onChange={handleDirectUpload} 
                        />
                      </label>

                      {/* Connect to Gallery button */}
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={openGallerySelector}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wider h-auto py-2 px-3.5 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Grid className="w-3.5 h-3.5 text-slate-500" />
                        Select from Gallery (ഗാലറിയിൽ നിന്ന്)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <Label className="font-bold text-[10px] uppercase text-slate-500">Or Paste Image URL/Link (അല്ലെങ്കിൽ ഫോട്ടോ ലിങ്ക് പേസ്റ്റ് ചെയ്യുക)</Label>
                    <Input 
                      value={imageUrl} 
                      onChange={e => {
                        let val = e.target.value.trim();
                        // Extract src from pasted ImgBB embed HTML / code:
                        const srcMatch = val.match(/src=["']([^"']+)["']/i);
                        if (srcMatch && srcMatch[1]) {
                          val = srcMatch[1].trim();
                        }
                        setImageUrl(val);
                      }}
                      placeholder="https://firebasestorage.googleapis.com/... or https://i.ibb.co/..."
                      className="h-10 rounded-xl border-slate-200 text-xs font-semibold bg-white"
                    />
                    <p className="text-[9px] text-slate-400 font-semibold uppercase">
                      Firebase-ലേക്ക് അപ്‌ലോഡ് ചെയ്താൽ ലിങ്ക് തനിയെ ഇവിടെ വരും.
                    </p>
                  </div>
=======
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-bold text-xs text-slate-700">Image url / Link for Photo (ഫോട്ടോ ലിങ്ക് - ImgBB അല്ലെങ്കിൽ മറ്റ് വെബ്‌സൈറ്റ് ലിങ്ക്) *</Label>
                  <Input 
                    value={imageUrl} 
                    onChange={e => {
                      let val = e.target.value.trim();
                      // Extract src from pasted ImgBB embed HTML / code:
                      const srcMatch = val.match(/src=["']([^"']+)["']/i);
                      if (srcMatch && srcMatch[1]) {
                        val = srcMatch[1].trim();
                      }
                      setImageUrl(val);
                    }}
                    placeholder="https://i.ibb.co/..."
                    className="h-11 rounded-xl border-slate-200 text-xs font-bold"
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase">ImgBB-യിൽ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്ത ശേഷം ലഭിക്കുന്ന HTML കോഡ് മുഴുവനായി പേസ്റ്റ് ചെയ്താലും മതിയാകും!</p>
>>>>>>> new-repo/main
                </div>
              </div>

              {imageUrl && (
                <div className="p-4 border border-slate-200/60 rounded-2xl bg-slate-50/55 inline-flex flex-col items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none">Photo Live Preview:</span>
                  <div className="w-20 h-20 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://i.ibb.co/My4KQNbH/1000072034-removebg-preview-1.png';
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="rounded-xl px-5 h-11 text-[10px] font-black uppercase tracking-wider border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl px-7 h-11 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-brand-blue/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Save Changes' : 'Add Committee Member'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
<<<<<<< HEAD

      {/* Gallery Photo Selector Dialog/Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-brand-blue" />
                  Select Photo from HCRS Gallery (HCRS ഗാലറിയിൽ നിന്ന് തിരഞ്ഞെടുക്കുക)
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Click on any photo below to instantly use it as the committee member's photo
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setGalleryOpen(false)}
                className="rounded-full w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
              {galleryLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-brand-magenta" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading gallery images...</p>
                </div>
              ) : galleryItems.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white p-6 max-w-md mx-auto animate-in fade-in duration-200">
                  <ImageIcon className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                  <p className="font-bold text-sm text-slate-700">ഗാലറിയിൽ ഫോട്ടോകൾ ഒന്നും തന്നെയില്ല!</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1.5">
                    ഗാലറി മാനേജ്‌മെന്റ് വിഭാഗത്തിൽ ഫോട്ടോകൾ അപ്‌ലോഡ് ചെയ്ത ശേഷം ഇവിടെ തിരഞ്ഞെടുക്കാം.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {galleryItems.map((item: any) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setImageUrl(item.url);
                        setGalleryOpen(false);
                        toast.success('ഫോട്ടോ തിരഞ്ഞെടുത്തിരിക്കുന്നു!');
                      }}
                      className="group bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-brand-blue/60 hover:shadow-md transition-all flex flex-col relative"
                    >
                      <div className="aspect-square bg-slate-50 overflow-hidden relative border-b border-slate-100">
                        <img 
                          src={item.url} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-brand-blue/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[10px] uppercase tracking-wider">
                          Select Photo
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-[10px] text-slate-800 uppercase truncate leading-tight">{item.title}</p>
                        {item.category && (
                          <span className="inline-block bg-slate-100 text-slate-650 font-black text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded mt-1">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
              <Button 
                onClick={() => setGalleryOpen(false)}
                className="bg-slate-700 hover:bg-slate-800 text-white rounded-xl px-5 h-10 text-[10px] font-black uppercase tracking-wider cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
=======
>>>>>>> new-repo/main
    </div>
  );
}
