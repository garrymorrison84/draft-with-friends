const sizeClasses = {
  sm: {
    bar: "h-16 w-1.5",
    container: "gap-3",
    words: "text-xl",
    gap: "gap-0.5",
  },
  md: {
    bar: "h-20 w-2",
    container: "gap-4",
    words: "text-2xl md:text-3xl",
    gap: "gap-1",
  },
  lg: {
    bar: "h-36 w-3 md:h-44 md:w-3.5",
    container: "gap-6 md:gap-7",
    words: "text-5xl md:text-7xl",
    gap: "gap-3 md:gap-4",
  },
};

export default function BrandMark({
  size = "md",
}: {
  size?: keyof typeof sizeClasses;
}) {
  const classes = sizeClasses[size];

  return (
    <div
      aria-label="Draft With Friends"
      className={`inline-flex items-center ${classes.container}`}
    >
      <div className={`${classes.bar} bg-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.24)]`} />
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
