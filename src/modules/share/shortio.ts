import axios from "axios";
import { env } from "@/shared/env";

const EDGE_REQUEST_TIMEOUT_MS = 15000;

const getEdgeUrl = () => {
  const withoutTrailingSlash = env.VITE_SUPABASE_URL.replace(/\/+$/, "");
  if (withoutTrailingSlash.includes("/functions/v1")) {
    return withoutTrailingSlash.replace(/\/functions\/v1\/?$/, "/functions/v1");
  }
  return `${withoutTrailingSlash}/functions/v1`;
};

export async function shortenUrl(longUrl: string, accessToken: string): Promise<string | null> {
  const base = getEdgeUrl();
  try {
    const res = await axios.post(
      `${base}/shorten-link`,
      { url: longUrl },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: EDGE_REQUEST_TIMEOUT_MS,
      },
    );
    const data = res.data as { url?: string };
    return data.url?.trim() ? data.url : null;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.code === "ECONNABORTED") return null;
      if (e.response) return null;
      return null;
    }
    return null;
  }
}

