import { useEffect, useState } from "react";
import { estimatePassword, GOOD_BITS } from "../../../../shared/password.js";
import { pwnedCount, sha1Hex } from "../lib/pwned";

const LABELS = ["Très faible", "Trop faible", "Correct", "Bon", "Solide"];

// Jauge de robustesse (repère CNIL : 80 bits) et vérification des fuites (k-anonymat).
export default function PasswordStrength({ password, id, onLeak }: { password: string; id: string; onLeak?: (n: number | null) => void }) {
  const est = estimatePassword(password);
  const [hash, setHash] = useState("");
  const [leak, setLeak] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    setLeak(undefined); onLeak?.(null);
    if (password.length < 8) { setHash(""); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const h = await sha1Hex(password);
      if (!alive) return;
      setHash(h);
      const n = await pwnedCount(password, h);
      if (alive) { setLeak(n); onLeak?.(n); }
    }, 700);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  if (!password) return null;
  const leakText = leak === undefined ? "Vérification des fuites…" : leak === null ? "Vérification des fuites indisponible"
    : leak > 0 ? `Trouvé ${leak.toLocaleString("fr-FR")} fois dans des fuites connues : à éviter` : "Trouvé 0 fois dans les fuites connues";
  return (
    <div className="pw" id={id}>
      <div className="pw-meter" aria-hidden="true" data-level={est.level}>
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i <= est.level ? "on" : undefined} />)}
      </div>
      <p className={est.accepted ? "ok" : "error"} aria-live="polite"><strong>{LABELS[est.level]}</strong> · ≈ {Math.min(est.bits, 128)} bits sur {GOOD_BITS} recommandés par la CNIL</p>
      {password.length >= 8 && <p className={leak ? "error" : undefined} aria-live="polite">{leakText}</p>}
      <details className="pw-how">
        <summary>Comment on vérifie les fuites sans voir votre mot de passe</summary>
        <ol>
          <li>Votre navigateur calcule l'empreinte SHA-1 : <code className="pw-hash">{hash ? <><mark>{hash.slice(0, 5)}</mark>{hash.slice(5)}</> : "…"}</code></li>
          <li>Seuls les 5 premiers caractères partent vers Pwned Passwords ; des centaines de mots de passe partagent ce début.</li>
          <li>Le service renvoie la liste et la comparaison se fait ici : personne d'autre ne sait lequel est le vôtre.</li>
        </ol>
      </details>
    </div>
  );
}
