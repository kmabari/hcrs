import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { GalleryItem, UserProfile } from '../types';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  Upload, 
  Tag, 
  FileText, 
  Filter, 
  ArrowUp, 
  ArrowDown, 
  ChevronUp, 
  ChevronDown, 
  Edit3, 
  Check, 
  X, 
  FolderPlus, 
  MapPin,
  ExternalLink,
  FolderOpen,
  Link as LinkIcon,
  Globe,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { compressImage } from '../lib/imageUtils';
import { 
  subscribeToGalleryCategories, 
  addGalleryCategory, 
  deleteGalleryCategory, 
  updateGalleryItem 
} from '../lib/cms';
import { DISTRICTS } from '../constants';
import { 
  normalizeImageUrl, 
  isValidImageUrl, 
  getProxiedImageUrl, 
  resolveImageUrlAsync, 
  getImageFallbackUrls,
  extractDriveFileId
} from '../lib/imageUrlUtils';

interface GalleryManagementProps {
  user?: UserProfile | null;
}

interface QueuedFile {
  id: string;
  file?: File;
  previewUrl: string;
  isExternalUrl?: boolean;
  title: string;
  description: string;
  category: string;
  district: string;
}

const MAIN_ADMINS = [
  'kmabarikiyafoods@gmail.com',
  'hcrsindia@gmail.com',
  'admin@hcrs.society',
  '9645934571@hcrs.society',
  'mabarikiyafoods@gmail.com'
];

