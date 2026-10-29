import React from "react";

export const SkeletonCard = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="w-full text-left border border-border rounded-xl bg-card p-5 overflow-hidden flex flex-col gap-3 animate-pulse shadow-sm"
        >
          {/* Top row: badge + date */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 bg-neutral-200 rounded w-20"></div>
            <div className="h-3 bg-neutral-200 rounded w-14"></div>
          </div>

          {/* Optional image placeholder on every 3rd card for natural grid rhythm */}
          {idx % 3 === 0 && (
            <div className="h-28 w-full bg-neutral-200/80 rounded-lg -my-1"></div>
          )}

          {/* Title lines */}
          <div className="space-y-2 pt-1">
            <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
            <div className="h-4 bg-neutral-200 rounded w-3/5"></div>
          </div>

          {/* Body preview */}
          <div className="space-y-1.5 pt-2">
            <div className="h-3 bg-neutral-100 rounded w-full"></div>
            <div className="h-3 bg-neutral-100 rounded w-4/5"></div>
          </div>

          {/* Bottom tag pills */}
          <div className="mt-auto pt-3 flex items-center gap-2">
            <div className="h-4 bg-neutral-200/70 rounded-full w-14"></div>
            <div className="h-4 bg-neutral-200/70 rounded-full w-16"></div>
          </div>
        </div>
      ))}
    </>
  );
};
