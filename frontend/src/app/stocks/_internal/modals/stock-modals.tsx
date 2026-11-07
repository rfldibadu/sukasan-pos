"use client";

import { useState } from "react";
import {
  Camera,
  PlusCircle,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import {
  CostCategory,
  ExpensePaymentMethod,
  RawStockItem,
} from "../hooks/use-stocks";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

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
}: PurchaseModalProps) {
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod>("m_banking");
  const [supplier, setSupplier] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

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

  if (!isOpen) return null;

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

  const handleSubmit = async () => {
    const fd = new FormData();
    fd.append("payment_method", paymentMethod);
    if (supplier.trim()) fd.append("supplier_or_store", supplier.trim());
    if (notes.trim()) fd.append("notes", notes.trim());

    const activeLines = mode === "single" ? [lines[0]] : lines;
    const payloadItems = activeLines.map((l) => {
      const matched =
        rawStocks.find((s) => s.id === l.raw_stock_id) || rawStocks[0];
      const qty = Math.max(0.1, parseFloat(l.quantity) || 1);
      const sub =
        parseFloat(l.subtotal_cost) ||
        (mode === "single" ? parseFloat(totalCost) || 0 : 0);
      return {
        raw_stock_id: matched?.id || null,
        raw_stock_name: matched?.name || l.raw_stock_name,
        category: matched?.category || l.category || "other",
        unit: matched?.unit || l.unit || "pcs",
        quantity: qty,
        subtotal_cost: sub,
      };
    });

    const computedSum = payloadItems.reduce(
      (sum, item) => sum + (item.subtotal_cost || 0),
      0
    );
    const finalTotal = parseFloat(totalCost) || computedSum || 10000;
    fd.append("total_cost", String(finalTotal));
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

          {/* Dynamic Line Items Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Purchased Raw Stock Item(s)
              </label>
              {mode === "multi" && (
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Another Item
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(mode === "single" ? [lines[0]] : lines).map((line, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-end"
                >
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500">
                      Raw Stock Item
                    </label>
                    <select
                      value={line.raw_stock_id || rawStocks[0]?.id || ""}
                      onChange={(e) =>
                        handleSelectLineStock(idx, e.target.value)
                      }
                      className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                    >
                      {rawStocks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500">Qty</label>
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
                    className={mode === "multi" && lines.length > 1 ? "col-span-3" : "col-span-4"}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Total Bill Amount (Rp)
              </label>
              <input
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="e.g. 14000 or 479600"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
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
            disabled={isMutating}
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
    if (receiptFile) {
      fd.append("receipt", receiptFile);
    }

    await onSubmitOperational(fd);
    setTitle("");
    setAmount("");
    setReceiptFile(null);
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
