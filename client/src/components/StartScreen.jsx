export default function StartScreen({
  mode,
  modes,
  onModeChange,
  onStart,
  playerName,
  onPlayerNameChange,
  personalBests,
  leaderboard,
  leaderboardLoading,
  muted,
  onToggleMute
}) {
  return (
    <main className="screen start-screen">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <button className="sound-button floating-sound" onClick={onToggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"}>
        {muted ? "🔇" : "🔊"}
      </button>

      <section className="start-card glass-card">
        <div className="eyebrow"><span /> PRECISION LAB <span /></div>
        <h1>AIM <strong>TRAINER</strong></h1>
        <p className="subtitle">Test your speed, accuracy and reaction time.</p>

        <div className="mode-label">PLAYER NAME</div>
        <input
          className="player-name-input"
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onStart();
          }}
          placeholder="Enter your name"
          maxLength={30}
          autoComplete="name"
        />

        <div className="mode-label">SELECT MODE</div>
        <div className="mode-grid">
          {Object.values(modes).map((item) => (
            <button
              key={item.id}
              className={`mode-button ${mode === item.id ? "active" : ""}`}
              onClick={() => onModeChange(item.id)}
            >
              <span className="mode-number">
                {item.type === "time" ? `${item.duration}s` : "100"}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <button className="primary-button start-button" onClick={onStart}>
          START GAME <span>↗</span>
        </button>

        <div className="personal-strip">
          <div>
            <span>BEST SCORE</span>
            <b>{personalBests.bestScore}</b>
          </div>
          <div>
            <span>BEST ACCURACY</span>
            <b>{personalBests.bestAccuracy.toFixed(1)}%</b>
          </div>
          <div>
            <span>BEST REACTION</span>
            <b>{personalBests.bestReaction === null ? "—" : `${Math.round(personalBests.bestReaction)}ms`}</b>
          </div>
        </div>

        <div className="leaderboard-section">
          <div className="leaderboard-heading">
            <span>GLOBAL LEADERBOARD</span>
            <small>{modes[mode].label}</small>
          </div>

          {leaderboardLoading ? (
            <div className="leaderboard-empty">LOADING...</div>
          ) : leaderboard.length === 0 ? (
            <div className="leaderboard-empty">NO SCORES YET — BE THE FIRST</div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((entry) => (
                <div className="leaderboard-row" key={entry.id}>
                  <span className="leaderboard-rank">{String(entry.rank).padStart(2, "0")}</span>
                  <span className="leaderboard-name">{entry.name}</span>
                  <span className="leaderboard-date">{entry.playedAtLabel}</span>
                  <strong>{entry.score}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
