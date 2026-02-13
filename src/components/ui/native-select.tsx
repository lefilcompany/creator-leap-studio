import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface NativeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeSelectProps {
  options: NativeSelectOption[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  triggerClassName?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const NativeSelect = React.forwardRef<HTMLButtonElement, NativeSelectProps>(
  ({ className, options, placeholder, value, onValueChange, triggerClassName, disabled, id, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        <Select value={value || undefined} onValueChange={(v) => onValueChange?.(v === "__placeholder__" ? "" : v)} disabled={disabled}>
          <SelectTrigger
            ref={ref}
            id={id}
            className={cn(
              "w-full bg-background text-sm cursor-pointer",
              triggerClassName
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {placeholder && (
              <SelectItem value="__placeholder__" disabled className="text-muted-foreground">
                {placeholder}
              </SelectItem>
            )}
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
