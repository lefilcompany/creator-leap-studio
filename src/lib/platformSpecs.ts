// Especificações de plataformas para geração de conteúdo

export interface PlatformSpec {
  name: string;
  organic: {
    image: {
      dimensions: {
        width: number;
        height: number;
        aspectRatio: string;
        description: string;
      }[];
      formats: string[];
      maxSize?: string;
      safeZone?: string;
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
  };
  ads?: {
    image: {
      dimensions: {
        width: number;
        height: number;
        aspectRatio: string;
        description: string;
      }[];
      formats?: string[];
      textRule?: string;
    };
    caption: {
      maxChars: number;
      recommendedChars?: number;
      hookChars?: number;
      hashtags?: {
        min: number;
        max: number;
        strategy: string;
      };
      title?: {
        maxChars: number;
        recommendedChars: number;
      };
      description?: {
        maxChars: number;
      };
      tips: string[];
    };
  };
}

export const platformSpecs: Record<string, PlatformSpec> = {
  Instagram: {
    name: "Instagram",
    organic: {
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
        formats: ["JPG", "PNG", "MP4"],
        maxSize: "30 MB",
        safeZone: "Mantenha textos centralizados em Stories/Reels",
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
          "Sempre inclua CTA claro: 'Comente abaixo', 'Salve este post', 'Clique no link da bio'",
          "Hashtags no final ou primeiro comentário",
        ],
      },
    },
    ads: {
      image: {
        dimensions: [
          {
            width: 1080,
            height: 1350,
            aspectRatio: "4:5",
            description: "Feed (Recomendado)",
          },
          {
            width: 1080,
            height: 1920,
            aspectRatio: "9:16",
            description: "Stories/Reels",
          },
          {
            width: 1080,
            height: 1080,
            aspectRatio: "1:1",
            description: "Feed Quadrado",
          },
        ],
        textRule: "Algoritmo favorece imagens com pouco ou nenhum texto sobreposto",
      },
      caption: {
        maxChars: 2200,
        recommendedChars: 125,
        title: {
          maxChars: 40,
          recommendedChars: 40,
        },
        tips: [
          "Três primeiras linhas são as mais importantes",
          "Seja direto e claro sobre a oferta",
          "Use botão de CTA nativo do Gerenciador",
          "Reforce a ação na legenda",
        ],
      },
    },
  },
  Facebook: {
    name: "Facebook",
    organic: {
      image: {
        dimensions: [
          {
            width: 1200,
            height: 630,
            aspectRatio: "1.91:1",
            description: "Feed Padrão/Links (Open Graph)",
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
        formats: ["JPG", "PNG", "MP4"],
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
          "Use quebras de linha, emojis e listas",
          "Melhor plataforma para inserir links diretos no corpo da postagem",
        ],
      },
    },
    ads: {
      image: {
        dimensions: [
          {
            width: 1080,
            height: 1080,
            aspectRatio: "1:1",
            description: "Feed (Recomendado para impacto)",
          },
          {
            width: 1200,
            height: 630,
            aspectRatio: "1.91:1",
            description: "Feed/Tráfego",
          },
          {
            width: 1080,
            height: 1920,
            aspectRatio: "9:16",
            description: "Stories/Messenger",
          },
        ],
      },
      caption: {
        maxChars: 125,
        recommendedChars: 125,
        title: {
          maxChars: 40,
          recommendedChars: 30,
        },
        description: {
          maxChars: 30,
        },
        tips: [
          "Texto principal: até 125 caracteres",
          "Título: 25-40 caracteres (parte mais lida depois da imagem)",
          "Descrição do link: ~30 caracteres",
          "Teste diferentes combinações com Criativos Dinâmicos",
        ],
      },
    },
  },
  LinkedIn: {
    name: "LinkedIn",
    organic: {
      image: {
        dimensions: [
          {
            width: 1200,
            height: 627,
            aspectRatio: "1.91:1",
            description: "Feed Padrão (Ideal para links de blog)",
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
          strategy: "Hashtags de nicho e profissionais para descoberta",
        },
        tips: [
          "LinkedIn valoriza textos longos e bem elaborados",
          "Conte histórias profissionais, compartilhe aprendizados",
          "Use quebras de linha para criar 'respiros'",
          "Emojis profissionais com moderação (💡, 🚀, ✅)",
          "PDFs em carrossel têm altíssimo engajamento",
          "Inicie discussões aprofundadas",
        ],
      },
    },
    ads: {
      image: {
        dimensions: [
          {
            width: 1200,
            height: 627,
            aspectRatio: "1.91:1",
            description: "Anúncio de Imagem Única",
          },
          {
            width: 1080,
            height: 1080,
            aspectRatio: "1:1",
            description: "Carrossel (por card)",
          },
        ],
      },
      caption: {
        maxChars: 600,
        recommendedChars: 150,
        title: {
          maxChars: 200,
          recommendedChars: 70,
        },
        tips: [
          "Texto introdutório: até 600 chars, mas mantenha em 150",
          "Título: até 200 chars, recomendado 70 para melhor visualização",
          "CTA: escolha entre opções pré-definidas",
        ],
      },
    },
  },
  TikTok: {
    name: "TikTok",
    organic: {
      image: {
        dimensions: [
          {
            width: 1080,
            height: 1920,
            aspectRatio: "9:16",
            description: "Vídeo Vertical (3s a 10min)",
          },
        ],
        formats: ["MP4"],
        safeZone: "Mantenha foco e textos centralizados (interface ocupa tela)",
      },
      caption: {
        maxChars: 2200,
        hashtags: {
          min: 3,
          max: 5,
          strategy: "Mix de trending (#trend) + nicho (#marketingdigital) + específico",
        },
        tips: [
          "Legenda é EXTREMAMENTE importante para o algoritmo SEO",
          "Use palavras-chave descritivas do vídeo",
          "Tom informal e direto",
          "Incentive engajamento rápido ('Você sabia? Comenta aí!')",
          "Primeiros 3 segundos são vitais para prender atenção",
        ],
      },
    },
    ads: {
      image: {
        dimensions: [
          {
            width: 1080,
            height: 1920,
            aspectRatio: "9:16",
            description: "Vídeo Vertical (Recomendado)",
          },
          {
            width: 1080,
            height: 1080,
            aspectRatio: "1:1",
            description: "Quadrado",
          },
        ],
      },
      caption: {
        maxChars: 100,
        recommendedChars: 100,
        tips: [
          "Seja MUITO direto (apenas 100 caracteres)",
          "Comunicação principal deve estar no vídeo",
          "Vídeos curtos (9-15s) performam melhor",
          "Anúncio deve parecer conteúdo nativo",
          "Use botão de CTA nativo",
        ],
      },
    },
  },
  "Twitter/X": {
    name: "Twitter/X",
    organic: {
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
          "Concisão é a CHAVE",
          "Vá direto ao ponto",
          "Use encurtadores de link (bit.ly)",
          "Fazer perguntas e criar enquetes gera interação",
          "Marcar outros perfis (@) gera engajamento",
        ],
      },
    },
    ads: {
      image: {
        dimensions: [
          {
            width: 800,
            height: 418,
            aspectRatio: "1.91:1",
            description: "Website Card",
          },
          {
            width: 800,
            height: 800,
            aspectRatio: "1:1",
            description: "App Card",
          },
          {
            width: 600,
            height: 335,
            aspectRatio: "16:9",
            description: "Imagem Simples (mínimo)",
          },
        ],
      },
      caption: {
        maxChars: 280,
        title: {
          maxChars: 70,
          recommendedChars: 50,
        },
        description: {
          maxChars: 200,
        },
        tips: [
          "Texto do Tweet: 280 caracteres",
          "Título do Card: 70 chars (cortado após 50 em algumas views)",
          "Descrição: 200 chars (não aparece em todos os lugares)",
        ],
      },
    },
  },
  Comunidades: {
    name: "Comunidades",
    organic: {
      image: {
        dimensions: [
          {
            width: 1080,
            height: 1080,
            aspectRatio: "1:1",
            description: "Quadrado (Universal - Recomendado)",
          },
          {
            width: 1600,
            height: 900,
            aspectRatio: "16:9",
            description: "Paisagem",
          },
          {
            width: 1080,
            height: 1440,
            aspectRatio: "3:4",
            description: "Retrato",
          },
        ],
        formats: ["JPG", "PNG", "GIF"],
        safeZone:
          "A imagem não precisa ser uma superprodução. Foco em agregar valor à discussão (infográfico com dados, captura de tela para ilustrar dúvida, posts inspiradores, post informativo,etc.)",
      },
      caption: {
        maxChars: 10000,
        hashtags: {
          min: 0,
          max: 3,
          strategy: "Hashtags raramente usadas, foco em gerar conversa",
        },
        tips: [
          "OBJETIVO PRINCIPAL: GERAR CONVERSA autêntica",
          "Seja Autêntico: Fale como membro, não como marca fazendo publicidade",
          "Faça Perguntas Abertas: Em vez de 'Confira nosso produto', tente 'Qual a maior dificuldade que vocês enfrentam com [problema]?'",
          "Entregue Valor Primeiro: Compartilhe dica, template ou insight valioso sem pedir nada em troca",
          "Respeite as Regras: Cada comunidade tem regras próprias sobre autopromoção. Leia-as com atenção antes de postar",
          "Imagem: Pode informativos, inspiradores, infográfico com dados, captura de tela para ilustrar",
          "CTA Sutil: 'O que vocês acham?', 'Alguém já passou por isso?', 'Deixem suas dicas nos comentários'",
          "Cultura e Engajamento são mais importantes que especificações técnicas",
        ],
      },
    },
  },
};

