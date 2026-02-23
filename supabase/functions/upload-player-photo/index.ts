const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
    const supabaseAnonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
    const supabaseServiceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

    const contentType = (req.headers.get("Content-Type") ?? "").toLowerCase();
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const peladaId = String(form.get("peladaId") ?? "").trim();
    const playerId = String(form.get("playerId") ?? "").trim();
    const file = form.get("file");

    if (!peladaId || !playerId) {
      return new Response(JSON.stringify({ error: "Missing peladaId or playerId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: adminCheck, error: adminErr } = await supabaseUser.rpc("is_pelada_admin_me", {
      _pelada_id: peladaId,
    });

    if (adminErr) {
      return new Response(JSON.stringify({ error: "Invalid JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const type = (file.type || "application/octet-stream").toLowerCase();
    const extFromType = type.includes("/") ? type.split("/")[1] : "";
    const extFromName = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
    const ext = (extFromType || extFromName || "jpg").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const bucket = "player-photos";
    const objectPath = `peladas/${peladaId}/players/${playerId}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(objectPath, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: uploadErr.message || "Upload failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
    const publicUrl = (publicData?.publicUrl ?? "").trim();
    if (!publicUrl) {
      return new Response(JSON.stringify({ error: "Could not generate public url" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

