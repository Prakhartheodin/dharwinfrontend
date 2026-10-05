/** Idempotent `<link rel="stylesheet">` injection (client only). */
export function injectStylesheet(href: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function scheduleStylesheetInjection(hrefs: readonly string[]) {
  const load = () => {
    for (const href of hrefs) {
      injectStylesheet(href);
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(load, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }

  const t = window.setTimeout(load, 1);
  return () => window.clearTimeout(t);
}
