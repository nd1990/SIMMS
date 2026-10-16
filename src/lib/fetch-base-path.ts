import { BASE } from "./base-path";

declare global {
  interface Window {
    __ctFetchBasePatched?: boolean;
  }
}

// Prefix same-origin absolute URLs (e.g. "/api/...") with the deployment
// basePath so fetch() works when the app is served under /SIMMS.
// <Link> and router.push already apply basePath automatically; raw fetch() does not.
if (typeof window !== "undefined" && BASE && !window.__ctFetchBasePatched) {
  window.__ctFetchBasePatched = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/") && !input.startsWith("//") && !input.startsWith(`${BASE}/`)) {
      input = `${BASE}${input}`;
    }
    return orig(input, init);
  };
}