export function getPlatformImageSpec(
  platform: string,
  type: "feed" | "story" | "default" = "default",
  contentType: "organic" | "ads" = "organic",
): { width: number; height: number; aspectRatio: string } | null {
  const spec = platformSpecs[platform];
  if (!spec) return null;

  const imageSpec = contentType === "ads" && spec.ads ? spec.ads.image : spec.organic.image;

  // Para Instagram, retornar baseado no tipo
  if (platform === "Instagram") {
    if (type === "story") {
      return imageSpec.dimensions[3] || imageSpec.dimensions[1]; // 9:16
    }
    return imageSpec.dimensions[0]; // 4:5 (melhor performance)
  }

  // Para outras plataformas, retornar primeira opção
  return imageSpec.dimensions[0];
}

export function getCaptionGuidelines(platform: string, contentType: "organic" | "ads" = "organic"): string[] {
  const spec = platformSpecs[platform];
  if (!spec) return [];

  const captionSpec = contentType === "ads" && spec.ads ? spec.ads.caption : spec.organic.caption;

  const guidelines: string[] = [];

  if (captionSpec.maxChars) {
    guidelines.push(`Máximo de ${captionSpec.maxChars} caracteres`);
  }

  if (captionSpec.recommendedChars) {
    guidelines.push(`Recomendado: ${captionSpec.recommendedChars} caracteres`);
  }

  if (captionSpec.hookChars) {
    guidelines.push(`Gancho inicial: ${captionSpec.hookChars} caracteres (antes do "ver mais")`);
  }

  if (captionSpec.hashtags) {
    guidelines.push(
      `Hashtags: ${captionSpec.hashtags.min}-${captionSpec.hashtags.max} (${captionSpec.hashtags.strategy})`,
    );
  }

  guidelines.push(...captionSpec.tips);

  return guidelines;
}

export function getAllPlatforms(): string[] {
  return Object.keys(platformSpecs);
}
