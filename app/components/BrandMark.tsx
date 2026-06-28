const sizeClasses = {
  sm: "h-11",
  md: "h-14",
  lg: "h-16 md:h-20",
};

export default function BrandMark({
  size = "md",
}: {
  size?: keyof typeof sizeClasses;
}) {
  return (
    <img
      src="/dwf-logo.png"
      alt="Draft With Friends"
      className={`${sizeClasses[size]} w-auto rounded-xl border border-white/5 bg-[#030712] object-contain shadow-xl shadow-black/40`}
    />
  );
}
