const sizeClasses = {
  sm: {
    letters: "text-3xl",
    word: "text-3xl",
    with: "text-sm",
  },
  md: {
    letters: "text-4xl md:text-5xl",
    word: "text-4xl md:text-5xl",
    with: "text-base md:text-lg",
  },
  lg: {
    letters: "text-6xl md:text-8xl",
    word: "text-5xl md:text-8xl",
    with: "text-2xl md:text-4xl",
  },
};

export default function BrandMark({
  size = "md",
  variant = "letters",
}: {
  size?: keyof typeof sizeClasses;
  variant?: "letters" | "wordmark";
}) {
  const classes = sizeClasses[size];

  if (variant === "wordmark") {
    return (
      <div
        aria-label="Draft With Friends"
        className="inline-flex flex-wrap items-baseline gap-x-4 gap-y-2 leading-none"
      >
        <span
          aria-hidden="true"
          className={`${classes.word} font-black uppercase text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]`}
        >
          Draft
        </span>
        <span
          aria-hidden="true"
          className={`${classes.with} font-black uppercase text-emerald-400 drop-shadow-[0_10px_24px_rgba(16,185,129,0.22)]`}
        >
          With
        </span>
        <span
          aria-hidden="true"
          className={`${classes.word} font-black uppercase text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]`}
        >
          Friends
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label="Draft With Friends"
      className="inline-flex"
    >
      <div
        aria-hidden="true"
        className={`${classes.letters} flex items-center font-black italic leading-none text-white`}
      >
        <span className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]">D</span>
        <span className="mx-0.5 bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(52,211,153,0.22)]">
          W
        </span>
        <span className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]">F</span>
      </div>
    </div>
  );
}
