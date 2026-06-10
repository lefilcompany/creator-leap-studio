import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { GOOGLE_FONTS } from "@/lib/googleFonts";

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
  customFonts?: { id: string; name: string }[];
}

export function FontPicker({ value, onChange, customFonts = [] }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => [
      ...GOOGLE_FONTS.map((f) => ({ value: f, label: f, group: "Google Fonts" })),
      ...customFonts.map((f) => ({ value: f.name, label: f.name, group: "Suas fontes" })),
    ],
    [customFonts],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal rounded-xl"
        >
          {value || "Escolha uma fonte"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar fonte..." />
          <CommandList>
            <CommandEmpty>Nenhuma fonte encontrada</CommandEmpty>
            <CommandGroup heading="Google Fonts">
              {options
                .filter((o) => o.group === "Google Fonts")
                .map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                    <span style={{ fontFamily: `'${o.value}', sans-serif` }}>{o.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
            {customFonts.length > 0 && (
              <CommandGroup heading="Suas fontes">
                {options
                  .filter((o) => o.group === "Suas fontes")
                  .map((o) => (
                    <CommandItem
                      key={o.value}
                      value={o.value}
                      onSelect={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                      {o.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
