"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Banknote,
  Printer,
  QrCode,
  X,
} from "lucide-react";
import {
  formatOrderCode,
  formatOrderTime,
  OrderData,
} from "../hooks/use-orders";
import { POSProduct } from "@/app/pos/_internal/usecases/pos";
import { useGetAddOns } from "@/app/pos/_internal/hooks/use-get-pos-products";
import { SearchableSelect } from "@/main/components/ui/searchable-select";
import { axiosHttpPrivate } from "@/main/lib/axios";

const SUGAR_OPTIONS = ["Normal 100%", "Less 70%", "No Sugar"] as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

/* =========================================================
   1. SETTLE OPEN BILL MODAL
   ========================================================= */
interface SettleBillModalProps {
  order: OrderData | null;
  isOpen: boolean;
  isMutating: boolean;
  onClose: () => void;
  onConfirmSettle: (
    method: "cash" | "qris",
    cashReceived: number | null
  ) => void;
}

export function SettleBillModal({
  order,
  isOpen,
  isMutating,
  onClose,
  onConfirmSettle,
}: SettleBillModalProps) {
  const [method, setMethod] = useState<"cash" | "qris">("cash");
  const [cashTendered, setCashTendered] = useState<string>("");

  if (!isOpen || !order) return null;

  const numericCash = parseFloat(cashTendered) || 0;
  const changeDue =
    method === "cash" ? Math.max(0, numericCash - order.total_amount) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Settle Open Bill
            </h3>
            <p className="text-xs text-slate-500">
              {order.customer_name || formatOrderCode(order)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-1">
          <p className="text-xs text-slate-500">Total Tagihan (Bill Due)</p>
          <p className="text-2xl font-bold font-mono text-amber-800">
            Rp {order.total_amount.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Payment Method Toggle */}
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMethod("cash")}
            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
              method === "cash"
                ? "border-amber-600 bg-amber-100 text-amber-800"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <Banknote className="w-4 h-4" /> Cash
          </button>
          <button
            type="button"
            onClick={() => setMethod("qris")}
            className={`py-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
              method === "qris"
                ? "border-amber-600 bg-amber-100 text-amber-800"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <QrCode className="w-4 h-4" /> QRIS
          </button>
        </div>

        {method === "cash" ? (
          <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
            <div>
              <label className="text-slate-600 font-semibold">
                Cash Tendered (Rp)
              </label>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm text-slate-900"
              />
              <div className="flex gap-1.5 mt-2">
                {[order.total_amount, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCashTendered(String(preset))}
                    className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-mono font-semibold text-slate-700 hover:border-amber-500 cursor-pointer"
                  >
                    {preset === order.total_amount
                      ? "Uang Pas"
                      : `Rp ${(preset / 1000).toFixed(0)}k`}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Change Due (Kembalian):</span>
              <span className="font-mono font-bold text-emerald-600">
                Rp {changeDue.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-2 border border-slate-100">
            <div className="w-32 h-32 bg-white border border-slate-300 mx-auto rounded-xl flex items-center justify-center shadow-xs">
              <QrCode className="w-20 h-20 text-slate-800" />
            </div>
            <p className="text-[11px] text-slate-500">
              Scan QRIS to confirm payment
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              isMutating ||
              (method === "cash" && numericCash < order.total_amount)
            }
            onClick={() =>
              onConfirmSettle(method, method === "cash" ? numericCash : null)
            }
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {isMutating ? "Settling..." : "Settle & Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   2. ADD ITEMS TO OPEN BILL MODAL
   ========================================================= */
interface AddItemsModalProps {
  order: OrderData | null;
  products: POSProduct[];
  isOpen: boolean;
  isMutating: boolean;
  onClose: () => void;
  onConfirmAddItem: (
    productId: string,
    quantity: number,
    notes: string,
    addonIds: string[]
  ) => void;
}

export function AddItemsModal({
  order,
  products,
  isOpen,
  isMutating,
  onClose,
  onConfirmAddItem,
}: AddItemsModalProps) {
  const { addOns, isLoading: loadingAddOns } = useGetAddOns();
  const [selectedProdId, setSelectedProdId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSugar, setSelectedSugar] = useState<string>("Less 70%");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  const allSelectableItems = useMemo(() => {
    const base = products.filter((p) => p.is_available);
    const existingIds = new Set(base.map((p) => p.id));
    const extraAddOns = addOns.filter(
      (a) => a.is_available && !existingIds.has(a.id)
    );
    return [...base, ...extraAddOns];
  }, [products, addOns]);

  const selectOptions = useMemo(
    () =>
      allSelectableItems.map((p) => ({
        value: p.id,
        label: p.name,
        sublabel: `Rp ${p.price.toLocaleString("id-ID")}`,
        badge: p.item_type === "ADD_ON" ? "ADD-ON" : p.category,
      })),
    [allSelectableItems]
  );

  if (!isOpen || !order) return null;

  const effectiveProdId = selectedProdId || allSelectableItems[0]?.id || "";
  const selectedProduct = allSelectableItems.find(
    (p) => p.id === effectiveProdId
  );

  const isConsignmentFoodOrAddon =
    !selectedProduct ||
    selectedProduct.item_type === "CONSIGNMENT" ||
    selectedProduct.item_type === "ADD_ON" ||
    selectedProduct.category.toUpperCase().includes("SNACK") ||
    selectedProduct.category.toUpperCase().includes("FOOD");

  const availableAddOns = addOns.filter((item) => item.id !== effectiveProdId);

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activeAddOns = isConsignmentFoodOrAddon
    ? []
    : availableAddOns.filter((item) => selectedAddOnIds.includes(item.id));
  const addOnsUnitCost = activeAddOns.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = (selectedProduct?.price || 0) + addOnsUnitCost;
  const totalLinePrice = unitPrice * quantity;

  const handleConfirm = () => {
    const parts: string[] = [];
    if (!isConsignmentFoodOrAddon && selectedSugar) {
      parts.push(selectedSugar);
    }
    if (activeAddOns.length > 0) {
      parts.push(...activeAddOns.map((a) => `+${a.name}`));
    }
    if (notes.trim()) {
      parts.push(`(${notes.trim()})`);
    }

    const finalNotes = parts.join(", ");
    const finalAddonIds = activeAddOns.map((a) => a.id);

    onConfirmAddItem(effectiveProdId, quantity, finalNotes, finalAddonIds);
    setNotes("");
    setQuantity(1);
    setSelectedAddOnIds([]);
    setSelectedSugar("Less 70%");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Add Items to Open Bill
            </h3>
            <p className="text-xs text-slate-500">
              {order.customer_name || formatOrderCode(order)}
            </p>
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
              Select Item to Add
            </label>
            <div className="mt-1">
              <SearchableSelect
                options={selectOptions}
                value={effectiveProdId}
                onChange={(val) => {
                  setSelectedProdId(val);
                  setSelectedAddOnIds([]);
                }}
                placeholder="Search or select menu item..."
                searchPlaceholder="Search drink, food, or add-on..."
                buttonClassName="py-2 px-3 rounded-xl bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Sugar Level (for drinks) */}
          {!isConsignmentFoodOrAddon && (
            <div>
              <label className="font-semibold text-slate-700">
                Sugar Level
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {SUGAR_OPTIONS.map((level) => {
                  const active = selectedSugar === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedSugar(active ? "" : level)}
                      className={`py-2 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? "bg-amber-100 border-amber-600 text-amber-800 font-semibold"
                          : "border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons (for drinks) */}
          {!isConsignmentFoodOrAddon && (
            <div>
              <label className="font-semibold text-slate-700">Add-ons</label>
              {loadingAddOns ? (
                <p className="text-slate-400 py-2">Loading add-ons...</p>
              ) : availableAddOns.length === 0 ? (
                <p className="text-slate-400 italic py-1">
                  No additional add-ons available
                </p>
              ) : (
                <div className="space-y-1.5 mt-1 max-h-36 overflow-y-auto pr-1">
                  {availableAddOns.map((addOn) => {
                    const checked = selectedAddOnIds.includes(addOn.id);
                    return (
                      <label
                        key={addOn.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? "border-amber-500 bg-amber-50/50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddOn(addOn.id)}
                            className="rounded text-amber-700 accent-amber-700"
                          />
                          <span className="font-medium text-slate-800">
                            {addOn.name}
                          </span>
                        </div>
                        <span className="font-mono text-slate-500">
                          +Rp {addOn.price.toLocaleString("id-ID")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700">
              Special Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra hot, serve in glass mug"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!effectiveProdId || isMutating}
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {isMutating
              ? "Adding..."
              : `Add to Bill • Rp ${totalLinePrice.toLocaleString("id-ID")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   3. RECEIPT PREVIEW MODAL (Thermal 58mm Emulation + PDF)
   ========================================================= */
interface ReceiptPreviewModalProps {
  order: OrderData | null;
  productLookup: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  onPrintTriggered: () => void;
}

export function ReceiptPreviewModal({
  order,
  productLookup,
  isOpen,
  onClose,
  onPrintTriggered,
}: ReceiptPreviewModalProps) {
  if (!isOpen || !order) return null;

  const orderCode = formatOrderCode(order);

  const handleOpenPdfReceipt = () => {
    window.open(`${API_BASE_URL}/receipts/${order.id}/pdf`, "_blank");
    onPrintTriggered();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Receipt Preview (58mm)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Paper Receipt Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-[11px] text-slate-800 space-y-2.5 shadow-inner">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">SUKASAN COFFEE</p>
            <p className="text-[10px] text-slate-500">
              Jl. Achmad Nadjamuddin No.20
            </p>
            <p className="text-[10px] text-slate-500">WA: 0812-3456-7890</p>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-500 flex justify-between">
            <span>
              {orderCode} &bull; {order.cashier_name || "Cashier"}
            </span>
            <span>{formatOrderTime(order.created_at)}</span>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-1">
            {order.items.map((item, idx) => {
              const name =
                item.product_name ||
                productLookup[item.product_id] ||
                `Item #${idx + 1}`;
              return (
                <div key={item.id || idx} className="flex justify-between">
                  <span className="truncate pr-2">
                    {item.quantity}x {name}
                  </span>
                  <span>{item.line_total.toLocaleString("id-ID")}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-1 font-bold">
            <div className="flex justify-between text-xs">
              <span>TOTAL:</span>
              <span>Rp {order.total_amount.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-[10px] font-normal text-slate-500">
              <span>STATUS:</span>
              <span>
                {order.payment_status === "paid"
                  ? `LUNAS (${(order.payment_method || "PAID").toUpperCase()})`
                  : "OPEN BILL (BELUM BAYAR)"}
              </span>
            </div>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500 space-y-1.5">
            <div>
              <p>Terima Kasih!</p>
              <p>Nikmati Harimu bersama Sukasan</p>
            </div>
            <div className="flex justify-center pt-1">
              <Image
                src="/logo/sukasan_logo_bw.jpg"
                alt="Sukasan B&W Receipt Logo"
                width={80}
                height={57}
                unoptimized
                className="w-20 h-auto object-contain"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleOpenPdfReceipt}
            className="flex-1 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   4. VOID ORDER REASON MODAL
   ========================================================= */
interface VoidOrderModalProps {
  order: OrderData | null;
  isOpen: boolean;
  isMutating: boolean;
  onClose: () => void;
  onConfirmVoid: (reason: string, authPin: string) => void;
}

const VOID_REASONS = [
  "Customer cancelled / Left before payment",
  "Wrong item input by cashier",
  "Product out of stock / Machine malfunction",
  "Duplicate order punched",
];

export function VoidOrderModal({
  order,
  isOpen,
  isMutating,
  onClose,
  onConfirmVoid,
}: VoidOrderModalProps) {
  const [reason, setReason] = useState(VOID_REASONS[0]);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [showYesNoConfirm, setShowYesNoConfirm] = useState(false);

  if (!isOpen || !order) return null;

  const handleClose = () => {
    setPin("");
    setPinError(null);
    setShowYesNoConfirm(false);
    onClose();
  };

  const handleVerifyAndProceed = async () => {
    const trimmedPin = pin.trim();
    if (!/^\d{4,6}$/.test(trimmedPin)) {
      setPinError("Please enter a valid 4 to 6-digit numeric PIN.");
      return;
    }

    setPinError(null);
    setIsVerifyingPin(true);
    try {
      await axiosHttpPrivate.post("/settings/void-pin/verify", {
        pin: trimmedPin,
      });
      setShowYesNoConfirm(true);
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      setPinError(detail || "Invalid authorization PIN.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleFinalConfirmYes = () => {
    const trimmedPin = pin.trim();
    setShowYesNoConfirm(false);
    setPin("");
    setPinError(null);
    onConfirmVoid(reason, trimmedPin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Void Order</h3>
            <p className="text-xs text-slate-500">
              Restore inventory &amp; cancel transaction
            </p>
          </div>
        </div>

        {showYesNoConfirm ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs">
              <p className="font-bold text-rose-900">
                Confirm Void {formatOrderCode(order)}?
              </p>
              <p className="text-rose-800">
                Are you sure you want to void this order and restore product stock?
              </p>
              <p className="text-[11px] text-rose-700 pt-1">
                Reason: <span className="font-semibold">{reason}</span>
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setShowYesNoConfirm(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                No, Go Back
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleFinalConfirmYes}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {isMutating ? "Voiding..." : "Yes, Void Order"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Reason for Voiding
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  {VOID_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Authorization PIN <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                    if (pinError) setPinError(null);
                  }}
                  placeholder="Enter 4 or 6-digit PIN"
                  className={`w-full mt-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono tracking-widest text-center text-slate-900 ${
                    pinError ? "border-rose-500 bg-rose-50/40" : "border-slate-200"
                  }`}
                />
                {pinError && (
                  <p className="text-[11px] font-semibold text-rose-600 mt-1">
                    {pinError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMutating || isVerifyingPin || !pin.trim()}
                onClick={handleVerifyAndProceed}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isVerifyingPin ? "Verifying PIN..." : "Confirm Void & Restore Stock"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
