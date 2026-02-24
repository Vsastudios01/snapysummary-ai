import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Clock, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SummaryOutput from "./SummaryOutput";

const summaryFormats = [
  "Resumo Rápido",
  "Resumo Detalhado",
  "Tópicos",
  "Modo Estudo",
  "Mapa Mental",
  "Thread Twitter",
  "Questões de Revisão",
  "Roteiro para Áudio",
  "Personalizado",
  "Multi-Idioma",
  "Resumo Visual",
  "Digest por E-mail",
];

function detectContentType(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return "video";
  if (/\.pdf$/i.test(url)) return "pdf";
  return "article";
}

interface GenerateTabProps {
  profile: any;
  onCreditsUsed: () => void;
}

export default function GenerateTab({ profile, onCreditsUsed }: GenerateTabProps) {
  const { toast } = useToast();
  const [contentUrl, setContentUrl] = useState("");
  const [format, setFormat] = useState("Resumo Rápido");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const credits = profile?.credits_available ?? 0;

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo de 20MB", variant: "destructive" });
        return;
      }
      setPdfFile(file);
      setContentUrl("");
    } else {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo PDF", variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!contentUrl && !pdfFile) return;

    if (credits <= 0) {
      toast({
        title: "Sem créditos",
        description: "Faça upgrade do seu plano para continuar gerando resumos!",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedSummary("");

    try {
      let body: any = { format };

      if (pdfFile) {
        setUploading(true);
        const userId = profile.user_id;
        const filePath = `${userId}/${Date.now()}_${pdfFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("pdfs")
          .upload(filePath, pdfFile);

        setUploading(false);
        if (uploadError) throw uploadError;

        body.pdf_path = filePath;
        body.content_type = "pdf";
      } else {
        body.url = contentUrl;
        body.content_type = detectContentType(contentUrl);
      }

      const { data, error } = await supabase.functions.invoke("generate-summary", { body });

      if (error) throw error;
      if (data?.error) {
        if (data.error === "no_credits") {
          toast({
            title: "Sem créditos",
            description: data.message || "Faça upgrade do seu plano!",
            variant: "destructive",
          });
        } else {
          toast({ title: "Erro", description: data.error, variant: "destructive" });
        }
      } else {
        setGeneratedSummary(data.summary.summary_text);
        onCreditsUsed();
        toast({ title: "Resumo gerado!", description: "Seu resumo com IA está pronto." });
      }
    } catch (err: any) {
      toast({
        title: "Falha na geração",
        description: err.message || "Algo deu errado",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Gerar Resumo</h2>
        <p className="text-sm text-muted-foreground">Cole uma URL ou envie um PDF para começar</p>
      </div>

      <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
        {/* URL input */}
        <Input
          placeholder="Cole a URL do YouTube, artigo ou blog..."
          value={contentUrl}
          onChange={(e) => {
            setContentUrl(e.target.value);
            if (e.target.value) setPdfFile(null);
          }}
          className="h-12"
          disabled={!!pdfFile}
        />

        {/* PDF upload */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handlePdfSelect}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
          >
            <Upload className="h-4 w-4 mr-2" />
            {pdfFile ? "Trocar PDF" : "Enviar PDF"}
          </Button>
          {pdfFile && (
            <div className="flex items-center gap-2 text-sm bg-secondary rounded-lg px-3 py-1.5">
              <span className="truncate max-w-[200px]">{pdfFile.name}</span>
              <button onClick={() => setPdfFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Formato do Resumo</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {summaryFormats.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="h-10 px-6 shadow-glow"
            onClick={handleGenerate}
            disabled={isGenerating || (!contentUrl && !pdfFile)}
          >
            {isGenerating ? (
              <><Clock className="h-4 w-4 mr-2 animate-spin" /> {uploading ? "Enviando..." : "Gerando..."}</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Gerar</>
            )}
          </Button>
        </div>
      </div>

      {isGenerating && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border p-8 bg-card text-center">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">
            {uploading ? "Enviando PDF..." : "Processando com IA... Isso geralmente leva alguns segundos."}
          </p>
        </motion.div>
      )}

      {generatedSummary && !isGenerating && (
        <SummaryOutput summary={generatedSummary} />
      )}
    </motion.div>
  );
}
