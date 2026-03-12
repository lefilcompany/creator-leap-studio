import * as React from "react";
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
  showClearOption?: boolean;
  clearLabel?: string;
}

const NativeSelect = React.forwardRef<HTMLButtonElement, NativeSelectProps>(
  (
    {
      className,
      options,
      placeholder,
      value,
      onValueChange,
      triggerClassName,
      disabled,
      id,
      showClearOption = false,
      clearLabel = "Nenhum",
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const clearOption = options.find((o) => o.value === "");
    const regularOptions = options.filter((o) => o.value !== "");

    return (
      <div className={cn("relative", className)}>
        <Select
          open={open}
          onOpenChange={setOpen}
          value={value && value.length > 0 ? value : undefined}
          onValueChange={(v) => {
            if (v === "__placeholder__" || v === "__clear__" || v === "__none__") {
              onValueChange?.("");
              return;
            }
            onValueChange?.(v);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            ref={ref}
            id={id}
            className={cn("w-full bg-background text-sm cursor-pointer", triggerClassName)}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>

          <SelectContent className="max-h-60">
            {placeholder && !clearOption && !showClearOption && (
              <SelectItem value="__placeholder__" disabled className="text-muted-foreground">
                {placeholder}
              </SelectItem>
            )}

            {showClearOption && (
              <SelectItem value="__none__" className="text-muted-foreground">
                {clearLabel}
              </SelectItem>
            )}

            {!showClearOption && clearOption && (
              <SelectItem value="__clear__" className="text-muted-foreground">
                {clearOption.label}
              </SelectItem>
            )}

            {regularOptions.map((option) => (
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
  },
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
