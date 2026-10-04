import re

# 1. Patch store.jsx
path_store = "frontend/src/store.jsx"
with open(path_store, "r", encoding="utf8") as f: content = f.read()
content = content.replace("}, [user, loadItems]);", "}, [user, loadItems, loadGroups]);")
with open(path_store, "w", encoding="utf8") as f: f.write(content)


# 2. Patch AllSaved.jsx
path_all = "frontend/src/pages/AllSaved.jsx"
with open(path_all, "r", encoding="utf8") as f: content2 = f.read()
content2 = content2.replace("}, [items, type, recent, category, sort]);", "}, [items, type, recent, category, sort, activeGroupId]);")
with open(path_all, "w", encoding="utf8") as f: f.write(content2)

print("Dependencies fixed")
