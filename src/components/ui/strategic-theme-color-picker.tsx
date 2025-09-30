"use client";

import { useState } from "react";
import { HexColorPicker, RgbColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Palette } from "lucide-react";
import { toast } from "sonner";

interface ColorItem {
  id: string;
  hex: string;
  name?: string;
}

interface StrategicThemeColorPickerProps {
  colors: string;
  onColorsChange: (colors: string) => void;
  maxColors?: number;
}

const generateId = (): string => {
  return `color-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const parseColorsString = (colorsString: string): ColorItem[] => {
  try {
    if (!colorsString) return [];
    return JSON.parse(colorsString);
  } catch (e) {
    console.error("Erro ao converter string de cores:", e);
    return [];
  }
};

const stringifyColors = (colors: ColorItem[]): string => {
  try {
    return JSON.stringify(colors);
  } catch (e) {
    console.error("Erro ao converter array de cores:", e);
    return "[]";
  }
};

function hexToRgb(hex: string) {
  let c = hex.replace(/^#/, "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

export function StrategicThemeColorPicker({
  colors,
  onColorsChange,
  maxColors = 8,
}: StrategicThemeColorPickerProps) {
  const [activeTab, setActiveTab] = useState<"hex" | "rgb">("hex");
  const [currentColor, setCurrentColor] = useState("#ffffff");
  const [hexInput, setHexInput] = useState("ffffff");
  const [currentRgb, setCurrentRgb] = useState({ r: 255, g: 255, b: 255 });
  const [colorName, setColorName] = useState("");
  const [colorsList, setColorsList] = useState<ColorItem[]>(() =>
    parseColorsString(colors)
  );

  const handleHexChange = (hex: string) => {
    const cleanHex = hex.replace(/^#/, "");
    setCurrentColor("#" + cleanHex);
    setHexInput(cleanHex);
    setCurrentRgb(hexToRgb("#" + cleanHex));
  };

  const handleManualHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    setHexInput(value);
    if (value.length === 6) {
      setCurrentColor("#" + value);
      setCurrentRgb(hexToRgb("#" + value));
    }
  };

  const handleRgbChange = (rgb: { r: number; g: number; b: number }) => {
    setCurrentRgb(rgb);
    const hex = rgbToHex(rgb);
    setCurrentColor(hex);
    setHexInput(hex);
  };

  const handleManualRgbChange = (key: "r" | "g" | "b", value: string) => {
    let num = Math.max(0, Math.min(255, Number(value)));
    const newRgb = { ...currentRgb, [key]: num };
    setCurrentRgb(newRgb);
    const hex = rgbToHex(newRgb);
    setCurrentColor(hex);
    setHexInput(hex);
  };

  const addColor = () => {
    if (colorsList.length >= maxColors) {
      toast.error(`Limite máximo de ${maxColors} cores atingido`);
      return;
    }

    if (
      colorsList.some((c) => c.hex.toLowerCase() === currentColor.toLowerCase())
    ) {
      toast.warning("Esta cor já foi adicionada à paleta");
      return;
    }

    const newColor: ColorItem = {
      id: generateId(),
      hex: currentColor,
      name: colorName.trim() || undefined,
    };

    const newColorsList = [...colorsList, newColor];
    setColorsList(newColorsList);
    onColorsChange(stringifyColors(newColorsList));
    setColorName("");
    toast.success(
      `Cor ${colorName.trim() || currentColor} adicionada à paleta`
    );
  };

  const removeColor = (id: string) => {
    const newColorsList = colorsList.filter((color) => color.id !== id);
    setColorsList(newColorsList);
    onColorsChange(stringifyColors(newColorsList));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Paleta de Cores</Label>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Seletor Visual - 4 colunas */}
            <div className="lg:col-span-4 space-y-3">
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "hex" | "rgb")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="hex">HEX</TabsTrigger>
                  <TabsTrigger value="rgb">RGB</TabsTrigger>
                </TabsList>

                <TabsContent value="hex" className="space-y-3 mt-2">
                  <div className="w-full">
                    <HexColorPicker
                      color={currentColor}
                      onChange={handleHexChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hex-input" className="text-sm">
                      Valor HEX
                    </Label>
                    <div className="flex items-center">
                      <span className="pl-2 pr-1 select-none text-muted-foreground font-mono text-lg">#</span>
                      <Input
                        id="hex-input"
                        value={hexInput}
                        onChange={handleManualHexChange}
                        placeholder="ffffff"
                        maxLength={6}
                        className="text-center font-mono"
                        style={{ paddingLeft: 0 }}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rgb" className="space-y-3 mt-2">
                  <div className="w-full">
                    <RgbColorPicker
                      color={currentRgb}
                      onChange={handleRgbChange}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="r-input" className="text-sm">
                        R
                      </Label>
                      <Input
                        id="r-input"
                        type="number"
                        min="0"
                        max="255"
                        value={currentRgb.r}
                        onChange={(e) =>
                          handleManualRgbChange("r", e.target.value)
                        }
                        className="text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="g-input" className="text-sm">
                        G
                      </Label>
                      <Input
                        id="g-input"
                        type="number"
                        min="0"
                        max="255"
                        value={currentRgb.g}
                        onChange={(e) =>
                          handleManualRgbChange("g", e.target.value)
                        }
                        className="text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="b-input" className="text-sm">
                        B
                      </Label>
                      <Input
                        id="b-input"
                        type="number"
                        min="0"
                        max="255"
                        value={currentRgb.b}
                        onChange={(e) =>
                          handleManualRgbChange("b", e.target.value)
                        }
                        className="text-center"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview e Controles - 4 colunas */}
            <div className="lg:col-span-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="color-name" className="text-sm">
                  Nome da Cor (opcional)
                </Label>
                <Input
                  id="color-name"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="Ex: Azul principal"
                />
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <div
                  className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: currentColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {colorName || currentColor}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {currentColor.toUpperCase()}
                  </p>
                </div>
              </div>

              <Button onClick={addColor} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cor
              </Button>
            </div>

            {/* Lista de Cores - 4 colunas */}
            <div className="lg:col-span-4 space-y-3 mt-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Cores Selecionadas
                </Label>
                <span className="text-xs text-muted-foreground">
                  {colorsList.length}/{maxColors}
                </span>
              </div>

              {colorsList.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {colorsList.map((color) => (
                    <div
                      key={color.id}
                      className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 group"
                    >
                      <div
                        className="w-10 h-10 rounded-md border shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {color.name || color.hex}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {color.hex.toUpperCase()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => removeColor(color.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10">
                  <Palette className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma cor adicionada
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
