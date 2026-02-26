import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Download, Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface SummaryOutputProps {
  summary: string;
}

export default function SummaryOutput({ summary }: SummaryOutputProps) {
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    toast({ title: "Copiado!" });
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumo.md";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado!" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Snapysummary", text: summary });
      } catch {}
    } else {
      navigator.clipboard.writeText(summary);
      toast({ title: "Texto copiado para compartilhar!" });
    }
  };

  const handleAudio = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border p-6 md:p-8 bg-card shadow-lg"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h3 className="text-lg font-semibold text-foreground">Seu Resumo</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar
          </Button>
          <Button
            variant={isSpeaking ? "default" : "outline"}
            size="sm"
            className="rounded-lg text-xs"
            onClick={handleAudio}
          >
            {isSpeaking ? (
              <><VolumeX className="h-3.5 w-3.5 mr-1" /> Parar</>
            ) : (
              <><Volume2 className="h-3.5 w-3.5 mr-1" /> Ouvir</>
            )}
          </Button>
        </div>
      </div>
      <div className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </motion.div>
  );
}
