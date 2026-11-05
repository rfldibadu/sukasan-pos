interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All Items",
  COFFEE: "☕ Espresso & Coffee",
  NON_COFFEE: "🍵 Non-Coffee / Tea",
  SNACKS: "🥐 Pastry & Snacks",
  FOODS: "🍽️ Foods",
  CUSTOM: "✨ Custom",
};

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
      {categories.map((cat) => {
        const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
        const label = CATEGORY_LABELS[cat.toUpperCase()] || cat;

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              isActive
                ? "bg-amber-100 text-amber-800 border border-amber-300 font-semibold shadow-2xs"
                : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
