import React from 'react';
import { LOGO_URL, FALLBACK_LOGO_URL } from '@/src/constants';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-42 h-42',
    xl: 'w-64 h-64',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-1", className, sizeClasses[size])}>
      <img 
        src={LOGO_URL} 
        alt="HCRS Society" 
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (target.src !== FALLBACK_LOGO_URL) {
            target.src = FALLBACK_LOGO_URL;
          }
        }}
      />
    </div>
  );
};

export default Logo;
