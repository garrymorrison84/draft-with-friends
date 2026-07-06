const sizeClasses = {
  sm: "w-[120px]",
  md: "w-[170px] md:w-[210px]",
  lg: "w-[210px] sm:w-[260px] md:w-[380px]",
};

export default function BrandMark({
  size = "md",
}: {
  size?: keyof typeof sizeClasses;
}) {
  return (
    <img
      src="/dwf-logo-snake.png"
      alt="Draft With Friends"
      className={`${sizeClasses[size]} h-auto max-w-full object-contain`}
    />
  );
}
