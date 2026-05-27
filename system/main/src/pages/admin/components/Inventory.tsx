import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Image as ImageIcon, Pencil, Plus, Search } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeedback } from "@/context/FeedbackContext";

interface InventoryItem {
  item_id: number;
  sku: string | null;
  image_path?: string | null;
  name: string;
  category_name: string | null;
  unit: string;
  unit_cost: number;
  unit_price: number;
  reorder_level: number;
  is_active: number;
  quantity_on_hand: number;
}

interface InventoryCategory {
  category_id: number;
  name: string;
}

interface ItemFormState {
  name: string;
  sku: string;
  imagePath: string;
  category: string;
  unit: string;
  unitCost: string;
  unitPrice: string;
  reorderLevel: string;
  initialQuantity: string;
  isActive: boolean;
}

interface AdjustFormState {
  mode: "add" | "remove";
  quantity: string;
  reason: string;
  transactionType: string;
}

const defaultItemForm: ItemFormState = {
  name: "",
  sku: "",
  imagePath: "",
  category: "",
  unit: "pcs",
  unitCost: "0",
  unitPrice: "0",
  reorderLevel: "0",
  initialQuantity: "0",
  isActive: true,
};

const defaultAdjustForm: AdjustFormState = {
  mode: "add",
  quantity: "",
  reason: "",
  transactionType: "adjustment",
};

