// Estimation de la robustesse d'un mot de passe (entropie en bits), partagée
// entre le navigateur et le serveur. Repère : recommandation CNIL 2022-100
// (80 bits sans autre mesure, 50 bits avec limitation des tentatives).

const COMMON = [
  "password", "motdepasse", "azerty", "qwerty", "admin", "bonjour", "soleil", "nouakchott",
  "nouadhibou", "mauritanie", "iloveyou", "jetaime", "welcome", "football", "dragon", "monkey",
  "letmein", "master", "secret", "princesse", "chocolat", "doudou", "marseille", "paris",
  "tunis", "alger", "dakar", "maroc", "senegal", "inshallah", "allah", "mohamed", "ahmed",
  "fatima", "aicha", "salut", "coucou", "loulou", "pokemon", "naruto", "superman", "batman",
  "test", "user", "root", "login", "toto", "titi", "changeme", "fst", "nuitdelinfo",
  "informatique", "universite", "etudiant", "facebook", "google", "samsung", "iphone",
];
const KEYBOARD = ["azertyuiop", "qsdfghjklm", "wxcvbn", "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];
const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

export const MIN_BITS = 50; // accepté : le serveur limite les tentatives
export const GOOD_BITS = 80; // recommandé par la CNIL

function poolSize(chars) {
  let p = 0;
  if (chars.some((c) => /[a-z]/.test(c))) p += 26;
  if (chars.some((c) => /[A-Z]/.test(c))) p += 26;
  if (chars.some((c) => /[0-9]/.test(c))) p += 10;
  if (chars.some((c) => /[ -/:-@[-`{-~]/.test(c))) p += 40; // caractères spéciaux du clavier AZERTY
  if (chars.some((c) => c.charCodeAt(0) > 126)) p += 100;
  return Math.max(p, 1);
}

const norm = (c) => {
  const base = c.normalize("NFD")[0].toLowerCase();
  return LEET[base] ?? base;
};

// Retourne { bits, level 0-4, accepted }.
export function estimatePassword(password) {
  const chars = Array.from(password ?? "");
  const n = chars.length;
  if (!n) return { bits: 0, level: 0, accepted: false };
  const perChar = Math.log2(poolSize(chars));
  const s = chars.map(norm).join("");
  const raw = chars.map((c) => c.toLowerCase()).join("");
  const cost = new Array(n).fill(perChar); // coût de chaque caractère
  const cover = (start, len, bits) => {
    for (let i = start; i < start + len; i++) cost[i] = 0;
    cost[start] = bits;
  };

  // Mots courants (du plus long au plus court), y compris en leet speak.
  for (const w of [...COMMON].sort((a, b) => b.length - a.length)) {
    let i = s.indexOf(w);
    while (i !== -1) {
      if (cost.slice(i, i + w.length).every((c) => c > 0)) cover(i, w.length, Math.log2(COMMON.length) + 1);
      i = s.indexOf(w, i + 1);
    }
  }
  // Années (1900–2099).
  for (const m of raw.matchAll(/(19|20)\d\d/g)) cover(m.index, 4, 7);
  // Suites (abc, 123, 987) et rangées de clavier, 3 caractères ou plus.
  for (let i = 0; i < n - 2; i++) {
    let j = i + 1;
    const step = raw.charCodeAt(i + 1) - raw.charCodeAt(i);
    if (Math.abs(step) === 1) while (j < n && raw.charCodeAt(j) - raw.charCodeAt(j - 1) === step) j++;
    if (j - i >= 3) { cover(i, j - i, 4 + Math.log2(j - i)); i = j - 1; continue; }
    for (const row of KEYBOARD) {
      let k = 3;
      while (i + k <= n && row.includes(raw.slice(i, i + k))) k++;
      if (k - 1 >= 4) { cover(i, k - 1, 5 + Math.log2(k - 1)); i += k - 2; break; }
    }
  }
  // Répétitions (aaa, 111).
  for (const m of raw.matchAll(/(.)\1{2,}/g)) cover(m.index, m[0].length, perChar + Math.log2(m[0].length));

  const bits = Math.round(cost.reduce((a, b) => a + b, 0));
  const level = bits < 28 ? 0 : bits < MIN_BITS ? 1 : bits < 65 ? 2 : bits < GOOD_BITS ? 3 : 4;
  return { bits, level, accepted: n >= 8 && bits >= MIN_BITS };
}
