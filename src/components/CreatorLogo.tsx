import React from 'react';

export const CreatorLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`creator-logo ${className}`}>
      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
        <div className="w-5 h-5 bg-gradient-to-br from-white to-white/70 rounded transform rotate-45"></div>
      </div>
      <span>CREATOR</span>
    </div>
  );
};