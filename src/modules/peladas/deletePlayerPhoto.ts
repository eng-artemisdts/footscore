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

export async function deletePlayerPhoto(params: {
  peladaId: string;
  playerId: string;
  accessToken: string;
}): Promise<void> {
  const base = getEdgeUrl();
  await axios.post(
    `${base}/delete-player-photo`,
    { peladaId: params.peladaId, playerId: params.playerId },
    {
      headers: {
        "Content-Type": "application/json",
        apikey: env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${params.accessToken}`,
      },
      timeout: EDGE_REQUEST_TIMEOUT_MS,
    },
  );
}

