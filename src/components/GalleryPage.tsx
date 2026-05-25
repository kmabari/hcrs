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
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { subscribeToGallery, GalleryItem } from '@/src/lib/cms';
import { STATIC_GALLERY_IMAGES } from '../constants';
import Logo from '../Logo';

interface GalleryPageProps {
  onBack: () => void;
  onLoginClick: () => void;
}

export default function GalleryPage({ onBack, onLoginClick }: GalleryPageProps) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedImageInfo, setSelectedImageInfo] = useState<{ index: number, category: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeToGallery((data) => {
      // Merge static images with CMS images, ensuring uniqueness by URL
      const cmsUrls = new Set(data.map(item => item.url));
      const filteredStatic = (STATIC_GALLERY_IMAGES as any[]).filter(item => !cmsUrls.has(item.url));
      setGallery([...filteredStatic, ...data] as GalleryItem[]);
    });
    return () => unsub();
  }, []);

  const categories = Array.from(new Set(gallery.map(item => item.category))) as string[];
  // Ensure "Secretariat Dharna" and "MLA Petitions" are prioritized
  const sortedCategories = categories.sort((a, b) => {
    const priority = ['Secretariat Dharna', 'MLA Petitions (140 Constituencies)'];
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
    }
  };

  const handlePrev = (category: string) => {
    if (selectedImageInfo) {
      const catImages = getImagesForCategory(category);
      setSelectedImageInfo({
        ...selectedImageInfo,
        index: (selectedImageInfo.index - 1 + catImages.length) % catImages.length
      });
    }
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
              <div className="hidden sm:block">
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
      <section className="relative pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-3 bg-brand-magenta/5 text-brand-magenta px-5 py-2 rounded-full">
              <Camera className="w-4 h-4" />
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">Community Archives</span>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter uppercase mb-6">
                  Moments of <span className="text-brand-magenta italic">Impact</span> & Unity
                </h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                  Explore our journey through the lens of community action, from the dharnas at Secretariat to district meetings that drive our revival.
                </p>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="bg-white p-6 rounded-[32px] shadow-premium border border-white flex items-center gap-4">
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

      {/* Filter Rail */}
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
                className="h-10 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
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
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No folders yet</p>
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
                className="scroll-mt-48 transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 border-l-4 border-brand-magenta pl-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                      {category}
                    </h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
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
                          View All
                          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="bg-white/50 backdrop-blur-sm rounded-[56px] p-6 sm:p-10 border border-slate-100 shadow-premium">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    <AnimatePresence mode="popLayout">
                      {displayImages.map((item, index) => (
                        <motion.div
                          layout
                          key={item.url}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.4 }}
                          className="group relative"
                        >
                          <div 
                            className="relative aspect-[4/5] overflow-hidden rounded-[24px] sm:rounded-[40px] bg-white p-2 sm:p-3 shadow-premium border border-white cursor-zoom-in transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                            onClick={() => setSelectedImageInfo({ index, category })}
                          >
                            <div className="w-full h-full rounded-[18px] sm:rounded-[30px] overflow-hidden relative">
                              <img 
                                src={item.url} 
                                alt={item.title} 
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 sm:p-6 flex flex-col justify-end">
                                <Maximize2 className="w-4 h-4 text-brand-magenta mb-2 scale-90 group-hover:scale-100 transition-transform" />
                                <h4 className="text-white font-black text-xs sm:text-lg uppercase tracking-tight leading-none truncate">{item.title}</h4>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {!isExpanded && catImages.length > 4 && (
                    <div className="mt-10 pt-10 border-t border-slate-100/50 flex justify-center">
                       <Button
                        variant="ghost" 
                        onClick={() => toggleCategoryExpand(category)}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-brand-blue"
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
        {selectedImageInfo !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
            onClick={() => setSelectedImageInfo(null)}
          >
            {/* Header Controls */}
            <div className="p-6 flex items-center justify-between relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                     <Logo size="sm" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase text-xs tracking-widest leading-none">
                      {getImagesForCategory(selectedImageInfo.category)[selectedImageInfo.index].title}
                    </h3>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                      {selectedImageInfo.category} Folder
                    </p>
                  </div>
               </div>
               
               <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-2xl w-12 h-12"
                onClick={() => setSelectedImageInfo(null)}
               >
                 <X className="w-6 h-6" />
               </Button>
            </div>

            {/* Main Stage */}
            <div className="flex-1 relative flex items-center justify-center p-4">
               <motion.button 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={(e) => { e.stopPropagation(); handlePrev(selectedImageInfo.category); }}
                className="absolute left-4 md:left-8 z-20 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-95 group"
               >
                 <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
               </motion.button>

               <motion.div 
                 key={`${selectedImageInfo.category}-${selectedImageInfo.index}`}
                 initial={{ opacity: 0, scale: 0.9, x: 50 }}
                 animate={{ opacity: 1, scale: 1, x: 0 }}
                 exit={{ opacity: 0, scale: 0.9, x: -50 }}
                 className="relative max-w-5xl max-h-full w-full h-full flex items-center justify-center"
                 onClick={e => e.stopPropagation()}
               >
                 <img 
                  src={getImagesForCategory(selectedImageInfo.category)[selectedImageInfo.index].url}
                  alt="Fullscreen view"
                  className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
                  referrerPolicy="no-referrer"
                 />
               </motion.div>

               <motion.button 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={(e) => { e.stopPropagation(); handleNext(selectedImageInfo.category); }}
                className="absolute right-4 md:right-8 z-20 w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-95 group"
               >
                 <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
               </motion.button>
            </div>

            {/* Footer Thumbnails */}
            <div className="p-8 relative z-10 bg-gradient-to-t from-slate-950 to-transparent">
               <div className="max-w-4xl mx-auto flex justify-center gap-3 overflow-x-auto no-scrollbar pb-2">
                 {getImagesForCategory(selectedImageInfo.category).map((item, idx) => (
                   <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageInfo({ index: idx, category: selectedImageInfo.category });
                    }}
                    className={cn(
                      "w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-300",
                      selectedImageInfo.index === idx ? "border-brand-magenta scale-110 shadow-lg shadow-brand-magenta/40" : "border-transparent opacity-40 hover:opacity-100"
                    )}
                   >
                     <img src={item.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   </button>
                 ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-white py-16 px-6 border-t border-slate-100">
         <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
            <Logo size="sm" className="opacity-40 grayscale" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center">
              HIGHRICH COMMUNITY REVIVAL SOCIETY © {new Date().getFullYear()}<br/>
              UNITY • EMPOWERMENT • REVIVAL
            </p>
            <div className="flex gap-10">
               <Button onClick={onBack} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue">Home</Button>
               <Button onClick={onBack} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue">Guidelines</Button>
               <Button onClick={onLoginClick} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-blue">Portal</Button>
            </div>
         </div>
      </footer>
    </div>
  );
}
