// Especificações de plataformas para geração de conteúdo

export interface PlatformSpec {
  name: string;
  image: {
    dimensions: {
      width: number;
      height: number;
      aspectRatio: string;
      description: string;
    }[];
    formats: string[];
    maxSize?: string;
  };
  caption: {
    maxChars: number;
    recommendedChars?: number;
    hookChars?: number;
    hashtags: {
      min: number;
      max: number;
      strategy: string;
    };
    tips: string[];
  };
}

export const platformSpecs: Record<string, PlatformSpec> = {
  Instagram: {
    name: "Instagram",
    image: {
      dimensions: [
        {
          width: 1080,
          height: 1350,
          aspectRatio: "4:5",
          description: "Feed Retrato (Melhor Performance)",
        },
        {
          width: 1080,
          height: 1080,
          aspectRatio: "1:1",
          description: "Feed Quadrado",
        },
        {
          width: 1080,
          height: 566,
          aspectRatio: "1.91:1",
          description: "Feed Paisagem",
        },
        {
          width: 1080,
          height: 1920,
          aspectRatio: "9:16",
          description: "Stories/Reels",
        },
      ],
      formats: ["JPG", "PNG"],
      maxSize: "30 MB",
    },
    caption: {
      maxChars: 2200,
      recommendedChars: 1300,
      hookChars: 125,
      hashtags: {
        min: 5,
        max: 15,
        strategy: "Mix de nicho (baixa competição), médio alcance e populares",
      },
      tips: [
        "Use os primeiros 125 caracteres para o gancho mais impactante",
        "Conte uma história (storytelling)",
        "Quebre em parágrafos curtos",
        "Sempre inclua CTA claro",
        "Hashtags no final ou primeiro comentário",
      ],
    },
  },
  Facebook: {
    name: "Facebook",
    image: {
      dimensions: [
        {
          width: 1200,
          height: 630,
          aspectRatio: "1.91:1",
          description: "Feed Padrão/Links",
        },
        {
          width: 1080,
          height: 1080,
          aspectRatio: "1:1",
          description: "Feed Quadrado",
        },
        {
          width: 1080,
          height: 1350,
          aspectRatio: "4:5",
          description: "Feed Retrato",
        },
        {
          width: 1080,
          height: 1920,
          aspectRatio: "9:16",
          description: "Stories",
        },
      ],
      formats: ["JPG", "PNG"],
    },
    caption: {
      maxChars: 63206,
      recommendedChars: 250,
      hookChars: 125,
      hashtags: {
        min: 1,
        max: 3,
        strategy: "Menos importante que Instagram, use apenas as mais relevantes",
      },
      tips: [
        "Textos curtos (até 250 chars) performam melhor",
        "Primeiro parágrafo deve ser cativante",
        "Use quebras de linha e emojis",
        "Melhor plataforma para inserir links diretos",
      ],
    },
  },
  LinkedIn: {
    name: "LinkedIn",
    image: {
      dimensions: [
        {
          width: 1200,
          height: 627,
          aspectRatio: "1.91:1",
          description: "Feed Padrão",
        },
        {
          width: 1080,
          height: 1080,
          aspectRatio: "1:1",
          description: "Quadrado",
        },
      ],
      formats: ["JPG", "PNG", "PDF"],
    },
    caption: {
      maxChars: 3000,
      recommendedChars: 1500,
      hashtags: {
        min: 3,
        max: 5,
        strategy: "Hashtags de nicho e profissionais",
      },
      tips: [
        "Valoriza textos longos e bem elaborados",
        "Conte histórias profissionais",
        "Compartilhe aprendizados",
        "Use quebras de linha para 'respiros'",
        "Emojis profissionais com moderação (💡, 🚀, ✅)",
        "PDFs em carrossel têm alto engajamento",
      ],
    },
  },
  TikTok: {
    name: "TikTok",
    image: {
      dimensions: [
        {
          width: 1080,
          height: 1920,
          aspectRatio: "9:16",
          description: "Vídeo Vertical",
        },
      ],
      formats: ["MP4"],
    },
    caption: {
      maxChars: 2200,
      hashtags: {
        min: 3,
        max: 5,
        strategy: "Mix de trending + nicho + específico do vídeo",
      },
      tips: [
        "Legenda é CRUCIAL para SEO do algoritmo",
        "Use palavras-chave descritivas",
        "Tom informal e direto",
        "Incentive engajamento rápido",
        "Primeiros 3 segundos do vídeo são vitais",
      ],
    },
  },
  "Twitter/X": {
    name: "Twitter/X",
    image: {
      dimensions: [
        {
          width: 1600,
          height: 900,
          aspectRatio: "16:9",
          description: "Feed (1 Imagem)",
        },
        {
          width: 800,
          height: 418,
          aspectRatio: "1.91:1",
          description: "Links com Imagem (Twitter Card)",
        },
      ],
      formats: ["JPG", "PNG"],
    },
    caption: {
      maxChars: 280,
      hashtags: {
        min: 1,
        max: 2,
        strategy: "Apenas para categorizar ou juntar-se a conversas relevantes",
      },
      tips: [
        "Concisão é a chave",
        "Vá direto ao ponto",
        "Use encurtadores de link",
        "Fazer perguntas gera interação",
        "Criar enquetes é efetivo",
      ],
    },
  },
};

export function getPlatformImageSpec(
  platform: string,
  type: "feed" | "story" | "default" = "default"
): { width: number; height: number; aspectRatio: string } | null {
  const spec = platformSpecs[platform];
  if (!spec) return null;

  // Para Instagram, retornar baseado no tipo
  if (platform === "Instagram") {
    if (type === "story") {
      return spec.image.dimensions[3]; // 9:16
    }
    return spec.image.dimensions[0]; // 4:5 (melhor performance)
  }

  // Para outras plataformas, retornar primeira opção
  return spec.image.dimensions[0];
}

export function getCaptionGuidelines(platform: string): string[] {
  const spec = platformSpecs[platform];
  if (!spec) return [];

  const guidelines: string[] = [];

  if (spec.caption.maxChars) {
    guidelines.push(`Máximo de ${spec.caption.maxChars} caracteres`);
  }

  if (spec.caption.recommendedChars) {
    guidelines.push(`Recomendado: ${spec.caption.recommendedChars} caracteres`);
  }

  if (spec.caption.hookChars) {
    guidelines.push(
      `Gancho inicial: ${spec.caption.hookChars} caracteres (antes do "ver mais")`
    );
  }

  guidelines.push(
    `Hashtags: ${spec.caption.hashtags.min}-${spec.caption.hashtags.max} (${spec.caption.hashtags.strategy})`
  );

  guidelines.push(...spec.caption.tips);

  return guidelines;
}
