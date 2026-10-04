import re

# 1. Patch api.js
path_api = "frontend/src/api.js"
with open(path_api, "r", encoding="utf8") as f: 
    content_api = f.read()

new_methods = """  // Groups
  getGroups: () => axios.get(`${API}/groups`).then((r) => r.data),
  createGroup: (name, color) => axios.post(`${API}/groups`, { name, color }).then((r) => r.data),
  updateGroup: (id, payload) => axios.patch(`${API}/groups/${id}`, payload).then((r) => r.data),
  deleteGroup: (id) => axios.delete(`${API}/groups/${id}`).then((r) => r.data),
  // items"""
content_api = content_api.replace("// items", new_methods)

with open(path_api, "w", encoding="utf8") as f: 
    f.write(content_api)

print("api.js patched")


# 2. Patch PopupApp.tsx
path_ext = "extension/src/popup/PopupApp.tsx"
with open(path_ext, "r", encoding="utf8") as f: 
    content_ext = f.read()

states = """  const [saving, setSaving] = useState(false);
  
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);"""
content_ext = content_ext.replace("  const [saving, setSaving] = useState(false);", states)

fetch_groups = """    getSession().then((s) => {
      setEmail(s?.user?.email || null);
      setLoading(false);
    });
    api.getGroups().then(setGroups).catch(console.error);"""
content_ext = content_ext.replace("""    getSession().then((s) => {
      setEmail(s?.user?.email || null);
      setLoading(false);
    });""", fetch_groups)

payloads_old = """      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (userNote) fd.append("user_note", userNote);
        await api.saveImage(fd);
      } else if (saveText.trim().startsWith("http")) {
        await api.saveUrl({ url: saveText.trim(), user_note: userNote });
      } else {
        await api.saveText({ text: saveText.trim(), user_note: userNote });
      }"""
payloads_new = """      const basePayload: any = { user_note: userNote };
      if (isCreatingGroup && newGroupName.trim()) {
        basePayload.new_group_name = newGroupName.trim();
      } else if (!isCreatingGroup && selectedGroupId) {
        basePayload.group_id = selectedGroupId;
      }

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        if (userNote) fd.append("user_note", userNote);
        if (basePayload.new_group_name) fd.append("new_group_name", basePayload.new_group_name);
        if (basePayload.group_id) fd.append("group_id", basePayload.group_id);
        await api.saveImage(fd);
      } else if (saveText.trim().startsWith("http")) {
        await api.saveUrl({ url: saveText.trim(), ...basePayload });
      } else {
        await api.saveText({ text: saveText.trim(), ...basePayload });
      }"""
content_ext = content_ext.replace(payloads_old, payloads_new)

jsx_old = """              <div className="pt-2">
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Why are you saving this? (Optional)"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:border-neutral-300 focus:bg-white transition-all placeholder:text-neutral-400"
                />
              </div>"""
jsx_new = """              <div className="pt-2 space-y-2">
                <input
                  type="text"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Why are you saving this? (Optional)"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:border-neutral-300 focus:bg-white transition-all placeholder:text-neutral-400"
                />
                
                <select 
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:border-neutral-300 focus:bg-white transition-all text-neutral-600"
                  value={isCreatingGroup ? "CREATE_NEW" : selectedGroupId}
                  onChange={(e) => {
                    if (e.target.value === "CREATE_NEW") {
                      setIsCreatingGroup(true);
                      setSelectedGroupId("");
                    } else {
                      setIsCreatingGroup(false);
                      setSelectedGroupId(e.target.value);
                    }
                  }}
                >
                  <option value="">No Group (Unorganized)</option>
                  <option value="CREATE_NEW">+ Create New Group...</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                {isCreatingGroup && (
                  <input
                    type="text"
                    placeholder="Name your new group..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-neutral-50 border border-blue-200 rounded-xl py-3 px-4 text-[13px] focus:outline-none focus:bg-white transition-all"
                  />
                )}
              </div>"""
content_ext = content_ext.replace(jsx_old, jsx_new)

reset_old = """      // Reset and close
      setSaveText("");
      setUserNote("");
      setFile(null);
      setIsSaveModalOpen(false);"""
reset_new = """      // Reset and close
      setSaveText("");
      setUserNote("");
      setFile(null);
      setNewGroupName("");
      setIsCreatingGroup(false);
      setIsSaveModalOpen(false);
      // Refresh groups list
      api.getGroups().then(setGroups).catch(console.error);"""
content_ext = content_ext.replace(reset_old, reset_new)

with open(path_ext, "w", encoding="utf8") as f: 
    f.write(content_ext)

print("PopupApp.tsx patched")


# 3. Patch ItemCard.jsx
path_card = "frontend/src/components/ItemCard.jsx"
with open(path_card, "r", encoding="utf8") as f: 
    content_card = f.read()

badge_jsx = """        {item.group_name && (
          <span 
            className="inline-block px-2 py-0.5 mb-2 w-max text-[11px] font-bold rounded-md"
            style={{ 
              backgroundColor: `${item.group_color}20`,
              color: item.group_color 
            }}
          >
            {item.group_name}
          </span>
        )}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground pr-6">{item.title}</h3>"""
        
content_card = content_card.replace("""<h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground pr-6">{item.title}</h3>""", badge_jsx)

with open(path_card, "w", encoding="utf8") as f: 
    f.write(content_card)

print("ItemCard.jsx patched")

