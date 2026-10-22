import React from 'react';

export interface InstitutionLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header' | 'exam';
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  variant?: 'transparent' | 'solid' | 'badge';
  alt?: string;
}

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  size = 'md',
  className = '',
  imgClassName = '',
  showText = false,
  variant = 'transparent',
  alt = 'Rifkins College Official Institutional Emblem',
}) => {
  // Sizing calibrated specifically for the 2.5:1 horizontal aspect ratio of this institution logo
  // Ensures the logo is never too small, maintaining clear readability of the emblem details
  const sizeClasses: Record<string, string> = {
    sm: 'h-7 sm:h-8 w-auto max-h-9',
    md: 'h-9 sm:h-10 md:h-11 w-auto max-h-12',
    header: 'h-11 sm:h-12 md:h-13 w-auto max-h-14',
    lg: 'h-14 sm:h-16 md:h-18 w-auto max-h-20',
    xl: 'h-18 sm:h-22 md:h-24 w-auto max-h-28',
    exam: 'h-16 sm:h-20 md:h-24 w-auto max-h-28 max-w-[320px]',
  };

  const imageSrc =
    variant === 'solid' ? '/institution-logo.jpg' : '/institution-logo-transparent.png';

  const isBadge = variant === 'badge';

  const logoImg = (
    <img
      src={imageSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={`${sizeClasses[size] || sizeClasses.md} object-contain transition-transform select-none ${imgClassName}`}
      onError={(e) => {
        // Fallback cascade to transparent png or rifkins-logo
        const target = e.currentTarget as HTMLImageElement;
        if (!target.src.endsWith('/rifkins-logo.png')) {
          target.src = '/rifkins-logo.png';
        } else if (!target.src.endsWith('/institution-logo-transparent.png')) {
          target.src = '/institution-logo-transparent.png';
        }
      }}
    />
  );

  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
      {isBadge ? (
        <div className="bg-white/10 dark:bg-white/10 backdrop-blur-xs px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl shadow-xs border border-white/20 flex items-center justify-center shrink-0">
          {logoImg}
        </div>
      ) : (
        logoImg
      )}

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight tracking-tight">
            Rifkins<span className="text-amber-500">College</span>
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            Impacting lives since 1953
          </span>
        </div>
      )}
    </div>
  );
};
