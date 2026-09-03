import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { useItems } from "@/lib/useItems";
import { useStore } from "@/store";

export default function AllSaved() {
  const { refreshKey, openSave, openItem } = useStore();
  const { items, loading } = useItems(refreshKey);

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Saved</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} item{items.length !== 1 ? "s" : ""} in your memory</p>
        </div>
        <Button onClick={openSave} data-testid="allsaved-save-btn">
          <Plus className="h-4 w-4 mr-1.5" /> Save
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={openItem} />
          ))}
        </div>
      )}
    </div>
  );
}
