"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Cake,
  Coffee,
  Croissant,
  CupSoda,
  Edit3,
  Milk,
  Plus,
  Trash2,
} from "lucide-react";
import { SearchBar } from "@/main/components/ui/search-bar";
import { Permissions } from "@/main/utils/permissions";
import {
  MenuProductItem,
  ProductCreatePayload,
  ProductUpdatePayload,
  useMenuProducts,
} from "./_internal/hooks/use-menu-products";
import { ProductFormModal } from "./_internal/modals/product-form-modal";

type CategoryFilterTab = "all" | "coffee" | "non_coffee" | "food" | "addons";
type SourceFilterTab = "all" | "in_house" | "consignment";

export default function MenuProductsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isManager = Permissions.canManageMenuCatalog(userRole);

  const {
    products,
    vendors,
    isLoading,
    isMutating,
    createProduct,
    updateProduct,
    updateProductStock,
    archiveProduct,
    createVendor,
  } = useMenuProducts();

  const [categoryTab, setCategoryTab] = useState<CategoryFilterTab>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProductItem | null>(
    null
  );
  const [stockEditProduct, setStockEditProduct] =
    useState<MenuProductItem | null>(null);
  const [stockEditValue, setStockEditValue] = useState<string>("");

  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showNotice = (
    text: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  const activeCount = useMemo(
    () => products.filter((p) => p.is_active).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Category filter
      if (categoryTab !== "all") {
        if (categoryTab === "addons" && item.item_type !== "ADD_ON")
          return false;
        if (
          categoryTab === "coffee" &&
          (item.item_type === "ADD_ON" || item.main_category !== "COFFEE")
        )
          return false;
        if (
          categoryTab === "non_coffee" &&
          (item.item_type === "ADD_ON" || item.main_category !== "NON_COFFEE")
        )
          return false;
        if (
          categoryTab === "food" &&
          item.item_type !== "CONSIGNMENT" &&
          item.main_category !== "SNACKS" &&
          item.main_category !== "FOODS"
        )
          return false;
      }

      // Source filter
      if (sourceFilter === "in_house" && item.item_type === "CONSIGNMENT")
        return false;
      if (sourceFilter === "consignment" && item.item_type !== "CONSIGNMENT")
        return false;

      // Search query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(term);
        const catMatch = (item.main_category || "")
          .toLowerCase()
          .includes(term);
        const vendorMatch = (item.vendor?.name || "")
          .toLowerCase()
          .includes(term);
        return nameMatch || catMatch || vendorMatch;
      }

      return true;
    });
  }, [products, categoryTab, sourceFilter, searchQuery]);

  const handleToggleAvailability = async (product: MenuProductItem) => {
    try {
      const nextActive = !product.is_active;
      await updateProduct(product.id, { is_active: nextActive });
      showNotice(
        nextActive
          ? `${product.name} is now available for ordering in POS.`
          : `${product.name} marked OUT OF STOCK.`,
        nextActive ? "success" : "info"
      );
    } catch {
      showNotice("Failed to update availability.", "error");
    }
  };

  const handleSaveProduct = async (
    payload: ProductCreatePayload | ProductUpdatePayload,
    productId?: string
  ) => {
    try {
      if (productId) {
        await updateProduct(productId, payload);
        showNotice(`Product "${payload.name}" updated!`, "success");
      } else {
        await createProduct(payload as ProductCreatePayload);
        showNotice(`Product "${payload.name}" added to catalog!`, "success");
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch {
      showNotice("Failed to save product.", "error");
    }
  };

  const handleCreateVendor = async (name: string, contact?: string) => {
    const vendor = await createVendor(name, contact);
    showNotice(`Vendor "${name}" registered & selected!`, "success");
    return vendor;
  };

  const handleArchiveProduct = async (product: MenuProductItem) => {
    try {
      await archiveProduct(product.id);
      showNotice(`"${product.name}" marked inactive / archived.`, "info");
    } catch {
      showNotice("Failed to archive product.", "error");
    }
  };

  const handleSaveStockCount = async () => {
    if (!stockEditProduct) return;
    try {
      const qty = Math.max(0, parseInt(stockEditValue, 10) || 0);
      await updateProductStock(stockEditProduct.id, qty);
      showNotice(
        `Stock for ${stockEditProduct.name} updated to ${qty}!`,
        "success"
      );
      setStockEditProduct(null);
    } catch {
      showNotice("Failed to update stock quantity.", "error");
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-20 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg text-white transition-all ${
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "info"
              ? "bg-slate-900"
              : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Title, Stats & Role-Aware Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Menu Catalog</h2>
          <p className="text-xs text-slate-500">
            Toggle in-store item availability, update consignment stock counts,
            and manage menu items.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-600">
            Total Items:{" "}
            <strong className="text-slate-900">{products.length}</strong>
          </span>
          <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-emerald-700">
            Active: <strong className="text-emerald-800">{activeCount}</strong>
          </span>

          {isManager ? (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          ) : (
            <span className="px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
              Cashier Mode: Stock &amp; Availability Only
            </span>
          )}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchBar
          className="sm:col-span-2"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search menu item by name, category, or vendor..."
        />
        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilterTab)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-600 shadow-2xs text-slate-700"
          >
            <option value="all">All Sources (In-House &amp; Vendors)</option>
            <option value="in_house">In-House Production Only</option>
            <option value="consignment">
              Consignment (Third-Party Vendors)
            </option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {(
          [
            { id: "all", label: "All Categories" },
            { id: "coffee", label: "☕ Espresso & Coffee" },
            { id: "non_coffee", label: "🍵 Non-Coffee / Tea" },
            { id: "food", label: "🥐 Pastry & Food" },
            { id: "addons", label: "✨ Add-ons & Syrups" },
          ] as const
        ).map((tab) => {
          const active = categoryTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-amber-100 text-amber-800 border border-amber-300 font-semibold"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading menu catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-1">
          <p className="text-xs font-bold text-slate-700">
            No matching menu items
          </p>
          <p className="text-[11px] text-slate-400">
            Try adjusting your category or source filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const isConsignment = product.item_type === "CONSIGNMENT";
            const isAddOn = product.item_type === "ADD_ON";
            const isOutOfStock =
              !product.is_active ||
              (product.stock_quantity != null && product.stock_quantity <= 0);

            const isNonCoffee = product.main_category === "NON_COFFEE";

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl p-4 shadow-2xs transition-all space-y-3 ${
                  isOutOfStock
                    ? "border border-slate-200 opacity-70 hover:opacity-100"
                    : isConsignment
                    ? "border-2 border-indigo-100 hover:border-amber-400"
                    : "border border-slate-200 hover:border-amber-400"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                        isOutOfStock
                          ? "bg-slate-100 text-slate-400"
                          : isConsignment
                          ? "bg-indigo-50 text-indigo-700"
                          : isNonCoffee
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {isOutOfStock ? (
                        <Cake className="w-6 h-6" />
                      ) : isConsignment ? (
                        <Croissant className="w-6 h-6" />
                      ) : isAddOn ? (
                        <Milk className="w-6 h-6" />
                      ) : isNonCoffee ? (
                        <CupSoda className="w-6 h-6" />
                      ) : (
                        <Coffee className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isOutOfStock
                            ? "text-rose-700 bg-rose-50"
                            : isConsignment
                            ? "text-indigo-700 bg-indigo-50"
                            : isNonCoffee
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-amber-700 bg-amber-50"
                        }`}
                      >
                        {isOutOfStock
                          ? "Out of Stock"
                          : isConsignment
                          ? "Consignment"
                          : isAddOn
                          ? "Add-on"
                          : isNonCoffee
                          ? "Tea / Non-Coffee"
                          : "Coffee"}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isConsignment
                          ? `Vendor: ${product.vendor?.name || "Partner Vendor"}`
                          : isAddOn
                          ? "Modifier / Add-on"
                          : "In-House Signature"}
                      </p>
                    </div>
                  </div>

                  {/* Instant Availability Switch */}
                  <label
                    className="relative inline-flex items-center cursor-pointer"
                    title="Toggle active status"
                  >
                    <input
                      type="checkbox"
                      checked={product.is_active}
                      onChange={() => handleToggleAvailability(product)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10px]">
                      {isAddOn ? "Add-on Price:" : "Price:"}
                    </span>
                    <p
                      className={`font-mono font-bold ${
                        isOutOfStock
                          ? "text-slate-400 line-through"
                          : "text-amber-800"
                      }`}
                    >
                      {isAddOn ? "+" : ""}Rp{" "}
                      {product.retail_price.toLocaleString("id-ID")}
                    </p>
                    {isConsignment && product.consignment_fee != null && (
                      <span className="text-[10px] text-indigo-600">
                        Consign Fee: Rp{" "}
                        {product.consignment_fee.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[10px]">
                      {isConsignment ? "Stock Left:" : "Stock:"}
                    </span>
                    {product.stock_quantity != null ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStockEditProduct(product);
                          setStockEditValue(String(product.stock_quantity));
                        }}
                        className={`block font-semibold hover:underline cursor-pointer ${
                          product.stock_quantity <= 0
                            ? "text-rose-600"
                            : product.stock_quantity <= 5
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {product.stock_quantity} units{" "}
                        {product.stock_quantity <= 5 &&
                        product.stock_quantity > 0
                          ? "(Low)"
                          : ""}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setStockEditProduct(product);
                          setStockEditValue("20");
                        }}
                        className="block text-emerald-600 font-semibold hover:underline cursor-pointer"
                      >
                        Plenty
                      </button>
                    )}
                  </div>
                </div>

                {isManager && (
                  <div className="flex items-center justify-end gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(product);
                        setIsProductModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveProduct(product)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Archive / Disable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        editingProduct={editingProduct}
        vendors={vendors}
        isMutating={isMutating}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaveProduct={handleSaveProduct}
        onCreateVendor={handleCreateVendor}
      />

      {/* Quick Stock Update Modal (Cashier & Manager) */}
      {stockEditProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Update Stock: {stockEditProduct.name}
            </h3>
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">
                Remaining Stock Quantity (Units)
              </label>
              <input
                type="number"
                min={0}
                value={stockEditValue}
                onChange={(e) => setStockEditValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStockEditProduct(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleSaveStockCount}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
