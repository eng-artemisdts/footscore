import axios from "axios";
import { env } from "@/shared/env";

const EDGE_REQUEST_TIMEOUT_MS = 30000;

const getEdgeUrl = () => {
  const withoutTrailingSlash = env.VITE_SUPABASE_URL.replace(/\/+$/, "");
  if (withoutTrailingSlash.includes("/functions/v1")) {
    return withoutTrailingSlash.replace(/\/functions\/v1\/?$/, "/functions/v1");
  }
  return `${withoutTrailingSlash}/functions/v1`;
};

export async function uploadPlayerPhoto(params: {
  peladaId: string;
  playerId: string;
  file: File;
  accessToken: string;
}): Promise<string> {
  const base = getEdgeUrl();
  const form = new FormData();
  form.append("peladaId", params.peladaId);
  form.append("playerId", params.playerId);
  form.append("file", params.file);

  const res = await axios.post(`${base}/upload-player-photo`, form, {
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${params.accessToken}`,
    },
    timeout: EDGE_REQUEST_TIMEOUT_MS,
  });

  const data = res.data as { url?: string; error?: string };
  const url = (data.url ?? "").trim();
  if (!url) throw new Error(data.error || "Upload falhou.");
  return url;
}

