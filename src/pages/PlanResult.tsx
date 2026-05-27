import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  Calendar,
  FileText,
  File,
  FileCode,
  Sparkles,
  Image as ImageIcon,
  Hash,
  Clock,
  Target,
  Users,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { saveAs } from "file-saver";

interface PlanPost {
  title: string;
  platform: string;
  format: string;
  summary: string;
  date: string;
  objective?: string;
  funnel?: string;
  persona?: string;
  bigIdea?: string;
  copy?: string;
  visual?: string;
  hashtags?: string[];
  bestTime?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter (X)",
  tiktok: "TikTok",
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
};

const PlanResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCopied, setIsCopied] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PlanPost | null>(null);
  const [showFullPlan, setShowFullPlan] = useState(false);

  const planContent: string | undefined = location.state?.plan;
  const posts: PlanPost[] = useMemo(() => {
    const raw = location.state?.posts;
    return Array.isArray(raw) ? raw : [];
  }, [location.state]);
  const brandId: string | undefined = location.state?.brandId;
  const actionId: string | undefined = location.state?.actionId;

  useEffect(() => {
    if (!planContent && posts.length === 0) {
      toast.error("Nenhum calendário de conteúdo encontrado");
      navigate("/plan");
    }
  }, [planContent, posts.length, navigate]);

  const handleCopy = () => {
    if (!planContent) return;
    navigator.clipboard
      .writeText(planContent)
      .then(() => {
        setIsCopied(true);
        toast.success("Planejamento copiado!");
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => toast.error("Falha ao copiar."));
  };

  const handleDownloadTxt = () => {
    if (!planContent) return;
    try {
      const blob = new Blob([planContent], { type: "text/plain;charset=utf-8" });
      saveAs(blob, `planejamento-${new Date().toISOString().split("T")[0]}.txt`);
      toast.success("Download do TXT iniciado!");
    } catch {
      toast.error("Erro ao gerar TXT.");
    }
  };

  const handleDownloadMd = () => {
    if (!planContent) return;
    try {
      const blob = new Blob([planContent], { type: "text/markdown;charset=utf-8" });
      saveAs(blob, `planejamento-${new Date().toISOString().split("T")[0]}.md`);
      toast.success("Download do Markdown iniciado!");
    } catch {
      toast.error("Erro ao gerar Markdown.");
    }
  };

  const handleDownloadDocx = async () => {
    if (!planContent) return;
    try {
      const processInlineMarkdown = (text: string): TextRun[] => {
        const parts: TextRun[] = [];
        const boldRegex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(new TextRun({ text: text.substring(lastIndex, match.index), font: "Arial", size: 24, color: "000000" }));
          }
          parts.push(new TextRun({ text: match[1], font: "Arial", size: 24, color: "000000", bold: true }));
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          parts.push(new TextRun({ text: text.substring(lastIndex), font: "Arial", size: 24, color: "000000" }));
        }
        return parts.length > 0 ? parts : [new TextRun({ text, font: "Arial", size: 24, color: "000000" })];
      };

      const paragraphs: Paragraph[] = [];
      planContent.split("\n").forEach((line) => {
        const t = line.trim();
        if (!t) {
          paragraphs.push(new Paragraph({ text: "", spacing: { after: 100 } }));
          return;
        }
        if (t.match(/^#\s+[^#]/)) {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: t.replace(/^#\s+/, ""), font: "Arial", size: 36, bold: true, color: "000000" })], spacing: { before: 240, after: 120 }, alignment: AlignmentType.LEFT }));
        } else if (t.match(/^##\s+[^#]/)) {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: t.replace(/^##\s+/, ""), font: "Arial", size: 32, bold: true, color: "000000" })], spacing: { before: 200, after: 100 } }));
        } else if (t.match(/^###\s+/)) {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: t.replace(/^###\s+/, ""), font: "Arial", size: 28, bold: true, color: "000000" })], spacing: { before: 160, after: 80 } }));
        } else if (t.match(/^(\-|\*)\s+/)) {
          paragraphs.push(new Paragraph({ children: processInlineMarkdown(t.replace(/^(\-|\*)\s+/, "")), bullet: { level: 0 }, spacing: { after: 80 } }));
        } else {
          paragraphs.push(new Paragraph({ children: processInlineMarkdown(t), spacing: { after: 100 } }));
        }
      });

      const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `planejamento-${new Date().toISOString().split("T")[0]}.docx`);
      toast.success("Download do DOCX iniciado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar DOCX.");
    }
  };

  const handleCreateContent = (post: PlanPost) => {
    const params = new URLSearchParams();
    // Build a rich description from the post for the create-content form
    const descriptionParts: string[] = [];
    if (post.title) descriptionParts.push(post.title);
    if (post.bigIdea) descriptionParts.push(post.bigIdea);
    if (post.summary) descriptionParts.push(post.summary);
    if (post.visual) descriptionParts.push(`Visual: ${post.visual}`);
    if (post.copy) descriptionParts.push(`Copy de referência: ${post.copy}`);
    params.set("prompt", descriptionParts.join("\n\n"));
    if (brandId) params.set("brand", brandId);
    if (post.platform) params.set("platform", post.platform.toLowerCase());
    navigate(`/create/content?${params.toString()}`);
  };

  if (!planContent && posts.length === 0) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/plan")}
            className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Criar Novo Planejamento
          </Button>

          <div className="flex flex-wrap gap-2">
            {planContent && (
              <Button variant="outline" onClick={() => setShowFullPlan(true)} className="gap-2">
                <FileText className="h-4 w-4" />
                Ver plano completo
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 hover:text-accent hover:border-accent hover:bg-accent/20">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border shadow-lg z-50">
                <DropdownMenuItem onClick={handleDownloadDocx} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Baixar como .docx (Word)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTxt} className="cursor-pointer">
                  <File className="h-4 w-4 mr-2" />
                  Baixar como .txt (Texto)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadMd} className="cursor-pointer">
                  <FileCode className="h-4 w-4 mr-2" />
                  Baixar como .md (Markdown)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleCopy} className="flex items-center gap-2">
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {isCopied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-primary/10 border border-primary/20 text-primary rounded-xl p-3">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Calendário de Conteúdo</h1>
            <p className="text-sm text-muted-foreground">
              {posts.length > 0
                ? `${posts.length} conteúdo(s) sugerido(s) — clique em um card para ver os detalhes`
                : `Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`}
            </p>
          </div>
        </div>

        {/* Posts grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPost(post)}
                className="group text-left bg-card rounded-2xl shadow-md hover:shadow-xl border border-border/40 hover:border-primary/40 transition-all p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {PLATFORM_LABELS[post.platform?.toLowerCase()] || post.platform || "Plataforma"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(post.date)}
                  </span>
                </div>
                <h3 className="font-semibold text-base text-foreground line-clamp-2">
                  {post.title || `Conteúdo ${idx + 1}`}
                </h3>
                {post.format && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>{post.format}</span>
                  </div>
                )}
                {post.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{post.summary}</p>
                )}
                <div className="mt-auto pt-2 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalhes →
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Fallback: no structured posts — show full markdown */
          <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b">
              <CardTitle className="text-2xl">Plano completo</CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown>{planContent || ""}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action link */}
        {actionId && (
          <div className="mt-8 text-center">
            <Button variant="link" onClick={() => navigate(`/action/${actionId}`)} className="text-muted-foreground hover:text-primary">
              Ver detalhes desta ação no histórico →
            </Button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(o) => !o && setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {PLATFORM_LABELS[selectedPost.platform?.toLowerCase()] || selectedPost.platform}
                  </Badge>
                  {selectedPost.date && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(selectedPost.date)}
                    </Badge>
                  )}
                  {selectedPost.format && (
                    <Badge variant="outline" className="gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {selectedPost.format}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedPost.title}</DialogTitle>
                {selectedPost.summary && <DialogDescription>{selectedPost.summary}</DialogDescription>}
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedPost.bigIdea && (
                  <DetailRow icon={<Lightbulb className="h-4 w-4" />} label="Grande ideia" value={selectedPost.bigIdea} />
                )}
                {selectedPost.objective && (
                  <DetailRow icon={<Target className="h-4 w-4" />} label="Objetivo" value={selectedPost.objective} />
                )}
                {selectedPost.funnel && (
                  <DetailRow icon={<Target className="h-4 w-4" />} label="Funil" value={selectedPost.funnel} />
                )}
                {selectedPost.persona && (
                  <DetailRow icon={<Users className="h-4 w-4" />} label="Persona" value={selectedPost.persona} />
                )}
                {selectedPost.copy && (
                  <DetailRow icon={<FileText className="h-4 w-4" />} label="Copy sugerida" value={selectedPost.copy} />
                )}
                {selectedPost.visual && (
                  <DetailRow icon={<ImageIcon className="h-4 w-4" />} label="Imagem / Vídeo" value={selectedPost.visual} />
                )}
                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <DetailRow
                    icon={<Hash className="h-4 w-4" />}
                    label="Hashtags"
                    value={selectedPost.hashtags.join(" ")}
                  />
                )}
                {selectedPost.bestTime && (
                  <DetailRow icon={<Clock className="h-4 w-4" />} label="Melhor horário" value={selectedPost.bestTime} />
                )}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setSelectedPost(null)}>
                  Fechar
                </Button>
                <Button onClick={() => handleCreateContent(selectedPost)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Criar este conteúdo
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Full plan modal */}
      <Dialog open={showFullPlan} onOpenChange={setShowFullPlan}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plano completo</DialogTitle>
            <DialogDescription>Conteúdo gerado em formato Markdown</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
            <ReactMarkdown>{planContent || ""}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
      {icon}
      {label}
    </div>
    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
  </div>
);

export default PlanResult;
