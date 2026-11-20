import { useState } from "react";
import { useSobre } from "../lib/sobre";

// Images et vidéos : chargement différé, et seulement sur demande en mode sobre.
type ImgProps = { src: string; alt: string; width: number; height: number; kb: number; format?: string };

export function SobreImage({ src, alt, width, height, kb, format = "WebP" }: ImgProps) {
  const { sobre } = useSobre();
  const [asked, setAsked] = useState(false);
  if (sobre && !asked) {
    return (
      <button type="button" className="media-placeholder" style={{ aspectRatio: `${width} / ${height}` }} onClick={() => setAsked(true)}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16 L15 11 L6 19" /></svg>
        <span className="strong">Afficher l'image</span>
        <span className="small">{alt} · {format} · {kb} Ko</span>
      </button>
    );
  }
  return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="media" />;
}

type VideoProps = { src: string; title: string; mb: number; duration: string; poster?: string; transcript?: string };

export function SobreVideo({ src, title, mb, duration, poster, transcript }: VideoProps) {
  const { sobre } = useSobre();
  const [asked, setAsked] = useState(false);
  return (
    <figure className="media-figure">
      {sobre && !asked ? (
        <button type="button" className="media-placeholder" style={{ aspectRatio: "16 / 9" }} onClick={() => setAsked(true)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 5 L19 12 L8 19 Z" /></svg>
          <span className="strong">Lire la vidéo</span>
          <span className="small">{title} · {duration} · {mb} Mo</span>
        </button>
      ) : (
        <video src={src} poster={poster} controls preload="none" className="media" aria-label={title} />
      )}
      {transcript && <figcaption><details><summary>Transcription</summary><p>{transcript}</p></details></figcaption>}
    </figure>
  );
}
