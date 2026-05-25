import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { GalleryItem } from '../types';
import { Plus, Trash2, Image as ImageIcon, Loader2, Upload, Tag, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageUtils';

const CATEGORIES = [
  'Secretariat Dharna',
  'MLA Petitions (140 Constituencies)',
  'State Committee',
  'District Committee',
  'Society Programs',
  'Dharna / Events',
  'Community Activities',
  'Member Support Activities'
] as const;

export default function GalleryManagement() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newImage, setNewImage] = useState<{
    file: File | null;
    title: string;
    description: string;
    category: typeof CATEGORIES[number];
  }>({
    file: null,
    title: '',
    description: '',
    category: 'Society Programs'
  });

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const galleryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryItem[];
      setItems(galleryData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewImage(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleUpload = async () => {
    if (!newImage.file || !newImage.title) {
      toast.error('Please provide a title and select an image.');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading gallery image...');

    try {
      // 1. Compress image
      const compressed = await compressImage(newImage.file, 1200, 1200, 0.7);
      
      // 2. Upload to Storage
      const fileName = `${Date.now()}_${newImage.file.name}`;
      const storageRef = ref(storage, `gallery/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(uploadResult.ref);

      // 3. Add to Firestore
      await addDoc(collection(db, 'gallery'), {
        url,
        title: newImage.title,
        description: newImage.description,
        category: newImage.category,
        createdAt: serverTimestamp()
      });

      toast.success('Gallery item added successfully!', { id: loadingToast });
      setNewImage({
        file: null,
        title: '',
        description: '',
        category: 'Society Programs'
      });
      // Reset file input
      const fileInput = document.getElementById('gallery-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image.', { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this gallery item?')) return;

    try {
      await deleteDoc(doc(db, 'gallery', id));
      toast.success('Gallery item deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Form */}
      <Card className="border-2 border-slate-100 shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Plus className="w-8 h-8 text-brand-magenta" />
            Add New <span className="text-brand-magenta">Gallery Item</span>
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">Upload activity photos and categories them for the public gallery.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Image Title
                </label>
                <Input 
                  placeholder="e.g. State Committee Meeting Oct 2023"
                  value={newImage.title}
                  onChange={e => setNewImage(prev => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl h-12 border-slate-200 focus:border-brand-magenta focus:ring-brand-magenta/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Filter className="w-3 h-3" /> Category
                </label>
                <Select 
                  value={newImage.category} 
                  onValueChange={(val: any) => setNewImage(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="rounded-xl h-12 border-slate-200">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Description (Optional)
                </label>
                <Textarea 
                  placeholder="Briefly describe the event..."
                  value={newImage.description}
                  onChange={e => setNewImage(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl min-h-[100px] border-slate-200 focus:border-brand-magenta focus:ring-brand-magenta/10 resize-none"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" /> Photo
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    id="gallery-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="gallery-upload"
                    className="flex flex-col items-center justify-center w-full aspect-video rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 hover:border-brand-magenta/50 transition-all cursor-pointer group"
                  >
                    {newImage.file ? (
                      <div className="relative w-full h-full p-4">
                        <img 
                          src={URL.createObjectURL(newImage.file)} 
                          alt="Preview" 
                          className="w-full h-full object-cover rounded-2xl shadow-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                           <Upload className="w-8 h-8 text-white animate-bounce" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-400 group-hover:text-brand-magenta transition-colors">
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Click to upload image</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button 
                onClick={handleUpload}
                disabled={uploading || !newImage.file || !newImage.title}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-brand-magenta text-white hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-brand-magenta/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Save to Gallery
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List / Management */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Current Gallery <span className="text-brand-blue">({items.length})</span></h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-brand-blue mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Gallery data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
             <ImageIcon className="w-16 h-16 text-slate-100 mx-auto mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Your gallery is currently empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(item => (
              <div 
                key={item.id} 
                className="group relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={item.url} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5">
                  <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-none mb-3 uppercase tracking-[0.1em] text-[9px] font-black">
                    {item.category}
                  </Badge>
                  <h4 className="font-black text-slate-800 text-sm mb-1 line-clamp-1">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium line-clamp-2 min-h-[30px]">
                    {item.description || 'No description provided.'}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                     <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                       {item.createdAt?.toDate().toLocaleDateString()}
                     </p>
                     <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={() => handleDelete(item.id)}
                       className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-8 w-8 p-0"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
