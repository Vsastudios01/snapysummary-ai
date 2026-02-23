import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Plus, Library, Settings, LogOut,
  Sparkles, BarChart3, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import GenerateTab from "@/components/dashboard/GenerateTab";
import LibraryTab from "@/components/dashboard/LibraryTab";

export default function Dashboard() {
  const { profile, signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState("generate");
  const [liveCredits, setLiveCredits] = useState<number | null>(null);

  const credits = liveCredits ?? profile?.credits_available ?? 0;
  const maxCredits = profile?.plans?.credits_per_day ?? 3;
  const userName = profile?.full_name || "User";

  // Realtime credit updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel("profile-credits")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profile.id}`,
        },
        (payload) => {
          const newCredits = (payload.new as any).credits_available;
          if (typeof newCredits === "number") setLiveCredits(newCredits);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleCreditsUsed = () => {
    setLiveCredits((prev) => Math.max(0, (prev ?? credits) - 1));
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
            <GenerateTab profile={profile} onCreditsUsed={handleCreditsUsed} />
          )}

          {activeTab === "library" && (
            <LibraryTab profile={profile} />
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
