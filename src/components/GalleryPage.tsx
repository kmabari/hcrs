import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  LayoutGrid, 
  ChevronRight, 
  Maximize2, 
  X, 
  Camera, 
  Calendar,
  Tag,
  LogOut,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  MapPin,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { subscribeToGallery, GalleryItem } from '@/src/lib/cms';
import { STATIC_GALLERY_IMAGES, DISTRICTS } from '../constants';
import Logo from '../Logo';

interface GalleryPageProps {
  onBack: () => void;
  onLoginClick: () => void;
}

export default function GalleryPage({ onBack, onLoginClick }: GalleryPageProps) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedImageInfo, setSelectedImageInfo] = useState<{ index: number, category: string } | null>(null);
  
  // Interactive full screen states
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const unsub = subscribeToGallery((data) => {
      // Merge static images with CMS images, ensuring uniqueness by URL
      const cmsUrls = new Set(data.map(item => item.url));
      const filteredStatic = (STATIC_GALLERY_IMAGES as any[]).filter(item => !cmsUrls.has(item.url));
      
      // Sort final unified array: order rank first, then creation date desc
      const combined = [...filteredStatic, ...data] as GalleryItem[];
      setGallery(combined);
    });
    return () => unsub();
  }, []);

  const categories = Array.from(new Set(gallery.map(item => item.category))) as string[];
  
  // Custom sorting prioritizing core legal and protest actions
  const sortedCategories = categories.sort((a, b) => {
    const priority = ['Secretariat Dharna', 'MLA Petitions (140 Constituencies)', 'Membership Campaigns', 'Welfare Activities', 'Financial Support'];
    const indexA = priority.indexOf(a);
    const indexB = priority.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    return a.localeCompare(b);
  });

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const getImagesForCategory = (category: string) => {
    return gallery.filter(item => item.category === category);
  };

  const handleNext = (category: string) => {
    if (selectedImageInfo) {
      const catImages = getImagesForCategory(category);
      setSelectedImageInfo({
        ...selectedImageInfo,
        index: (selectedImageInfo.index + 1) % catImages.length
      });
      setIsZoomed(false); // Reset zoom on image change
    }
  };

  const handlePrev = (category: string) => {
    if (selectedImageInfo) {
      const catImages = getImagesForCategory(category);
      setSelectedImageInfo({
        ...selectedImageInfo,
        index: (selectedImageInfo.index - 1 + catImages.length) % catImages.length
      });
      setIsZoomed(false); // Reset zoom on image change
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (category: string) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext(category);
    } else if (isRightSwipe) {
      handlePrev(category);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Statewide archive';
    let dateObj: Date;
    if (dateValue.toDate) {
      dateObj = dateValue.toDate();
    } else {
      dateObj = new Date(dateValue);
    }
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const scrollToCategory = (category: string) => {
    const element = document.getElementById(`category-${category.replace(/\s+/g, '-').toLowerCase()}`);
    if (element) {
      const headerOffset = 180;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-slate-900 font-sans selection:bg-brand-magenta/10">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="rounded-2xl hover:bg-slate-100 text-slate-500 transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div className="hidden sm:block text-left">
                <h1 className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] leading-none">HCRS SOCIETY</h1>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Gallery</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={onLoginClick}
              className="text-[10px] font-black uppercase tracking-widest text-brand-magenta hover:bg-brand-magenta/5 rounded-xl px-6"
            >
              Member Login
            </Button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <Button 
              className="bg-brand-blue text-white rounded-xl px-6 h-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all hidden sm:flex"
              onClick={onBack}
            >
              Support HCRS
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 text-left">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-3 bg-brand-magenta/5 text-brand-magenta px-5 py-2 rounded-full border border-brand-magenta/10">
              <Camera className="w-4 h-4" />
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">Community Archives</span>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="max-w-3xl">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-[0.95] tracking-tight uppercase mb-6">
                  Moments of <span className="text-brand-magenta bg-brand-magenta/5 px-4 py-1.5 rounded-3xl border border-brand-magenta/10">Impact</span> & Unity
                </h2>
                <p className="text-sm md:text-base text-slate-505 text-slate-500 font-bold leading-relaxed max-w-xl">
                  Explore our community journey and real-time operations, from historical protests and constituency meetings to decentralized welfare recovery events.
                </p>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="bg-white p-6 rounded-[28px] shadow-premium border border-slate-100 flex items-center gap-4">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total Captures</p>
                      <p className="text-3xl font-black text-brand-blue leading-none">{gallery.length}</p>
                   </div>
                   <div className="w-12 h-12 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue">
                      <LayoutGrid className="w-6 h-6" />
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filter Rail Nav */}
      <div className="sticky top-[73px] z-40 bg-[#FAF9FC]/90 backdrop-blur-md border-b border-slate-100 px-6 py-6 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200 shrink-0">
             <Tag className="w-4 h-4 text-slate-400" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Folders</span>
          </div>
          
          <div className="flex gap-2">
            {sortedCategories.map(cat => (
              <Button
                key={cat}
                variant="ghost"
                onClick={() => scrollToCategory(cat)}
                className="h-10 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
              >
                {cat}
              </Button>
            ))}
            {sortedCategories.length === 0 && (
               <div className="flex items-center gap-3 px-6 h-10 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  No folders yet
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Sections Grouped by Category */}
      <main className="max-w-7xl mx-auto px-6 py-16 space-y-24">
        {sortedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[56px] border border-slate-100 shadow-premium">
            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6">
               <Camera className="w-10 h-10" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No folders found in database</p>
          </div>
        ) : (
          sortedCategories.map((category) => {
            const catImages = getImagesForCategory(category);
            const isExpanded = expandedCategories.has(category);
            const displayImages = isExpanded ? catImages : catImages.slice(0, 4);

            return (
              <section 
                key={category} 
                id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}
                className="scroll-mt-48 transition-all text-left"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-l-4 border-brand-magenta pl-6">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                      {category}
                    </h3>
                    <p className="text-slate-450 text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-slate-400">
                      {catImages.length} {catImages.length === 1 ? 'Capture' : 'Captures'} in total
                    </p>
                  </div>

                  {catImages.length > 4 && (
                    <Button
                      onClick={() => toggleCategoryExpand(category)}
                      className={cn(
                        "rounded-2xl font-black text-[10px] uppercase tracking-widest px-8 shadow-lg transition-all active:scale-95 group",
                        isExpanded 
                          ? "bg-slate-100 text-slate-600 shadow-none border border-slate-200 hover:bg-slate-200" 
                          : "bg-brand-blue text-white shadow-brand-blue/20 hover:scale-105"
                      )}
                    >
                      {isExpanded ? (
                        <>Show Less Folder</>
                      ) : (
                        <>
                          View All ({catImages.length})
                          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-[42px] p-6 sm:p-10 border border-slate-100 shadow-premium">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <AnimatePresence mode="popLayout">
                      {displayImages.map((item, index) => {
                        const itemDistrictName = DISTRICTS.find(d => d.code === (item as any).district)?.name;
                        return (
                          <motion.div
                            layout
                            key={item.url + index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="group relative flex flex-col justify-between h-full"
                          >
                            <div 
                              className="relative aspect-[4/5] overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white p-2 shadow-premium border border-slate-100 cursor-zoom-in transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                              onClick={() => setSelectedImageInfo({ index, category })}
                            >
                              <div className="w-full h-full rounded-[18px] sm:rounded-[26px] overflow-hidden relative bg-slate-50">
                                <img 
                                  src={item.url} 
                                  alt={item.title} 
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115"
                                  referrerPolicy="no-referrer"
                                />
                                
                                {/* Overlay display detailed dates */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 sm:p-5 flex flex-col justify-end">
                                  <Maximize2 className="w-4 h-4 text-brand-magenta mb-2 scale-90 group-hover:scale-100 transition-transform" />
                                  <h4 className="text-white font-extrabold text-xs sm:text-sm uppercase tracking-tight leading-tight line-clamp-2">{item.title}</h4>
                                  <p className="text-[8px] sm:text-[9px] text-white/65 mt-1 font-mono tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(item.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Card descriptions info displays beneath item thumbnail */}
                            <div className="px-3 pt-3 pb-1 text-left">
                              <h5 className="font-extrabold text-slate-800 text-[11px] sm:text-xs truncate uppercase tracking-tight">{item.title}</h5>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <span className="text-[9px] font-semibold text-slate-400 font-mono">
                                  {formatDate(item.createdAt)}
                                </span>
                                {(item as any).district && (
                                  <span className="inline-flex items-center gap-1 text-[8px] bg-brand-blue/5 text-brand-blue font-bold px-1.5 py-0.5 rounded-md">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {itemDistrictName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {!isExpanded && catImages.length > 4 && (
                    <div className="mt-10 pt-8 border-t border-slate-100/50 flex justify-center">
                       <Button
                        variant="ghost" 
                        onClick={() => toggleCategoryExpand(category)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-brand-magenta/80"
                       >
                         And {catImages.length - 4} more captures
                       </Button>
                    </div>
                  )}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Lightbox / Modal */}
      <AnimatePresence>
        {selectedImageInfo !== null && (() => {
          const catImages = getImagesForCategory(selectedImageInfo.category);
          const activeItem = catImages[selectedImageInfo.index];
          if (!activeItem) return null;
          
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900 bg-slate-950 flex flex-col justify-between"
              onClick={() => setSelectedImageInfo(null)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(selectedImageInfo.category)}
            >
              {/* Header Controls */}
              <div className="p-6 flex items-center justify-between relative z-10 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                 <div className="flex items-center gap-4 text-left">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                       <Logo size="sm" />
                    </div>
                    <div>
                      <h3 className="text-white font-extrabold uppercase text-xs sm:text-sm tracking-wide leading-none">
                        {activeItem.title}
                      </h3>
                      <p className="text-brand-magenta text-[9px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        <span>{selectedImageInfo.category} folder</span>
                        <span className="text-white/35">•</span>
                        <span className="text-white/60 font-mono">{formatDate(activeItem.createdAt)}</span>
                      </p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-1.5">
                   <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsZoomed(!isZoomed);
                    }}
                    title="Toggle Zoom"
                   >
                     {isZoomed ? <ZoomOut className="w-5 h-5 text-brand-magenta" /> : <ZoomIn className="w-5 h-5 text-brand-blue" />}
                   </Button>
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/10 rounded-xl"
                    onClick={() => setSelectedImageInfo(null)}
                   >
                     <X className="w-5 h-5" />
                   </Button>
                 </div>
              </div>

              {/* Main Stage Image wrapper */}
              <div className="flex-1 relative flex items-center justify-center p-4 min-h-0 bg-slate-950/40">
                 {/* Navigation Left */}
                 <button 
                  onClick={(e) => { e.stopPropagation(); handlePrev(selectedImageInfo.category); }}
                  className="absolute left-4 md:left-8 z-20 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90 group border border-white/5"
                 >
                   <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                 </button>

                 <motion.div 
                   key={`${selectedImageInfo.category}-${selectedImageInfo.index}`}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.25 }}
                   className="max-w-5xl max-h-full w-full h-full flex flex-col items-center justify-center overflow-hidden"
                   onClick={e => e.stopPropagation()}
                   onDoubleClick={() => setIsZoomed(!isZoomed)}
                 >
                   <img 
                    src={activeItem.url}
                    alt={activeItem.title}
                    className={cn(
                      "max-w-full max-h-full object-contain rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.6)] transition-all duration-300 origin-center select-none",
                      isZoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                    )}
                    referrerPolicy="no-referrer"
                   />
                 </motion.div>

                 {/* Navigation Right */}
                 <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(selectedImageInfo.category); }}
                  className="absolute right-4 md:right-8 z-20 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-90 group border border-white/5"
                 >
                   <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                 </button>
              </div>

              {/* Footer text panel + dynamic thumbnails */}
              <div className="relative z-10 bg-slate-950 border-t border-white/5 py-6 px-6">
                 <div className="max-w-4xl mx-auto space-y-5">
                   
                   {/* Description/Caption block of edited image */}
                   {activeItem.description && (
                     <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-left text-xs max-w-xl mx-auto flex items-start gap-2.5">
                       <FileText className="w-4 h-4 text-brand-magenta shrink-0 mt-0.5" />
                       <p className="text-white/80 font-semibold leading-relaxed">
                         {activeItem.description}
                       </p>
                     </div>
                   )}

                   <div className="flex justify-center gap-2.5 overflow-x-auto no-scrollbar py-1">
                     {catImages.map((item, idx) => (
                       <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageInfo({ index: idx, category: selectedImageInfo.category });
                          setIsZoomed(false);
                        }}
                        className={cn(
                          "w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-300",
                          selectedImageInfo.index === idx ? "border-brand-magenta scale-105 shadow-md shadow-brand-magenta/35" : "border-transparent opacity-45 hover:opacity-100"
                        )}
                       >
                         <img src={item.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       </button>
                     ))}
                   </div>
                 </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <footer className="bg-white py-14 px-6 border-t border-slate-100">
         <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
            <Logo size="sm" className="opacity-45 grayscale" />
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center leading-relaxed">
              HIGHRICH COMMUNITY REVIVAL SOCIETY © {new Date().getFullYear()}<br/>
              UNITY • EMPOWERMENT • REVIVAL
            </p>
            <div className="flex gap-8">
               <Button onClick={onBack} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-magenta">Home</Button>
               <Button onClick={onBack} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-magenta">Guidelines</Button>
               <Button onClick={onLoginClick} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-magenta">Portal</Button>
            </div>
         </div>
      </footer>
    </div>
  );
}
