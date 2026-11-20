import type { Fiche, Lang } from "./index";
export declare function systemPrompt(persona: string, lang: Lang): string;
export declare function context(hits: { doc: Fiche }[], lang: Lang): string;
