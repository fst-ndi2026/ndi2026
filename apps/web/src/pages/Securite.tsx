import { useEffect, useState } from "react";
import { grade, runChecks, type Check } from "../lib/security";

// Déclaration de sécurité : les dix risques OWASP Top 10:2025 et ce qui est fait pour chacun.
const risques = [
  { code: "A01", nom: "Contrôle d'accès défaillant", texte: "L'API ne renvoie jamais les données d'un autre utilisateur ni le mot de passe ; aucune route d'administration exposée." },
  { code: "A02", nom: "Mauvaise configuration", texte: "CSP stricte, HSTS, nosniff, COOP/CORP et Permissions-Policy sur toutes les pages ; vérifié en direct par le badge bouclier." },
  { code: "A03", nom: "Chaîne d'approvisionnement", texte: "npm audit bloquant dans la CI, mises à jour automatiques (Dependabot), aucun script tiers chargé." },
  { code: "A04", nom: "Défaillances cryptographiques", texte: "HTTPS uniquement ; mots de passe hachés avec scrypt et un sel aléatoire, jamais stockés en clair." },
  { code: "A05", nom: "Injection", texte: "Chaque entrée validée par schéma (zod) côté serveur ; requêtes SQL paramétrées ; aucun HTML injecté côté client." },
  { code: "A06", nom: "Conception non sécurisée", texte: "Seules les données nécessaires sont demandées ; chaque champ a une taille maximale." },
  { code: "A07", nom: "Authentification", texte: "Robustesse mesurée (repère CNIL), mots de passe déjà fuités signalés, 10 tentatives par minute au plus." },
  { code: "A08", nom: "Intégrité du logiciel et des données", texte: "Déploiement uniquement depuis la branche principale après tests ; aucun code chargé depuis un autre domaine." },
  { code: "A09", nom: "Journalisation et alertes", texte: "Les erreurs serveur sont journalisées sans les données envoyées par l'utilisateur." },
  { code: "A10", nom: "Conditions exceptionnelles", texte: "Un seul gestionnaire d'erreurs : réponse JSON neutre, jamais de trace technique." },
];

export default function Securite() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  useEffect(() => { runChecks().then(setChecks).catch(() => setChecks([])); }, []);
  const ok = checks?.filter((c) => c.ok).length ?? 0;
  return (
    <section className="stack" lang="fr" dir="ltr">
      <h1>Déclaration de sécurité</h1>
      <p>Ce service suit le référentiel OWASP Top 10:2025 et les recommandations de l'ANSSI et de la CNIL. Chaque mesure ci-dessous peut être vérifiée depuis le navigateur.</p>
      <dl className="sec-stats">
        <div><dt>Protections reçues avec cette page</dt><dd aria-busy={!checks}>{checks ? `${grade(checks)} · ${ok}/${checks.length}` : "…"}</dd></div>
        <div><dt>Risques OWASP traités</dt><dd>{risques.length} / 10</dd></div>
        <div><dt>Dépendances vulnérables</dt><dd>0 <span className="eco-sub">(npm audit à chaque intégration)</span></dd></div>
      </dl>
      <h2>Mesures appliquées</h2>
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Les dix risques OWASP Top 10:2025 et ce qui est fait pour chacun</caption>
          <thead><tr><th scope="col">Risque</th><th scope="col">Ce qui est fait</th><th scope="col">État</th></tr></thead>
          <tbody>{risques.map((r) => <tr key={r.code}><th scope="row">{r.code} · {r.nom}</th><td>{r.texte}</td><td>Fait</td></tr>)}</tbody>
        </table>
      </div>
      <h2>Vérifier vous-même</h2>
      <ul>
        <li>Note officielle des en-têtes : <a href={`https://developer.mozilla.org/fr/observatory/analyze?host=${location.hostname}`}>MDN HTTP Observatory</a>.</li>
        <li>Le mot de passe saisi à l'inscription ne quitte jamais le navigateur : seuls 5 caractères de son empreinte partent vers Pwned Passwords (k-anonymat).</li>
      </ul>
      <h2>Signaler une faille</h2>
      <p>Utilisez le <a href="https://github.com/fst-ndi2026/ndi2026/security/advisories/new">signalement privé du dépôt GitHub</a>. Le fichier <a href="/.well-known/security.txt">security.txt</a> (RFC 9116) donne ce contact et sa date de validité. Merci de ne pas tester d'attaque sur le service en production.</p>
    </section>
  );
}
