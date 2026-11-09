"use client";

import { ReactNode, useMemo, useState } from "react";
import { Pagination } from "./pagination";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  className?: string;
  cellClassName?: string;
  headerClassName?: string;
  render: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyMessage?: string;
  pageSize?: number;
  itemLabel?: string;
  className?: string;
}

export function DataTable<T>({
  title,
  subtitle,
  headerAction,
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  pageSize = 10,
  itemLabel = "records",
  className = "",
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const alignClass = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {(title || subtitle || headerAction) && (
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              {title && (
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${alignClass(col.align)} ${
                      col.headerClassName || ""
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => (
                  <tr
                    key={keyExtractor(row)}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 ${alignClass(col.align)} ${
                          col.cellClassName || col.className || ""
                        }`}
                      >
                        {col.render(row, idx)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        itemLabel={itemLabel}
        onPageChange={setPage}
      />
    </div>
  );
}
