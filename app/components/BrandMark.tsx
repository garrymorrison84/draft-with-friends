const sizeClasses = {
  sm: {
    container: "gap-1",
    mark: "text-3xl",
    subtitle: "text-[10px]",
  },
  md: {
    container: "gap-1.5",
    mark: "text-4xl md:text-5xl",
    subtitle: "text-xs",
  },
  lg: {
    container: "gap-2",
    mark: "text-6xl md:text-8xl",
    subtitle: "text-sm md:text-base",
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
      className={`inline-flex flex-col ${classes.container}`}
    >
      <div
        aria-hidden="true"
        className={`${classes.mark} flex items-center font-black italic leading-none text-white`}
      >
        <span className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]">D</span>
        <span className="mx-0.5 bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_8px_24px_rgba(52,211,153,0.22)]">
          W
        </span>
        <span className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]">F</span>
      </div>

      <div
        aria-hidden="true"
        className={`${classes.subtitle} flex gap-2 font-black uppercase leading-none text-slate-200`}
      >
        Draft <span className="text-emerald-400">With</span> Friends
      </div>
    </div>
  );
}
