import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.credits_available <= 0) {
      return new Response(JSON.stringify({ error: "No credits remaining. Upgrade your plan!" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, format, content_type } = await req.json();
    if (!url || !format) {
      return new Response(JSON.stringify({ error: "URL and format are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build AI prompt based on format
    const formatPrompts: Record<string, string> = {
      "Quick Summary": "Provide a concise 3-5 sentence summary.",
      "Detailed Summary": "Provide a comprehensive detailed summary with sections.",
      "Bullet Points": "Summarize as clear bullet points with key takeaways.",
      "Study Mode": "Create a study guide with key concepts, definitions, and flashcard-style Q&A.",
      "Mindmap Style": "Create a hierarchical outline/mindmap with main topics and subtopics.",
      "Twitter Thread": "Convert into a viral Twitter thread format (numbered tweets, max 280 chars each).",
    };

    const systemPrompt = `You are Snapysummary AI, an expert content summarizer. 
The user wants a "${format}" summary. ${formatPrompts[format] || "Provide a helpful summary."}
If the content is a URL, summarize what the page is about based on the URL context.
Always respond in the same language as the content. If unsure, use Portuguese (pt-BR).
Format your response in clean markdown.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please summarize this content: ${url}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const summaryText = aiData.choices?.[0]?.message?.content || "Summary could not be generated.";

    // Extract a title from the URL
    const title = url.length > 60 ? url.substring(0, 60) + "..." : url;

    // Save summary
    const { data: summary, error: insertError } = await supabase
      .from("summaries")
      .insert({
        user_id: profile.id,
        content_type: content_type || "article",
        original_link: url,
        summary_format: format,
        summary_text: summaryText,
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

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: profile.id,
      content_type: content_type || "article",
      tokens_used: aiData.usage?.total_tokens || 0,
    });

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
