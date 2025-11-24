import { FabricObject } from 'fabric';

export enum CreationStep {
  INFORMATIONS = 1,
  GENERATE_IMAGE = 2,
  ADJUST_IMAGE = 3,
  EDIT_CANVAS = 4,
  FINALIZE = 5
}

export interface CanvasLayer {
  id: string;
  name: string;
  type: 'background' | 'image' | 'text' | 'shape' | 'group';
  fabricObject: FabricObject;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  thumbnail?: string;
  isGroup?: boolean;
  groupId?: string;
  children?: string[];
}

export interface CanvasState {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  zoom: number;
  canvasData: any;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'triangle' | 'star' | 'line';
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface TextProperties {
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: number;
  textAlign: 'left' | 'center' | 'right';
  opacity: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface ShapeProperties {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export const AVAILABLE_FONTS = [
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Poppins',
  'Raleway',
  'Oswald',
  'Playfair Display',
  'Bebas Neue',
  'Anton',
  'Inter'
];

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900];
