import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface InstitutionLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'badge' | 'full' | 'icon';
  className?: string;
}

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  size = 'md',
  variant = 'badge',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    sm: { img: 'h-6 max-w-[50px]', text: 'text-xs', sub: 'text-[9px]' },
    md: { img: 'h-8 max-w-[70px]', text: 'text-sm', sub: 'text-[10px]' },
    lg: { img: 'h-11 max-w-[95px]', text: 'text-base', sub: 'text-xs' },
    xl: { img: 'h-14 max-w-[120px]', text: 'text-xl', sub: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {!imageError ? (
        <img
          src="/institution-logo.jpg"
          alt="Institutional Examination Board Logo"
          onError={() => setImageError(true)}
          className={`${sizeMap.img} object-contain shrink-0 rounded`}
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
          <ShieldCheck className="w-5 h-5" />
        </div>
      )}

      {variant !== 'icon' && (
        <div>
          <div className={`font-bold tracking-tight text-slate-900 dark:text-slate-100 ${sizeMap.text}`}>
            Rifkins Education College
          </div>
          <div className={`text-slate-500 dark:text-slate-400 font-medium italic ${sizeMap.sub}`}>
            Impacting lives since 1953
          </div>
        </div>
      )}
    </div>
  );
};
