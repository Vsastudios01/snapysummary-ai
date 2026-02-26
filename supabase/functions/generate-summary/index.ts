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
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profile with plan
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
        JSON.stringify({
          error: "no_credits",
          message: "No credits remaining. Upgrade your plan!",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { url, format, content_type, pdf_path } = await req.json();
    if ((!url && !pdf_path) || !format) {
      return new Response(
        JSON.stringify({ error: "URL/PDF and format are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build content for Gemini
    let contentText = "";
    let title = "";

    if (pdf_path) {
      // Download PDF from storage and extract text
      const { data: fileData, error: fileError } = await supabase.storage
        .from("pdfs")
        .download(pdf_path);

      if (fileError || !fileData) {
        return new Response(
          JSON.stringify({ error: "Failed to download PDF" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Convert to base64 for Gemini multimodal
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );
      title = pdf_path.split("/").pop() || "PDF Document";

      // Use Gemini with inline PDF data
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

      const lang =
        profile.preferred_language === "pt-BR"
          ? "Respond in Portuguese (pt-BR)."
          : "Respond in the same language as the content.";
      const formatInstruction =
        formatPrompts[format] || "Provide a helpful summary.";

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: base64,
                    },
                  },
                  {
                    text: `${formatInstruction} ${lang}\n\nSummarize this PDF document. Format your response in clean markdown.`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error("Gemini PDF error:", geminiRes.status, errBody);
        if (geminiRes.status === 429)
          return new Response(
            JSON.stringify({ error: "Rate limit reached. Try again shortly." }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        throw new Error("AI generation failed");
      }

      const geminiData = await geminiRes.json();
      contentText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Summary could not be generated.";
    } else if (url) {
      title = url.length > 60 ? url.substring(0, 60) + "..." : url;

      // For YouTube or articles, try to fetch content
      let fetchedContent = "";
      const isYouTube = /youtube\.com|youtu\.be/i.test(url);

      if (!isYouTube) {
        try {
          const pageRes = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; Snapysummary/1.0; +https://snapysummary.com)",
            },
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            // Simple text extraction: remove tags
            fetchedContent = html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .substring(0, 30000); // Limit to ~30k chars
          }
        } catch (e) {
          console.log("Fetch failed, will summarize URL only:", e);
        }
      }

      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

      const lang =
        profile.preferred_language === "pt-BR"
          ? "Respond in Portuguese (pt-BR)."
          : "Respond in the same language as the content.";
      const formatInstruction =
        formatPrompts[format] || "Provide a helpful summary.";

      const userMessage = fetchedContent
        ? `${formatInstruction} ${lang}\n\nSummarize this content:\n\nURL: ${url}\n\nExtracted content:\n${fetchedContent}\n\nFormat your response in clean markdown.`
        : `${formatInstruction} ${lang}\n\nSummarize this content from the URL: ${url}\n\nFormat your response in clean markdown.`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error("Gemini error:", geminiRes.status, errBody);
        if (geminiRes.status === 429)
          return new Response(
            JSON.stringify({ error: "Rate limit reached. Try again shortly." }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        throw new Error("AI generation failed");
      }

      const geminiData = await geminiRes.json();
      contentText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Summary could not be generated.";
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
    const diffDays = Math.floor(
      (now.getTime() - lastUsed.getTime()) / 86400000
    );
    const newStreak = diffDays <= 1 ? profile.streak_days + 1 : 1;
    await supabase
      .from("profiles")
      .update({ streak_days: newStreak })
      .eq("id", profile.id);

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: profile.id,
      content_type: content_type || "article",
      tokens_used: 0,
    });

    return new Response(
      JSON.stringify({
        summary,
        credits_remaining: profile.credits_available - 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-summary error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
