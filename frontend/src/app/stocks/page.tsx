"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Coffee,
  CupSoda,
  Droplet,
  Edit2,
  Image as ImageIcon,
  Layers,
  Milk,
  Plus,
  ShoppingCart,
  Snowflake,
  Wine,
  Zap,
} from "lucide-react";
import { DataTable, DataTableColumn } from "@/main/components/ui/data-table";
import { SearchBar } from "@/main/components/ui/search-bar";
import {
  OperationalCostRecord,
  RawStockCategory,
  RawStockCreatePayload,
  RawStockItem,
  RawStockUpdatePayload,
  ReimbursementStatus,
  StockPurchaseRecord,
  useStocks,
} from "./_internal/hooks/use-stocks";
import {
  AdjustStockModal,
  EditRawStockModal,
  ExpenseReceiptPreviewModal,
  OperationalModal,
  PurchaseModal,
  ReceiptPreviewInfo,
} from "./_internal/modals/stock-modals";

type MainStockView = "catalog" | "purchases" | "operationals";

const RAW_CATEGORY_PILLS: Array<{
  id: "all" | RawStockCategory;
  label: string;
}> = [
  { id: "all", label: "All Raw Stocks" },
  { id: "beans", label: "☕ Coffee Beans" },
  { id: "milk_dairy", label: "🥛 Milks & Dairy" },
  { id: "creamer_sweetener", label: "🍯 Creamer & SKM" },
  { id: "syrup_beverage", label: "🍓 Syrups & Juices" },
  { id: "powder_spread", label: "🍵 Powders & Spreads" },
  { id: "ice", label: "🧊 Ice Crystals" },
  { id: "packaging_supply", label: "🥤 Cups, Straws & Tissue" },
];

