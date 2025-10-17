import React from 'react';
import { useTheme } from 'next-themes';
import logoCreatorPreta from '@/assets/logoCreatorPreta.png';
import logoCreatorBranca from '@/assets/logoCreatorBranca.png';
export const CreatorLogo = ({
  className = ""
}: {
  className?: string;
}) => {
  const {
    theme
  } = useTheme();
  const logo = theme === 'dark' ? logoCreatorBranca : logoCreatorPreta;
  return <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="Creator Logo" className="h-14 w-auto object-contain justify-center items-center " />
    </div>;
};