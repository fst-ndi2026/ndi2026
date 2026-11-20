import type { Fiche, Lang, PersonaId } from "./index";
export declare const kb: Fiche[];
export declare function normalize(s: string): string;
export declare function tokens(s: string): string[];
export declare function isArabic(s: string): boolean;
export declare function search(question: string, k?: number): { doc: Fiche; score: number }[];
export declare function offlineAnswer(question: string, persona?: PersonaId | string): { answer: string; refs: string[]; lang: Lang; found: boolean };
export declare const SUGGESTIONS: Record<Lang, string[]>;
