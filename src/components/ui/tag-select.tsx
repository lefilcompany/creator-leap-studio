import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface TagSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TagSelectProps {
  options: TagSelectOption[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  triggerClassName?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  label?: string;
  required?: boolean;
}

const TagSelect = React.forwardRef<HTMLButtonElement, TagSelectProps>(
  (
    {
      className,
      options,
      placeholder = "Selecionar",
      value,
      onValueChange,
      triggerClassName,
      disabled,
      id,
      label,
      required,
    },
    ref,
  ) => {
    const selectedOption = value ? options.find((o) => o.value === value) : null;

    return (
      <div className={cn("space-y-1.5", className)}>
        {/* Select - hidden when value is selected */}
        {!selectedOption ? (
          <Select
            value={undefined}
            onValueChange={(v) => onValueChange?.(v)}
            disabled={disabled}
          >
            <SelectTrigger
              ref={ref}
              id={id}
              className={cn(
                "w-full bg-background text-sm cursor-pointer",
                triggerClassName,
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent className="max-h-60">
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
        ) : (
          <div className="flex items-center min-h-9">
            <Badge
              variant="secondary"
              className="gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors max-w-full"
            >
              <span className="truncate">{selectedOption.label}</span>
              <button
                type="button"
                onClick={() => onValueChange?.("")}
                className="flex-shrink-0 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                aria-label={`Remover ${selectedOption.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>
    );
  },
);

TagSelect.displayName = "TagSelect";

export { TagSelect };
