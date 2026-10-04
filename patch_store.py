import re

path = "frontend/src/store.jsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

# Add groups to global state
state_old = """  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);"""

state_new = """  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);"""

content = content.replace(state_old, state_new)

# Add loadGroups
load_old = """  const loadItems = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.listItems();"""

load_new = """  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const g = await api.getGroups();
      setGroups(g);
    } catch (e) {}
  }, [user]);

  const loadItems = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.listItems();"""

content = content.replace(load_old, load_new)

# Add loadGroups to useEffect
effect_old = """    if (user) {
      loadItems();"""
effect_new = """    if (user) {
      loadGroups();
      loadItems();"""
content = content.replace(effect_old, effect_new)

# Provide groups in context
ctx_old = """  return (
    <StoreContext.Provider
      value={{
        items,
        loading,
        reloadItems: loadItems,
        saveOpen,
        openSave: () => setSaveOpen(true),
        closeSave: () => setSaveOpen(false),
        detailId,
        detailOpen,
        openItem: (id) => {
          setDetailId(id);
          setDetailOpen(true);
        },
        setDetailOpen,
        togglePin
      }}
    >"""
ctx_new = """  return (
    <StoreContext.Provider
      value={{
        items,
        groups,
        reloadGroups: loadGroups,
        loading,
        reloadItems: loadItems,
        saveOpen,
        openSave: () => setSaveOpen(true),
        closeSave: () => setSaveOpen(false),
        detailId,
        detailOpen,
        openItem: (id) => {
          setDetailId(id);
          setDetailOpen(true);
        },
        setDetailOpen,
        togglePin
      }}
    >"""
content = content.replace(ctx_old, ctx_new)

with open(path, "w", encoding="utf8") as f: f.write(content)
print("store patched")
