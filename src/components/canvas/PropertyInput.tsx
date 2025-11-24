import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PropertyInputProps {
  label: string;
  value: string | number;
  onChange: (value: any) => void;
  type?: 'text' | 'number' | 'color';
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}

export const PropertyInput = ({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
  suffix,
  disabled = false
}: PropertyInputProps) => {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={value}
          onChange={(e) => {
            const val = type === 'number' ? parseFloat(e.target.value) : e.target.value;
            onChange(val);
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="h-8"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
};
