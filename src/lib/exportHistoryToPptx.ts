import PptxGenJS from 'pptxgenjs';
import { supabase } from '@/integrations/supabase/client';
import { ACTION_TYPE_DISPLAY, type ActionType } from '@/types/action';

// Color palette (no '#' for PptxGenJS)
const COLORS = {
  bg: 'FFFFFF',
  surface: 'F8F5F7',
  text: '2D1F28',
  muted: '6B5560',
  border: 'E8E0E5',
  accent: 'E91E63',
  accentSoft: 'FCE4EC',
};

const FONT = 'Calibri';

// Slide size 16:9 = 10" x 5.625"
const SLIDE_W = 10;
const SLIDE_H = 5.625;

type ProgressFn = (current: number, total: number, label: string) => void;

interface ActionRow {
  id: string;
  type: string;
  created_at: string;
  details: any;
  result: any;
  thumb_path: string | null;
  brands: { id: string; name: string; brand_color: string | null; avatar_url: string | null } | null;
}

interface FetchedImage {
  dataUrl: string | null;
  width: number;
  height: number;
}

const stripMarkdown = (text: string | undefined | null): string => {
  if (!text) return '';
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\r\n/g, '\n')
    .trim();
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
};

const fetchImageAsDataUrl = async (url: string): Promise<FetchedImage> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    // Get dimensions
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, width: dims.w, height: dims.h };
  } catch (e) {
    console.warn('Failed to fetch image:', url, e);
    return { dataUrl: null, width: 0, height: 0 };
  }
};

const resolveImageUrl = (action: ActionRow): string | null => {
  if (action.thumb_path) {
    const { data } = supabase.storage.from('content-images').getPublicUrl(action.thumb_path);
    if (data?.publicUrl) return data.publicUrl;
  }
  const r = action.result || {};
  return r.imageUrl || r.originalImage || r.thumbnailUrl || null;
};

const extractTitle = (action: ActionRow): string => {
  const r = action.result || {};
  const d = action.details || {};
  return stripMarkdown(r.title || r.headline || d.title || d.objective || ACTION_TYPE_DISPLAY[action.type as ActionType] || 'Conteúdo');
};

const extractBody = (action: ActionRow): string => {
  const r = action.result || {};
  const body = r.body || r.caption || r.suggestedCaption || r.text || r.description || r.plan || '';
  return stripMarkdown(body);
};

const extractHashtags = (action: ActionRow): string => {
  const r = action.result || {};
  if (Array.isArray(r.hashtags)) {
    return r.hashtags
      .map((h: string) => (h.startsWith('#') ? h : `#${h}`))
      .join(' ');
  }
  if (typeof r.hashtags === 'string') return r.hashtags;
  return '';
};

const extractPlatform = (action: ActionRow): string => {
  const d = action.details || {};
  return stripMarkdown(d.platform || d.format || '');
};

// Compute "contain" fit inside a box, returns image position+size
const fitContain = (imgW: number, imgH: number, boxX: number, boxY: number, boxW: number, boxH: number) => {
  if (!imgW || !imgH) return { x: boxX, y: boxY, w: boxW, h: boxH };
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  let w: number, h: number;
  if (imgRatio > boxRatio) {
    w = boxW;
    h = boxW / imgRatio;
  } else {
    h = boxH;
    w = boxH * imgRatio;
  }
  const x = boxX + (boxW - w) / 2;
  const y = boxY + (boxH - h) / 2;
  return { x, y, w, h };
};

const addCoverSlide = (pptx: PptxGenJS, count: number) => {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.text };

  // Accent bar on left
  slide.addShape('rect', { x: 0, y: 0, w: 0.25, h: SLIDE_H, fill: { color: COLORS.accent }, line: { type: 'none' } });

  slide.addText('Histórico Creator', {
    x: 0.8, y: 1.8, w: 8.5, h: 1.0,
    fontFace: FONT, fontSize: 44, bold: true, color: 'FFFFFF',
    align: 'left', valign: 'middle',
  });

  slide.addText(`${count} ${count === 1 ? 'conteúdo selecionado' : 'conteúdos selecionados'}`, {
    x: 0.8, y: 2.85, w: 8.5, h: 0.5,
    fontFace: FONT, fontSize: 20, color: 'FCE4EC',
    align: 'left', valign: 'middle',
  });

  slide.addText(`Exportado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`, {
    x: 0.8, y: 3.5, w: 8.5, h: 0.4,
    fontFace: FONT, fontSize: 14, color: 'B8A0AC',
    align: 'left', valign: 'middle',
  });

  slide.addText('Creator by Lefil', {
    x: 0.8, y: SLIDE_H - 0.6, w: 8.5, h: 0.4,
    fontFace: FONT, fontSize: 11, color: 'B8A0AC', italic: true,
    align: 'left', valign: 'middle',
  });
};