export function Inventory() {
  const navigate = useNavigate();
  const { showPromise } = useFeedback();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [activeTab, setActiveTab] = useState("details");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(defaultItemForm);
  const [adjustForm, setAdjustForm] = useState<AdjustFormState>(defaultAdjustForm);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleDeleteItem = (id?: number | null) => {
    if (!id) return;
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const promise = async () => {
      const response = await fetch(`http://localhost:5000/api/inventory/items/${id}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = response.headers.get("content-type") || "";
      let data: { message?: string } = {};
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(
            text.includes("Cannot POST") || text.includes("Cannot DELETE")
              ? "Delete endpoint not available. Restart the API server and try again."
              : "Failed to delete item"
          );
        }
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete item");
      }

      await fetchItems();
      setSheetOpen(false);
      return data.message || "Item deleted successfully";
    };

    showPromise(promise(), {
      loading: "Deleting item...",
      success: (message) => message,
      error: (err) => err.message || "Failed to delete item",
    });
  };

  const fetchCategories = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;
      const response = await fetch("http://localhost:5000/api/inventory/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchItems = async () => {
    try {
      setError(null);
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/inventory/items", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        setItems([]);
        setError("Unexpected inventory response. Please refresh.");
        return;
      }
      setItems(data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      setError("Unable to load inventory items. Check the server logs and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        (item.sku || "").toLowerCase().includes(term) ||
        (item.category_name || "").toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const currentQty = Math.round(Number(selectedItem?.quantity_on_hand ?? 0));
  const adjustQuantity = Math.round(Number(adjustForm.quantity || 0));
  const normalizedAdjustQty = Number.isFinite(adjustQuantity) ? adjustQuantity : 0;
  const deltaPreview = adjustForm.mode === "remove" ? -Math.abs(normalizedAdjustQty) : Math.abs(normalizedAdjustQty);
  const nextQty = currentQty + deltaPreview;

  const openCreateSheet = () => {
    setSelectedItem(null);
    setSheetMode("create");
    setActiveTab("details");
    setItemForm(defaultItemForm);
    setAdjustForm(defaultAdjustForm);
    setImagePreview(null);
    setSheetOpen(true);
  };

  const openEditSheet = (item: InventoryItem, tab: "details" | "stock" = "details") => {
    setSelectedItem(item);
    setSheetMode("edit");
    setActiveTab(tab);
    setItemForm({
      name: item.name,
      sku: item.sku || "",
      imagePath: item.image_path || "",
      category: item.category_name || "",
      unit: item.unit || "pcs",
      unitCost: String(item.unit_cost ?? 0),
      unitPrice: String(item.unit_price ?? 0),
      reorderLevel: String(item.reorder_level ?? 0),
      initialQuantity: "0",
      isActive: Boolean(item.is_active),
    });
    setAdjustForm(defaultAdjustForm);
    setImagePreview(item.image_path ? resolveImageUrl(item.image_path) : null);
    setSheetOpen(true);
  };

  const handleSaveItem = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const payload = {
      name: itemForm.name.trim(),
      sku: itemForm.sku.trim(),
      imagePath: itemForm.imagePath.trim(),
      category: itemForm.category.trim(),
      unit: itemForm.unit.trim() || "pcs",
      unitCost: Number(itemForm.unitCost || 0),
      unitPrice: Number(itemForm.unitPrice || 0),
      reorderLevel: Number(itemForm.reorderLevel || 0),
      isActive: itemForm.isActive,
      initialQuantity: Number(itemForm.initialQuantity || 0),
    };

    const promise = async () => {
      const response = await fetch(
        selectedItem
          ? `http://localhost:5000/api/inventory/items/${selectedItem.item_id}`
          : "http://localhost:5000/api/inventory/items",
        {
          method: selectedItem ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save item");
      }

      await fetchItems();
      setSheetOpen(false);
      return selectedItem ? "Item updated" : "Item created";
    };

    showPromise(promise(), {
      loading: selectedItem ? "Updating item..." : "Creating item...",
      success: (message) => message,
      error: (err) => err.message || "Failed to save item",
    });
  };

  const handleAdjustStock = async () => {
    if (!selectedItem) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const quantity = Number(adjustForm.quantity || 0);
    const normalizedQty = Number.isFinite(quantity) ? quantity : 0;
    if (normalizedQty <= 0) return;
    const delta = adjustForm.mode === "remove" ? -Math.abs(normalizedQty) : Math.abs(normalizedQty);

    const payload = {
      delta,
      reason: adjustForm.reason.trim(),
      transactionType: adjustForm.transactionType,
    };

    const promise = async () => {
      const response = await fetch(
        `http://localhost:5000/api/inventory/items/${selectedItem.item_id}/adjust`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to adjust stock");
      }

      await fetchItems();
      setSheetOpen(false);
      return "Stock adjusted";
    };

    showPromise(promise(), {
      loading: "Adjusting stock...",
      success: (message) => message,
      error: (err) => err.message || "Failed to adjust stock",
    });
  };

  const formatQty = (value: number) => {
    return Math.round(Number(value || 0)).toLocaleString();
  };

  const formatMoney = (value: number) => {
    return `PHP ${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const resolveImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `http://localhost:5000${path}`;
  };

  const handleImagePick = (file: File | null) => {
    if (!file) return;
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setItemForm((prev) => ({
      ...prev,
      imagePath: `/uploads/inventory/${file.name}`,
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory"
        description="Track parts and supplies used for service work."
        action={
          <Button onClick={openCreateSheet} className="gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search item, SKU, or category..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          Loading inventory...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
          No inventory items found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const lowStock = item.reorder_level > 0 && item.quantity_on_hand <= item.reorder_level;
            const imageUrl = resolveImageUrl(item.image_path);

            return (
              <Card
                key={item.item_id}
                className="group overflow-hidden border-border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openEditSheet(item)}
              >
                <div className="h-40 bg-muted/40 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                      <span className="mt-2 text-xs">No image</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.sku || "No SKU"}</p>
                    </div>
                    {item.is_active ? (
                      <Badge variant="outline" className="border-emerald-200 text-emerald-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-200 text-gray-500">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">
                      {item.category_name || "Uncategorized"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1">
                      {formatQty(item.quantity_on_hand)} {item.unit}
                    </span>
                    {lowStock && (
                      <span className="rounded-full bg-orange-50 text-orange-700 px-2 py-1">Low stock</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Unit Price</p>
                      <p className="font-medium">{formatMoney(item.unit_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reorder Level</p>
                      <p className="font-medium">{formatQty(item.reorder_level)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditSheet(item);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditSheet(item, "stock");
                      }}
                    >
                      <ArrowUpDown className="h-4 w-4" /> Adjust
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === "create" ? "Add Inventory Item" : selectedItem?.name || "Inventory Item"}
            </SheetTitle>
            <SheetDescription>
              {sheetMode === "create"
                ? "Create a new inventory item and set starting stock."
                : "Update item details and adjust stock."}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="stock" disabled={sheetMode === "create"}>
                Stock
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="item-name">Name</Label>
                  <Input
                    id="item-name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-sku">SKU</Label>
                  <Input
                    id="item-sku"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-category">Category</Label>
                  <Select
                    value={itemForm.category || "__none__"}
                    onValueChange={(value) =>
                      setItemForm((prev) => ({
                        ...prev,
                        category: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger id="item-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Uncategorized</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.category_id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label>Item Image</Label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        id="item-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImagePick(e.target.files?.[0] || null)}
                      />
                      <Input
                        value={itemForm.imagePath}
                        readOnly
                        placeholder="/uploads/inventory/filename.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Place the image in the server uploads folder; we will use the filename to build the path.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="item-unit">Unit</Label>
                    <Input
                      id="item-unit"
                      value={itemForm.unit}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="item-reorder">Reorder Level</Label>
                    <Input
                      id="item-reorder"
                      type="number"
                      value={itemForm.reorderLevel}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, reorderLevel: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-price">Unit Price (PHP)</Label>
                  <Input
                    id="item-price"
                    type="number"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  />
                </div>
                {sheetMode === "create" && (
                  <div className="grid gap-2">
                    <Label htmlFor="item-initial">Initial Quantity</Label>
                    <Input
                      id="item-initial"
                      type="number"
                      value={itemForm.initialQuantity}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, initialQuantity: e.target.value }))}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="item-active"
                    checked={itemForm.isActive}
                    onCheckedChange={(value) =>
                      setItemForm((prev) => ({ ...prev, isActive: Boolean(value) }))
                    }
                  />
                  <Label htmlFor="item-active">Active</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stock" className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Current Stock</span>
                  <span className="font-semibold">
                    {selectedItem ? `${formatQty(selectedItem.quantity_on_hand)} ${selectedItem.unit}` : "-"}
                  </span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Adjustment</Label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr]">
                  <Select
                    value={adjustForm.mode}
                    onValueChange={(value) =>
                      setAdjustForm((prev) => ({
                        ...prev,
                        mode: value === "remove" ? "remove" : "add",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add stock</SelectItem>
                      <SelectItem value="remove">Remove stock</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="adjust-qty"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Preview</Label>
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Change</span>
                    <span
                      className={
                        deltaPreview < 0
                          ? "font-semibold text-rose-500"
                          : "font-semibold text-emerald-600"
                      }
                    >
                      {deltaPreview === 0
                        ? "0"
                        : `${deltaPreview > 0 ? "+" : ""}${formatQty(deltaPreview)}`} {selectedItem?.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>New Stock</span>
                    <span className="font-semibold">
                      {selectedItem ? `${formatQty(nextQty)} ${selectedItem.unit}` : "-"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adjust-reason">Reason</Label>
                <Input
                  id="adjust-reason"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adjust-type">Transaction Type</Label>
                <Select
                  value={adjustForm.transactionType}
                  onValueChange={(value) =>
                    setAdjustForm((prev) => ({ ...prev, transactionType: value }))
                  }
                >
                  <SelectTrigger id="adjust-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            {activeTab === "details" ? (
              <div className="flex items-center gap-2">
                {sheetMode === "edit" && (
                  <Button variant="destructive" onClick={() => handleDeleteItem(selectedItem?.item_id)}>
                    Delete
                  </Button>
                )}
                <Button onClick={handleSaveItem} disabled={!itemForm.name.trim()}>
                  {sheetMode === "create" ? "Create Item" : "Save Changes"}
                </Button>
              </div>
            ) : (
              <Button onClick={handleAdjustStock} disabled={normalizedAdjustQty <= 0}>
                Apply Change
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
