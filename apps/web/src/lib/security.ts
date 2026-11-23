// Vérifie, depuis le navigateur, les protections réellement reçues avec la page.

export type Check = { id: string; label: string; ok: boolean };

const has = (h: Headers, k: string) => (h.get(k) ?? "").toLowerCase();

export function checkHeaders(page: Headers, api: Headers | null, cookies: string): Check[] {
  const csp = has(page, "content-security-policy");
  const script = /script-src([^;]*)/.exec(csp)?.[1] ?? /default-src([^;]*)/.exec(csp)?.[1] ?? "";
  const hsts = /max-age=(\d+)/.exec(has(page, "strict-transport-security"));
  const perms = has(page, "permissions-policy");
  const ref = has(page, "referrer-policy");
  return [
    { id: "csp", label: "Politique de contenu (CSP) stricte", ok: !!csp && !script.includes("unsafe-inline") && !script.includes("unsafe-eval") && (csp.includes("default-src 'none'") || csp.includes("object-src 'none'")) },
    { id: "hsts", label: "HTTPS forcé (HSTS 6 mois et plus)", ok: !!hsts && Number(hsts[1]) >= 15_552_000 },
    { id: "frame", label: "Anti-clickjacking (frame-ancestors)", ok: /frame-ancestors\s+'none'|frame-ancestors\s+'self'/.test(csp) || ["deny", "sameorigin"].includes(has(page, "x-frame-options")) },
    { id: "nosniff", label: "Type MIME verrouillé (nosniff)", ok: has(page, "x-content-type-options") === "nosniff" },
    { id: "referrer", label: "Aucun référent transmis", ok: ["no-referrer", "same-origin", "strict-origin", "strict-origin-when-cross-origin"].includes(ref) },
    // le micro est réservé au site lui-même (page /son, sur demande de l'utilisateur) : jamais aux sites tiers
    { id: "perms", label: "Caméra et position bloquées, micro réservé au site", ok: ["camera=()", "geolocation=()"].every((p) => perms.includes(p)) && /microphone=\((self)?\)/.test(perms) },
    { id: "isolation", label: "Isolation d'origine (COOP / CORP)", ok: has(page, "cross-origin-opener-policy") === "same-origin" && !!has(page, "cross-origin-resource-policy") },
    { id: "ratelimit", label: "Limitation des requêtes API", ok: !!api && !!(api.get("ratelimit-limit") || api.get("x-ratelimit-limit") || api.get("ratelimit-policy")) },
    { id: "cookies", label: "Aucun cookie, aucun traceur", ok: cookies.trim() === "" },
  ];
}

export function grade(checks: Check[]): string {
  const ko = checks.filter((c) => !c.ok).length;
  return ["A+", "A", "B", "C", "C", "D"][ko] ?? "F";
}

export async function runChecks(path = location.pathname): Promise<Check[]> {
  const page = await fetch(path, { method: "HEAD", cache: "no-store" });
  const api = await fetch("/api/health", { cache: "no-store" }).catch(() => null);
  return checkHeaders(page.headers, api?.ok ? api.headers : null, document.cookie);
}
