"use client";

import { useState } from "react";
import { useGetPosProducts } from "./_internal/hooks/use-get-pos-products";
import { createPOSOrder } from "./_internal/services";
import { POSProduct, POSCartItem } from "./_internal/usecases/pos";

import { CategoryFilter } from "./_internal/components/category-filter";
import { ProductGrid } from "./_internal/components/product-grid";
import { CartSummary } from "./_internal/components/cart-summary";
import { ItemCustomizerModal } from "./_internal/modals/item-customizer-modal";
import { CheckoutModal } from "./_internal/modals/checkout-modal";

export default function POSPage() {
  const { products, categories, category, setCategory, refreshProducts } = useGetPosProducts();
  
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [activeProduct, setActiveProduct] = useState<POSProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"takeaway" | "dine_in">("takeaway");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");
  const [cashReceived, setCashReceived] = useState<number>(0);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const changeAmount = paymentMethod === "cash" ? Math.max(0, cashReceived - subtotal) : 0;

  const handleAddToCart = (itemNoteInput: string) => {
    if (!activeProduct) return;
    setCart((prev) => [
      ...prev,
      { product: activeProduct, quantity: 1, itemNotes: itemNoteInput },
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
    setIsSubmitting(true);

    try {
      await createPOSOrder({
        customer_name: customerName || "Guest",
        order_type: orderType,
        payment_method: paymentMethod,
        discount_amount: 0,
        cash_amount_received: paymentMethod === "cash" ? cashReceived : subtotal,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          item_notes: item.itemNotes,
        })),
      });

      alert("Order placed successfully!");
      setCart([]);
      setIsCheckoutOpen(false);
      setCustomerName("");
      setCashReceived(0);
      refreshProducts();
    } catch {
      alert("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
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