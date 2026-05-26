import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Search, Trash2 } from "lucide-react";

interface InventoryItem {
  item_id: number;
  name: string;
  unit: string;
  unit_price: number;
  quantity_on_hand: number;
}

interface UsedPart {
  itemId: number;
  quantity: number;
}

interface CompleteJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (additionalCost: number, notes: string, parts: { itemId: number; quantity: number }[]) => void;
  serviceName?: string;
  serviceBaseCost?: number;
}

export function CompleteJobDialog({ isOpen, onClose, onConfirm, serviceName, serviceBaseCost }: CompleteJobDialogProps) {
  const [notes, setNotes] = useState('');
  const [additionalCost, setAdditionalCost] = useState('0');
  const [search, setSearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [parts, setParts] = useState<UsedPart[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadItems = async () => {
      try {
        setItemsLoading(true);
        const token = sessionStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/inventory/items', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setInventoryItems(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error loading inventory items:', error);
      } finally {
        setItemsLoading(false);
      }
    };

    loadItems();
    setParts([]);
    setAdditionalCost('0');
    setNotes('');
    setSearch('');
  }, [isOpen]);

  const handleSubmit = () => {
    const baseCost = Number(serviceBaseCost || 0);
    const extraCost = Number(additionalCost || 0);
    if (!Number.isFinite(baseCost) || !Number.isFinite(extraCost) || extraCost < 0) {
      return;
    }

    const normalizedParts = parts.filter((part) => part.quantity > 0);
    onConfirm(Number(extraCost.toFixed(2)), notes, normalizedParts);
    onClose();
  };

  const addPart = (itemId: number) => {
    setParts((prev) => {
      const existing = prev.find((part) => part.itemId === itemId);
      if (existing) {
        return prev.map((part) =>
          part.itemId === itemId ? { ...part, quantity: part.quantity + 1 } : part
        );
      }
      return [...prev, { itemId, quantity: 1 }];
    });
  };

  const updatePartQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      setParts((prev) => prev.filter((part) => part.itemId !== itemId));
      return;
    }
    setParts((prev) =>
      prev.map((part) => (part.itemId === itemId ? { ...part, quantity } : part))
    );
  };

  const removePart = (itemId: number) => {
    setParts((prev) => prev.filter((part) => part.itemId !== itemId));
  };

  const partsSubtotal = useMemo(() => {
    return parts.reduce((sum, part) => {
      const item = inventoryItems.find((inv) => inv.item_id === part.itemId);
      const price = item ? Number(item.unit_price || 0) : 0;
      return sum + part.quantity * price;
    }, 0);
  }, [parts, inventoryItems]);

  const baseCost = Number(serviceBaseCost || 0);
  const extraCost = Number(additionalCost || 0);
  const totalCost = baseCost + partsSubtotal + (Number.isFinite(extraCost) ? extraCost : 0);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventoryItems;
    return inventoryItems.filter((item) => item.name.toLowerCase().includes(term));
  }, [inventoryItems, search]);

  const formatMoney = (value: number) =>
    `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Complete Job</DialogTitle>
          <DialogDescription>
            Confirm parts used and finalize costs for {serviceName || 'this service'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parts Catalog</p>
                <p className="text-xs text-muted-foreground">Tap items to add them to the job.</p>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {itemsLoading ? (
              <p className="text-sm text-muted-foreground">Loading inventory...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parts match that search.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredItems.slice(0, 8).map((item) => {
                  const outOfStock = item.quantity_on_hand <= 0;
                  return (
                    <Card key={item.item_id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(item.unit_price)} per {item.unit}
                            </p>
                          </div>
                          {outOfStock ? (
                            <Badge variant="outline" className="border-red-200 text-red-600">Out</Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-600">
                              {item.quantity_on_hand} {item.unit}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          disabled={outOfStock}
                          onClick={() => addPart(item.item_id)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Part
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parts Used</Label>
                <Badge variant="outline">{parts.length} items</Badge>
              </div>
              {parts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No parts added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {parts.map((part) => {
                    const item = inventoryItems.find((inv) => inv.item_id === part.itemId);
                    if (!item) return null;
                    const lineTotal = part.quantity * Number(item.unit_price || 0);
                    return (
                      <Card key={part.itemId} className="border-border">
                        <CardContent className="p-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(item.unit_price)} per {item.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => updatePartQuantity(part.itemId, part.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              className="w-16 text-center"
                              type="number"
                              value={part.quantity}
                              min="0"
                              onChange={(e) => updatePartQuantity(part.itemId, Number(e.target.value))}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => updatePartQuantity(part.itemId, part.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatMoney(lineTotal)}</p>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removePart(part.itemId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <Card className="border-border">
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cost Summary</p>
                  <p className="text-2xl font-semibold text-foreground mt-2">
                    {formatMoney(totalCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">Calculated total</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service base</span>
                    <span>{formatMoney(baseCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Parts subtotal</span>
                    <span>{formatMoney(partsSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Additional cost</span>
                    <span>{formatMoney(Number(additionalCost || 0))}</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="additional-cost">Additional Cost (PHP)</Label>
                  <Input
                    id="additional-cost"
                    type="number"
                    value={additionalCost}
                    onChange={(e) => setAdditionalCost(e.target.value)}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Use this for labor or extra service fees.</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any cost notes or service remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Complete Job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
