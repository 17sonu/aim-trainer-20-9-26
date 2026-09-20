function formatReaction(value) {
  return value > 0 ? `${Math.round(value)}ms` : "—";
}

export default function HUD({ stats, mode, muted, onToggleMute }) {
  const timeLabel =
    mode.type === "time"
      ? `${Math.ceil(stats.remaining)}`
      : `${stats.hits}/${mode.targetCount}`;

  return (
    <header className="hud">
      <div className="hud-brand">AIM<span>/</span>TRAINER</div>

      <div className="hud-stats">
        <div><span>SCORE</span><b>{stats.score}</b></div>
        <div><span>HITS</span><b>{stats.hits}</b></div>
        <div><span>MISSES</span><b>{stats.misses}</b></div>
        <div><span>ACCURACY</span><b>{stats.accuracy.toFixed(1)}%</b></div>
        <div><span>REACTION</span><b>{formatReaction(stats.averageReaction)}</b></div>
        <div className="hud-time"><span>{mode.type === "time" ? "TIME" : "TARGETS"}</span><b>{timeLabel}</b></div>
      </div>

      <button className="sound-button" onClick={onToggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"}>
        {muted ? "🔇" : "🔊"}
      </button>
    </header>
  );
}