export default function GalleryManagement({ user }: GalleryManagementProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Add Mode: 'upload' (local file) vs 'url' (external direct link)
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload');
  
  // Dynamic category administration
  const [newCatName, setNewCatName] = useState('');
  const [showCatAdmin, setShowCatAdmin] = useState(false);

  // Direct Image URL Form State
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlDescription, setUrlDescription] = useState('');
  const [urlCategory, setUrlCategory] = useState('');
  const [urlDistrict, setUrlDistrict] = useState('state');
  const [urlImageValid, setUrlImageValid] = useState<boolean | null>(null);
  const [urlImageLoading, setUrlImageLoading] = useState(false);
  const [urlPreviewSrc, setUrlPreviewSrc] = useState('');
  const [urlUsingProxy, setUrlUsingProxy] = useState(false);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [urlFallbackIndex, setUrlFallbackIndex] = useState(0);
  const [urlFallbacks, setUrlFallbacks] = useState<string[]>([]);
  const [savingDirectUrl, setSavingDirectUrl] = useState(false);

  // Queue of multiple files or external URLs to be uploaded
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  
  // Filters for administrator list view
  const [adminDistrictFilter, setAdminDistrictFilter] = useState<string>('all');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');

  // Modal / Dialog states for edit image details
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPreviewSrc, setEditPreviewSrc] = useState('');
  const [editUsingProxy, setEditUsingProxy] = useState(false);
  const [editUrlValid, setEditUrlValid] = useState<boolean | null>(true);

  // Identify state privileges
  const isSuperAdmin = MAIN_ADMINS.includes(user?.email || '') || (user?.role === 'admin' && !user?.district);
  const userDistrictCode = user?.district || '';
  const userDistrictName = DISTRICTS.find(d => d.code === userDistrictCode)?.name || userDistrictCode;

  // 1. Subscribe to categories
  useEffect(() => {
    const unsubCat = subscribeToGalleryCategories((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !urlCategory) {
        setUrlCategory(isSuperAdmin ? (cats[0] || 'Society Programs') : 'District Committee');
      }
    });
    return () => unsubCat();
  }, [isSuperAdmin, urlCategory]);

  // Set default district for non-superadmin
  useEffect(() => {
    if (!isSuperAdmin && userDistrictCode) {
      setUrlDistrict(userDistrictCode);
    }
  }, [isSuperAdmin, userDistrictCode]);

  // 2. Subscribe to gallery items
  useEffect(() => {
    const q = query(collection(db, 'gallery'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const galleryData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as GalleryItem[];
      
      // Secondary sort logic: order ascending (null/undefined defaults to 0) then createdAt descending
      galleryData.sort((a, b) => {
        const orderA = (a as any).order !== undefined ? Number((a as any).order) : 0;
        const orderB = (b as any).order !== undefined ? Number((b as any).order) : 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      setItems(galleryData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle URL change & pre-validation with multi-candidate fallback detection
  const handleUrlInputChange = (val: string) => {
    setUrlInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setUrlPreviewSrc('');
      setUrlFallbacks([]);
      setUrlFallbackIndex(0);
      setUrlUsingProxy(false);
      setUrlImageLoading(false);
      setUrlImageValid(null);
      return;
    }

    const clean = normalizeImageUrl(trimmed);
    const fallbacks = getImageFallbackUrls(trimmed);
    setUrlFallbacks(fallbacks);
    setUrlFallbackIndex(0);
    setUrlPreviewSrc(fallbacks[0] || clean);
    setUrlUsingProxy(false);

    if (isValidImageUrl(clean)) {
      setUrlImageLoading(true);
      setUrlImageValid(null);

      // Auto-detect viewer/webpage URLs (e.g. ibb.co, postimg.cc, imgur without direct extension) and resolve asynchronously
      if (
        (trimmed.includes('ibb.co/') && !trimmed.includes('i.ibb.co/')) ||
        (trimmed.includes('postimg.cc/') && !trimmed.includes('i.postimg.cc/')) ||
        (trimmed.includes('postimages.org/')) ||
        (trimmed.includes('imgur.com/') && !trimmed.includes('i.imgur.com/'))
      ) {
        setIsResolvingUrl(true);
        resolveImageUrlAsync(trimmed).then(res => {
          setIsResolvingUrl(false);
          if (res.isPageResolved && res.resolvedUrl) {
            setUrlPreviewSrc(res.resolvedUrl);
            setUrlFallbacks([res.resolvedUrl, ...fallbacks]);
            setUrlFallbackIndex(0);
            setUrlImageLoading(true);
            setUrlImageValid(null);
            toast.success('Direct photo link extracted automatically!');
          }
        }).catch(() => {
          setIsResolvingUrl(false);
        });
      }
    } else {
      setUrlImageLoading(false);
      setUrlImageValid(null);
    }
  };

  // Manual trigger to resolve / auto-fix webpage or embed link
  const handleManualResolveUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL first.');
      return;
    }
    setIsResolvingUrl(true);
    toast.loading('Detecting and resolving direct image link...', { id: 'resolve-toast' });
    try {
      const res = await resolveImageUrlAsync(urlInput.trim());
      if (res.isPageResolved && res.resolvedUrl) {
        setUrlPreviewSrc(res.resolvedUrl);
        setUrlFallbacks(prev => [res.resolvedUrl, ...prev]);
        setUrlFallbackIndex(0);
        setUrlUsingProxy(false);
        setUrlImageLoading(true);
        setUrlImageValid(null);
        toast.success('Successfully resolved direct image URL!', { id: 'resolve-toast' });
      } else {
        const fallbacks = getImageFallbackUrls(urlInput.trim());
        setUrlFallbacks(fallbacks);
        setUrlFallbackIndex(0);
        setUrlPreviewSrc(fallbacks[0]);
        toast.info('Direct image candidate updated. Testing live preview...', { id: 'resolve-toast' });
      }
    } catch (err: any) {
      toast.error(`Resolution notice: ${err.message || err}`, { id: 'resolve-toast' });
    } finally {
      setIsResolvingUrl(false);
    }
  };

  // Filter gallery items for administrator display
  const displayedItems = items.filter(item => {
    // District Admins can only see photos stamped with their district
    if (!isSuperAdmin) {
      return (item as any).district === userDistrictCode;
    }
    // Main Admin filters
    const matchDistrict = adminDistrictFilter === 'all' 
      ? true 
      : adminDistrictFilter === 'state' 
        ? !(item as any).district 
        : (item as any).district === adminDistrictFilter;
        
    const matchCategory = adminCategoryFilter === 'all'
      ? true
      : item.category === adminCategoryFilter;
      
    return matchDistrict && matchCategory;
  });

  // Handle Drag over
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Add files to the upload queue
  const addFilesToQueue = (files: FileList) => {
    const defaultCat = isSuperAdmin ? (categories[0] || 'Society Programs') : 'District Committee';
    const newQueueItems: QueuedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file.`);
        continue;
      }
      
      // strip extension for default title
      const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      
      newQueueItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        isExternalUrl: false,
        title: cleanTitle.replace(/[-_]/g, ' '),
        description: '',
        category: defaultCat,
        district: isSuperAdmin ? 'state' : userDistrictCode
      });
    }

    if (newQueueItems.length > 0) {
      setQueuedFiles(prev => [...prev, ...newQueueItems]);
      toast.success(`Added ${newQueueItems.length} image(s) to transmission queue.`);
    }
  };

  // Add external URL directly to the queue
  const addUrlToQueue = () => {
    const raw = urlInput.trim();
    const finalUrl = urlPreviewSrc.trim() || normalizeImageUrl(raw);
    if (!isValidImageUrl(finalUrl)) {
      toast.error('Please enter a valid image URL (e.g. https://... or direct link).');
      return;
    }
    if (!urlTitle.trim()) {
      toast.error('Please enter a title for the image.');
      return;
    }

    const defaultCat = urlCategory || (isSuperAdmin ? (categories[0] || 'Society Programs') : 'District Committee');
    const newQueueItem: QueuedFile = {
      id: Math.random().toString(36).substring(2, 9),
      previewUrl: finalUrl,
      isExternalUrl: true,
      title: urlTitle.trim(),
      description: urlDescription.trim(),
      category: defaultCat,
      district: isSuperAdmin ? urlDistrict : userDistrictCode
    };

    setQueuedFiles(prev => [...prev, newQueueItem]);
    toast.success(`Added external image link to queue.`);
    setUrlInput('');
    setUrlTitle('');
    setUrlDescription('');
    setUrlPreviewSrc('');
    setUrlFallbacks([]);
    setUrlImageValid(null);
  };

  // Direct save of Image URL (1-click publish without going through batch upload)
  const handleDirectSaveUrl = async () => {
    const raw = urlInput.trim();
    const finalUrl = urlPreviewSrc.trim() || normalizeImageUrl(raw);
    if (!isValidImageUrl(finalUrl)) {
      toast.error('Please enter a valid image URL (e.g. https://... or direct link).');
      return;
    }
    if (!urlTitle.trim()) {
      toast.error('Please enter a title for the image.');
      return;
    }

    const categoryToUse = urlCategory || (isSuperAdmin ? (categories[0] || 'Society Programs') : 'District Committee');
    setSavingDirectUrl(true);

    try {
      let highestOrder = 0;
      if (items.length > 0) {
        highestOrder = Math.max(...items.map(item => (item as any).order !== undefined ? Number((item as any).order) : 0));
      }
      const nextOrder = highestOrder + 1;
      const finalDistrict = (!isSuperAdmin || urlDistrict === 'state') ? (isSuperAdmin ? '' : userDistrictCode) : urlDistrict;

      await addDoc(collection(db, 'gallery'), {
        url: finalUrl,
        title: urlTitle.trim(),
        description: urlDescription.trim(),
        category: categoryToUse,
        district: finalDistrict,
        order: nextOrder,
        createdAt: serverTimestamp()
      });

      toast.success(`Image URL saved and linked into [${categoryToUse}]!`);
      setUrlInput('');
      setUrlTitle('');
      setUrlDescription('');
      setUrlPreviewSrc('');
      setUrlFallbacks([]);
      setUrlImageValid(null);
    } catch (err) {
      console.error('Failed to save image URL', err);
      toast.error(`Operation failed: ${(err as Error).message || err}`);
    } finally {
      setSavingDirectUrl(false);
    }
  };

  // Drag 'n Drop callback
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  // Manual File change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  // Remove single image from upload queue
  const removeQueueItem = (id: string) => {
    setQueuedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Edit fields inside the queue
  const updateQueueField = (id: string, field: keyof QueuedFile, value: string) => {
    setQueuedFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Set category for all queued items
  const setBatchCategory = (category: string) => {
    setQueuedFiles(prev => prev.map(f => ({ ...f, category })));
    toast.info(`Updated batch category to: ${category}`);
  };

  // Set district for all queued items (Super Admin only)
  const setBatchDistrict = (district: string) => {
    setQueuedFiles(prev => prev.map(f => ({ ...f, district })));
    toast.info(`Updated batch location to: ${district === 'state' ? 'Statewide' : district}`);
  };

  // Sequential Batch Upload Action (handles both files and external URLs)
  const handleBatchUpload = async () => {
    if (queuedFiles.length === 0) {
      toast.error('Your upload queue is empty. Please select files or add image links.');
      return;
    }

    setUploading(true);
    const totalFiles = queuedFiles.length;
    let completed = 0;
    const progressToast = toast.loading(`Processing images: ${completed}/${totalFiles}...`);

    try {
      // Find the highest current order value to append new items incrementally
      let highestOrder = 0;
      if (items.length > 0) {
        highestOrder = Math.max(...items.map(item => (item as any).order !== undefined ? Number((item as any).order) : 0));
      }

      for (let i = 0; i < queuedFiles.length; i++) {
        const item = queuedFiles[i];
        let finalUrl = item.previewUrl;
        
        // If it's a local file, compress & upload to Firebase Storage sandbox
        if (!item.isExternalUrl && item.file) {
          const compressed = await compressImage(item.file, 1200, 1200, 0.7);
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${item.file.name}`;
          const storageRef = ref(storage, `gallery/${fileName}`);
          const uploadResult = await uploadBytes(storageRef, compressed);
          finalUrl = await getDownloadURL(uploadResult.ref);
        }

        // Add record to Firestore
        const nextOrder = highestOrder + i + 1;
        const finalDistrict = item.district === 'state' ? '' : item.district;

        await addDoc(collection(db, 'gallery'), {
          url: finalUrl,
          title: item.title || 'Untitled Activity',
          description: item.description || '',
          category: item.category,
          district: finalDistrict,
          order: nextOrder,
          createdAt: serverTimestamp()
        });

        completed++;
        toast.loading(`Processing images: ${completed}/${totalFiles} completed...`, { id: progressToast });
      }

      toast.success(`Successfully saved ${totalFiles} photos to HCRS public archives!`, { id: progressToast });
      setQueuedFiles([]);
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(`Operation failed: ${(err as Error).message || err}`, { id: progressToast });
    } finally {
      setUploading(false);
    }
  };

  // Add dynamic category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addGalleryCategory(newCatName);
      toast.success(`Category "${newCatName}" appended to central repository.`);
      setNewCatName('');
    } catch (e) {
      toast.error('Unable to finalize category.');
    }
  };

  // Delete dynamic category
  const handleDeleteCategory = async (catName: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"? Existing images in this category will remain, but you won't be able to pick it.`)) {
      return;
    }
    try {
      await deleteGalleryCategory(catName);
      toast.success(`Category deleted.`);
    } catch (e) {
      toast.error('Operation failed.');
    }
  };

  // Delete gallery item
  const handleDeleteImage = async (id: string) => {
    if (!window.confirm('Delete this photo from HCRS community archives? This is irreversible.')) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
      toast.success('Archived file removed.');
    } catch (error) {
      toast.error('Failed to purge item from Firestore.');
    }
  };

  // Reordering functions
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= displayedItems.length) return;

    const itemA = displayedItems[index];
    const itemB = displayedItems[targetIdx];

    const currentOrderA = (itemA as any).order !== undefined ? Number((itemA as any).order) : 0;
    const currentOrderB = (itemB as any).order !== undefined ? Number((itemB as any).order) : 0;

    // Decide custom order numbers to swap
    let newOrderA = currentOrderB;
    let newOrderB = currentOrderA;

    if (newOrderA === newOrderB) {
      newOrderA = direction === 'up' ? currentOrderB - 1 : currentOrderB + 1;
    }

    try {
      await updateGalleryItem(itemA.id, { order: newOrderA });
      await updateGalleryItem(itemB.id, { order: newOrderB });
      toast.success('Sequence ordering synced.');
    } catch (e) {
      toast.error(`Reordering error.`);
    }
  };

  // Trigger editing modal
  const startEditing = (item: GalleryItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditCategory(item.category);
    setEditDistrict((item as any).district || 'state');
    const clean = normalizeImageUrl(item.url || '');
    setEditUrl(item.url || '');
    setEditPreviewSrc(clean);
    setEditUsingProxy(false);
    setEditUrlValid(true);
  };

  // Save edits
  const saveItemEdits = async () => {
    if (!editingItem) return;
    if (!editUrl.trim()) {
      toast.error('Image URL is required.');
      return;
    }
    if (!editTitle.trim()) {
      toast.error('Title is required to update photo.');
      return;
    }

    try {
      const finalDistrict = editDistrict === 'state' ? '' : editDistrict;
      const normalizedUrl = normalizeImageUrl(editUrl.trim());
      await updateGalleryItem(editingItem.id, {
        url: normalizedUrl,
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        district: finalDistrict
      });
      toast.success('Archived photo updated successfully.');
      setEditingItem(null);
    } catch (e) {
      toast.error('Failed to submit updates.');
    }
  };

  // Categories available for current user
  const availableCategoriesForUpload = isSuperAdmin 
    ? categories 
    : categories.filter(c => c === 'District Committee' || c === 'District Activities' || c === 'Community Support Activities' || c === 'Welfare Activities');

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Top Header Controls / State info */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-brand-magenta/20 text-brand-magenta border border-brand-magenta/30 px-3.5 py-1 rounded-full mb-3 text-xs font-semibold">
            <ImageIcon className="w-3.5 h-3.5 animate-pulse" />
            <span>Admin Control Module • ഗാലറി നിയന്ത്രണം</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            Gallery Management
          </h2>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {isSuperAdmin 
              ? "Central command. You have unrestricted global authorization to configure public image sections statewide via direct uploads or image URLs." 
              : `Aesthetic Board locked to [${userDistrictName} District Committee]. All assets are automatically stamped and verified.`
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button 
            variant="ghost" 
            onClick={() => setShowCatAdmin(!showCatAdmin)}
            className="text-white hover:bg-white/10 rounded-xl px-5 h-11 text-xs font-extrabold uppercase tracking-wider"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
        </div>
      </div>

      {/* Dynamic Category Manager drawer */}
      {showCatAdmin && (
        <Card className="border-2 border-slate-100 shadow-lg rounded-[32px] overflow-hidden bg-slate-50/50 p-6 md:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Gallery Folder Categories</h3>
                <p className="text-xs text-slate-500 font-medium">Create or clean folders shared synchronously by statewide & district admin nodes.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setShowCatAdmin(false)} className="rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Input 
                placeholder="Type new category name... e.g. MLA Petitions"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="rounded-xl h-12 bg-white"
              />
              <Button 
                onClick={handleAddCategory}
                className="bg-brand-magenta text-white font-extrabold text-xs uppercase px-6 h-12 rounded-xl shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Folder
              </Button>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              {categories.map(cat => (
                <div key={cat} className="inline-flex items-center gap-2 bg-white border border-slate-200 pl-4 pr-2 py-1.5 rounded-full text-xs font-black shadow-sm group">
                  <span className="text-slate-700">{cat}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1 rounded-full text-slate-350 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* DUAL MODE ADD BOX: UPLOAD OR IMAGE URL / EXTERNAL LINK */}
      <Card className="border-2 border-slate-100 shadow-xl shadow-slate-200/50 rounded-[36px] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-brand-blue" />
                Add Activity <span className="text-brand-blue">Photos</span>
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold text-xs mt-1">
                Choose between uploading image files directly or linking external image URLs for every gallery category.
              </CardDescription>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300 shrink-0">
              <button
                type="button"
                onClick={() => setAddMode('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  addMode === 'upload'
                    ? 'bg-white text-brand-blue shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Image Upload</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMode('url')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  addMode === 'url'
                    ? 'bg-brand-magenta text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>Image URL / External Link</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-8">
          {/* OPTION 1: IMAGE FILE UPLOAD (DRAG & DROP / MULTI UPLOAD) */}
          {addMode === 'upload' && (
            <div className="space-y-6">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full aspect-[21/6] rounded-3xl border-2 border-dashed transition-all cursor-pointer p-6 ${
                  dragActive 
                    ? "border-brand-magenta bg-brand-magenta/5 scale-[0.99] shadow-inner" 
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 hover:border-brand-blue/50"
                }`}
              >
                <input
                  type="file"
                  id="gallery-multi-upload"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="gallery-multi-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-400">
                    <Upload className="w-8 h-8 text-brand-blue" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-700">Drag & Drop photos here, or click to browse files</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Supports PNG, JPG, JPEG, WEBP</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* OPTION 2: IMAGE URL / EXTERNAL IMAGE LINK */}
          {addMode === 'url' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-50 border-2 border-slate-200/80 rounded-3xl p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Form inputs */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-brand-magenta" />
                          Direct Image URL / Web Link <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-bold">ImgBB, PostImages, Google Drive, Imgur, Cloud CDN</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="url"
                            placeholder="https://i.ibb.co/example.jpg or https://ibb.co/xyz"
                            value={urlInput}
                            onChange={e => handleUrlInputChange(e.target.value)}
                            className="h-12 rounded-xl bg-white border-2 border-slate-300 focus:border-brand-magenta pr-10 text-xs font-mono font-bold text-slate-900"
                          />
                          {urlInput && (
                            <button
                              type="button"
                              onClick={() => { setUrlInput(''); setUrlPreviewSrc(''); setUrlFallbacks([]); setUrlImageValid(null); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleManualResolveUrl}
                          disabled={isResolvingUrl || !urlInput.trim()}
                          className="h-12 px-3.5 rounded-xl border-2 border-brand-magenta/30 hover:border-brand-magenta text-brand-magenta font-extrabold text-xs flex items-center gap-1.5 shrink-0 bg-brand-magenta/5 hover:bg-brand-magenta/10"
                          title="Auto-detect direct photo link from web page"
                        >
                          {isResolvingUrl ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Auto-Fix</span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        വെബ് ലിങ്കുകൾ (ImgBB, Google Drive, PostImages മുതലായവ) നേരിട്ട് പേസ്റ്റ് ചെയ്യുക. സിസ്റ്റം ഓട്ടോമാറ്റിക്കായി ചിത്രം കണ്ടെത്തി തത്സമയം പ്രിവ്യൂ ചെയ്യും.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Image Title */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Photo Title <span className="text-red-500">*</span>
                        </label>
                        <Input 
                          placeholder="e.g. Kozhikode Member Assembly"
                          value={urlTitle}
                          onChange={e => setUrlTitle(e.target.value)}
                          className="h-11 rounded-xl bg-white border-2 border-slate-300 focus:border-brand-magenta text-xs font-bold"
                        />
                      </div>

                      {/* Target Category */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Gallery Category <span className="text-red-500">*</span>
                        </label>
                        <Select value={urlCategory} onValueChange={setUrlCategory}>
                          <SelectTrigger className="h-11 rounded-xl bg-white border-2 border-slate-300 text-xs font-bold">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {availableCategoriesForUpload.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Scope & Caption */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Target Scope / Location
                        </label>
                        {isSuperAdmin ? (
                          <Select value={urlDistrict} onValueChange={setUrlDistrict}>
                            <SelectTrigger className="h-11 rounded-xl bg-white border-2 border-slate-300 text-xs font-bold">
                              <SelectValue placeholder="Scope" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="state" className="font-bold text-brand-magenta">Statewide (Global)</SelectItem>
                              {DISTRICTS.map(d => (
                                <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-11 bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center pl-3.5 rounded-xl border border-slate-300">
                            {userDistrictName}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Caption / Description (Optional)
                        </label>
                        <Input 
                          placeholder="Brief description or date"
                          value={urlDescription}
                          onChange={e => setUrlDescription(e.target.value)}
                          className="h-11 rounded-xl bg-white border-2 border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={handleDirectSaveUrl}
                        disabled={savingDirectUrl || !urlInput.trim() || !urlTitle.trim()}
                        className="bg-brand-magenta hover:bg-brand-magenta/90 text-white font-extrabold text-xs uppercase tracking-wider px-6 h-12 rounded-xl shadow-lg shadow-brand-magenta/20 transition-all flex items-center gap-2"
                      >
                        {savingDirectUrl ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving Image URL...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Save to Gallery Now</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addUrlToQueue}
                        disabled={!urlInput.trim() || !urlTitle.trim()}
                        className="border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-extrabold text-xs uppercase tracking-wider px-5 h-12 rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add to Batch Queue
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: Live URL Image Preview Card */}
                  <div className="lg:col-span-5 space-y-2">
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-brand-blue" />
                        Live Image Preview
                      </span>
                      {urlImageValid === true && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px] lowercase">
                          <CheckCircle2 className="w-3.5 h-3.5" /> loaded
                        </span>
                      )}
                      {urlImageValid === false && (
                        <span className="text-red-500 font-bold flex items-center gap-1 text-[11px] lowercase">
                          <AlertCircle className="w-3.5 h-3.5" /> preview issue
                        </span>
                      )}
                    </label>

                    <div className="aspect-[4/3] rounded-2xl bg-white border-2 border-slate-300 relative overflow-hidden flex items-center justify-center shadow-inner">
                      {urlInput.trim() ? (
                        <>
                          <img 
                            key={urlPreviewSrc}
                            src={urlPreviewSrc || normalizeImageUrl(urlInput)} 
                            alt="URL Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onLoad={() => {
                              setUrlImageValid(true);
                              setUrlImageLoading(false);
                            }}
                            onError={() => {
                              // Try next fallback in queue
                              if (urlFallbacks.length > 0 && urlFallbackIndex + 1 < urlFallbacks.length) {
                                const nextIndex = urlFallbackIndex + 1;
                                setUrlFallbackIndex(nextIndex);
                                setUrlPreviewSrc(urlFallbacks[nextIndex]);
                                setUrlImageLoading(true);
                              } else if (!urlUsingProxy) {
                                const clean = urlPreviewSrc || normalizeImageUrl(urlInput);
                                if (clean && !clean.includes('wsrv.nl')) {
                                  setUrlUsingProxy(true);
                                  setUrlPreviewSrc(getProxiedImageUrl(clean));
                                  setUrlImageLoading(true);
                                } else {
                                  setUrlImageValid(false);
                                  setUrlImageLoading(false);
                                }
                              } else {
                                setUrlImageValid(false);
                                setUrlImageLoading(false);
                              }
                            }}
                          />
                          {(urlImageLoading || isResolvingUrl) && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-7 h-7 animate-spin text-brand-magenta" />
                              <p className="text-[11px] font-bold text-slate-600">
                                {isResolvingUrl ? 'ലിങ്ക് പരിശോധിക്കുന്നു...' : 'ചിത്രം ലോഡ് ചെയ്യുന്നു...'}
                              </p>
                            </div>
                          )}
                          {urlImageValid === false && !urlImageLoading && !isResolvingUrl && (
                            <div className="absolute inset-0 bg-slate-900/95 text-white p-4 flex flex-col items-center justify-center text-center overflow-y-auto">
                              <AlertCircle className="w-7 h-7 text-amber-400 mb-1.5 shrink-0" />
                              <p className="text-xs font-black text-white">തത്സമയ പ്രിവ്യൂ ലഭ്യമായില്ല</p>
                              <p className="text-[10px] text-slate-300 mt-1 max-w-[260px] leading-relaxed">
                                വെബ്സൈറ്റ് സുരക്ഷ കാരണം നേരിട്ട് കാണിക്കാൻ കഴിഞ്ഞില്ലെങ്കിലും സേവ് ചെയ്യാൻ സാധിക്കും.
                              </p>
                              
                              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setUrlUsingProxy(true);
                                    setUrlPreviewSrc(getProxiedImageUrl(urlInput.trim()));
                                    setUrlImageLoading(true);
                                    setUrlImageValid(null);
                                  }}
                                  className="h-8 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5"
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" /> Try Proxy
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleManualResolveUrl}
                                  className="h-8 text-[11px] font-bold bg-brand-magenta hover:bg-brand-magenta/90 text-white rounded-lg px-2.5"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" /> Auto-Fix Link
                                </Button>
                              </div>

                              <div className="mt-3 text-[9px] text-slate-400 text-left bg-black/40 p-2 rounded-lg w-full space-y-0.5">
                                <div>• <b>Google Drive</b>: ഷെയറിംഗ് 'Anyone with link' ആക്കുക.</div>
                                <div>• <b>ImgBB / PostImages</b>: 'Auto-Fix Link' അമർത്തുക.</div>
                                <div>• താഴെ നൽകിയ 'Save to Gallery Now' വഴി നേരിട്ട് സേവ് ചെയ്യാം.</div>
                              </div>
                            </div>
                          )}
                          {/* Live Overlay Badges */}
                          {urlImageValid === true && !urlImageLoading && (
                            <div className="absolute top-3 left-3 flex flex-col gap-1 items-start pointer-events-none">
                              <Badge className="bg-slate-900/85 text-white backdrop-blur-md rounded-lg text-[9px] border-none uppercase">
                                {urlCategory || 'Select Category'}
                              </Badge>
                              <Badge className="bg-brand-magenta text-white backdrop-blur-md rounded-lg text-[9px] border-none uppercase">
                                <Globe className="w-2.5 h-2.5 mr-1" /> External URL
                              </Badge>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2 text-slate-300">
                          <ImageIcon className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                          <p className="text-xs font-bold text-slate-500">ഇമേജ് URL നൽകിയാൽ തത്സമയം ഇവിടെ കാണാം</p>
                          <p className="text-[10px] text-slate-400">ImgBB, Google Drive, PostImages, Cloud CDN links supported</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* QUEUED TRANSMISSION LIST (FOR BATCH SAVING FILES OR MULTIPLE URLS) */}
          {queuedFiles.length > 0 && (
            <div className="space-y-6 border-t border-slate-100 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase flex items-center gap-2">
                    Images in Stage Queue <span className="text-brand-blue">({queuedFiles.length})</span>
                  </h3>
                  <p className="text-xs font-bold text-slate-400">Review images, adjust titles or folders prior to finalizing.</p>
                </div>
                
                {/* Batch Override Controllers */}
                <div className="flex flex-wrap gap-2">
                  <div className="w-44">
                    <Select onValueChange={setBatchCategory}>
                      <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                        <SelectValue placeholder="Batch Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableCategoriesForUpload.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isSuperAdmin && (
                    <div className="w-40">
                      <Select onValueChange={setBatchDistrict}>
                        <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-slate-200 text-xs font-bold">
                          <SelectValue placeholder="Batch District" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="state">Statewide (Global)</SelectItem>
                          {DISTRICTS.map(d => (
                            <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid scroll block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                {queuedFiles.map(q => (
                  <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4 items-start relative group hover:border-slate-350 transition-all">
                    {/* Thumbnail preview */}
                    <div className="w-20 h-20 rounded-xl relative overflow-hidden bg-white shrink-0 border border-slate-200">
                      <img 
                        src={normalizeImageUrl(q.previewUrl)} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.retried) {
                            target.dataset.retried = 'true';
                            target.src = getProxiedImageUrl(q.previewUrl);
                          }
                        }}
                      />
                      {q.isExternalUrl && (
                        <div className="absolute bottom-1 left-1 bg-brand-magenta text-white p-0.5 rounded text-[8px] font-bold">
                          <LinkIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Meta edits */}
                    <div className="flex-1 space-y-2.5">
                      <Input 
                        placeholder="Image Title"
                        value={q.title}
                        onChange={e => updateQueueField(q.id, 'title', e.target.value)}
                        className="rounded-lg h-9 bg-white text-xs font-bold"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={q.category} onValueChange={val => updateQueueField(q.id, 'category', val)}>
                          <SelectTrigger className="h-8 rounded-lg bg-white text-[10px] font-bold">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {availableCategoriesForUpload.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {isSuperAdmin ? (
                          <Select value={q.district} onValueChange={val => updateQueueField(q.id, 'district', val)}>
                            <SelectTrigger className="h-8 rounded-lg bg-white text-[10px] font-bold">
                              <SelectValue placeholder="Location" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="state" className="font-black text-brand-magenta">Statewide</SelectItem>
                              {DISTRICTS.map(d => (
                                <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-8 flex items-center pl-2 text-[10px] bg-slate-100 text-slate-500 font-extrabold rounded-lg">
                            {userDistrictName}
                          </div>
                        )}
                      </div>

                      <Input 
                        placeholder="Caption/Description (Optional)"
                        value={q.description}
                        onChange={e => updateQueueField(q.id, 'description', e.target.value)}
                        className="rounded-lg h-8 bg-white text-[10px]"
                      />
                    </div>

                    {/* Delete item button */}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeQueueItem(q.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-8 w-8 absolute top-2 right-2 shrink-0 opacity-80 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Upload CTA triggers */}
              <div className="pt-4 flex justify-end gap-3 flex-wrap">
                <Button 
                  onClick={() => setQueuedFiles([])}
                  variant="ghost" 
                  disabled={uploading}
                  className="rounded-xl h-12 uppercase text-xs tracking-widest font-black text-slate-500"
                >
                  Clear Queue
                </Button>
                <Button 
                  onClick={handleBatchUpload}
                  disabled={uploading}
                  className="rounded-xl px-10 h-12 uppercase text-xs tracking-widest font-black bg-brand-blue hover:bg-brand-blue/90 text-white shadow-xl shadow-brand-blue/20 transition-all"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving queued files...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Save All Queue Photos
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FILTER & GALLERY LISTING TABLE BOARD */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Current Public Gallery <span className="text-brand-magenta">({displayedItems.length})</span></h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">Sort order, edit titles/links, or change category folder allocations.</p>
          </div>

          {/* Directory Filtering Rail */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {isSuperAdmin && (
              <Select value={adminDistrictFilter} onValueChange={setAdminDistrictFilter}>
                <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-xs font-bold w-40">
                  <SelectValue placeholder="Filter District" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Districts</SelectItem>
                  <SelectItem value="state">Statewide (Only)</SelectItem>
                  {DISTRICTS.map(d => (
                    <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={adminCategoryFilter} onValueChange={setAdminCategoryFilter}>
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-xl text-xs font-bold w-44">
                <SelectValue placeholder="Filter Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* LOADING STATE PLACEHOLDER */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-brand-magenta mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing community archives...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FolderOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pictures match the configuration</p>
          </div>
        ) : (
          /* RESPONSIVE RENDERING LIST */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedItems.map((item, index) => {
              const itemDistrictCode = (item as any).district;
              const itemDistrict = DISTRICTS.find(d => d.code === itemDistrictCode)?.name;
              
              return (
                <div 
                  key={item.id} 
                  className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-350 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Image thumbnail frame */}
                    <div className="aspect-[4/3] overflow-hidden relative bg-slate-100">
                      <img 
                        src={normalizeImageUrl(item.url)} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.retried) {
                            target.dataset.retried = 'true';
                            target.src = getProxiedImageUrl(item.url);
                          }
                        }}
                      />
                      
                      {/* Floating badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                        <Badge className="bg-slate-900/80 text-white backdrop-blur-md rounded-lg text-[9px] border-none uppercase tracking-wider">
                          {item.category}
                        </Badge>
                        {itemDistrictCode ? (
                          <Badge className="bg-brand-blue text-white backdrop-blur-md rounded-lg text-[9px] border-none uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {itemDistrict}
                          </Badge>
                        ) : (
                          <Badge className="bg-brand-magenta text-white backdrop-blur-md rounded-lg text-[9px] border-none uppercase tracking-wider">
                            Statewide
                          </Badge>
                        )}
                      </div>

                      {/* Rank order overlay */}
                      <div className="absolute bottom-3 right-3 bg-black/70 px-2 py-0.5 rounded text-white text-[9px] font-black font-mono">
                        Rank: {(item as any).order !== undefined ? (item as any).order : 0}
                      </div>
                    </div>

                    {/* Descriptive layout details */}
                    <div className="p-5">
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1 uppercase tracking-tight line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 min-h-[34px]">
                        {item.description || 'No caption/description attached.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer bar */}
                  <div className="p-5 pt-0 bg-slate-50/50 border-t border-slate-100 mt-2 flex items-center justify-between">
                    {/* Order adjustment triggers */}
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, 'up')}
                        className="h-8 w-8 rounded-lg hover:bg-slate-100"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={index === displayedItems.length - 1}
                        onClick={() => handleMoveOrder(index, 'down')}
                        className="h-8 w-8 rounded-lg hover:bg-slate-100"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>

                    {/* Actions dropdown override / delete */}
                    <div className="flex gap-1.5 items-center">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => startEditing(item)}
                        className="text-slate-500 hover:text-brand-blue hover:bg-slate-100 h-8 w-8 rounded-lg"
                        title="Edit Details & URL"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDeleteImage(item.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-lg"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PICTURE METADATA & IMAGE URL EDITING MODAL FRAME */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <Card className="max-w-lg w-full border-none shadow-[0_30px_70px_rgba(0,0,0,0.4)] rounded-[32px] overflow-hidden bg-white text-left max-h-[90vh] overflow-y-auto custom-scrollbar">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between sticky top-0 z-10">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-brand-blue" />
                  Edit Gallery Image Details
                </CardTitle>
                <CardDescription className="text-xs">Adjust image URL, title, category folder, and location.</CardDescription>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditingItem(null)} className="rounded-xl h-10 w-10">
                <X className="w-5 h-5 text-slate-400" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Image URL / Link editor & Live preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-brand-magenta" />
                    Image URL / External Link <span className="text-red-500">*</span>
                  </label>
                  {editUrlValid === true && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid Image
                    </span>
                  )}
                  {editUrlValid === false && (
                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Broken Link
                    </span>
                  )}
                </div>
                <Input 
                  value={editUrl}
                  onChange={e => {
                    const val = e.target.value;
                    setEditUrl(val);
                    const clean = normalizeImageUrl(val);
                    setEditPreviewSrc(clean);
                    setEditUsingProxy(false);
                    setEditUrlValid(null);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="rounded-xl bg-slate-50 text-xs font-mono font-bold border-2 border-slate-300 focus:border-brand-magenta"
                />

                {/* Live Preview Container in Edit Modal */}
                {editUrl.trim() && (
                  <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200 relative flex items-center justify-center mt-2">
                    <img 
                      src={editPreviewSrc || normalizeImageUrl(editUrl.trim())} 
                      alt="Edit Preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onLoad={() => setEditUrlValid(true)}
                      onError={() => {
                        const clean = normalizeImageUrl(editUrl.trim());
                        if (!editUsingProxy && clean && !clean.includes('wsrv.nl')) {
                          setEditUsingProxy(true);
                          setEditPreviewSrc(getProxiedImageUrl(clean));
                        } else {
                          setEditUrlValid(false);
                        }
                      }}
                    />
                    {editUrlValid === false && (
                      <div className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center p-3 text-center">
                        <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
                        <p className="text-xs font-bold text-red-700">ചിത്രം ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Image Title <span className="text-red-500">*</span></label>
                <Input 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="rounded-xl bg-slate-50 border-2 border-slate-300 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Caption/Description</label>
                <Textarea 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="rounded-xl bg-slate-50 border-2 border-slate-300 min-h-[70px] resize-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Category Folder</label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-2 border-slate-300 text-xs font-bold">
                      <SelectValue placeholder="Folder" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Target Scope</label>
                  {isSuperAdmin ? (
                    <Select value={editDistrict} onValueChange={setEditDistrict}>
                      <SelectTrigger className="rounded-xl h-10 bg-slate-50 border-2 border-slate-300 text-xs font-bold">
                        <SelectValue placeholder="Scope" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="state" className="font-bold text-brand-magenta">Statewide (Global)</SelectItem>
                        {DISTRICTS.map(d => (
                          <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center pl-3.5 rounded-xl border border-slate-300">
                      {userDistrictName}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setEditingItem(null)} className="h-11 rounded-xl">
                  Cancel
                </Button>
                <Button 
                  onClick={saveItemEdits}
                  className="bg-brand-magenta text-white font-black uppercase text-xs tracking-wider px-6 h-11 rounded-xl shadow-lg shadow-brand-magenta/20"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
