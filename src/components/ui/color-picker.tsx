'use client';

import { useState, useCallback } from 'react';
import { HexColorPicker, RgbColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { X, Plus, Palette } from 'lucide-react';
import { toast } from 'sonner';
import type { ColorItem } from '@/types/brand';

interface ColorPickerProps {
    colors: ColorItem[];
    onColorsChange: (colors: ColorItem[]) => void;
    maxColors?: number;
}

// Função para converter hex para rgb
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : { r: 0, g: 0, b: 0 };
};

// Função para converter rgb para hex
const rgbToHex = (r: number, g: number, b: number): string => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Função para gerar ID único
const generateId = (): string => {
    return `color-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export function ColorPicker({ colors, onColorsChange, maxColors = 10 }: ColorPickerProps) {
    const [currentColor, setCurrentColor] = useState('#ffffff');
    const [currentRgb, setCurrentRgb] = useState({ r: 255, g: 255, b: 255 });
    const [colorName, setColorName] = useState('');
    const [activeTab, setActiveTab] = useState('hex');
    const [hexInput, setHexInput] = useState('ffffff');

    // Sincronizar hex e rgb quando um deles muda
    const handleHexChange = useCallback((hex: string) => {
        // Remove o '#' se presente
        const cleanHex = hex.replace(/^#/, '');
        setCurrentColor('#' + cleanHex);
        setHexInput(cleanHex);
        setCurrentRgb(hexToRgb('#' + cleanHex));
    }, []);

    const handleRgbChange = useCallback((rgb: { r: number; g: number; b: number }) => {
        setCurrentRgb(rgb);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setCurrentColor(hex);
        setHexInput(hex);
    }, []);

    const handleManualHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Permite apenas caracteres hexadecimais e limita a 6 dígitos
        let value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
        setHexInput(value);
        if (value.length === 6) {
            setCurrentColor('#' + value);
            setCurrentRgb(hexToRgb('#' + value));
        }
    };

    const handleManualRgbChange = (component: 'r' | 'g' | 'b', value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
            const newRgb = { ...currentRgb, [component]: numValue };
            handleRgbChange(newRgb);
        }
    };

    const addColor = () => {
        // Verificar se atingiu o limite
        if (colors.length >= maxColors) {
            toast.error(`Limite máximo de ${maxColors} cores atingido`);
            return;
        }

        // Verificar se a cor já foi adicionada
        if (isColorAlreadyAdded) {
            toast.warning('Esta cor já foi adicionada à paleta');
            return;
        }

        const newColor: ColorItem = {
            id: generateId(),
            hex: currentColor,
            rgb: currentRgb,
            name: colorName.trim() || undefined,
        };

        onColorsChange([...colors, newColor]);
        setColorName('');
        toast.success(`Cor ${colorName.trim() || currentColor} adicionada à paleta`);
    };

    const removeColor = (id: string) => {
        onColorsChange(colors.filter(color => color.id !== id));
    };

    const isColorAlreadyAdded = colors.some(color => color.hex.toLowerCase() === currentColor.toLowerCase());

    return (
        <div className="space-y-4">
            <Label className="text-sm font-medium">Paleta de Cores</Label>
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Seletor Visual - 4 colunas */}
                        <div className="lg:col-span-4 space-y-3">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="hex">HEX</TabsTrigger>
                                    <TabsTrigger value="rgb">RGB</TabsTrigger>
                                </TabsList>

                                <TabsContent value="hex" className="space-y-3 mt-2">
                                    <div className="w-full">
                                        <HexColorPicker color={currentColor} onChange={handleHexChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="hex-input" className="text-sm">Valor HEX</Label>
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
                                        <RgbColorPicker color={currentRgb} onChange={handleRgbChange} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label htmlFor="r-input" className="text-sm">R</Label>
                                            <Input
                                                id="r-input"
                                                type="number"
                                                min="0"
                                                max="255"
                                                value={currentRgb.r}
                                                onChange={(e) => handleManualRgbChange('r', e.target.value)}
                                                className="text-center"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="g-input" className="text-sm">G</Label>
                                            <Input
                                                id="g-input"
                                                type="number"
                                                min="0"
                                                max="255"
                                                value={currentRgb.g}
                                                onChange={(e) => handleManualRgbChange('g', e.target.value)}
                                                className="text-center"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="b-input" className="text-sm">B</Label>
                                            <Input
                                                id="b-input"
                                                type="number"
                                                min="0"
                                                max="255"
                                                value={currentRgb.b}
                                                onChange={(e) => handleManualRgbChange('b', e.target.value)}
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
                                <Label htmlFor="color-name" className="text-sm">Nome da Cor (opcional)</Label>
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
                                    <div className="text-sm font-medium truncate mb-1">
                                        {colorName.trim() || 'Preview'}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                        {currentColor}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        RGB({currentRgb.r}, {currentRgb.g}, {currentRgb.b})
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={addColor}
                                className="w-full"
                                size="sm"
                            >
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
                                    {colors.length}/{maxColors}
                                </span>
                            </div>
                            
                            {colors.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {colors.map((color) => (
                                        <div
                                            key={color.id}
                                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div
                                                className="w-6 h-6 rounded border border-gray-300 shadow-sm flex-shrink-0"
                                                style={{ backgroundColor: color.hex }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium truncate">
                                                    {color.name || 'Sem nome'}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    {color.hex}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeColor(color.id)}
                                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10">
                                    <Palette className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                    <div className="text-xs text-muted-foreground text-center">
                                        <div className="font-medium mb-1">Nenhuma cor selecionada</div>
                                        <div>Adicione cores à sua paleta usando o seletor ao lado</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
