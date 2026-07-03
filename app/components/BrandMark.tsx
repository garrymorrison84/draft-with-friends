const sizeClasses = {
  sm: "w-[120px]",
  md: "w-[170px] md:w-[210px]",
  lg: "w-[260px] md:w-[380px]",
};

export default function BrandMark({
  size = "md",
}: {
  size?: keyof typeof sizeClasses;
}) {
  return (
    <span className="inline-flex rounded-xl bg-slate-950 p-2 shadow-sm">
      <img
        src="/dwf-logo-snake.png"
        alt="Draft With Friends"
        className={`${sizeClasses[size]} h-auto object-contain`}
      />
    </span>
  );
}
