export default function Background({ imageUrl, blurPx = 20, dimPct = 40 }) {
  return (
    <div className="bg-layer">
      {imageUrl ? (
        <div
          className="bg-image"
          style={{
            backgroundImage: `url(${imageUrl})`,
            filter: `blur(${blurPx}px)`,
          }}
        />
      ) : (
        <div className="bg-fallback" />
      )}
      <div className="bg-dim" style={{ opacity: dimPct / 100 }} />
    </div>
  );
}
