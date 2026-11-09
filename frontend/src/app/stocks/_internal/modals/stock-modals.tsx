"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  Edit2,
  PackagePlus,
  Plus,
  PlusCircle,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import {
  CostCategory,
  ExpensePaymentMethod,
  RawStockCategory,
  RawStockCreatePayload,
  RawStockItem,
  RawStockUpdatePayload,
  ReimbursementStatus,
} from "../hooks/use-stocks";
import { SearchableSelect } from "@/main/components/ui/searchable-select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

const RAW_STOCK_CATEGORIES: Array<{
  value: RawStockCategory;
  label: string;
}> = [
  { value: "beans", label: "☕ Coffee Beans (Biji Kopi)" },
  { value: "milk_dairy", label: "🥛 Milks & Dairy" },
  { value: "creamer_sweetener", label: "🍯 Creamer & Sweetener" },
  { value: "syrup_beverage", label: "🍓 Syrups & Flavoring" },
  { value: "powder_spread", label: "🍵 Powders & Spreads" },
  { value: "ice", label: "🧊 Ice Crystals (Es Kristal)" },
  { value: "packaging_supply", label: "🥤 Packaging & Cups" },
  { value: "other", label: "📦 Other Raw Supply" },
];

const COMMON_UNITS = [
  "kg",
  "gr",
  "liter",
  "ml",
  "can",
  "pouch",
  "bag",
  "pack",
  "pcs",
  "roll",
  "btl",
];

/* =========================================================
   MODAL 1: ADD RAW STOCK PURCHASE WITH RECEIPT / BILL IMAGE
   ========================================================= */
interface PurchaseModalProps {
  isOpen: boolean;
  rawStocks: RawStockItem[];
  preselectedStockId?: string | null;
  isMutating: boolean;
  onClose: () => void;
  onSubmitPurchase: (formData: FormData) => Promise<void>;
  onCreateRawStock?: (payload: RawStockCreatePayload) => Promise<RawStockItem>;
}

interface LineItemDraft {
  raw_stock_id: string;
  raw_stock_name: string;
  unit: string;
  category: string;
  quantity: string;
  subtotal_cost: string;
}

