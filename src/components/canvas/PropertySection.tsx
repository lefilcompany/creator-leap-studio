import { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

interface PropertySectionProps {
  title: string;
  children: ReactNode;
}

export const PropertySection = ({ title, children }: PropertySectionProps) => {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xs font-semibold text-foreground mb-2">{title}</h4>
        <Separator />
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};
