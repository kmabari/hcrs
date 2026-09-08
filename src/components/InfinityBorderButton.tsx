import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface InfinityBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  roundedClassName?: string;
  speed?: number;
  glowOpacity?: number;
}

export const InfinityBorderButton: React.FC<InfinityBorderButtonProps> = ({
  children,
  className,
  innerClassName,
  roundedClassName = "rounded-xl sm:rounded-2xl",
  speed = 7,
  glowOpacity = 0.85,
  onClick,
  disabled,
  type = "button",
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative group p-[1.5px] inline-flex items-center justify-center overflow-hidden transition-all duration-200",
        roundedClassName,
        "shadow-xs hover:shadow-md",
        "bg-gradient-to-r from-[#1a2b5c] via-[#c9a227] to-[#1a2b5c]",
        "hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        className
      )}
      {...props}
    >
      {/* Button Content */}
      <div 
        className={cn(
          "relative w-full h-full flex items-center justify-center gap-2 font-bold transition-all",
          "rounded-[10px] sm:rounded-[14px]",
          innerClassName
        )}
      >
        {children}
      </div>
    </button>
  );
};

export default InfinityBorderButton;