const addContentSlide = (
  pptx: PptxGenJS,
  action: ActionRow,
  image: FetchedImage,
  brandColorHex: string,
) => {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.bg };

  const brandName = action.brands?.name || 'Sem marca';
  const platform = extractPlatform(action);
  const date = formatDate(action.created_at);
  const title = extractTitle(action);
  const body = extractBody(action);
  const hashtags = extractHashtags(action);
  const typeLabel = ACTION_TYPE_DISPLAY[action.type as ActionType] || action.type;

  // Header bar
  slide.addShape('rect', {
    x: 0, y: 0, w: SLIDE_W, h: 0.55,
    fill: { color: COLORS.surface }, line: { type: 'none' },
  });
  // Brand color accent (left edge)
  slide.addShape('rect', {
    x: 0, y: 0, w: 0.12, h: SLIDE_H,
    fill: { color: brandColorHex }, line: { type: 'none' },
  });

  // Brand name (left of header)
  slide.addText(brandName, {
    x: 0.3, y: 0.05, w: 5.0, h: 0.45,
    fontFace: FONT, fontSize: 13, bold: true, color: COLORS.text,
    align: 'left', valign: 'middle', margin: 0,
  });

  // Date • Platform (right of header)
  const headerRight = [date, platform].filter(Boolean).join('  •  ');
  slide.addText(headerRight, {
    x: 5.3, y: 0.05, w: 4.5, h: 0.45,
    fontFace: FONT, fontSize: 11, color: COLORS.muted,
    align: 'right', valign: 'middle', margin: 0,
  });

  const hasImage = !!image.dataUrl;
  const contentTop = 0.75;
  const contentBottom = SLIDE_H - 0.55;
  const contentH = contentBottom - contentTop;

  if (hasImage) {
    // Image area (left half)
    const imgBoxX = 0.3;
    const imgBoxY = contentTop;
    const imgBoxW = 4.5;
    const imgBoxH = contentH;

    // Subtle background frame
    slide.addShape('rect', {
      x: imgBoxX, y: imgBoxY, w: imgBoxW, h: imgBoxH,
      fill: { color: COLORS.surface }, line: { type: 'none' },
    });

    const fit = fitContain(image.width, image.height, imgBoxX, imgBoxY, imgBoxW, imgBoxH);
    slide.addImage({
      data: image.dataUrl!,
      x: fit.x, y: fit.y, w: fit.w, h: fit.h,
    });

    // Text column (right)
    const textX = 5.0;
    const textW = SLIDE_W - textX - 0.3;
    let cursorY = contentTop;

    slide.addText(title, {
      x: textX, y: cursorY, w: textW, h: 0.7,
      fontFace: FONT, fontSize: 18, bold: true, color: COLORS.text,
      align: 'left', valign: 'top', margin: 0,
    });
    cursorY += 0.75;

    const hashtagsH = hashtags ? 0.4 : 0;
    const bodyH = contentBottom - cursorY - hashtagsH - 0.1;

    if (body) {
      slide.addText(body, {
        x: textX, y: cursorY, w: textW, h: bodyH,
        fontFace: FONT, fontSize: 11, color: COLORS.text,
        align: 'left', valign: 'top', margin: 0, paraSpaceAfter: 4,
      });
    }

    if (hashtags) {
      slide.addText(hashtags, {
        x: textX, y: contentBottom - hashtagsH, w: textW, h: hashtagsH,
        fontFace: FONT, fontSize: 10, color: COLORS.accent, italic: true,
        align: 'left', valign: 'bottom', margin: 0,
      });
    }
  } else {
    // No image: full width text layout
    const textX = 0.5;
    const textW = SLIDE_W - 1.0;
    let cursorY = contentTop + 0.1;

    slide.addText(title, {
      x: textX, y: cursorY, w: textW, h: 0.7,
      fontFace: FONT, fontSize: 22, bold: true, color: COLORS.text,
      align: 'left', valign: 'top', margin: 0,
    });
    cursorY += 0.85;

    const hashtagsH = hashtags ? 0.4 : 0;
    const bodyH = contentBottom - cursorY - hashtagsH - 0.1;

    if (body) {
      slide.addText(body, {
        x: textX, y: cursorY, w: textW, h: bodyH,
        fontFace: FONT, fontSize: 13, color: COLORS.text,
        align: 'left', valign: 'top', margin: 0, paraSpaceAfter: 6,
      });
    } else {
      slide.addText('Imagem indisponível', {
        x: textX, y: cursorY, w: textW, h: 0.4,
        fontFace: FONT, fontSize: 11, color: COLORS.muted, italic: true,
        align: 'left', valign: 'top', margin: 0,
      });
    }

    if (hashtags) {
      slide.addText(hashtags, {
        x: textX, y: contentBottom - hashtagsH, w: textW, h: hashtagsH,
        fontFace: FONT, fontSize: 11, color: COLORS.accent, italic: true,
        align: 'left', valign: 'bottom', margin: 0,
      });
    }
  }

  // Footer
  slide.addShape('rect', {
    x: 0, y: SLIDE_H - 0.4, w: SLIDE_W, h: 0.4,
    fill: { color: COLORS.surface }, line: { type: 'none' },
  });

  // Type badge
  slide.addShape('roundRect', {
    x: 0.3, y: SLIDE_H - 0.32, w: 2.0, h: 0.24,
    fill: { color: COLORS.accentSoft }, line: { type: 'none' },
    rectRadius: 0.12,
  });
  slide.addText(typeLabel, {
    x: 0.3, y: SLIDE_H - 0.32, w: 2.0, h: 0.24,
    fontFace: FONT, fontSize: 9, bold: true, color: COLORS.accent,
    align: 'center', valign: 'middle', margin: 0,
  });

  slide.addText('Creator by Lefil', {
    x: SLIDE_W - 2.5, y: SLIDE_H - 0.32, w: 2.2, h: 0.24,
    fontFace: FONT, fontSize: 9, color: COLORS.muted, italic: true,
    align: 'right', valign: 'middle', margin: 0,
  });
};

