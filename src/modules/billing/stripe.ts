const EDGE_REQUEST_TIMEOUT_MS = 15000;

const getEdgeUrl = () => {
  const meta = import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } };
  const url = meta.env?.VITE_SUPABASE_URL;
  if (!url) return null;
  return url.replace(/\.supabase\.co$/, ".supabase.co/functions/v1");
};

export async function createCheckoutSession(successUrl: string, cancelUrl: string, accessToken: string): Promise<string | null> {
  const base = getEdgeUrl();
  if (!base) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/stripe-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("A requisição demorou muito. Tente novamente.");
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    const msg = err?.error ?? "Falha ao criar sessão de checkout";
    if (res.status === 401) {
      throw new Error("Sessão expirada ou inválida. Faça login novamente.");
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

export async function createPortalSession(returnUrl: string, accessToken: string): Promise<string | null> {
  const base = getEdgeUrl();
  if (!base) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/stripe-portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ return_url: returnUrl }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("A requisição demorou muito. Tente novamente.");
    }
    throw e;
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    const msg = err?.error ?? "Falha ao abrir portal";
    if (res.status === 401) {
      throw new Error("Sessão expirada ou inválida. Faça login novamente.");
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

