"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "items",
  onPageChange,
  className = "",
}: PaginationProps) {
  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  const startIdx = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalItems);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs text-xs ${className}`}
    >
      <div className="text-slate-500">
        Page <strong className="text-slate-900">{page}</strong> of{" "}
        <strong className="text-slate-900">{totalPages}</strong> &bull; Showing{" "}
        <span className="font-mono font-semibold text-slate-800">
          {startIdx}–{endIdx}
        </span>{" "}
        of{" "}
        <span className="font-mono font-semibold text-slate-800">
          {totalItems}
        </span>{" "}
        {itemLabel}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 font-semibold text-slate-700 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        {pageNumbers[0] > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-mono text-slate-700 cursor-pointer"
            >
              1
            </button>
            {pageNumbers[0] > 2 && (
              <span className="px-1 text-slate-400">&hellip;</span>
            )}
          </>
        )}

        {pageNumbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={`px-2.5 py-1.5 rounded-lg font-mono font-bold transition-colors cursor-pointer ${
              num === page
                ? "bg-amber-700 text-white border border-amber-700"
                : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            {num}
          </button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-1 text-slate-400">&hellip;</span>
            )}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-mono text-slate-700 cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 font-semibold text-slate-700 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
