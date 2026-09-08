import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface InfinityBorderCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  roundedClassName?: string;
  glowClassName?: string;
  isButton?: boolean;
  onClick?: () => void;
  speed?: number;
  borderWidth?: string;
  glowOpacity?: number;
}

export const InfinityBorderCard: React.FC<InfinityBorderCardProps> = ({
  children,
  className,
  innerClassName,
  roundedClassName = "rounded-2xl sm:rounded-3xl",
  glowClassName,
  isButton = false,
  onClick,
  borderWidth = "p-[1.5px]",
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group",
        borderWidth,
        roundedClassName,
        "flex flex-col items-center justify-center overflow-hidden transition-all duration-200",
        "shadow-sm hover:shadow-md",
        "bg-gradient-to-br from-[#1a2b5c]/30 via-[#c9a227]/40 to-[#1a2b5c]/30",
        isButton && "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        className
      )}
    >
      {/* Inner Clean Frosted Glass Surface */}
      <div 
        className={cn(
          "relative w-full h-full bg-white flex flex-col items-center justify-between border border-slate-100",
          "rounded-[14px] sm:rounded-[22px]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default InfinityBorderCard;
