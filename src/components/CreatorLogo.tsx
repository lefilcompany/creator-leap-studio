import React from 'react';
import logoImage from '../assets/logoCreatorPreta-2.png';

export const CreatorLogo = ({ className = "", size = "default" }: { className?: string; size?: "small" | "default" | "large" }) => {
  const sizeClasses = {
    small: "h-8",
    default: "h-10",
    large: "h-16"
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logoImage} 
        alt="Creator Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};