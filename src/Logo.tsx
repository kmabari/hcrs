import React, { useState, useEffect } from 'react';
import { LOGO_URL, FALLBACK_LOGO_URL, ANIMATED_LOGO_URL, LOCAL_ANIMATED_LOGO_URL } from '@/src/constants';
import { subscribeToOrgSettings, OrgSettings, normalizeImageUrl } from '@/src/lib/cms';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  src?: string;
  showGlow?: boolean;
  showAura?: boolean;
  showRotatingBorder?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  animated = true, 
  src,
  showGlow = false,
  showAura = false,
  showRotatingBorder = true,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 sm:w-12 sm:h-12',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52',
    xl: 'w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64',
  };

  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(() => {
    try {
      const cached = localStorage.getItem('hcrs_cached_org_settings');
      if (cached) return JSON.parse(cached) as OrgSettings;
    } catch {
      // ignore
    }
    return null;
  });

  const getEffectiveSrc = (settings: OrgSettings | null, explicitSrc?: string): string => {
    if (explicitSrc) return normalizeImageUrl(explicitSrc);
    if (animated) {
      if (settings?.animatedLogoUrl) return normalizeImageUrl(settings.animatedLogoUrl);
      if (settings?.logoUrl) return normalizeImageUrl(settings.logoUrl);
      return LOCAL_ANIMATED_LOGO_URL || ANIMATED_LOGO_URL;
    } else {
      if (settings?.logoUrl) return normalizeImageUrl(settings.logoUrl);
      if (settings?.animatedLogoUrl) return normalizeImageUrl(settings.animatedLogoUrl);
      return LOGO_URL;
    }
  };

  const [currentSrc, setCurrentSrc] = useState<string>(() => getEffectiveSrc(orgSettings, src));
  const [loaded, setLoaded] = useState(false);
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  useEffect(() => {
    const unsub = subscribeToOrgSettings((settings) => {
      setOrgSettings(settings);
      setCurrentSrc(getEffectiveSrc(settings, src));
      setUseSvgFallback(false);
    });
    return () => unsub();
  }, [src, animated]);

  useEffect(() => {
    setCurrentSrc(getEffectiveSrc(orgSettings, src));
    setUseSvgFallback(false);
  }, [src, animated, orgSettings?.animatedLogoUrl, orgSettings?.logoUrl]);

  const handleError = () => {
    // Multi-tier fallback sequence
    if (currentSrc !== LOCAL_ANIMATED_LOGO_URL && LOCAL_ANIMATED_LOGO_URL) {
      setCurrentSrc(LOCAL_ANIMATED_LOGO_URL);
    } else if (currentSrc !== ANIMATED_LOGO_URL) {
      setCurrentSrc(ANIMATED_LOGO_URL);
    } else if (currentSrc !== 'https://i.ibb.co/whWxd4FX/782447521-1074313911653476-2779143939229298450-n.gif') {
      setCurrentSrc('https://i.ibb.co/whWxd4FX/782447521-1074313911653476-2779143939229298450-n.gif');
    } else if (currentSrc !== FALLBACK_LOGO_URL) {
      setCurrentSrc(FALLBACK_LOGO_URL);
    } else {
      setUseSvgFallback(true);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className={cn("relative flex items-center justify-center select-none", sizeClasses[size], className)}>
      {/* Crisp Rotating Multi-Color Glass Border Ring (Tight & Sharp, No muddy blur bleeding) */}
      {animated && showRotatingBorder ? (
        <div className={cn(
          "relative w-full h-full rounded-full flex items-center justify-center overflow-hidden shadow-xs",
          isSmall ? "p-[1.5px]" : "p-[2.5px]"
        )}>
          {/* Continuous Multi-Color Spectrum Beam spinning smoothly along the rim */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: isSmall ? 6 : 8,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -inset-[100%] pointer-events-none -z-10 bg-[conic-gradient(from_0deg,#ff007a_0deg,#7928ca_45deg,#0070f3_90deg,#00dfd8_135deg,#10b981_180deg,#c9a227_225deg,#f59e0b_270deg,#ff4b4b_315deg,#ff007a_360deg)] opacity-100"
          />

          {/* Clean Pristine Inner Glass Surface */}
          <div className="relative w-full h-full rounded-full bg-white flex items-center justify-center p-0.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] overflow-hidden">
            {useSvgFallback ? (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a2b5c] to-[#003366] text-[#c9a227] flex flex-col items-center justify-center p-1 shadow-inner border border-amber-400/40">
                <span className="font-black text-[10px] sm:text-xs tracking-wider">HCRS</span>
                <span className="text-[6px] text-white/80 font-bold uppercase tracking-widest">KERALA</span>
              </div>
            ) : (
              <img 
                src={currentSrc} 
                alt="HCRS Society" 
                onLoad={() => setLoaded(true)}
                onError={handleError}
                className={cn(
                  "w-full h-full object-contain transition-all duration-300",
                  loaded ? "opacity-100" : "opacity-80 scale-95"
                )}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            )}
          </div>
        </div>
      ) : (
        /* Static / Non-bordered Clean Logo */
        <div className="relative w-full h-full flex items-center justify-center p-0.5">
          {useSvgFallback ? (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a2b5c] to-[#003366] text-[#c9a227] flex flex-col items-center justify-center p-2 shadow-inner border border-amber-400/40">
              <span className="font-black text-xs sm:text-sm tracking-wider">HCRS</span>
              <span className="text-[7px] text-white/80 font-bold uppercase tracking-widest">KERALA</span>
            </div>
          ) : (
            <img 
              src={currentSrc} 
              alt="HCRS Society" 
              onLoad={() => setLoaded(true)}
              onError={handleError}
              className={cn(
                "w-full h-full object-contain transition-all duration-300",
                loaded ? "opacity-100" : "opacity-80 scale-95"
              )}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;

