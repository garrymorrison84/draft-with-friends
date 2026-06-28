const sizeClasses = {
  sm: {
    bar: "w-1.5",
    container: "gap-3",
    words: "text-xl",
    letters: "text-3xl",
    gap: "gap-0.5",
  },
  md: {
    bar: "w-2",
    container: "gap-4",
    words: "text-2xl md:text-3xl",
    letters: "text-4xl md:text-5xl",
    gap: "gap-1",
  },
  lg: {
    bar: "w-2.5 md:w-3",
    container: "gap-5 md:gap-6",
    words: "text-4xl md:text-6xl",
    letters: "text-6xl md:text-8xl",
    gap: "gap-2 md:gap-3",
  },
};

export default function BrandMark({
  size = "md",
  variant = "compact",
}: {
  size?: keyof typeof sizeClasses;
  variant?: "compact" | "stacked";
}) {
  const classes = sizeClasses[size];

  if (variant === "compact") {
    return (
      <div
        aria-label="Draft With Friends"
        className={`${classes.letters} inline-flex items-center font-black uppercase leading-none`}
      >
        <span className="text-emerald-400 drop-shadow-[0_8px_20px_rgba(16,185,129,0.16)]">
          D
        </span>
        <span className="text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
          W
        </span>
        <span className="text-emerald-400 drop-shadow-[0_8px_20px_rgba(16,185,129,0.16)]">
          F
        </span>
      </div>
    );
  }

  return (
    <div
      aria-label="Draft With Friends"
      className={`inline-flex items-stretch ${classes.container}`}
    >
      <div className={`${classes.bar} bg-white shadow-[0_0_24px_rgba(255,255,255,0.16)]`} />
      <div className={`flex flex-col ${classes.gap}`}>
        <span className={`${classes.words} font-black uppercase leading-none text-emerald-400 drop-shadow-[0_10px_24px_rgba(16,185,129,0.16)]`}>
          Draft
        </span>
        <span className={`${classes.words} font-black uppercase leading-none text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]`}>
          With
        </span>
        <span className={`${classes.words} font-black uppercase leading-none text-emerald-400 drop-shadow-[0_10px_24px_rgba(16,185,129,0.16)]`}>
          Friends
        </span>
      </div>
    </div>
  );
}
