import "./portrait-frame.css";
interface CharacterPortraitProps {
  src: string;
  alt?: string;
  className?: string;
  label?: string;
  title?: string;
  onClick?: () => void;
  loading?: "lazy" | "eager";
}
/** Shared portrait artwork, frame, aspect ratio and shadow for every fighter. */
export function CharacterPortrait({
  src,
  alt = "",
  className = "",
  label,
  title,
  onClick,
  loading,
}: CharacterPortraitProps) {
  const image = (
    <img
      className="identity-portrait"
      src={src}
      alt={alt}
      width="240"
      height="360"
      loading={loading}
      draggable={false}
    />
  );
  const classes = `character-portrait ${className}`;
  return onClick ? (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={label ?? alt}
      aria-haspopup="dialog"
      title={title}
    >
      {image}
    </button>
  ) : (
    <span className={classes} title={title}>
      {image}
    </span>
  );
}
