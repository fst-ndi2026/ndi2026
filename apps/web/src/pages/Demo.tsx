import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

type Item = { id: number; title: string; body: string };

export default function Demo() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setStatus("loading");
    api<Item[]>("/api/items")
      .then((d) => { setItems(d); setStatus("ready"); })
      .catch(() => setStatus("error"));
  };
  useEffect(load, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setMsg({ ok: false, text: t("required") });
    try {
      const item = await api<Item>("/api/items", { method: "POST", body: JSON.stringify({ title, body }) });
      setItems((xs) => [...xs, item]);
      setTitle(""); setBody("");
      setMsg({ ok: true, text: t("added") });
    } catch {
      setMsg({ ok: false, text: t("loadError") });
    }
  }

  return (
    <section className="stack">
      <h1>{t("demo")}</h1>
      {status === "loading" && <p aria-busy="true">{t("loading")}</p>}
      {status === "error" && (
        <div role="alert">
          <p className="error">{t("loadError")}</p>
          <button type="button" onClick={load}>{t("retry")}</button>
        </div>
      )}
      {status === "ready" && items.length === 0 && <p>{t("empty")}</p>}
      {status === "ready" && items.length > 0 && (
        <ul>{items.map((i) => <li key={i.id} className="card"><h2>{i.title}</h2><p>{i.body}</p></li>)}</ul>
      )}
      <form onSubmit={submit} className="card stack" noValidate>
        <div>
          <label htmlFor="title">{t("titleField")}</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div>
          <label htmlFor="body">{t("bodyField")}</label>
          <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        </div>
        <button type="submit">{t("add")}</button>
        <p aria-live="polite" className={msg?.ok ? "ok" : "error"}>{msg?.text}</p>
      </form>
    </section>
  );
}
