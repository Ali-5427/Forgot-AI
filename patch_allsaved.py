import re

path = "frontend/src/pages/AllSaved.jsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

# Add useSearchParams import
import_old = """import { useMemo, useState } from "react";
import { Plus, Layers, Search } from "lucide-react";"""
import_new = """import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Layers, Search } from "lucide-react";"""
content = content.replace(import_old, import_new)

# Add searchParams to component
comp_old = """export default function AllSaved() {
  const { openSave, openItem, togglePin } = useStore();
  const { items, loading } = useItems();
  const [type, setType] = useState("all");"""
comp_new = """export default function AllSaved() {
  const [searchParams] = useSearchParams();
  const activeGroupId = searchParams.get("group");
  const { openSave, openItem, togglePin, groups } = useStore();
  const { items, loading } = useItems();
  const [type, setType] = useState("all");"""
content = content.replace(comp_old, comp_new)

# Filter by group inside useMemo
filter_old = """    let list = items.filter((i) => {
      if (type !== "all" && i.content_type !== type) return false;"""
filter_new = """    let list = items.filter((i) => {
      if (activeGroupId && i.group_id !== activeGroupId) return false;
      if (type !== "all" && i.content_type !== type) return false;"""
content = content.replace(filter_old, filter_new)

# Add group title/color header
header_old = """      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Saved Memory</h1>
          <p className="text-muted-foreground mt-1 text-sm">Everything you've ever saved, across all devices.</p>
        </div>
      </div>"""
header_new = """      <div className="mb-8 flex items-center justify-between">
        <div>
          {activeGroupId ? (() => {
            const g = groups?.find(x => x.id === activeGroupId);
            if (g) return (
              <>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: g.color }}></span>
                  {g.name}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">Items in this group.</p>
              </>
            );
            return <h1 className="text-3xl font-bold tracking-tight">Group not found</h1>;
          })() : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">All Saved Memory</h1>
              <p className="text-muted-foreground mt-1 text-sm">Everything you've ever saved, across all devices.</p>
            </>
          )}
        </div>
      </div>"""
content = content.replace(header_old, header_new)

with open(path, "w", encoding="utf8") as f: f.write(content)
print("AllSaved.jsx patched")
