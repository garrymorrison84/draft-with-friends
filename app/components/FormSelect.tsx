"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SelectOption = {
  value: string | number;
  label: string;
};

type FormSelectProps = {
  value: string | number;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
};

export default function FormSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  buttonClassName = "",
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const normalizedValue = String(value);
  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === normalizedValue),
    [normalizedValue, options]
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-600/40 bg-[#172235] px-4 py-3 text-left font-bold text-white shadow-inner shadow-black/20 outline-none transition hover:border-emerald-400/40 focus-visible:border-emerald-300/70 ${buttonClassName}`}
      >
        <span className="min-w-0 truncate">
          {selectedOption?.label ?? "Select"}
        </span>
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-600/45 bg-[#111827] shadow-2xl shadow-black/60">
          <div
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-72 overflow-y-auto py-1"
          >
            {options.map((option) => {
              const selected = String(option.value) === normalizedValue;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(String(option.value));
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-black transition ${
                    selected
                      ? "bg-emerald-400 text-slate-950"
                      : "text-slate-200 hover:bg-emerald-400/10 hover:text-emerald-200"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected && (
                    <span className="text-xs uppercase tracking-wide">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
