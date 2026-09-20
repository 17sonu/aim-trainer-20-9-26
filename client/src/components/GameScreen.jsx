import HUD from "./HUD";
import Target from "./Target";

export default function GameScreen({
  gameAreaRef,
  stats,
  mode,
  target,
  feedback,
  muted,
  onToggleMute,
  onTargetHit,
  onMiss
}) {
  return (
    <main className="game-screen">
      <HUD
        stats={stats}
        mode={mode}
        muted={muted}
        onToggleMute={onToggleMute}
      />

      <section
        ref={gameAreaRef}
        className="game-area"
        onPointerDown={onMiss}
        aria-label="Aim trainer play area"
      >
        <div className="game-grid" />
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        <Target target={target} onHit={onTargetHit} />

        {feedback && (
          <div key={feedback.id} className={`feedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}

        <div className="game-tip">CLICK THE TARGET</div>
      </section>
    </main>
  );
}
