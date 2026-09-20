export default function Countdown({ value, muted, onToggleMute }) {
  return (
    <main className="screen countdown-screen">
      <button className="sound-button floating-sound" onClick={onToggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"}>
        {muted ? "🔇" : "🔊"}
      </button>
      <div className="countdown-content">
        <div className="eyebrow"><span /> GET READY <span /></div>
        <div key={String(value)} className="count-number">
          {value}
        </div>
      </div>
    </main>
  );
}
