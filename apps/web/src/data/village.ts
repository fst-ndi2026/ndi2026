// Contenu du Village Résistant : quartiers (piliers NIRD) et quêtes.
export type Choice = { label: string; ok: boolean };
export type Step = { situation: string; question: string; choices: Choice[]; good: string; bad: string };
export type Quest = { id: string; name: string; minutes: number; intro: string; steps: Step[]; requires?: string };
export type District = { id: "inclusion" | "responsabilite" | "durabilite"; name: string; tagline: string; color: string; tint: string; border: string; quests: Quest[] };

const c = (label: string, ok = false): Choice => ({ label, ok });

export const DISTRICTS: District[] = [
  {
    id: "inclusion", name: "Inclusion", tagline: "Le numérique pour tous les élèves",
    color: "#2F5FB3", tint: "#E8EEF9", border: "#C9D6EE",
    quests: [
      { id: "salle-info", name: "Salle info ouverte", minutes: 2, intro: "La salle informatique est fermée le midi. Des élèves sans ordinateur à la maison voudraient l'utiliser.",
        steps: [
          { situation: "Trois élèves demandent un accès pour leurs devoirs.", question: "Que proposez-vous ?",
            choices: [c("Ouvrir la salle le midi avec un élève référent", true), c("Leur dire d'aller à la médiathèque"), c("Attendre la fin de l'année")],
            good: "Ouvrir la salle réduit la fracture numérique, au cœur du pilier Inclusion.", bad: "L'école peut agir elle-même : un créneau encadré suffit." },
          { situation: "Les postes ont des comptes différents selon les élèves.", question: "Comment simplifier ?",
            choices: [c("Des sessions invitées qui s'effacent à la déconnexion", true), c("Un seul compte partagé avec le même mot de passe"), c("Interdire la connexion")],
            good: "Des sessions invitées protègent la vie privée de chacun.", bad: "Un compte partagé expose les données de tout le monde." },
        ] },
      { id: "accessibilite", name: "Accessibilité des cours", minutes: 2, intro: "Un élève malvoyant suit les cours en ligne de l'établissement.",
        steps: [
          { situation: "Les supports sont des images de texte.", question: "Que faire en priorité ?",
            choices: [c("Publier les supports en texte, avec titres et descriptions d'images", true), c("Agrandir les images"), c("Lui imprimer les cours en plus petit")],
            good: "Du texte structuré se lit avec un lecteur d'écran et s'agrandit sans perte.", bad: "Une image de texte reste illisible pour un lecteur d'écran." },
        ] },
      { id: "pc-familles", name: "PC pour les familles", minutes: 3, requires: "reemploi", intro: "Des familles n'ont pas d'ordinateur pour suivre la scolarité de leurs enfants.",
        steps: [
          { situation: "L'atelier a reconditionné 10 portables sous Linux.", question: "Comment les distribuer ?",
            choices: [c("Avec l'assistante sociale, et une courte prise en main", true), c("Les vendre aux enchères"), c("Les garder en réserve")],
            good: "Un don accompagné garantit que le matériel sert vraiment.", bad: "L'objectif est l'équité : le matériel doit aller à ceux qui en ont besoin." },
        ] },
    ],
  },
  {
    id: "responsabilite", name: "Responsabilité", tagline: "Des données qui restent à l'école",
    color: "#7A4AA3", tint: "#F1EAF6", border: "#DCCDE8",
    quests: [
      { id: "cloud-local", name: "Cloud local", minutes: 2, intro: "Les enseignants partagent leurs fichiers sur des services américains gratuits.",
        steps: [
          { situation: "Les copies des élèves contiennent leurs noms et leurs notes.", question: "Où les stocker ?",
            choices: [c("Sur un cloud hébergé par l'établissement ou l'académie", true), c("Sur un service gratuit d'une grande plateforme"), c("Sur une clé USB qui circule")],
            good: "Les données des élèves restent sous le contrôle de l'école.", bad: "Un service gratuit se paie souvent avec les données des utilisateurs." },
        ] },
      { id: "messagerie", name: "Messagerie souveraine", minutes: 2, intro: "Les parents et les profs échangent sur une messagerie grand public.",
        steps: [
          { situation: "On cherche un outil pour les échanges école-familles.", question: "Quel critère compte le plus ?",
            choices: [c("Données hébergées en Europe, sans publicité ni revente", true), c("Le plus d'émojis possible"), c("Celui que tout le monde a déjà")],
            good: "La souveraineté et le respect des données passent avant l'habitude.", bad: "L'habitude n'est pas un critère de protection des données." },
        ] },
      { id: "charte", name: "Charte numérique", minutes: 2, requires: "cloud-local", intro: "Le conseil d'administration veut une charte du numérique responsable.",
        steps: [
          { situation: "Il faut une règle simple sur les outils autorisés.", question: "Quelle règle proposez-vous ?",
            choices: [c("Privilégier les logiciels libres et les services de l'Éducation nationale", true), c("Chacun utilise ce qu'il veut"), c("Tout interdire")],
            good: "Une règle claire et réaliste rend la démarche durable.", bad: "Sans cadre commun, les dépendances reviennent vite." },
        ] },
    ],
  },
  {
    id: "durabilite", name: "Durabilité", tagline: "Faire durer le matériel",
    color: "#23704A", tint: "#E5F2EA", border: "#C6DFCF",
    quests: [
      { id: "atelier-linux", name: "Atelier Linux", minutes: 2, intro: "Le support de Windows 10 s'arrête. 40 ordinateurs fonctionnent encore.",
        steps: [
          { situation: "Le budget ne permet pas de tout racheter.", question: "Quelle solution choisir ?",
            choices: [c("Installer Linux progressivement, en commençant par une salle", true), c("Garder Windows 10 sans mises à jour"), c("Racheter 40 ordinateurs")],
            good: "Linux prolonge la vie du matériel et évite des achats : c'est le socle de NIRD.", bad: "Un système sans mises à jour devient dangereux ; racheter coûte cher et pollue." },
        ] },
      { id: "reemploi", name: "Clinique du réemploi", minutes: 2, intro: "Des ordinateurs arrivent à l'atelier. Pour chacun, choisissez la meilleure décision.",
        steps: [
          { situation: "Portable de 2015, 4 Go de mémoire. Il démarre en 3 minutes, l'écran et la batterie fonctionnent.", question: "Que faites-vous ?",
            choices: [c("Le mettre au recyclage et en racheter un neuf"), c("Installer une distribution Linux légère et le donner à une famille", true), c("Le garder tel quel sans mises à jour")],
            good: "Un PC de 10 ans tourne bien sous Linux : moins de déchets, pas d'achat.", bad: "Ce portable fonctionne encore : avec Linux il redevient sûr et rapide." },
          { situation: "Tour de bureau avec un disque dur en panne.", question: "Que faites-vous ?",
            choices: [c("Remplacer le disque par un SSD de récupération", true), c("Jeter toute la tour"), c("La ranger à la cave")],
            good: "Une pièce changée suffit souvent à sauver toute une machine.", bad: "Une seule pièce est en cause : le reste est réutilisable." },
        ] },
      { id: "sobriete", name: "Sobriété des usages", minutes: 2, requires: "atelier-linux", intro: "La consommation numérique de l'établissement explose.",
        steps: [
          { situation: "Les vidéos de cours sont envoyées en très haute définition.", question: "Quel geste a le plus d'effet ?",
            choices: [c("Partager un lien vers une vidéo compressée plutôt que des pièces jointes", true), c("Changer de fond d'écran"), c("Éteindre les écrans 5 minutes par jour")],
            good: "Moins de données transférées, c'est moins d'énergie et de stockage.", bad: "Le plus gros gain vient du volume de données échangées." },
        ] },
    ],
  },
];

export const ALL_QUESTS = DISTRICTS.flatMap((d) => d.quests.map((q) => ({ ...q, district: d })));
export const POINTS_PER_STEP = 10;
