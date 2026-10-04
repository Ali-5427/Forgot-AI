import re

# 1. Patch store.jsx
path_store = "frontend/src/store.jsx"
with open(path_store, "r", encoding="utf8") as f: content = f.read()

# Add groups and reloadGroups to the provider value
provider_old = """      value={{
        saveOpen, setSaveOpen,"""
provider_new = """      value={{
        groups, reloadGroups: loadGroups,
        saveOpen, setSaveOpen,"""
content = content.replace(provider_old, provider_new)
with open(path_store, "w", encoding="utf8") as f: f.write(content)


# 2. Patch Layout.jsx
path_layout = "frontend/src/components/Layout.jsx"
with open(path_layout, "r", encoding="utf8") as f: content2 = f.read()

content2 = content2.replace("{groups.length === 0", "{groups?.length === 0")
content2 = content2.replace("{groups.map(g => (", "{groups?.map(g => (")

with open(path_layout, "w", encoding="utf8") as f: f.write(content2)


# 3. Check AllSaved.jsx just in case (already did groups?.find so should be fine)
# But let's verify ItemCard.jsx
path_itemcard = "frontend/src/components/ItemCard.jsx"
with open(path_itemcard, "r", encoding="utf8") as f: content3 = f.read()
content3 = content3.replace("{groups.map(g => (", "{groups?.map(g => (")
content3 = content3.replace("groups.find(x => x.id === groupId)", "(groups || []).find(x => x.id === groupId)")
with open(path_itemcard, "w", encoding="utf8") as f: f.write(content3)

print("Files patched successfully")
