"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onAddNew?: (currentQuery: string) => void;
  addNewLabel?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No items found",
  onAddNew,
  addNewLabel = "+ Add New Item",
  disabled = false,
  className = "",
  buttonClassName = "",
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectId = useId();

  // Find currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.sublabel?.toLowerCase().includes(q) ?? false;
      const matchBadge = opt.badge?.toLowerCase().includes(q) ?? false;
      return matchLabel || matchSub || matchBadge;
    });
  }, [options, query]);

  // Handle outside click & escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setQuery("");
          } else {
            setQuery("");
            setIsOpen(true);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-left text-slate-900 hover:border-slate-300 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded text-[10px] font-semibold shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-amber-700" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-full min-w-[220px] max-w-sm sm:max-w-md bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-5 px-3 text-center text-xs text-slate-400">
                <p>{emptyMessage}</p>
                {query && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-amber-50 text-amber-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold shrink-0 uppercase">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Footer: Add New Item */}
          {onAddNew && (
            <div className="p-1.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const currentQ = query.trim();
                  setIsOpen(false);
                  onAddNew(currentQ);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {query
                    ? `${addNewLabel} "${query}"`
                    : addNewLabel}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
