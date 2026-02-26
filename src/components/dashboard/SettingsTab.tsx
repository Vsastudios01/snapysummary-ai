import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun, Moon, User, CreditCard, Globe, Bell, Shield, Download,
  Share2, Key, Save, Trash2, LogOut, Check, Copy, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SettingsTabProps {
  profile: any;
}

export default function SettingsTab({ profile }: SettingsTabProps) {
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Local state from profile
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [theme, setTheme] = useState(profile?.theme ?? "light");
  const [language, setLanguage] = useState(profile?.preferred_language ?? "pt-BR");
  const [notifications, setNotifications] = useState(profile?.notifications_enabled ?? true);
  const [saving, setSaving] = useState<string | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Affiliate
  const [copied, setCopied] = useState(false);

  // Sync profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setTheme(profile.theme ?? "light");
      setLanguage(profile.preferred_language ?? "pt-BR");
      setNotifications(profile.notifications_enabled ?? true);
    }
  }, [profile]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const updateProfile = async (field: string, value: any) => {
    setSaving(field);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", profile.id);

    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Configuração atualizada." });
    }
  };

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    updateProfile("theme", next);
  };

  const handleSaveName = () => updateProfile("full_name", fullName);
  const handleLanguage = (v: string) => { setLanguage(v); updateProfile("preferred_language", v); };
  const handleNotifications = (v: boolean) => { setNotifications(v); updateProfile("notifications_enabled", v); };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    setSaving("password");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    // Delete user data, then sign out
    if (profile?.id) {
      await supabase.from("summaries").delete().eq("user_id", profile.id);
      await supabase.from("usage_logs").delete().eq("user_id", profile.id);
      await supabase.from("profiles").delete().eq("id", profile.id);
    }
    await signOut();
    toast({ title: "Conta deletada", description: "Seus dados foram removidos." });
  };

  const handleExport = async (format: "csv" | "json") => {
    const { data, error } = await supabase
      .from("summaries")
      .select("title, content_type, summary_format, summary_text, original_link, created_at, tags")
      .eq("user_id", profile.id);

    if (error || !data?.length) {
      toast({ title: "Nada para exportar", variant: "destructive" });
      return;
    }

    let blob: Blob;
    let filename: string;

    if (format === "json") {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      filename = "snapysummary_export.json";
    } else {
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map((r: any) =>
        Object.values(r).map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      );
      blob = new Blob([headers + "\n" + rows.join("\n")], { type: "text/csv" });
      filename = "snapysummary_export.csv";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportado!", description: `Arquivo ${format.toUpperCase()} baixado.` });
  };

  const handleCopyAffiliate = () => {
    if (profile?.affiliate_code) {
      navigator.clipboard.writeText(profile.affiliate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateAffiliate = async () => {
    const code = `SNAPY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await updateProfile("affiliate_code", code);
  };

  const planName = profile?.plans?.name ?? "FREE";
  const isPro = planName !== "FREE";

  const cardClass = "rounded-2xl border border-border bg-card shadow-[var(--shadow-md)]";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold mb-1">Configurações</h2>
        <p className="text-sm text-muted-foreground">Gerencie sua conta, preferências e segurança</p>
      </div>

      {/* Theme */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            Aparência
          </CardTitle>
          <CardDescription>Alternar entre modo claro e escuro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">{theme === "dark" ? "Modo Escuro" : "Modo Claro"}</span>
            <Switch checked={theme === "dark"} onCheckedChange={handleThemeToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <div className="flex gap-2 mt-1">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={handleSaveName} disabled={saving === "full_name"}>
                {saving === "full_name" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Plano atual</p>
              <p className="text-xs text-muted-foreground">{planName} — {profile?.plans?.credits_per_day ?? 3} créditos/dia</p>
            </div>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary">
              {planName}
            </span>
          </div>
          {!isPro && (
            <Button className="w-full shadow-glow" size="sm">
              <CreditCard className="h-4 w-4 mr-2" /> Fazer Upgrade
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Language */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Idioma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={handleLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (BR)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notificações
          </CardTitle>
          <CardDescription>Receber e-mails com novidades e digests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm">E-mails ativados</span>
            <Switch checked={notifications} onCheckedChange={handleNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleChangePassword} disabled={saving === "password" || !newPassword}>
            {saving === "password" ? "Salvando..." : "Alterar Senha"}
          </Button>

          <div className="border-t border-border pt-4 mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" /> Deletar Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação é irreversível. Todos os seus resumos e dados serão deletados permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Exportar Dados
          </CardTitle>
          <CardDescription>Baixe seus resumos como arquivo</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
            <Download className="h-4 w-4 mr-2" /> JSON
          </Button>
        </CardContent>
      </Card>

      {/* Affiliate */}
      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> Programa de Afiliados
          </CardTitle>
          <CardDescription>{isPro ? "Compartilhe e ganhe créditos" : "Disponível para planos PRO"}</CardDescription>
        </CardHeader>
        <CardContent>
          {isPro ? (
            profile?.affiliate_code ? (
              <div className="flex items-center gap-2">
                <Input value={profile.affiliate_code} readOnly className="flex-1" />
                <Button size="sm" variant="outline" onClick={handleCopyAffiliate}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleGenerateAffiliate}>Gerar Código</Button>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Faça upgrade para PRO para acessar o programa de afiliados.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
