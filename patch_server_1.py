import re

file_path = "backend/server.py"
with open(file_path, "r", encoding="utf8") as f:
    content = f.read()

# 1. Add Group models and update SavedItem/SaveIn models
models_replacement = """class GroupCreate(BaseModel):
    name: str
    color: Optional[str] = "#808080"

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class SavedItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    library_id: str = DEFAULT_LIB
    content_type: str
    original_text: Optional[str] = None
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    source_domain: Optional[str] = None
    image_path: Optional[str] = None
    title: str = "Untitled"
    summary: str = ""
    why_saved: Optional[str] = None
    user_note: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    category: str = "Uncategorized"
    extracted_text: str = ""
    searchable_text: str = ""
    dedup_key: Optional[str] = None
    status: str = "processing"
    pinned: bool = False
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    group_color: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TextSaveIn(BaseModel):
    text: str
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    user_note: Optional[str] = None
    group_id: Optional[str] = None
    new_group_name: Optional[str] = None


class UrlSaveIn(BaseModel):
    url: str
    context_text: Optional[str] = None
    source_title: Optional[str] = None
    user_note: Optional[str] = None
    group_id: Optional[str] = None
    new_group_name: Optional[str] = None


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    user_note: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    group_color: Optional[str] = None"""

# Use regex to replace the old models block (from SavedItem up to ItemUpdate)
content = re.sub(
    r"class SavedItem\(BaseModel\):.*?class ItemUpdate\(BaseModel\):.*?category: Optional\[str\] = None",
    models_replacement,
    content,
    flags=re.DOTALL
)

# 2. Add Group endpoints and helper to save items
# First, add a helper to process group creation on the fly
group_helper = """
async def _handle_new_group(payload, lib, user_id):
    group_id = getattr(payload, 'group_id', None)
    new_group_name = getattr(payload, 'new_group_name', None)
    
    if new_group_name:
        group_id = str(uuid.uuid4())
        group_color = getattr(payload, 'new_group_color', '#808080')
        db.supabase.table("groups").insert({
            "id": group_id,
            "library_id": lib,
            "user_id": user_id,
            "name": new_group_name,
            "color": group_color
        }).execute()
        return group_id, new_group_name, group_color
        
    if group_id:
        res = db.supabase.table("groups").select("*").eq("id", group_id).execute()
        if res.data:
            return group_id, res.data[0]["name"], res.data[0]["color"]
            
    return None, None, None

@api_router.get("/groups")
async def get_groups(lib: str = Depends(resolve_library)):
    res = db.supabase.table("groups").select("*").eq("library_id", lib).order("created_at", desc=True).execute()
    return res.data or []

@api_router.post("/groups")
async def create_group(payload: GroupCreate, request: Request, lib: str = Depends(resolve_library)):
    user_id = lib  # Simplified fallback
    try:
        user = await get_current_user(request)
        user_id = user["id"]
    except Exception:
        pass
    
    group_id = str(uuid.uuid4())
    res = db.supabase.table("groups").insert({
        "id": group_id,
        "library_id": lib,
        "user_id": user_id,
        "name": payload.name,
        "color": payload.color
    }).execute()
    return res.data[0]

@api_router.patch("/groups/{group_id}")
async def update_group(group_id: str, payload: GroupUpdate, lib: str = Depends(resolve_library)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    res = db.supabase.table("groups").update(updates).eq("id", group_id).eq("library_id", lib).execute()
    
    # Sync group name/color across items
    if "name" in updates or "color" in updates:
        item_updates = {}
        if "name" in updates: item_updates["group_name"] = updates["name"]
        if "color" in updates: item_updates["group_color"] = updates["color"]
        await db.items.update_many({"group_id": group_id, "library_id": lib}, {"$set": item_updates})
        
    return res.data[0] if res.data else None

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, lib: str = Depends(resolve_library)):
    # Items' group_id will be set to NULL due to ON DELETE SET NULL, 
    # but for mongo we need to manually update them.
    await db.items.update_many(
        {"group_id": group_id, "library_id": lib}, 
        {"$set": {"group_id": None, "group_name": None, "group_color": None}}
    )
    db.supabase.table("groups").delete().eq("id", group_id).eq("library_id", lib).execute()
    return {"ok": True}
"""

# Insert group helper and endpoints right before items routes
content = content.replace("# ---------------- Item routes ----------------", group_helper + "\n# ---------------- Item routes ----------------")

with open(file_path, "w", encoding="utf8") as f:
    f.write(content)
print("Updated models and added group routes.")