export function PurchaseModal({
  isOpen,
  rawStocks,
  preselectedStockId,
  isMutating,
  onClose,
  onSubmitPurchase,
  onCreateRawStock,
}: PurchaseModalProps) {
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("m_banking");
  const [reimbursementStatus, setReimbursementStatus] =
    useState<ReimbursementStatus>("not_applicable");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [addedBillAmount, setAddedBillAmount] = useState("");

  const defaultStock =
    rawStocks.find((s) => s.id === preselectedStockId) || rawStocks[0];

  const [lines, setLines] = useState<LineItemDraft[]>([
    {
      raw_stock_id: defaultStock?.id || "",
      raw_stock_name: defaultStock?.name || "Es Kristal (Ice Crystals)",
      unit: defaultStock?.unit || "bag",
      category: defaultStock?.category || "ice",
      quantity: "1",
      subtotal_cost: "",
    },
  ]);

  // Options for SearchableSelect
  const stockOptions = useMemo(
    () =>
      rawStocks.map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: `${s.category.replace("_", " ")} • Current: ${
          s.current_quantity
        } ${s.unit}`,
        badge: s.unit,
      })),
    [rawStocks]
  );

  // Inline "Register New Raw Stock Item" sub-form state
  const [showNewStockForm, setShowNewStockForm] = useState(false);
  const [targetLineIdxForNew, setTargetLineIdxForNew] = useState<number>(0);
  const [newStockName, setNewStockName] = useState("");
  const [newStockCategory, setNewStockCategory] =
    useState<RawStockCategory>("beans");
  const [newStockUnit, setNewStockUnit] = useState("kg");
  const [newStockThreshold, setNewStockThreshold] = useState("1");
  const [inlineCreateError, setInlineCreateError] = useState("");

  if (!isOpen) return null;

  const handleOpenInlineNewStock = (idx: number, initialQuery = "") => {
    setTargetLineIdxForNew(idx);
    setNewStockName(initialQuery);
    setInlineCreateError("");
    setShowNewStockForm(true);
  };

  const handleSaveInlineNewStock = async () => {
    if (!newStockName.trim()) {
      setInlineCreateError("Please enter a raw stock name.");
      return;
    }
    if (!onCreateRawStock) return;

    try {
      setInlineCreateError("");
      const created = await onCreateRawStock({
        name: newStockName.trim(),
        category: newStockCategory,
        unit: newStockUnit.trim() || "pcs",
        low_stock_threshold: Math.max(0, parseFloat(newStockThreshold) || 1),
      });

      handleSelectLineStock(targetLineIdxForNew, created.id);
      setShowNewStockForm(false);
      setNewStockName("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail || "Failed to create raw stock item"
          : "Failed to create raw stock item";
      setInlineCreateError(String(msg));
    }
  };

  const handleAddLine = () => {
    const first = rawStocks[0];
    setLines((prev) => [
      ...prev,
      {
        raw_stock_id: first?.id || "",
        raw_stock_name: first?.name || "Raw Stock Item",
        unit: first?.unit || "pcs",
        category: first?.category || "other",
        quantity: "1",
        subtotal_cost: "",
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSelectLineStock = (idx: number, stockId: string) => {
    const matched = rawStocks.find((s) => s.id === stockId);
    setLines((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        raw_stock_id: stockId,
        raw_stock_name: matched?.name || next[idx].raw_stock_name,
        unit: matched?.unit || next[idx].unit,
        category: matched?.category || next[idx].category,
      };
      return next;
    });
  };

  const handleLineChange = (
    idx: number,
    field: "quantity" | "subtotal_cost",
    val: string
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const activeLines = mode === "single" ? [lines[0]] : lines;
  const itemsSubtotalSum = activeLines.reduce(
    (sum, line) => sum + Math.max(0, parseFloat(line.subtotal_cost) || 0),
    0
  );
  const parsedDiscount = showAdjustment
    ? Math.max(0, parseFloat(discountAmount) || 0)
    : 0;
  const parsedAddedBill = showAdjustment
    ? Math.max(0, parseFloat(addedBillAmount) || 0)
    : 0;
  const computedTotalCost = Math.max(
    0,
    itemsSubtotalSum - parsedDiscount + parsedAddedBill
  );

  const handleSubmit = async () => {
    if (computedTotalCost <= 0 && itemsSubtotalSum <= 0) return;

    const fd = new FormData();
    fd.append("payment_method", paymentMethod);
    fd.append(
      "reimbursement_status",
      paymentMethod === "cash" ? "not_applicable" : reimbursementStatus
    );
    if (supplier.trim()) fd.append("supplier_or_store", supplier.trim());

    const adjParts: string[] = [];
    if (parsedDiscount > 0) {
      adjParts.push(`Discount: -Rp ${parsedDiscount.toLocaleString("id-ID")}`);
    }
    if (parsedAddedBill > 0) {
      adjParts.push(
        `Added Bill: +Rp ${parsedAddedBill.toLocaleString("id-ID")}`
      );
    }
    const adjSuffix = adjParts.length > 0 ? `[${adjParts.join(", ")}]` : "";
    const combinedNotes = [notes.trim(), adjSuffix].filter(Boolean).join(" ");
    if (combinedNotes) fd.append("notes", combinedNotes);

    const payloadItems = activeLines.map((l) => {
      const matched =
        rawStocks.find((s) => s.id === l.raw_stock_id) || rawStocks[0];
      const qty = Math.max(0.1, parseFloat(l.quantity) || 1);
      const sub = Math.max(0, parseFloat(l.subtotal_cost) || 0);
      return {
        raw_stock_id: matched?.id || null,
        raw_stock_name: matched?.name || l.raw_stock_name,
        category: matched?.category || l.category || "other",
        unit: matched?.unit || l.unit || "pcs",
        quantity: qty,
        subtotal_cost: sub,
      };
    });

    fd.append("total_cost", String(computedTotalCost));
    fd.append("items_json", JSON.stringify(payloadItems));

    if (receiptFile) {
      fd.append("receipt", receiptFile);
    }

    await onSubmitPurchase(fd);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Record Raw Stock Purchase
              </h3>
              <p className="text-[11px] text-slate-500">
                Manager Only &bull; Store Receipt or M-Banking / E-Wallet Bill
                (Optional)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Single-Item vs Multi-Item Store Receipt */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === "single"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Single-Item Bill (e.g. Es Kristal)
          </button>
          <button
            type="button"
            onClick={() => setMode("multi")}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === "multi"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Multi-Item Receipt (e.g. Cup, Kopi, Susu)
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as ExpensePaymentMethod)
                }
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="m_banking">
                  M-Banking Transfer (BCA/Mandiri/BRI)
                </option>
                <option value="e_wallet">
                  E-Wallet (GoPay/OVO/Dana/ShopeePay)
                </option>
                <option value="qris">QRIS</option>
                <option value="cash">Store Cash Receipt</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">
                Store / Supplier
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Indogrosir / Tokopedia / Depot Es"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Reimbursement / Funding Source Selector */}
          {paymentMethod === "cash" ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Reimbursement Status:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold">
                Paid with Cafe Cash (No Reimburse)
              </span>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-slate-700">
                Funding Source / Reimbursement
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setReimbursementStatus("not_applicable")}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    reimbursementStatus === "not_applicable"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="block text-xs">Cafe / Finance Account</span>
                  <span className="block text-[10px] font-normal text-slate-500">
                    Paid directly by Finance (No Reimburse)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReimbursementStatus("pending")}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    reimbursementStatus === "pending"
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="block text-xs">Paid Out-of-Pocket</span>
                  <span className="block text-[10px] font-normal text-slate-500">
                    Needs reimbursement from Finance
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Line Items Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Purchased Raw Stock Item(s)
              </label>
              <div className="flex items-center gap-2">
                {onCreateRawStock && !showNewStockForm && (
                  <button
                    type="button"
                    onClick={() => handleOpenInlineNewStock(0, "")}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Stock Item</span>
                  </button>
                )}
                {mode === "multi" && (
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Row
                  </button>
                )}
              </div>
            </div>

            {/* Inline New Raw Stock Quick-Add Sub-Form */}
            {showNewStockForm && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-amber-700" />
                    Register New Raw Stock Item
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewStockForm(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {inlineCreateError && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inlineCreateError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStockName}
                      onChange={(e) => setNewStockName(e.target.value)}
                      placeholder="e.g. Arabica Puntang Natural - Kopi Kultur"
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">
                        Category
                      </label>
                      <select
                        value={newStockCategory}
                        onChange={(e) =>
                          setNewStockCategory(
                            e.target.value as RawStockCategory
                          )
                        }
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                      >
                        {RAW_STOCK_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">
                        Unit <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newStockUnit}
                        onChange={(e) => setNewStockUnit(e.target.value)}
                        placeholder="kg / gr / can"
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">
                        Min. Alert
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={newStockThreshold}
                        onChange={(e) => setNewStockThreshold(e.target.value)}
                        placeholder="1"
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>

                  {/* Unit suggestions */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400">Quick unit:</span>
                    {COMMON_UNITS.slice(0, 7).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewStockUnit(u)}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                          newStockUnit === u
                            ? "bg-amber-700 text-white font-bold"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-200/50">
                  <button
                    type="button"
                    onClick={() => setShowNewStockForm(false)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!newStockName.trim() || isMutating}
                    onClick={handleSaveInlineNewStock}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save &amp; Select</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(mode === "single" ? [lines[0]] : lines).map((line, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-end"
                >
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 font-medium">
                      Raw Stock Item
                    </label>
                    <div className="mt-0.5">
                      <SearchableSelect
                        options={stockOptions}
                        value={line.raw_stock_id || rawStocks[0]?.id || ""}
                        onChange={(val) => handleSelectLineStock(idx, val)}
                        placeholder="Search or pick stock..."
                        searchPlaceholder="Filter beans, milk, syrups..."
                        onAddNew={
                          onCreateRawStock
                            ? (q) => handleOpenInlineNewStock(idx, q)
                            : undefined
                        }
                        addNewLabel="+ Add New Raw Stock Item"
                      />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500">
                      Qty ({line.unit || "unit"})
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={line.quantity}
                      onChange={(e) =>
                        handleLineChange(idx, "quantity", e.target.value)
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div
                    className={
                      mode === "multi" && lines.length > 1
                        ? "col-span-3"
                        : "col-span-4"
                    }
                  >
                    <label className="text-[10px] text-slate-500">
                      Subtotal (Rp)
                    </label>
                    <input
                      type="number"
                      value={line.subtotal_cost}
                      onChange={(e) =>
                        handleLineChange(idx, "subtotal_cost", e.target.value)
                      }
                      placeholder="14000"
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                  {mode === "multi" && lines.length > 1 && (
                    <div className="col-span-1 flex justify-end pb-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Discount or Added Bill (Shipping / Tax / Fee) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">
                Discount or Added Bill{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (showAdjustment) {
                    setDiscountAmount("");
                    setAddedBillAmount("");
                  }
                  setShowAdjustment((prev) => !prev);
                }}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                {showAdjustment ? (
                  <>
                    <X className="w-3 h-3" />
                    <span>Remove Discount / Added Bill</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>+ Add Discount / Added Bill</span>
                  </>
                )}
              </button>
            </div>

            {showAdjustment && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-emerald-700">
                      Discount / Promo (- Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-rose-700">
                      Added Bill / Fee / Ongkir (+ Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addedBillAmount}
                      onChange={(e) => setAddedBillAmount(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/70 font-mono">
                  <span>
                    Items Subtotal: Rp{" "}
                    {itemsSubtotalSum.toLocaleString("id-ID")}
                  </span>
                  {parsedDiscount > 0 && (
                    <span className="text-emerald-700 font-semibold">
                      - Rp {parsedDiscount.toLocaleString("id-ID")}
                    </span>
                  )}
                  {parsedAddedBill > 0 && (
                    <span className="text-rose-600 font-semibold">
                      + Rp {parsedAddedBill.toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Total Bill Amount (Rp)
              </label>
              <input
                type="text"
                readOnly
                value={`Rp ${computedTotalCost.toLocaleString("id-ID")}`}
                className="w-full mt-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 cursor-not-allowed select-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">
                Notes (Keterangan)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cup, Kopi, Creamer"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Optional Receipt / M-Banking Bill Image Upload */}
          <div>
            <label className="font-semibold text-slate-700 flex items-center justify-between">
              <span>
                Receipt / Payment Proof Image{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </span>
              <span className="text-[10px] text-amber-700 font-normal">
                JPG, PNG, WEBP or PDF
              </span>
            </label>
            <label className="mt-1 border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
              <UploadCloud className="w-6 h-6 text-amber-700" />
              <span className="text-xs font-bold text-amber-900">
                {receiptFile
                  ? `Attached: ${receiptFile.name}`
                  : "Tap to attach store receipt or M-Banking / E-Wallet screenshot (if available)"}
              </span>
              <span className="text-[10px] text-slate-500">
                Leave blank for warung/cash purchases without a receipt (e.g. Es
                Kristal)
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) =>
                  setReceiptFile(e.target.files?.[0] || null)
                }
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isMutating || computedTotalCost <= 0}
            onClick={handleSubmit}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {isMutating ? "Saving..." : "Save Purchase & Update Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL 2: LOG OPERATIONAL EXPENSE (PLN / SALARY / CONSIGN)
   ========================================================= */
interface OperationalModalProps {
  isOpen: boolean;
  isMutating: boolean;
  onClose: () => void;
  onSubmitOperational: (formData: FormData) => Promise<void>;
}

export function OperationalModal({
  isOpen,
  isMutating,
  onClose,
  onSubmitOperational,
}: OperationalModalProps) {
  const [category, setCategory] = useState<CostCategory>("electricity_indoor");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("m_banking");
  const [reimbursementStatus, setReimbursementStatus] =
    useState<ReimbursementStatus>("not_applicable");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (!title.trim() || numAmount <= 0) return;

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("category", category);
    fd.append("amount", String(numAmount));
    fd.append("payment_method", paymentMethod);
    fd.append(
      "reimbursement_status",
      paymentMethod === "cash" ? "not_applicable" : reimbursementStatus
    );
    if (receiptFile) {
      fd.append("receipt", receiptFile);
    }

    await onSubmitOperational(fd);
    setTitle("");
    setAmount("");
    setReceiptFile(null);
    setReimbursementStatus("not_applicable");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              Log Operational Expense
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">
              Expense Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CostCategory)}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
            >
              <option value="electricity_indoor">
                Electricity Indoor (Token Listrik Ruko)
              </option>
              <option value="electricity_booth">
                Electricity Booth (Token Listrik Booth)
              </option>
              <option value="staff_salary">
                Staff Salary / Kasbon / Insentif
              </option>
              <option value="consignment_payout">
                Consignment Vendor Payout (Rafid / Palmer / Letu)
              </option>
              <option value="rent">Rent / Sewa</option>
              <option value="other">Other Operational Expense</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700">
              Title / Description (Keterangan)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Token Ruko / Gaji Wirya / Consignment Palmer"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Amount (Rp)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="103500"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as ExpensePaymentMethod)
                }
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="m_banking">M-Banking</option>
                <option value="e_wallet">E-Wallet</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          {paymentMethod === "cash" ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Reimbursement Status:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold">
                Paid with Cafe Cash (No Reimburse)
              </span>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-slate-700">
                Funding Source / Reimbursement
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setReimbursementStatus("not_applicable")}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    reimbursementStatus === "not_applicable"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="block text-xs">Cafe / Finance Account</span>
                  <span className="block text-[10px] font-normal text-slate-500">
                    Paid directly by Finance
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReimbursementStatus("pending")}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    reimbursementStatus === "pending"
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="block text-xs">Paid Out-of-Pocket</span>
                  <span className="block text-[10px] font-normal text-slate-500">
                    Needs reimbursement
                  </span>
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="font-semibold text-slate-700">
              Payment Proof / PLN Receipt (Optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="w-full mt-1 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!title.trim() || !amount || isMutating}
            onClick={handleSubmit}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {isMutating ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL 3: STOCK OPNAME / QUANTITY ADJUSTMENT
   ========================================================= */
interface AdjustStockModalProps {
  stock: RawStockItem | null;
  isMutating: boolean;
  onClose: () => void;
  onConfirmAdjust: (newQty: number) => Promise<void>;
}

export function AdjustStockModal({
  stock,
  isMutating,
  onClose,
  onConfirmAdjust,
}: AdjustStockModalProps) {
  const [val, setVal] = useState<string>(
    stock ? String(stock.current_quantity) : "0"
  );

  if (!stock) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">
            Opname: {stock.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-slate-700">
            Actual Remaining Quantity ({stock.unit})
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900"
          />
          <p className="text-[11px] text-slate-400">
            Used for end-of-shift or weekly stock opname checks.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isMutating}
            onClick={() => onConfirmAdjust(Math.max(0, parseFloat(val) || 0))}
            className="px-4 py-2 bg-amber-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            Update Quantity
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL 4: RECEIPT / M-BANKING BILL PREVIEW
   ========================================================= */
export interface ReceiptPreviewInfo {
  title: string;
  amount: string;
  method: string;
  itemsSummary: string;
  imageUrl?: string | null;
}

export function ExpenseReceiptPreviewModal({
  preview,
  onClose,
}: {
  preview: ReceiptPreviewInfo | null;
  onClose: () => void;
}) {
  if (!preview) return null;

  const fullImgUrl =
    preview.imageUrl && preview.imageUrl.startsWith("/static/")
      ? preview.imageUrl
      : preview.imageUrl && preview.imageUrl.startsWith("/")
        ? `${API_BASE_URL}${preview.imageUrl}`
        : preview.imageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">{preview.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Payment Method:</span>
            <span className="font-semibold text-slate-900">
              {preview.method}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Amount:</span>
            <span className="font-mono font-bold text-rose-600">
              {preview.amount}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200/70">
            <span className="text-slate-500 block mb-1">Items / Notes:</span>
            <p className="font-medium text-slate-800">{preview.itemsSummary}</p>
          </div>
        </div>

        {fullImgUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-64 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullImgUrl}
              alt="Receipt Proof"
              className="max-h-64 w-auto object-contain"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL 5: EDIT / ADD RAW STOCK ITEM
   ========================================================= */
export interface EditRawStockModalProps {
  isOpen: boolean;
  stock: RawStockItem | null;
  isMutating: boolean;
  onClose: () => void;
  onSaveRawStock: (
    stockId: string,
    payload: RawStockUpdatePayload
  ) => Promise<void>;
  onCreateRawStock?: (
    payload: RawStockCreatePayload
  ) => Promise<RawStockItem>;
}

export function EditRawStockModal(props: EditRawStockModalProps) {
  if (!props.isOpen) return null;
  const key = props.stock ? `edit-${props.stock.id}` : "create-new";
  return <EditRawStockDialog key={key} {...props} />;
}

function EditRawStockDialog({
  stock,
  isMutating,
  onClose,
  onSaveRawStock,
  onCreateRawStock,
}: EditRawStockModalProps) {
  const [name, setName] = useState(stock?.name ?? "");
  const [category, setCategory] = useState<RawStockCategory>(
    stock?.category ?? "beans"
  );
  const [unit, setUnit] = useState(stock?.unit ?? "kg");
  const [threshold, setThreshold] = useState(
    stock ? String(stock.low_stock_threshold) : "1"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg("Raw stock name cannot be empty.");
      return;
    }
    if (!unit.trim()) {
      setErrorMsg("Measurement unit is required (e.g. kg, liter, pcs).");
      return;
    }

    try {
      setErrorMsg("");
      const parsedThreshold = Math.max(0, parseFloat(threshold) || 0);

      if (stock) {
        await onSaveRawStock(stock.id, {
          name: name.trim(),
          category,
          unit: unit.trim(),
          low_stock_threshold: parsedThreshold,
        });
      } else if (onCreateRawStock) {
        await onCreateRawStock({
          name: name.trim(),
          category,
          unit: unit.trim(),
          low_stock_threshold: parsedThreshold,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail || "Failed to save raw stock item."
          : "Failed to save raw stock item.";
      setErrorMsg(String(msg));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              {stock ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <PackagePlus className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {stock
                  ? `Edit Raw Stock: ${stock.name}`
                  : "Add New Raw Stock Item"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {stock
                  ? "Update item name, category, or low stock threshold"
                  : "Register a new ingredient or cafe supply"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700">
              Raw Stock Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arabica Gayo Natural - Roastery A"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as RawStockCategory)
                }
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
              >
                {RAW_STOCK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">
                Measurement Unit <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg / gr / can / pcs"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Quick Unit Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Quick unit:</span>
            {COMMON_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  unit === u
                    ? "bg-amber-700 text-white font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <div>
            <label className="font-semibold text-slate-700">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 2"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-amber-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Triggers a red &ldquo;Low Stock&rdquo; alert when inventory falls at or below this value.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || !unit.trim() || isMutating}
            onClick={handleSubmit}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isMutating ? "Saving..." : stock ? "Save Changes" : "Create Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
