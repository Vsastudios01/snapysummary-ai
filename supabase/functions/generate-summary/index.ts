import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const formatPrompts: Record<string, string> = {
  "Resumo Rápido": "Provide a concise 3-5 sentence summary in a short paragraph.",
  "Resumo Detalhado": "Provide a comprehensive detailed summary with clear sections and headings using markdown.",
  "Tópicos": "Summarize as clear bullet points with key takeaways using markdown lists.",
  "Modo Estudo": "Create a structured study guide with key concepts, definitions, and flashcard-style Q&A pairs. Use markdown headings and bold for emphasis.",
  "Mapa Mental": "Create a hierarchical outline/mindmap with main topics and subtopics using markdown indentation and nested lists.",
  "Thread Twitter": "Convert into a viral Twitter thread format (numbered tweets, max 280 chars each). Use **bold** for emphasis.",
  "Questões de Revisão": "Generate 10 quiz questions with answers based on the content. Use **Q:** and **A:** format with markdown.",
  "Roteiro para Áudio": "Convert into a natural-sounding script optimized for text-to-speech reading aloud.",
  "Personalizado": "Provide a tailored summary focusing on actionable insights and practical takeaways. Use markdown formatting.",
  "Multi-Idioma": "Translate and summarize the content in Portuguese (pt-BR). Use markdown formatting.",
  "Resumo Visual": "Describe the content as an infographic: sections with icons/emojis, stats, and visual hierarchy using markdown headings and lists.",
  "Digest por E-mail": "Format as a professional email digest with subject line, key highlights, and call-to-action links. Use markdown.",
};

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 50000);
}

async function fetchYouTubeTranscript(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Snapysummary/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try to extract captions/transcript data from YouTube page
    const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"/s);
    if (!captionMatch) return null;

    // Extract caption track URL
    const trackMatch = captionMatch[1].match(/"baseUrl"\s*:\s*"([^"]+)"/);
    if (!trackMatch) return null;

    let captionUrl = trackMatch[1].replace(/\\u0026/g, "&");
    // Fetch the transcript XML
    const captionRes = await fetch(captionUrl);
    if (!captionRes.ok) return null;
    const captionXml = await captionRes.text();

    // Extract text from XML transcript
    const textParts = captionXml.match(/<text[^>]*>([\s\S]*?)<\/text>/g);
    if (!textParts || textParts.length === 0) return null;

    const transcript = textParts
      .map(t => t.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return transcript.length > 100 ? transcript.substring(0, 50000) : null;
  } catch (e) {
    console.log("YouTube transcript extraction failed:", e);
    return null;
  }
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
        {
          role: "system",
          content: "You are an expert content summarizer. Always respond in clean, well-structured Markdown. Use headings (##, ###), bold (**text**), bullet points, and numbered lists for clarity. Keep the structure consistent and professional.",
        },
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
      ? "Respond entirely in Portuguese (pt-BR)."
      : "Respond in the same language as the content.";
    const formatInstruction = formatPrompts[format] || "Provide a helpful summary in markdown format.";

    let contentText = "";
    let title = "";

    if (pdf_path) {
      // ── PDF extraction using unpdf ──
      const { data: fileData, error: fileError } = await supabase.storage
        .from("pdfs")
        .download(pdf_path);

      if (fileError || !fileData) {
        return new Response(
          JSON.stringify({ error: "Failed to download PDF" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let pdfText = "";
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
        const { text } = await extractText(pdf, { mergePages: true });
        pdfText = typeof text === "string" ? text.substring(0, 50000) : "";
      } catch (pdfErr) {
        console.error("PDF parsing error:", pdfErr);
        // Fallback: basic text extraction
        try {
          const ab = await fileData.arrayBuffer();
          const decoder = new TextDecoder("utf-8", { fatal: false });
          const rawText = decoder.decode(new Uint8Array(ab));
          const textMatches = rawText.match(/\(([^)]+)\)/g);
          if (textMatches) {
            pdfText = textMatches.map(m => m.slice(1, -1)).join(" ").substring(0, 50000);
          }
        } catch { /* ignore fallback errors */ }
      }

      title = pdf_path.split("/").pop()?.replace(/^\d+_/, "") || "PDF Document";

      const prompt = pdfText && pdfText.length > 50
        ? `${formatInstruction}\n\n${lang}\n\nSummarize this PDF document titled "${title}":\n\n${pdfText}`
        : `${formatInstruction}\n\n${lang}\n\nThe PDF "${title}" could not be fully parsed. Provide a general template summary based on the title.`;

      contentText = await callAI(prompt);

    } else if (url) {
      title = url.length > 60 ? url.substring(0, 60) + "..." : url;
      const isYouTube = /youtube\.com|youtu\.be/i.test(url);

      if (isYouTube) {
        // ── YouTube: try transcript first, then URL-based prompt ──
        const transcript = await fetchYouTubeTranscript(url);

        if (transcript) {
          const prompt = `${formatInstruction}\n\n${lang}\n\nAnalyze and summarize this YouTube video based on its transcript.\n\nVideo URL: ${url}\n\nTranscript:\n${transcript}\n\nProvide a precise, well-structured summary. Do NOT invent information not present in the transcript.`;
          contentText = await callAI(prompt);
        } else {
          // Fallback: URL-only prompt
          const prompt = `${formatInstruction}\n\n${lang}\n\nAnalyze and precisely summarize the content of this YouTube video: ${url}\n\nProvide a structured summary based on the video topic. If you cannot access the video, summarize what the video is likely about based on the URL and provide a note that the summary is based on limited information.`;
          contentText = await callAI(prompt);
        }
      } else {
        // ── Article/URL: fetch page content ──
        let fetchedContent = "";
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

        const prompt = fetchedContent && fetchedContent.length > 100
          ? `${formatInstruction}\n\n${lang}\n\nSummarize this article:\n\nURL: ${url}\n\nContent:\n${fetchedContent}`
          : `${formatInstruction}\n\n${lang}\n\nSummarize the content from this URL: ${url}`;

        contentText = await callAI(prompt);
      }
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
