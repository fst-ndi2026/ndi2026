// Vérifie si un mot de passe figure dans des fuites connues (Pwned Passwords),
// sans jamais l'envoyer : seuls les 5 premiers caractères de son empreinte SHA-1
// partent (k-anonymat), la comparaison se fait dans le navigateur.

export async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Nombre d'apparitions dans les fuites (0 = jamais vu), ou null si le service est injoignable.
export async function pwnedCount(password: string, hash?: string): Promise<number | null> {
  const h = hash ?? (await sha1Hex(password));
  const prefix = h.slice(0, 5), suffix = h.slice(5);
  try {
    const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" }, credentials: "omit", referrerPolicy: "no-referrer",
    });
    if (!r.ok) return null;
    for (const line of (await r.text()).split("\n")) {
      const [suf, n] = line.trim().split(":");
      if (suf === suffix) return Number(n) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}
