function PersonalBest({ label, value, active }) {
  return (
    <div className={`best-item ${active ? "new-best" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
      {active && <em>NEW BEST</em>}
    </div>
  );
}

export default function ResultScreen({
  results,
  personalBests,
  leaderboard,
  leaderboardLoading,
  onPlayAgain,
  onChangeMode,
  onHome,
  muted,
  onToggleMute
}) {
  if (!results) return null;

  const previousScore = personalBests.bestScore;
  const previousAccuracy = personalBests.bestAccuracy;
  const previousReaction = personalBests.bestReaction;
  const previousTps = personalBests.bestTargetsPerSecond;

  const newScore = results.score >= previousScore && results.score > 0;
  const newAccuracy = results.accuracy >= previousAccuracy && results.accuracy > 0;
  const newReaction =
    results.bestReaction !== null &&
    (previousReaction === null || results.bestReaction <= previousReaction);
  const newTps = results.targetsPerSecond >= previousTps && results.targetsPerSecond > 0;

  return (
    <main className="screen result-screen">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <button className="sound-button floating-sound" onClick={onToggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"}>
        {muted ? "🔇" : "🔊"}
      </button>

      <section className="result-card glass-card">
        <div className="result-heading">
          <div className="eyebrow"><span /> SESSION COMPLETE <span /></div>
          <h1>GAME <strong>COMPLETE</strong></h1>
          <p>{results.modeLabel} · {results.name}</p>
        </div>

        <div className="result-score">
          <span>FINAL SCORE</span>
          <strong>{results.score}</strong>
        </div>

        <div className="result-grid">
          <div><span>TARGETS HIT</span><b>{results.hits}</b></div>
          <div><span>MISSES</span><b>{results.misses}</b></div>
          <div><span>ACCURACY</span><b>{results.accuracy.toFixed(1)}%</b></div>
          <div><span>AVERAGE REACTION</span><b>{Math.round(results.averageReaction)}ms</b></div>
          <div><span>BEST REACTION</span><b>{results.bestReaction === null ? "—" : `${Math.round(results.bestReaction)}ms`}</b></div>
          <div><span>TARGETS / SECOND</span><b>{results.targetsPerSecond.toFixed(2)}</b></div>
        </div>

        <div className="best-heading">PERSONAL BESTS</div>
        <div className="best-grid">
          <PersonalBest label="SCORE" value={personalBests.bestScore} active={newScore} />
          <PersonalBest label="ACCURACY" value={`${personalBests.bestAccuracy.toFixed(1)}%`} active={newAccuracy} />
          <PersonalBest label="REACTION" value={personalBests.bestReaction === null ? "—" : `${Math.round(personalBests.bestReaction)}ms`} active={newReaction} />
          <PersonalBest label="TARGETS / SEC" value={personalBests.bestTargetsPerSecond.toFixed(2)} active={newTps} />
        </div>

        <div className="leaderboard-section result-leaderboard">
          <div className="leaderboard-heading">
            <span>GLOBAL LEADERBOARD</span>
            <small>{results.modeLabel}</small>
          </div>

          {leaderboardLoading ? (
            <div className="leaderboard-empty">UPDATING...</div>
          ) : leaderboard.length === 0 ? (
            <div className="leaderboard-empty">NO SCORES YET</div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((entry) => (
                <div className={`leaderboard-row ${entry.name === results.name && entry.score === results.score ? "current-player" : ""}`} key={entry.id}>
                  <span className="leaderboard-rank">{String(entry.rank).padStart(2, "0")}</span>
                  <span className="leaderboard-name">{entry.name}</span>
                  <span className="leaderboard-date">{entry.playedAtLabel}</span>
                  <strong>{entry.score}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="result-actions">
          <button className="primary-button" onClick={onPlayAgain}>PLAY AGAIN <span>↗</span></button>
          <button className="secondary-button" onClick={onChangeMode}>CHANGE MODE</button>
          <button className="secondary-button" onClick={onHome}>HOME</button>
        </div>
      </section>
    </main>
  );
}
