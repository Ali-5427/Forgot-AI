import re

path = "frontend/src/components/Layout.jsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

# Replace Layout's local groups state with store's groups state
find_block = """  const { openSave, detailOpen, detailId, setDetailOpen } = useStore();
  
  const [groups, setGroups] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");

  useEffect(() => {
    api.getGroups().then(setGroups).catch(console.error);
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const created = await api.createGroup(newGroupName.trim(), newGroupColor);
      setGroups([created, ...groups]);
      setIsCreatingGroup(false);
      setNewGroupName("");
    } catch (e) {
      console.error("Failed to create group", e);
    }
  };"""

replace_block = """  const { openSave, detailOpen, detailId, setDetailOpen, groups, reloadGroups } = useStore();
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.createGroup(newGroupName.trim(), newGroupColor);
      await reloadGroups();
      setIsCreatingGroup(false);
      setNewGroupName("");
    } catch (e) {
      console.error("Failed to create group", e);
    }
  };"""

content = content.replace(find_block, replace_block)
with open(path, "w", encoding="utf8") as f: f.write(content)
print("layout patched")
