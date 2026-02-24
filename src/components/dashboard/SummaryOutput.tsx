import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Download, Share2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
      className="rounded-2xl border border-border p-6 bg-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Seu Resumo</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar
          </Button>
          <Button
            variant={isSpeaking ? "default" : "outline"}
            size="sm"
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
      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
        {summary}
      </div>
    </motion.div>
  );
}
