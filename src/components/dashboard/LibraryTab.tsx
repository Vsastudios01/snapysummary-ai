import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Youtube, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const typeIcon: Record<string, any> = { video: Youtube, article: Globe, pdf: FileText };

function tempoAtras(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

interface LibraryTabProps {
  profile: any;
}

export default function LibraryTab({ profile }: LibraryTabProps) {
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSummaries = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("summaries")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setSummaries(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Minha Biblioteca</h2>
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : summaries.length === 0 ? (
        <p className="text-muted-foreground">Nenhum resumo ainda. Gere o primeiro!</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            const Icon = typeIcon[s.content_type] || Globe;
            return (
              <div key={s.id} className="rounded-xl border border-border p-4 bg-card flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.title || s.original_link}</p>
                  <p className="text-xs text-muted-foreground">{s.summary_format} · {tempoAtras(s.created_at)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  navigator.clipboard.writeText(s.summary_text);
                  toast({ title: "Copiado!" });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
