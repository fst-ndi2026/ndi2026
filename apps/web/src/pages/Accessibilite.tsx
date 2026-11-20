import { useI18n } from "../lib/i18n";

// Déclaration d'accessibilité (inspirée du modèle RGAA) : à mettre à jour après chaque audit.
const criteres = [
  { theme: "Navigation", texte: "Lien d'évitement « Aller au contenu », ordre de tabulation logique, focus toujours visible.", ok: true },
  { theme: "Structure", texte: "Langue de la page déclarée (fr / ar avec sens d'écriture), un seul titre h1 par page, repères header / nav / main / footer.", ok: true },
  { theme: "Titres de page", texte: "Chaque page a un titre unique, mis à jour à chaque navigation, et annoncé aux lecteurs d'écran.", ok: true },
  { theme: "Formulaires", texte: "Chaque champ a une étiquette liée ; les erreurs et confirmations sont annoncées (aria-live, role=alert).", ok: true },
  { theme: "Couleurs", texte: "Contrastes conformes au niveau AA ; thèmes clair, sombre, sépia et contraste élevé ; l'information n'est jamais portée par la couleur seule.", ok: true },
  { theme: "Personnalisation", texte: "Panneau « Paramètres d'affichage » : profils Malvoyance, Dyslexie et Concentration, police lisible, interlignage augmenté, réglages mémorisés sans compte.", ok: true },
  { theme: "Texte", texte: "Agrandissement du texte jusqu'à 200 % sans perte de contenu (curseur « Taille du texte »).", ok: true },
  { theme: "Animations", texte: "Les animations sont désactivées si le système le demande ou si l'utilisateur active « Arrêter les animations ».", ok: true },
  { theme: "Cibles tactiles", texte: "Boutons et liens d'au moins 44 × 44 pixels.", ok: true },
  { theme: "Tests", texte: "Audit automatique axe-core à chaque intégration continue, complété par des tests manuels au clavier.", ok: true },
];

export default function Accessibilite() {
  const { t } = useI18n();
  return (
    <section className="stack" lang="fr" dir="ltr">
      <h1>{t("a11y")}</h1>
      <p>
        L'équipe FST s'engage à rendre cette application accessible à tous, y compris aux personnes utilisant
        un lecteur d'écran, le clavier seul ou un agrandissement de l'affichage.
      </p>
      <h2>État de conformité</h2>
      <p>Application <strong>partiellement conforme</strong> au RGAA 4 : audit interne, non certifié.</p>
      <h2>Critères vérifiés</h2>
      <table className="table">
        <caption className="sr-only">Critères d'accessibilité vérifiés</caption>
        <thead><tr><th scope="col">Thème</th><th scope="col">Ce qui est fait</th><th scope="col">État</th></tr></thead>
        <tbody>
          {criteres.map((c) => (
            <tr key={c.theme}>
              <th scope="row">{c.theme}</th>
              <td>{c.texte}</td>
              <td>{c.ok ? "Conforme" : "À faire"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Signaler un problème</h2>
      <p>Si un contenu vous est inaccessible, signalez-le à l'équipe via le dépôt du projet ; nous vous proposerons une alternative.</p>
    </section>
  );
}
