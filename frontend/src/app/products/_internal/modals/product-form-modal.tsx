"use client";

import { useState } from "react";
import {
  Check,
  Handshake,
  Plus,
  PlusCircle,
  Store,
  X,
} from "lucide-react";
import {
  MenuProductItem,
  ProductCreatePayload,
  ProductUpdatePayload,
  VendorItem,
} from "../hooks/use-menu-products";

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: MenuProductItem | null;
  vendors: VendorItem[];
  isMutating: boolean;
  onClose: () => void;
  onSaveProduct: (
    payload: ProductCreatePayload | ProductUpdatePayload,
    productId?: string
  ) => Promise<void>;
  onCreateVendor: (
    name: string,
    contact?: string
  ) => Promise<{ id: string; name: string }>;
}

type CategorySelectValue = "COFFEE" | "NON_COFFEE" | "SNACKS" | "ADD_ON";
type SourceSelectValue = "in_house" | "consignment";

function getInitialCategory(editingProduct: MenuProductItem | null): CategorySelectValue {
  if (!editingProduct) return "COFFEE";
  if (editingProduct.item_type === "ADD_ON") return "ADD_ON";
  if (editingProduct.main_category === "NON_COFFEE") return "NON_COFFEE";
  if (
    editingProduct.main_category === "SNACKS" ||
    editingProduct.main_category === "FOODS"
  ) {
    return "SNACKS";
  }
  return "COFFEE";
}

export function ProductFormModal(props: ProductFormModalProps) {
  if (!props.isOpen) return null;
  const formKey = props.editingProduct ? `edit-${props.editingProduct.id}` : "create-new";
  return <ProductFormDialog key={formKey} {...props} />;
}

function ProductFormDialog({
  editingProduct,
  vendors,
  isMutating,
  onClose,
  onSaveProduct,
  onCreateVendor,
}: ProductFormModalProps) {
  const [name, setName] = useState(editingProduct?.name ?? "");
  const [category, setCategory] = useState<CategorySelectValue>(
    getInitialCategory(editingProduct)
  );
  const [source, setSource] = useState<SourceSelectValue>(
    editingProduct?.item_type === "CONSIGNMENT" ? "consignment" : "in_house"
  );
  const [price, setPrice] = useState<string>(
    editingProduct ? String(editingProduct.retail_price) : ""
  );
  const [stock, setStock] = useState<string>(
    editingProduct?.stock_quantity != null
      ? String(editingProduct.stock_quantity)
      : ""
  );
  const [vendorId, setVendorId] = useState<string>(
    editingProduct?.vendor_id || vendors[0]?.id || ""
  );
  const [consignmentFee, setConsignmentFee] = useState<string>(
    editingProduct?.consignment_fee != null
      ? String(editingProduct.consignment_fee)
      : ""
  );

  // Inline Quick-Add New Vendor Partner sub-form state
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorContact, setNewVendorContact] = useState("");

  const handleSaveNewVendor = async () => {
    if (!newVendorName.trim()) return;
    const created = await onCreateVendor(
      newVendorName.trim(),
      newVendorContact.trim() || undefined
    );
    setVendorId(created.id);
    setShowNewVendorForm(false);
    setNewVendorName("");
    setNewVendorContact("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const retailPrice = parseFloat(price) || 0;
    if (retailPrice <= 0) return;

    const itemType: "MAIN" | "CONSIGNMENT" | "ADD_ON" =
      category === "ADD_ON"
        ? "ADD_ON"
        : source === "consignment"
        ? "CONSIGNMENT"
        : "MAIN";

    const mainCategory:
      | "COFFEE"
      | "NON_COFFEE"
      | "SNACKS"
      | "FOODS"
      | "CUSTOM"
      | null =
      category === "ADD_ON"
        ? null
        : category === "NON_COFFEE"
        ? "NON_COFFEE"
        : category === "SNACKS"
        ? "SNACKS"
        : "COFFEE";

    const parsedStock =
      stock.trim() !== "" ? Math.max(0, parseInt(stock, 10) || 0) : null;
    const parsedFee =
      source === "consignment" && consignmentFee.trim() !== ""
        ? Math.max(0, parseFloat(consignmentFee) || 0)
        : null;

    await onSaveProduct(
      {
        name: name.trim(),
        item_type: itemType,
        retail_price: retailPrice,
        main_category: mainCategory,
        stock_quantity: parsedStock,
        consignment_fee: parsedFee,
        vendor_id:
          source === "consignment" ? vendorId || vendors[0]?.id || null : null,
      },
      editingProduct?.id
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {editingProduct
                ? `Edit Product: ${editingProduct.name}`
                : "Add New Product"}
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
            <label className="font-semibold text-slate-700">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kopi Tubruk Nusantara"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Main Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as CategorySelectValue)
                }
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="COFFEE">Coffee</option>
                <option value="NON_COFFEE">Non-Coffee / Tea</option>
                <option value="SNACKS">Food &amp; Pastry</option>
                <option value="ADD_ON">Add-ons</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">
                Item Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as SourceSelectValue)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="in_house">In-House</option>
                <option value="consignment">Consignment (Vendor)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">
                Retail Price (Rp)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="20000"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">
                Stock Quantity (Optional)
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="e.g. 20 (blank = plenty)"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Consignment specific fields */}
          {source === "consignment" && (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-indigo-900 text-[11px] flex items-center gap-1.5">
                  <Handshake className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Consignment Details</span>
                </p>
                {!showNewVendorForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewVendorForm(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Vendor</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">
                    Vendor Partner
                  </label>
                  <select
                    value={vendorId || vendors[0]?.id || ""}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {vendors.length === 0 ? (
                      <option value="">No vendor yet - add below</option>
                    ) : (
                      vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">
                    Cafe Fee / Share (Rp)
                  </label>
                  <input
                    type="number"
                    value={consignmentFee}
                    onChange={(e) => setConsignmentFee(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full mt-1 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Inline Quick-Add New Vendor Partner Sub-Form (POST /vendors) */}
              {showNewVendorForm && (
                <div className="bg-white border border-indigo-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-indigo-600" />
                      Register New Vendor Partner
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      POST /vendors
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">
                        Vendor Partner Name{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        placeholder="e.g. Kue Balok Kang Didin"
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700">
                        Contact / Payout Info{" "}
                        <span className="text-slate-400 font-normal">
                          (Optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newVendorContact}
                        onChange={(e) => setNewVendorContact(e.target.value)}
                        placeholder="e.g. 0812-3456-7890 (WA) / BCA 8291029"
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewVendorForm(false)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newVendorName.trim() || isMutating}
                      onClick={handleSaveNewVendor}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Save &amp; Select</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
            disabled={!name.trim() || !price || isMutating}
            onClick={handleSubmit}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            {isMutating ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
