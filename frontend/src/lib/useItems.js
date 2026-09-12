import { useStore } from "@/store";

export function useItems() {
  const { items, loading, reloadItems } = useStore();
  return { items, loading, reload: reloadItems };
}
