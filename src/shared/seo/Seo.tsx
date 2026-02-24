import React, { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  robots?: string;
};

function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function Seo({
  title,
  description,
  canonicalUrl,
  ogImageUrl,
  robots,
}: SeoProps) {
  useEffect(() => {
    const safeTitle = title.trim();
    const safeDescription = description.trim();
    const url = canonicalUrl?.trim() || window.location.href;
    const image =
      ogImageUrl?.trim() ||
      `${window.location.origin}${import.meta.env.BASE_URL}logo.svg`;

    document.title = safeTitle;
    upsertMetaByName("description", safeDescription);
    upsertMetaByName("robots", (robots ?? "index, follow").trim());

    upsertLink("canonical", url);

    upsertMetaByProperty("og:title", safeTitle);
    upsertMetaByProperty("og:description", safeDescription);
    upsertMetaByProperty("og:url", url);
    upsertMetaByProperty("og:image", image);

    upsertMetaByName("twitter:title", safeTitle);
    upsertMetaByName("twitter:description", safeDescription);
    upsertMetaByName("twitter:image", image);
  }, [title, description, canonicalUrl, ogImageUrl, robots]);

  return null;
}

