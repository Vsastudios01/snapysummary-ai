import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Plus, Library, Settings, LogOut, Copy, Download,
  FileText, Youtube, Globe, Sparkles, BarChart3, Clock, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const summaryFormats = [
  "Quick Summary",
  "Detailed Summary",
  "Bullet Points",
  "Study Mode",
  "Mindmap Style",
  "Twitter Thread",
];

const typeIcon: Record<string, any> = { video: Youtube, article: Globe, pdf: FileText };

function detectContentType(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return "video";
  if (/\.pdf$/i.test(url)) return "pdf";
  return "article";
}

export default function Dashboard() {
  const { profile, signOut, user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generate");
  const [contentUrl, setContentUrl] = useState("");
  const [format, setFormat] = useState("Quick Summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const credits = profile?.credits_available ?? 0;
  const maxCredits = profile?.plans?.credits_per_day ?? 3;
  const userName = profile?.full_name || "User";

  const fetchSummaries = useCallback(async () => {
    if (!profile) return;
    setLoadingLibrary(true);
    const { data } = await supabase
      .from("summaries")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setSummaries(data || []);
    setLoadingLibrary(false);
  }, [profile]);

  useEffect(() => {
    if (activeTab === "library") fetchSummaries();
  }, [activeTab, fetchSummaries]);

  const handleGenerate = async () => {
    if (!contentUrl) return;
    setIsGenerating(true);
    setGeneratedSummary("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: {
          url: contentUrl,
          format,
          content_type: detectContentType(contentUrl),
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        setGeneratedSummary(data.summary.summary_text);
        toast({ title: "Summary generated!", description: "Your AI summary is ready." });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSummary);
    toast({ title: "Copied to clipboard!" });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col bg-card">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Snapysummary</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { icon: Plus, label: "Generate", tab: "generate" },
            { icon: Library, label: "My Library", tab: "library" },
            { icon: BarChart3, label: "Analytics", tab: "analytics" },
            { icon: Settings, label: "Settings", tab: "settings" },
          ].map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === item.tab
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-bold">Snapysummary</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hello,</span>
              <span className="font-semibold">{userName}</span>
              {profile?.streak_days > 0 && (
                <span className="flex items-center gap-1 text-primary ml-2">
                  <Flame className="h-4 w-4" /> {profile.streak_days} day streak
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{credits} credits left</span>
              <Progress value={(credits / maxCredits) * 100} className="w-20 h-2" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "generate" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Generate Summary</h2>
                <p className="text-sm text-muted-foreground">Paste a URL to get started</p>
              </div>

              <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
                <Input
                  placeholder="Paste YouTube, article, or blog URL..."
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="h-12"
                />
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1.5 block">Summary Format</label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {summaryFormats.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="h-10 px-6 shadow-glow" onClick={handleGenerate} disabled={isGenerating || !contentUrl}>
                    {isGenerating ? (
                      <><Clock className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Generate</>
                    )}
                  </Button>
                </div>
              </div>

              {isGenerating && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border p-8 bg-card text-center">
                  <Sparkles className="h-10 w-10 text-primary mx-auto mb-4 animate-pulse" />
                  <p className="text-muted-foreground">Processing with AI... This usually takes a few seconds.</p>
                </motion.div>
              )}

              {generatedSummary && !isGenerating && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border p-6 bg-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Your Summary</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {generatedSummary}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "library" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">My Library</h2>
              {loadingLibrary ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : summaries.length === 0 ? (
                <p className="text-muted-foreground">No summaries yet. Generate your first one!</p>
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
                          <p className="text-xs text-muted-foreground">{s.summary_format} · {timeAgo(s.created_at)}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          navigator.clipboard.writeText(s.summary_text);
                          toast({ title: "Copied!" });
                        }}><Copy className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {(activeTab === "analytics" || activeTab === "settings") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto text-center py-20">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
              <p className="text-muted-foreground">This feature is coming soon.</p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
