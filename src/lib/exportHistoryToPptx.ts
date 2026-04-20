import PptxGenJS from 'pptxgenjs';
import { supabase } from '@/integrations/supabase/client';
import { ACTION_TYPE_DISPLAY, type ActionType } from '@/types/action';
import creatorWatermark from '@/assets/creator-symbol.png';

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

// Watermark dims
const WM_SIZE = 0.55;
const WM_MARGIN = 0.18;

type ProgressFn = (current: number, total: number, label: string) => void;

export interface ExportPptxOptions {
  periodStart?: Date;
  periodEnd?: Date;
  includeWatermark?: boolean;
}

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

const formatDateLong = (d: Date): string => {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatDateShort = (d: Date): string => {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

const fetchAssetAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
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

const addWatermark = (slide: any, dataUrl: string | null) => {
  if (!dataUrl) return;
  slide.addImage({
    data: dataUrl,
    x: SLIDE_W - WM_SIZE - WM_MARGIN,
    y: SLIDE_H - WM_SIZE - WM_MARGIN,
    w: WM_SIZE,
    h: WM_SIZE,
    transparency: 75,
  });
};

const addCoverSlide = (
  pptx: PptxGenJS,
  count: number,
  periodStart: Date | undefined,
  periodEnd: Date | undefined,
  watermarkData: string | null,
  brandLogos: string[],
) => {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.text };

  // Accent bar on left
  slide.addShape('rect', { x: 0, y: 0, w: 0.25, h: SLIDE_H, fill: { color: COLORS.accent }, line: { type: 'none' } });

  slide.addText('Histórico Creator', {
    x: 0.8, y: 1.6, w: 8.5, h: 1.0,
    fontFace: FONT, fontSize: 44, bold: true, color: 'FFFFFF',
    align: 'left', valign: 'middle',
  });

  slide.addText(`${count} ${count === 1 ? 'conteúdo selecionado' : 'conteúdos selecionados'}`, {
    x: 0.8, y: 2.65, w: 8.5, h: 0.5,
    fontFace: FONT, fontSize: 20, color: 'FCE4EC',
    align: 'left', valign: 'middle',
  });

  // Period or export date
  let periodText = '';
  if (periodStart && periodEnd) {
    periodText = `Conteúdo de ${formatDateShort(periodStart)} a ${formatDateShort(periodEnd)}`;
  } else {
    periodText = `Exportado em ${formatDateLong(new Date())}`;
  }

  slide.addText(periodText, {
    x: 0.8, y: 3.3, w: 8.5, h: 0.4,
    fontFace: FONT, fontSize: 14, color: 'B8A0AC',
    align: 'left', valign: 'middle',
  });

  // Brand logos row (if any)
  if (brandLogos.length > 0) {
    const logoSize = 0.5;
    const gap = 0.15;
    const maxLogos = Math.min(brandLogos.length, 8);
    const totalWidth = maxLogos * logoSize + (maxLogos - 1) * gap;
    let x = 0.8;
    for (let i = 0; i < maxLogos; i++) {
      slide.addImage({
        data: brandLogos[i],
        x,
        y: 4.0,
        w: logoSize,
        h: logoSize,
        sizing: { type: 'cover', w: logoSize, h: logoSize },
      });
      x += logoSize + gap;
    }
    void totalWidth;
  }

  slide.addText('Creator by Lefil', {
    x: 0.8, y: SLIDE_H - 0.5, w: 6.0, h: 0.4,
    fontFace: FONT, fontSize: 11, color: 'B8A0AC', italic: true,
    align: 'left', valign: 'middle',
  });

  addWatermark(slide, watermarkData);
};

const addContentSlide = (
  pptx: PptxGenJS,
  action: ActionRow,
  image: FetchedImage,
  brandLogo: string | null,
  brandColorHex: string,
  watermarkData: string | null,
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

  // Brand logo + name
  const hasLogo = !!brandLogo;
  if (hasLogo) {
    slide.addImage({
      data: brandLogo!,
      x: 0.3, y: 0.075, w: 0.4, h: 0.4,
      sizing: { type: 'contain', w: 0.4, h: 0.4 },
    });
  }
  slide.addText(brandName, {
    x: hasLogo ? 0.8 : 0.3, y: 0.05, w: 4.5, h: 0.45,
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
    const imgBoxX = 0.3;
    const imgBoxY = contentTop;
    const imgBoxW = 4.5;
    const imgBoxH = contentH;

    slide.addShape('rect', {
      x: imgBoxX, y: imgBoxY, w: imgBoxW, h: imgBoxH,
      fill: { color: COLORS.surface }, line: { type: 'none' },
    });

    const fit = fitContain(image.width, image.height, imgBoxX, imgBoxY, imgBoxW, imgBoxH);
    slide.addImage({
      data: image.dataUrl!,
      x: fit.x, y: fit.y, w: fit.w, h: fit.h,
    });

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

  // Watermark
  addWatermark(slide, watermarkData);
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
  options: ExportPptxOptions = {},
): Promise<void> {
  if (actionIds.length === 0) throw new Error('Nenhum item selecionado');

  const includeWatermark = options.includeWatermark !== false; // default true

  onProgress?.(0, actionIds.length, 'Buscando conteúdos...');

  const { data: actions, error } = await supabase
    .from('actions')
    .select('id, type, created_at, details, result, thumb_path, brands(id, name, brand_color, avatar_url)')
    .in('id', actionIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!actions || actions.length === 0) throw new Error('Conteúdos não encontrados');

  // Pre-fetch unique brand logos
  onProgress?.(0, actions.length, 'Carregando logos das marcas...');
  const uniqueBrandLogos = new Map<string, string>(); // brandId -> avatar_url
  (actions as any[]).forEach((a) => {
    if (a.brands?.id && a.brands?.avatar_url && !uniqueBrandLogos.has(a.brands.id)) {
      uniqueBrandLogos.set(a.brands.id, a.brands.avatar_url);
    }
  });

  const logoEntries = Array.from(uniqueBrandLogos.entries());
  const logoResults = await Promise.all(
    logoEntries.map(async ([id, url]) => [id, await fetchAssetAsDataUrl(url)] as const)
  );
  const brandLogoMap = new Map<string, string>();
  logoResults.forEach(([id, data]) => {
    if (data) brandLogoMap.set(id, data);
  });

  // Watermark
  let watermarkData: string | null = null;
  if (includeWatermark) {
    watermarkData = await fetchAssetAsDataUrl(creatorWatermark);
  }

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_WIDE_CUSTOM', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'LAYOUT_WIDE_CUSTOM';
  pptx.title = 'Histórico Creator';
  pptx.author = 'Creator by Lefil';
  pptx.company = 'Lefil';

  const coverLogos = Array.from(brandLogoMap.values());
  addCoverSlide(pptx, actions.length, options.periodStart, options.periodEnd, watermarkData, coverLogos);

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i] as unknown as ActionRow;
    onProgress?.(i + 1, actions.length, `Processando ${i + 1} de ${actions.length}...`);

    const imgUrl = resolveImageUrl(action);
    const image: FetchedImage = imgUrl
      ? await fetchImageAsDataUrl(imgUrl)
      : { dataUrl: null, width: 0, height: 0 };

    const brandColor = normalizeBrandColor(action.brands?.brand_color);
    const brandLogo = action.brands?.id ? brandLogoMap.get(action.brands.id) || null : null;
    addContentSlide(pptx, action, image, brandLogo, brandColor, watermarkData);
  }

  onProgress?.(actions.length, actions.length, 'Gerando arquivo...');
  const today = new Date().toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `historico-creator-${today}.pptx` });
}
