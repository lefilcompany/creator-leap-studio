import { useState, useCallback } from 'react';
import { CanvasLayer } from '@/types/canvas';
import { FabricObject, Canvas as FabricCanvas } from 'fabric';

export const useCanvasLayers = () => {
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const generateThumbnail = useCallback((fabricObject: FabricObject, canvas?: FabricCanvas): string => {
    try {
      if (!canvas) return '';
      
      // Criar um canvas temporário para thumbnail
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 48;
      tempCanvas.height = 48;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) return '';
      
      // Configurar fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 48, 48);
      
      // Renderizar objeto redimensionado
      const bounds = fabricObject.getBoundingRect();
      const scale = Math.min(40 / bounds.width, 40 / bounds.height);
      
      ctx.save();
      ctx.translate(24, 24);
      ctx.scale(scale, scale);
      ctx.translate(-bounds.left - bounds.width / 2, -bounds.top - bounds.height / 2);
      
      fabricObject.render(ctx as any);
      ctx.restore();
      
      return tempCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return '';
    }
  }, []);

  const addLayer = useCallback((layer: CanvasLayer) => {
    setLayers(prev => [...prev, layer]);
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId]);

  const updateLayer = useCallback((id: string, updates: Partial<CanvasLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const reorderLayers = useCallback((startIndex: number, endIndex: number) => {
    setLayers(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Atualizar zIndex baseado na nova ordem
      return result.map((layer, index) => ({
        ...layer,
        zIndex: index
      }));
    });
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => 
      l.id === id ? { ...l, visible: !l.visible } : l
    ));
  }, []);

  const toggleLock = useCallback((id: string) => {
    setLayers(prev => prev.map(l => 
      l.id === id ? { ...l, locked: !l.locked } : l
    ));
  }, []);

  const duplicateLayer = useCallback(async (id: string, fabricCanvas?: FabricCanvas) => {
    const layer = layers.find(l => l.id === id);
    if (!layer || !fabricCanvas) return;

    try {
      const cloned = await layer.fabricObject.clone();
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      
      fabricCanvas.add(cloned);
      
      const newLayer: CanvasLayer = {
        ...layer,
        id: `layer-${Date.now()}`,
        name: `${layer.name} (cópia)`,
        fabricObject: cloned,
        thumbnail: generateThumbnail(cloned, fabricCanvas),
      };
      
      addLayer(newLayer);
      fabricCanvas.renderAll();
    } catch (error) {
      console.error('Error duplicating layer:', error);
    }
  }, [layers, addLayer, generateThumbnail]);

  const groupLayers = useCallback((layerIds: string[]) => {
    // TODO: Implementar agrupamento
    console.log('Grouping layers:', layerIds);
  }, []);

  const ungroupLayers = useCallback((groupId: string) => {
    // TODO: Implementar desagrupamento
    console.log('Ungrouping:', groupId);
  }, []);

  const clearLayers = useCallback(() => {
    setLayers([]);
    setSelectedLayerId(null);
  }, []);

  return {
    layers,
    selectedLayerId,
    setSelectedLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    reorderLayers,
    toggleVisibility,
    toggleLock,
    duplicateLayer,
    groupLayers,
    ungroupLayers,
    generateThumbnail,
    clearLayers,
  };
};
