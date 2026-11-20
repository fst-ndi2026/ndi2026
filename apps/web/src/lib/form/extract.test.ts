import { describe, it, expect } from "vitest";
import { extract } from "./extract";

describe("« Dis-le en une phrase »", () => {
  it("comprend un don mensuel en français", () => {
    expect(extract("Je m'appelle Aïcha Mint Ahmed, je veux donner 25 € chaque mois, mon mail c'est aicha@exemple.mr"))
      .toEqual({ mission: "don", name: "Aïcha Mint Ahmed", email: "aicha@exemple.mr", amount: 25, frequency: "monthly" });
  });
  it("comprend l'arabe et les chiffres arabes", () => {
    expect(extract("اسمي سيدي، أريد أن أتبرع بـ ٥٠ يورو كل شهر sidi@fst.mr")).toMatchObject({ mission: "don", name: "سيدي", amount: 50, frequency: "monthly", email: "sidi@fst.mr" });
    expect(extract("أريد التطوع معكم، هاتفي 22 33 44 55").mission).toBe("benevole");
  });
  it("devine la mission et le téléphone", () => {
    expect(extract("Je voudrais aider comme bénévole, appelez-moi au +222 22 33 44 55")).toMatchObject({ mission: "benevole", phone: "+22222334455" });
    expect(extract("Envoyez-moi la documentation svp").mission).toBe("info");
    expect(extract("J'ai une question sur le partenariat").mission).toBe("contact");
  });
  it("ne prend pas l'e-mail pour un téléphone et n'invente rien", () => {
    expect(extract("contact: ali2024@mail.com").phone).toBeUndefined();
    expect(extract("Bonjour")).toEqual({});
  });
});
