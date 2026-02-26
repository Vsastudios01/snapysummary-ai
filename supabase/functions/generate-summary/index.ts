import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatPrompts: Record<string, string> = {
  "Resumo Rápido": "Provide a concise 3-5 sentence summary in a short paragraph.",
  "Resumo Detalhado": "Provide a comprehensive detailed summary with clear sections and headings.",
  "Tópicos": "Summarize as clear bullet points with key takeaways.",
  "Modo Estudo": "Create a structured study guide with key concepts, definitions, and flashcard-style Q&A pairs.",
  "Mapa Mental": "Create a hierarchical outline/mindmap with main topics and subtopics using indentation.",
  "Thread Twitter": "Convert into a viral Twitter thread format (numbered tweets, max 280 chars each).",
  "Questões de Revisão": "Generate 10 quiz questions with answers based on the content. Use Q: and A: format.",
  "Roteiro para Áudio": "Convert into a natural-sounding script optimized for text-to-speech reading aloud.",
  "Personalizado": "Provide a tailored summary focusing on actionable insights and practical takeaways.",
  "Multi-Idioma": "Translate and summarize the content in Portuguese (pt-BR).",
  "Resumo Visual": "Describe the content as an infographic: sections with icons, stats, and visual hierarchy descriptions.",
  "Digest por E-mail": "Format as a professional email digest with subject line, key highlights, and call-to-action links.",
};

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 30000);
}

async function callAI(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert content summarizer. Format your response in clean markdown." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("AI gateway error:", res.status, errText);
    if (res.status === 429) throw new Error("rate_limit");
    if (res.status === 402) throw new Error("payment_required");
    throw new Error("AI generation failed");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Summary could not be generated.";
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, plans(*)")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.credits_available <= 0) {
      return new Response(
        JSON.stringify({ error: "no_credits", message: "Sem créditos. Faça upgrade do seu plano!" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { url, format, content_type, pdf_path } = await req.json();
    if ((!url && !pdf_path) || !format) {
      return new Response(
        JSON.stringify({ error: "URL/PDF and format are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = profile.preferred_language === "pt-BR"
      ? "Respond in Portuguese (pt-BR)."
      : "Respond in the same language as the content.";
    const formatInstruction = formatPrompts[format] || "Provide a helpful summary.";

    let contentText = "";
    let title = "";

    if (pdf_path) {
      const { data: fileData, error: fileError } = await supabase.storage
        .from("pdfs")
        .download(pdf_path);

      if (fileError || !fileData) {
        return new Response(
          JSON.stringify({ error: "Failed to download PDF" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract text from PDF bytes (basic text extraction)
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let pdfText = "";
      // Simple text extraction from PDF binary
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = decoder.decode(bytes);
      // Extract text between BT/ET blocks and parentheses
      const textMatches = rawText.match(/\(([^)]+)\)/g);
      if (textMatches) {
        pdfText = textMatches.map(m => m.slice(1, -1)).join(" ").substring(0, 30000);
      }

      title = pdf_path.split("/").pop() || "PDF Document";

      const prompt = pdfText
        ? `${formatInstruction} ${lang}\n\nSummarize this PDF document content:\n\n${pdfText}\n\nFormat your response in clean markdown.`
        : `${formatInstruction} ${lang}\n\nThe PDF "${title}" could not be fully parsed. Please provide a general template summary based on the document title. Format your response in clean markdown.`;

      contentText = await callAI(prompt);

    } else if (url) {
      title = url.length > 60 ? url.substring(0, 60) + "..." : url;
      let fetchedContent = "";
      const isYouTube = /youtube\.com|youtu\.be/i.test(url);

      if (!isYouTube) {
        try {
          const pageRes = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Snapysummary/1.0)" },
          });
          if (pageRes.ok) {
            fetchedContent = extractTextFromHtml(await pageRes.text());
          }
        } catch (e) {
          console.log("Fetch failed, will summarize URL only:", e);
        }
      }

      const prompt = fetchedContent
        ? `${formatInstruction} ${lang}\n\nSummarize this content:\n\nURL: ${url}\n\nExtracted content:\n${fetchedContent}\n\nFormat your response in clean markdown.`
        : `${formatInstruction} ${lang}\n\nSummarize the content from this URL: ${url}\n\nFormat your response in clean markdown.`;

      contentText = await callAI(prompt);
    }

    // Save summary
    const { data: summary, error: insertError } = await supabase
      .from("summaries")
      .insert({
        user_id: profile.id,
        content_type: content_type || "article",
        original_link: url || pdf_path,
        summary_format: format,
        summary_text: contentText,
        title,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save summary");
    }

    // Deduct credit
    await supabase
      .from("profiles")
      .update({ credits_available: profile.credits_available - 1 })
      .eq("id", profile.id);

    // Update streak
    const lastUsed = new Date(profile.updated_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastUsed.getTime()) / 86400000);
    const newStreak = diffDays <= 1 ? profile.streak_days + 1 : 1;
    await supabase.from("profiles").update({ streak_days: newStreak }).eq("id", profile.id);

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: profile.id,
      content_type: content_type || "article",
      tokens_used: 0,
    });

    return new Response(
      JSON.stringify({ summary, credits_remaining: profile.credits_available - 1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-summary error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "rate_limit" ? 429 : msg === "payment_required" ? 402 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
