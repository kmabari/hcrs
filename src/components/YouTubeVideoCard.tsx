import React, { useState } from 'react';
import { Play, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '@/src/lib/youtube';
import { cn } from '@/lib/utils';

interface YouTubeVideoCardProps {
  url?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  compact?: boolean;
  className?: string;
}

export default function YouTubeVideoCard({
  url,
  title = 'Latest HCRS Video Update',
  description = 'വീഡിയോ പ്ലേ ചെയ്ത് കൂടുതൽ അറിയാം',
  buttonLabel = 'വീഡിയോ കാണുക / Watch Video',
  compact = false,
  className
}: YouTubeVideoCardProps) {
  const [open, setOpen] = useState(false);
  const thumbnail = getYouTubeThumbnail(url);
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!thumbnail || !embedUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          compact ? 'flex items-center gap-3 p-3' : 'block',
          className
        )}
        aria-label={buttonLabel}
      >
        <div className={cn('relative overflow-hidden bg-slate-950', compact ? 'h-24 w-36 shrink-0 rounded-xl' : 'aspect-video w-full')}>
          <img
            src={thumbnail}
            alt={`${title} thumbnail`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition-transform group-hover:scale-110">
              <Play className="h-5 w-5 fill-current" />
            </span>
          </span>
        </div>
        <div className={cn(compact ? 'min-w-0 flex-1 pr-2' : 'space-y-2 p-4 sm:p-5')}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600">
            <Video className="h-3.5 w-3.5" /> YouTube Video
          </div>
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-[#1a2b5c] sm:text-base">{title}</h3>
          <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{description}</p>
          <span className="inline-flex text-[11px] font-black text-blue-700">{buttonLabel}</span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-4xl rounded-2xl p-3 sm:p-5">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-base font-black text-[#1a2b5c] sm:text-lg">{title}</DialogTitle>
            <DialogDescription className="text-xs">YouTube-ൽ നിന്നുള്ള ഔദ്യോഗിക വീഡിയോ</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {open && (
              <iframe
                src={embedUrl}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
