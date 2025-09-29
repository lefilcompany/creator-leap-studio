import { Wand2, CheckCircle, Calendar } from 'lucide-react';

export interface ActionResult {
  title?: string;
  body?: string;
  feedback?: string;
  plan?: string;
  imageUrl?: string;
  originalImage?: string;
}

export interface ActionDetails {
  platform?: string;
  quantity?: string;
  [key: string]: any;
}

export interface Action {
  id: string;
  type: string;
  brandId: string;
  brand?: {
    id: string;
    name: string;
  };
  details?: ActionDetails;
  result?: ActionResult;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  teamId: string;
  userId: string;
}

export interface ActionSummary {
  id: string;
  type: string;
  brandId: string;
  brand?: {
    id: string;
    name: string;
  };
  approved: boolean;
  createdAt: string;
}

export const ACTION_TYPE_DISPLAY: { [key: string]: string } = {
  'CRIAR_CONTEUDO': 'Criar conteúdo',
  'REVISAR_CONTEUDO': 'Revisar Conteúdo',
  'PLANEJAR_CONTEUDO': 'Planejar Conteúdo'
};

export const ACTION_STYLE_MAP: { [key: string]: { icon: any; background: string; color: string } } = {
  'Criar conteúdo': {
    icon: Wand2,
    background: 'bg-pink-500/10',
    color: 'text-pink-600'
  },
  'Revisar Conteúdo': {
    icon: CheckCircle,
    background: 'bg-blue-500/10', 
    color: 'text-blue-600'
  },
  'Planejar Conteúdo': {
    icon: Calendar,
    background: 'bg-purple-500/10',
    color: 'text-purple-600'
  }
};