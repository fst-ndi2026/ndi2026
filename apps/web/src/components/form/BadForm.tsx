import { useRef, useState } from "react";

// 😈 Version Bad UI : le même formulaire, volontairement infernal (mais toujours utilisable au clavier).
const LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789@._-";

export default function BadForm({ onSubmit }: { onSubmit: (d: { email: string; phone: string }) => void }) {
  const [email, setEmail] = useState("");
  const [pos, setPos] = useState(0);
  const [phone, setPhone] = useState(0);
  const [agree, setAgree] = useState(false);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const [msg, setMsg] = useState("");
  const btn = useRef<HTMLButtonElement>(null);

  const flee = () => setShift({ x: Math.round((Math.random() - 0.5) * 300), y: Math.round((Math.random() - 0.5) * 120) });

  return (
    <form className="fa-bad" onSubmit={(e) => {
      e.preventDefault();
      if (!agree) { setMsg("Vous devez ne pas refuser de ne pas être en désaccord."); return; }
      onSubmit({ email, phone: String(phone) });
      setMsg("Merci… ou pas. Votre demande sera traitée dans 3 à 5 années bissextiles.");
    }}>
      <p className="fa-bad-warn">😈 Mode Bad UI : ce formulaire est volontairement pénible (défi « Bad UI »).</p>
      <div>
        <label htmlFor="bad-letter">E-mail, lettre par lettre : <strong>{LETTERS[pos]}</strong></label>
        <input id="bad-letter" type="range" min={0} max={LETTERS.length - 1} value={pos} onChange={(e) => setPos(Number(e.target.value))} />
        <div className="fa-row">
          <button type="button" onClick={() => setEmail(email + LETTERS[pos])}>Ajouter « {LETTERS[pos]} »</button>
          <button type="button" onClick={() => setEmail("")}>Tout effacer (pas de retour arrière)</button>
        </div>
        <p aria-live="polite">E-mail : <code>{email || "…"}</code></p>
      </div>
      <div>
        <p id="bad-phone">Téléphone : <strong>{phone}</strong></p>
        <button type="button" aria-describedby="bad-phone" onClick={() => setPhone(phone + 1)}>+1</button>
      </div>
      <div>
        <input id="bad-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />{" "}
        <label htmlFor="bad-agree">Je ne refuse pas de ne pas être en désaccord avec les conditions</label>
      </div>
      <button ref={btn} type="submit" className="fa-flee" style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }} onMouseEnter={flee}>Envoyer</button>
      <p role="status">{msg}</p>
    </form>
  );
}
