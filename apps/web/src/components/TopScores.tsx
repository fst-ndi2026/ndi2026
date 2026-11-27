import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

type Score = { name: string; score: number };

export default function TopScores({ limit = 5 }: { limit?: number }) {
    const { t } = useI18n();
    const [scores, setScores] = useState<Score[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

    const load = () => {
        setStatus("loading");
        api<Score[]>(`/api/scores?limit=${limit}`)
            .then((d) => { setScores(d); setStatus("ready"); })
            .catch(() => setStatus("error"));
    };
    useEffect(load, [limit]);

    return (
        <section className="card" aria-labelledby="top-scores-title">
            <h2 id="top-scores-title">Meilleurs scores</h2>
            {status === "loading" && <p aria-busy="true">{t("loading")}</p>}
            {status === "error" && (
                <div role="alert">
                    <p className="error">{t("loadError")}</p>
                    <button type="button" onClick={load}>{t("retry")}</button>
                </div>
            )}
            {status === "ready" && scores.length === 0 && <p>{t("empty")}</p>}
            {status === "ready" && scores.length > 0 && (
                <ol>{scores.map((s, i) => <li key={i}><strong>{s.name}</strong> — {s.score}</li>)}</ol>
            )}
        </section>
    );
}