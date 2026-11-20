import { useEffect, useState } from "react";
import { estimate, measure, type EcoResult } from "../lib/eco";

// Déclaration d'écoconception (inspirée du modèle RGESN 2024) : à compléter le jour J.
const mesures = [
  { domaine: "Stratégie", texte: "Le service répond à un besoin identifié ; aucune fonctionnalité gadget n'est ajoutée sans usage.", ok: true },
  { domaine: "Interface", texte: "Pas de lecture automatique de vidéo, pas de défilement infini, pas de notification non sollicitée.", ok: true },
  { domaine: "Contenus", texte: "Images en WebP, dimensionnées et chargées en différé ; en mode sobre, médias seulement sur demande.", ok: true },
  { domaine: "Front-end", texte: "Polices système (aucune police téléchargée), aucune bibliothèque de suivi, budget de poids vérifié à chaque intégration.", ok: true },
  { domaine: "Back-end", texte: "API minimale, réponses compressées, fichiers statiques mis en cache un an.", ok: true },
  { domaine: "Hébergement", texte: "Hébergement mutualisé sans serveur permanent (fonctions à la demande).", ok: true },
  { domaine: "Données", texte: "Aucun traceur ; seules les données nécessaires sont demandées.", ok: true },
];

export default function Sobriete() {
  const [r, setR] = useState<EcoResult | null>(null);
  useEffect(() => { const t = setTimeout(() => setR(estimate(measure())), 600); return () => clearTimeout(t); }, []);
  const done = mesures.filter((m) => m.ok).length;
  return (
    <section className="stack" lang="fr" dir="ltr">
      <h1>Déclaration d'écoconception</h1>
      <p>Ce service s'inscrit dans une démarche d'écoconception visant à réduire ses impacts environnementaux, en s'appuyant sur le référentiel général de l'écoconception des services numériques (RGESN 2024).</p>
      <h2>Mesures appliquées ({done} / {mesures.length})</h2>
      <table className="table">
        <caption className="sr-only">Mesures d'écoconception</caption>
        <thead><tr><th scope="col">Domaine</th><th scope="col">Ce qui est fait</th><th scope="col">État</th></tr></thead>
        <tbody>{mesures.map((m) => <tr key={m.domaine}><th scope="row">{m.domaine}</th><td>{m.texte}</td><td>{m.ok ? "Fait" : "À faire"}</td></tr>)}</tbody>
      </table>
      <h2>Mesure de cette page</h2>
      {r ? (
        <p>Estimation inspirée d'EcoIndex : <strong>{r.grade} ({r.score}/100)</strong> · {r.dom} éléments · {r.requests} requêtes · {r.kb} Ko.
          La mesure de référence se fait sur <a href="https://www.ecoindex.fr/">ecoindex.fr</a>.</p>
      ) : <p aria-busy="true">Mesure en cours…</p>}
      <h2>Comment réduire encore l'empreinte</h2>
      <ul>
        <li>Activez le <strong>mode sobre</strong> depuis le badge en bas de page.</li>
        <li>Préférez le texte aux images quand l'information est la même.</li>
      </ul>
    </section>
  );
}
