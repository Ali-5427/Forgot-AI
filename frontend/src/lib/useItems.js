import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/api";

export function useItems(refreshKey) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const data = await api.listItems();
    setItems(data);
    setLoading(false);
    const anyProcessing = data.some((i) => i.status === "processing");
    clearTimeout(timer.current);
    if (anyProcessing) timer.current = setTimeout(load, 3500);
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
  }, [load, refreshKey]);

  return { items, loading, reload: load };
}
