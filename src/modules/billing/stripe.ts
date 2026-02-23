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

export async function createCheckoutSession(successUrl: string, cancelUrl: string, accessToken: string): Promise<string | null> {
  const base = getEdgeUrl();
  try {
    const res = await axios.post(
      `${base}/stripe-checkout`,
      { success_url: successUrl, cancel_url: cancelUrl },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: EDGE_REQUEST_TIMEOUT_MS,
      }
    );
    const data = res.data as { url?: string };
    if (!data.url) {
      throw new Error("Checkout indisponível: o servidor não retornou a URL do Stripe.");
    }
    return data.url;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.code === "ECONNABORTED") {
        throw new Error("A requisição demorou muito. Tente novamente.");
      }
      if (e.response) {
        const err = (e.response.data ?? {}) as { error?: string };
        const msg = err?.error ?? "Falha ao criar sessão de checkout";
        if (e.response.status === 401) {
          throw new Error("Sessão expirada ou inválida. Faça login novamente.");
        }
        throw new Error(msg);
      }
      throw new Error(e.message || "Falha ao conectar ao servidor.");
    }
    throw e;
  }
}

export async function createPortalSession(returnUrl: string, accessToken: string): Promise<string | null> {
  const base = getEdgeUrl();
  try {
    const res = await axios.post(
      `${base}/stripe-portal`,
      { return_url: returnUrl },
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
    if (!data.url) {
      throw new Error("Portal indisponível: o servidor não retornou a URL do Stripe.");
    }
    return data.url;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.code === "ECONNABORTED") {
        throw new Error("A requisição demorou muito. Tente novamente.");
      }
      if (e.response) {
        const err = (e.response.data ?? {}) as { error?: string };
        const msg = err?.error ?? "Falha ao abrir portal";
        if (e.response.status === 401) {
          throw new Error("Sessão expirada ou inválida. Faça login novamente.");
        }
        throw new Error(msg);
      }
      throw new Error(e.message || "Falha ao conectar ao servidor.");
    }
    throw e;
  }
}

