"use client";

import { useState } from "react";
import {
  ChevronUp,
  Clock,
  CreditCard,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { useGetPosProducts } from "./_internal/hooks/use-get-pos-products";
import { POSProduct } from "./_internal/usecases/pos";

import { CategoryFilter } from "./_internal/components/category-filter";
import { ProductGrid } from "./_internal/components/product-grid";
import { CartSummary } from "./_internal/components/cart-summary";
import { ItemCustomizerModal } from "./_internal/modals/item-customizer-modal";
import { CheckoutModal } from "./_internal/modals/checkout-modal";
import { useCreateOrder } from "./_internal/hooks/use-create-orders";

export interface POSCartItem {
  product: POSProduct;
  quantity: number;
  itemNotes?: string;
  selectedAddOns?: POSProduct[];
}

export default function POSPage() {
  const { products, categories, category, setCategory, refreshProducts } =
    useGetPosProducts();
  const { createOrder, isSubmitting } = useCreateOrder();

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProduct, setActiveProduct] = useState<POSProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in">("dine_in");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");
  const [cashReceived, setCashReceived] = useState<number>(0);

  const showNotice = (
    text: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Subtotal calculation factoring in selected add-ons for each cart item
  const subtotal = cart.reduce((sum, item) => {
    const addOnsCost =
      item.selectedAddOns?.reduce((aSum, addon) => aSum + addon.price, 0) || 0;
    return sum + (item.product.price + addOnsCost) * item.quantity;
  }, 0);

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const changeAmount =
    paymentMethod === "cash" ? Math.max(0, cashReceived - subtotal) : 0;

  const handleAddToCart = (
    itemNoteInput: string,
    selectedAddOns?: POSProduct[]
  ) => {
    if (!activeProduct) return;

    setCart((prev) => [
      ...prev,
      {
        product: activeProduct,
        quantity: 1,
        itemNotes: itemNoteInput,
        selectedAddOns: selectedAddOns || [],
      },
    ]);
    showNotice(`Added ${activeProduct.name} to cart!`, "success");
    setActiveProduct(null);
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) return updated.filter((_, i) => i !== index);
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    showNotice("Cart cleared", "info");
  };

  // Open Bill (Simpan Antrean - Unpaid)
  const handleSaveOpenBill = async () => {
    if (cart.length === 0) return;

    const label =
      customerName.trim() ||
      (orderType === "dine_in" ? "Meja Dine-In" : "Takeaway Guest");

    const result = await createOrder({
      customer_name: label,
      order_type: orderType,
      payment_status: "unpaid",
      payment_method: null,
      discount_amount: 0,
      cash_amount_received: null,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        addon_ids: item.selectedAddOns?.map((a) => a.id) || [],
        item_notes: item.itemNotes || null,
      })),
    });

    if (result && result.status === "success") {
      showNotice(
        `Order sent to Barista Queue! [Open Bill: ${label}]`,
        "success"
      );
      setCart([]);
      setIsMobileCartOpen(false);
      setCustomerName("");
      refreshProducts();
    } else {
      showNotice("Failed to save Open Bill. Check stock or server.", "error");
    }
  };

  // Direct Pay Checkout (Bayar Sekarang - Paid)
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;

    const label =
      customerName.trim() ||
      (orderType === "dine_in" ? "Dine-In Guest" : "Takeaway Guest");

    const result = await createOrder({
      customer_name: label,
      order_type: orderType,
      payment_status: "paid",
      payment_method: paymentMethod,
      discount_amount: 0,
      cash_amount_received: paymentMethod === "cash" ? cashReceived : null,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        addon_ids: item.selectedAddOns?.map((a) => a.id) || [],
        item_notes: item.itemNotes || null,
      })),
    });

    if (result && result.status === "success") {
      showNotice(
        "Payment received! Order sent to kitchen queue.",
        "success"
      );
      setCart([]);
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      setCustomerName("");
      setCashReceived(0);
      refreshProducts();
    } else {
      showNotice(
        "Failed to submit order. Please check input or stock.",
        "error"
      );
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-8">
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

      {/* Top Sub-bar: Order Type Switcher & Mobile Cart Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">POS Register</h2>
          <p className="text-xs text-slate-500">
            Select items for Open Bill queue or direct checkout
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setOrderType("dine_in")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                orderType === "dine_in"
                  ? "bg-white shadow-2xs text-amber-800 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dine-In
            </button>
            <button
              type="button"
              onClick={() => setOrderType("takeaway")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                orderType === "takeaway"
                  ? "bg-white shadow-2xs text-amber-800 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Takeaway
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Search, Categories & Product Grid */}
        <div className="md:col-span-7 lg:col-span-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu items..."
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <CategoryFilter
            categories={categories}
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

          {/* Product Grid */}
          <ProductGrid
            products={products}
            searchQuery={searchQuery}
            onSelectProduct={setActiveProduct}
          />
        </div>

        {/* Right Column: Desktop Cart Panel */}
        <div className="hidden md:block md:col-span-5 lg:col-span-4">
          <CartSummary
            cart={cart}
            subtotal={subtotal}
            customerName={customerName}
            setCustomerName={setCustomerName}
            isSubmitting={isSubmitting}
            onQuantityChange={handleQuantityChange}
            onClearCart={handleClearCart}
            onSaveOpenBill={handleSaveOpenBill}
            onProceedCheckout={() => setIsCheckoutOpen(true)}
          />
        </div>
      </div>

      {/* Mobile Bottom Floating Cart Bar (Realme Note 50) */}
      <div className="md:hidden fixed bottom-14 inset-x-0 p-3 z-30">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-[11px] font-bold">
              {totalCount}
            </span>
            <span>View Order</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400 text-sm">
              Rp {subtotal.toLocaleString("id-ID")}
            </span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end justify-center md:hidden">
          <div className="bg-white rounded-t-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Current Cart ({totalCount} items)
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Customer / Table (Open Bill ID)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Meja 04 - Budi / Takeaway"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">
                    Cart is empty. Tap any product to add.
                  </p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const addOnsCost =
                    item.selectedAddOns?.reduce((s, a) => s + a.price, 0) || 0;
                  const lineTotal =
                    (item.product.price + addOnsCost) * item.quantity;
                  return (
                    <div
                      key={`${item.product.id}-${idx}`}
                      className="flex items-start justify-between text-xs border-b border-slate-100 pb-2.5"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">
                          {item.product.name}
                        </p>
                        {item.itemNotes && (
                          <p className="text-[10px] text-slate-500">
                            {item.itemNotes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, -1)}
                            className="w-5 h-5 bg-slate-100 rounded text-slate-700 font-bold text-[11px]"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, 1)}
                            className="w-5 h-5 bg-slate-100 rounded text-slate-700 font-bold text-[11px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">
                          Rp {lineTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 space-y-2 border-t border-slate-100">
              <div className="flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span className="font-mono text-amber-800">
                  Rp {subtotal.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handleSaveOpenBill}
                  className="w-full py-3 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Clock className="w-4 h-4 text-amber-800" />
                  <span>Open Bill</span>
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Bayar Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Customizer Modal */}
      {activeProduct && (
        <ItemCustomizerModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        subtotal={subtotal}
        customerName={customerName}
        setCustomerName={setCustomerName}
        orderType={orderType}
        setOrderType={setOrderType}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        changeAmount={changeAmount}
        isSubmitting={isSubmitting}
        onClose={() => setIsCheckoutOpen(false)}
        onSubmit={handleCheckoutSubmit}
      />
    </div>
  );
}
