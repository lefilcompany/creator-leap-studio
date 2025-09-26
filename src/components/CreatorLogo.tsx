import React from 'react';
import logoCreator from '@/assets/logoCreatorPreta.png';

export const CreatorLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoCreator} 
        alt="Creator Logo" 
        className="h-8 w-auto object-contain"
      />
    </div>
  );
};