export default function StocksPage() {
  const {
    rawStocks,
    purchases,
    operationalCosts,
    metrics,
    isLoading,
    isMutating,
    createRawStock,
    updateRawStock,
    adjustRawStockQuantity,
    recordStockPurchase,
    recordOperationalCost,
    reimbursePurchase,
    reimburseOperationalCost,
  } = useStocks();

  const [mainView, setMainView] = useState<MainStockView>("catalog");
  const [rawCatFilter, setRawCatFilter] = useState<"all" | RawStockCategory>(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [preselectedStockId, setPreselectedStockId] = useState<string | null>(
    null
  );
  const [isOperationalOpen, setIsOperationalOpen] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState<RawStockItem | null>(
    null
  );
  const [receiptPreview, setReceiptPreview] =
    useState<ReceiptPreviewInfo | null>(null);

  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<RawStockItem | null>(null);

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

  const filteredRawStocks = useMemo(() => {
    return rawStocks.filter((item) => {
      if (rawCatFilter !== "all" && item.category !== rawCatFilter)
        return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rawStocks, rawCatFilter, searchQuery]);

  const handleConfirmAdjust = async (newQty: number) => {
    if (!adjustingStock) return;
    try {
      await adjustRawStockQuantity(adjustingStock.id, newQty);
      showNotice(
        `Raw stock "${adjustingStock.name}" updated to ${newQty} ${adjustingStock.unit}!`,
        "success"
      );
      setAdjustingStock(null);
    } catch {
      showNotice("Failed to adjust raw stock quantity.", "error");
    }
  };

  const handleSubmitPurchase = async (formData: FormData) => {
    try {
      await recordStockPurchase(formData);
      setIsPurchaseOpen(false);
      setPreselectedStockId(null);
      showNotice("Stock purchase logged & cashflow updated!", "success");
    } catch {
      showNotice("Failed to record stock purchase.", "error");
    }
  };

  const handleSubmitOperational = async (formData: FormData) => {
    try {
      await recordOperationalCost(formData);
      setIsOperationalOpen(false);
      showNotice("Operational expense recorded into Cashflow!", "success");
    } catch {
      showNotice("Failed to record operational expense.", "error");
    }
  };

  const handleSaveRawStock = async (
    stockId: string,
    payload: RawStockUpdatePayload
  ) => {
    try {
      await updateRawStock(stockId, payload);
      setIsEditStockOpen(false);
      setEditingStock(null);
      showNotice("Raw stock details updated!", "success");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail || "Failed to update raw stock"
          : "Failed to update raw stock";
      showNotice(String(msg), "error");
      throw err;
    }
  };

  const handleCreateRawStock = async (payload: RawStockCreatePayload) => {
    try {
      const created = await createRawStock(payload);
      setIsEditStockOpen(false);
      setEditingStock(null);
      showNotice(`Raw stock "${created.name}" created!`, "success");
      return created;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail || "Failed to create raw stock"
          : "Failed to create raw stock";
      showNotice(String(msg), "error");
      throw err;
    }
  };

  const handleToggleStockActive = async (stock: RawStockItem) => {
    try {
      await updateRawStock(stock.id, { is_active: !stock.is_active });
      showNotice(
        `Raw stock "${stock.name}" is now ${
          !stock.is_active ? "Active" : "Inactive"
        }`,
        "info"
      );
    } catch {
      showNotice("Failed to toggle raw stock status.", "error");
    }
  };

  const renderCategoryIcon = (cat: RawStockCategory) => {
    switch (cat) {
      case "beans":
        return (
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
        );
      case "ice":
        return (
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Snowflake className="w-5 h-5" />
          </div>
        );
      case "milk_dairy":
        return (
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <Milk className="w-5 h-5" />
          </div>
        );
      case "creamer_sweetener":
        return (
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Droplet className="w-5 h-5" />
          </div>
        );
      case "syrup_beverage":
        return (
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Wine className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CupSoda className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8">
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

      {/* Top Page Title & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Raw Stocks &amp; Expenses
          </h2>
          <p className="text-xs text-slate-500">
            Beans, Milks, Syrups, Ice Crystals &amp; Operational Bills
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOperationalOpen(true)}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Log Operational Bill</span>
            <span className="sm:hidden">+ Bill</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPreselectedStockId(null);
              setIsPurchaseOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>+ Restock with Receipt</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              Raw Stock Catalog
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold font-mono text-slate-900">
            {metrics.totalCatalog} Items
          </div>
          <p className="text-[10px] text-slate-400">
            Beans, milks, syrups, ice, cups
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              Low Stock Alerts
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold font-mono text-rose-600">
            {metrics.lowStockCount} Items
          </div>
          <p className="text-[10px] text-rose-600 font-medium truncate">
            {metrics.lowStockNames || "All stock levels healthy"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              Stock Bought (Total)
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold font-mono text-slate-900">
            Rp {metrics.totalStockSpent.toLocaleString("id-ID")}
          </div>
          <p className="text-[10px] text-slate-400">
            {metrics.purchasesCount} verified store/m-banking receipts
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              Operational Bills
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold font-mono text-slate-900">
            Rp {metrics.totalOpsSpent.toLocaleString("id-ID")}
          </div>
          <p className="text-[10px] text-slate-400">
            PLN Token, Staff Salary &amp; Consignment
          </p>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMainView("catalog")}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              mainView === "catalog"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📦 Raw Stock Inventory ({rawStocks.length})
          </button>
          <button
            type="button"
            onClick={() => setMainView("purchases")}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              mainView === "purchases"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🧾 Purchase Receipts Log ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setMainView("operationals")}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              mainView === "operationals"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⚡ Operational &amp; Consignment Bills ({operationalCosts.length})
          </button>
        </div>

        {mainView === "catalog" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchBar
              className="flex-1 sm:w-64"
              inputClassName="py-2"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search beans, milk, syrup, ice..."
            />
            <button
              type="button"
              onClick={() => {
                setEditingStock(null);
                setIsEditStockOpen(true);
              }}
              className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Item</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: RAW STOCK INVENTORY CATALOG */}
      {mainView === "catalog" && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            {RAW_CATEGORY_PILLS.map((pill) => {
              const active = rawCatFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRawCatFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading raw stocks...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRawStocks.map((stock) => {
                const isLow =
                  stock.is_active &&
                  stock.current_quantity <= stock.low_stock_threshold;

                return (
                  <div
                    key={stock.id}
                    className={`bg-white rounded-2xl p-4 shadow-2xs transition-all space-y-3 ${
                      !stock.is_active
                        ? "border border-slate-200 opacity-70 hover:opacity-100"
                        : isLow
                        ? "border-2 border-rose-200"
                        : "border border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {renderCategoryIcon(stock.category)}
                        <div>
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded uppercase">
                            {stock.category.replace("_", " ")}
                          </span>
                          <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                            {stock.name}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Latest cost: Rp{" "}
                            {stock.cost_per_unit.toLocaleString("id-ID")} /{" "}
                            {stock.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            !stock.is_active
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : isLow
                              ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {!stock.is_active
                            ? "Inactive"
                            : isLow
                            ? "Low Stock"
                            : "In Stock"}
                        </span>

                        {/* Instant Active Switch (same style as Menu page) */}
                        <label
                          className="relative inline-flex items-center cursor-pointer"
                          title="Toggle active status"
                        >
                          <input
                            type="checkbox"
                            checked={stock.is_active}
                            onChange={() => handleToggleStockActive(stock)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">
                          Remaining Stock
                        </span>
                        <p
                          className={`text-sm font-bold font-mono ${
                            isLow ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          {stock.current_quantity}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            {stock.unit}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStock(stock);
                            setIsEditStockOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title={`Edit ${stock.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustingStock(stock)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                        >
                          Opname / Adjust
                        </button>
                        {isLow && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreselectedStockId(stock.id);
                              setIsPurchaseOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] cursor-pointer"
                          >
                            + Buy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* VIEW 2: PURCHASE RECEIPTS LOG */}
      {mainView === "purchases" && (
        <section className="space-y-4">
          <DataTable<StockPurchaseRecord>
            title="Raw Stock Purchase History (with Receipts)"
            subtitle="Supports both single-item bills and multi-item store receipts"
            headerAction={
              <button
                type="button"
                onClick={() => setIsPurchaseOpen(true)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Upload Receipt
              </button>
            }
            data={purchases}
            keyExtractor={(p) => p.id}
            pageSize={10}
            itemLabel="purchase receipts"
            emptyMessage="No stock purchase records yet."
            columns={
              [
                {
                  key: "date",
                  header: "Date",
                  cellClassName: "font-mono text-[11px]",
                  render: (p) =>
                    new Date(p.purchased_at).toLocaleDateString("id-ID"),
                },
                {
                  key: "type",
                  header: "Receipt Type",
                  render: (p) => {
                    const isMulti = (p.items?.length || 0) > 1;
                    return isMulti ? (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px]">
                        Multi-Item Receipt ({p.items.length})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        Single-Item
                      </span>
                    );
                  },
                },
                {
                  key: "items",
                  header: "Items Bought (Keterangan)",
                  cellClassName: "font-medium",
                  render: (p) =>
                    p.items && p.items.length > 0
                      ? p.items
                          .map(
                            (i) =>
                              `${i.raw_stock_name || "Item"} (${i.quantity} ${
                                i.unit || ""
                              })`
                          )
                          .join(", ")
                      : p.notes || "Raw stock restock",
                },
                {
                  key: "payment",
                  header: "Payment",
                  render: (p) => (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px] uppercase">
                      {p.payment_method.replace("_", " ")}
                    </span>
                  ),
                },
                {
                  key: "reimbursement",
                  header: "Reimbursement",
                  render: (p) => {
                    const status: ReimbursementStatus =
                      p.reimbursement_status || "not_applicable";
                    if (status === "pending") {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                            <Clock className="w-3 h-3" />
                            Pending Reimburse
                          </span>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={async () => {
                              try {
                                await reimbursePurchase(p.id);
                                showNotice(
                                  "Purchase marked as Reimbursed!",
                                  "success"
                                );
                              } catch {
                                showNotice(
                                  "Failed to mark purchase reimbursed.",
                                  "error"
                                );
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            Mark Reimbursed
                          </button>
                        </div>
                      );
                    }
                    if (status === "reimbursed") {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Reimbursed
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                        {p.payment_method === "cash"
                          ? "Cafe Cash"
                          : "Direct / Finance"}
                      </span>
                    );
                  },
                },
                {
                  key: "total",
                  header: "Total Cost",
                  align: "right",
                  cellClassName: "font-mono font-bold text-rose-600",
                  render: (p) => `-Rp ${p.total_cost.toLocaleString("id-ID")}`,
                },
                {
                  key: "proof",
                  header: "Proof / Receipt",
                  align: "center",
                  render: (p) => {
                    const summaryText =
                      p.items && p.items.length > 0
                        ? p.items
                            .map(
                              (i) =>
                                `${i.raw_stock_name || "Item"} (${i.quantity} ${
                                  i.unit || ""
                                })`
                            )
                            .join(", ")
                        : p.notes || "Raw stock restock";
                    const dateStr = new Date(
                      p.purchased_at
                    ).toLocaleDateString("id-ID");
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptPreview({
                            title: `${
                              p.supplier_or_store || "Store Receipt"
                            } (${dateStr})`,
                            amount: `Rp ${p.total_cost.toLocaleString("id-ID")}`,
                            method: p.payment_method
                              .replace("_", " ")
                              .toUpperCase(),
                            itemsSummary: summaryText,
                            imageUrl: p.receipt_image_url,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px] hover:bg-amber-100 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> View Bill
                      </button>
                    );
                  },
                },
              ] satisfies DataTableColumn<StockPurchaseRecord>[]
            }
          />
        </section>
      )}

      {/* VIEW 3: OPERATIONAL & CONSIGNMENT BILLS */}
      {mainView === "operationals" && (
        <section className="space-y-4">
          <DataTable<OperationalCostRecord>
            title="Operational Costs & Consignment Payouts"
            subtitle="Electricity (Token Ruko / Booth), Staff Salary/Kasbon & Vendor Payouts"
            headerAction={
              <button
                type="button"
                onClick={() => setIsOperationalOpen(true)}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                + Log Expense
              </button>
            }
            data={operationalCosts}
            keyExtractor={(c) => c.id}
            pageSize={10}
            itemLabel="operational bills"
            emptyMessage="No operational expenses logged yet."
            columns={
              [
                {
                  key: "date",
                  header: "Date",
                  cellClassName: "font-mono text-[11px]",
                  render: (c) =>
                    new Date(c.expense_date).toLocaleDateString("id-ID"),
                },
                {
                  key: "category",
                  header: "Category",
                  render: (c) => (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[10px]">
                      {c.category}
                    </span>
                  ),
                },
                {
                  key: "title",
                  header: "Description (Keterangan)",
                  cellClassName: "font-medium",
                  render: (c) => c.title,
                },
                {
                  key: "reimbursement",
                  header: "Reimbursement",
                  render: (c) => {
                    const status: ReimbursementStatus =
                      c.reimbursement_status || "not_applicable";
                    if (status === "pending") {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                            <Clock className="w-3 h-3" />
                            Pending Reimburse
                          </span>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={async () => {
                              try {
                                await reimburseOperationalCost(c.id);
                                showNotice(
                                  "Operational expense marked as Reimbursed!",
                                  "success"
                                );
                              } catch {
                                showNotice(
                                  "Failed to mark expense reimbursed.",
                                  "error"
                                );
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            Mark Reimbursed
                          </button>
                        </div>
                      );
                    }
                    if (status === "reimbursed") {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Reimbursed
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                        {c.payment_method === "cash"
                          ? "Cafe Cash"
                          : "Direct / Finance"}
                      </span>
                    );
                  },
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  cellClassName: "font-mono font-bold text-rose-600",
                  render: (c) => `-Rp ${c.amount.toLocaleString("id-ID")}`,
                },
                {
                  key: "proof",
                  header: "Payment Proof",
                  align: "center",
                  render: (c) => {
                    const dateStr = new Date(
                      c.expense_date
                    ).toLocaleDateString("id-ID");
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptPreview({
                            title: `${c.title} (${dateStr})`,
                            amount: `Rp ${c.amount.toLocaleString("id-ID")}`,
                            method: (
                              c.payment_method || "m_banking"
                            ).toUpperCase(),
                            itemsSummary: c.notes || c.title,
                            imageUrl: c.receipt_image_url,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] hover:bg-slate-200 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> Proof
                      </button>
                    );
                  },
                },
              ] satisfies DataTableColumn<OperationalCostRecord>[]
            }
          />
        </section>
      )}

      {/* Modals */}
      <PurchaseModal
        isOpen={isPurchaseOpen}
        rawStocks={rawStocks}
        preselectedStockId={preselectedStockId}
        isMutating={isMutating}
        onClose={() => {
          setIsPurchaseOpen(false);
          setPreselectedStockId(null);
        }}
        onSubmitPurchase={handleSubmitPurchase}
        onCreateRawStock={handleCreateRawStock}
      />

      <OperationalModal
        isOpen={isOperationalOpen}
        isMutating={isMutating}
        onClose={() => setIsOperationalOpen(false)}
        onSubmitOperational={handleSubmitOperational}
      />

      <AdjustStockModal
        stock={adjustingStock}
        isMutating={isMutating}
        onClose={() => setAdjustingStock(null)}
        onConfirmAdjust={handleConfirmAdjust}
      />

      <EditRawStockModal
        isOpen={isEditStockOpen}
        stock={editingStock}
        isMutating={isMutating}
        onClose={() => {
          setIsEditStockOpen(false);
          setEditingStock(null);
        }}
        onSaveRawStock={handleSaveRawStock}
        onCreateRawStock={handleCreateRawStock}
      />

      <ExpenseReceiptPreviewModal
        preview={receiptPreview}
        onClose={() => setReceiptPreview(null)}
      />
    </div>
  );
}
