"use client";

import { useState } from "react";
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
  const { products, categories, category, setCategory, refreshProducts } = useGetPosProducts();
  const { createOrder, isSubmitting } = useCreateOrder();

  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [activeProduct, setActiveProduct] = useState<POSProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in">("takeaway");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Subtotal calculation factoring in selected add-ons for each cart item
  const subtotal = cart.reduce((sum, item) => {
    const addOnsCost = item.selectedAddOns?.reduce((aSum, addon) => aSum + addon.price, 0) || 0;
    return sum + (item.product.price + addOnsCost) * item.quantity;
  }, 0);

  const changeAmount = paymentMethod === "cash" ? Math.max(0, cashReceived - subtotal) : 0;

  const handleAddToCart = (itemNoteInput: string, selectedAddOns?: POSProduct[]) => {
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

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;

    const result = await createOrder({
      customer_name: customerName || "Guest",
      order_type: orderType,
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
      alert("Order placed successfully!");
      setCart([]);
      setIsCheckoutOpen(false);
      setCustomerName("");
      setCashReceived(0);
      refreshProducts();
    } else {
      alert("Failed to submit order. Please check input or server connection.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 md:pb-6">
      <div className="lg:col-span-2 space-y-4">
        <CategoryFilter
          categories={categories}
          selectedCategory={category}
          onSelectCategory={setCategory}
        />
        <ProductGrid products={products} onSelectProduct={setActiveProduct} />
      </div>

      <div>
        <CartSummary
          cart={cart}
          subtotal={subtotal}
          onQuantityChange={handleQuantityChange}
          onProceedCheckout={() => setIsCheckoutOpen(true)}
        />
      </div>

      {activeProduct && (
        <ItemCustomizerModal
          product={activeProduct}
          onClose={() => setActiveProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

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