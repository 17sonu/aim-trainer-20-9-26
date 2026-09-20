export default function Target({ target, onHit }) {
  if (!target) return null;

  return (
    <button
      type="button"
      data-target="true"
      className="target"
      style={{
        width: `${target.size}px`,
        height: `${target.size}px`,
        left: `${target.x}px`,
        top: `${target.y}px`
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onHit(target.id);
      }}
      aria-label="Target"
    >
      <span className="target-ring outer" />
      <span className="target-ring middle" />
      <span className="target-ring inner" />
      <span className="target-dot" />
    </button>
  );
}