const normalizeBrandColor = (color: string | null | undefined): string => {
  if (!color) return COLORS.accent;
  const hex = color.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return hex;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return hex.split('').map(c => c + c).join('');
  }
  return COLORS.accent;
};

export async function exportActionsToPptx(
  actionIds: string[],
  onProgress?: ProgressFn,
): Promise<void> {
  if (actionIds.length === 0) throw new Error('Nenhum item selecionado');

  onProgress?.(0, actionIds.length, 'Buscando conteúdos...');

  const { data: actions, error } = await supabase
    .from('actions')
    .select('id, type, created_at, details, result, thumb_path, brands(id, name, brand_color, avatar_url)')
    .in('id', actionIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!actions || actions.length === 0) throw new Error('Conteúdos não encontrados');

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.defineLayout({ name: 'LAYOUT_WIDE', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Histórico Creator';
  pptx.author = 'Creator by Lefil';
  pptx.company = 'Lefil';

  addCoverSlide(pptx, actions.length);

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i] as unknown as ActionRow;
    onProgress?.(i + 1, actions.length, `Processando ${i + 1} de ${actions.length}...`);

    const imgUrl = resolveImageUrl(action);
    const image: FetchedImage = imgUrl
      ? await fetchImageAsDataUrl(imgUrl)
      : { dataUrl: null, width: 0, height: 0 };

    const brandColor = normalizeBrandColor(action.brands?.brand_color);
    addContentSlide(pptx, action, image, brandColor);
  }

  onProgress?.(actions.length, actions.length, 'Gerando arquivo...');
  const today = new Date().toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `historico-creator-${today}.pptx` });
}
