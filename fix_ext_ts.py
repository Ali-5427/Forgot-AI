import re

# 1. Update extension/src/lib/api.ts
path_api = "extension/src/lib/api.ts"
with open(path_api, "r", encoding="utf8") as f:
    content_api = f.read()

new_methods = """
  getGroups: () => request<any[]>("/api/groups", { auth: true }),
  saveText: (data: any) => 
    request<any>("/api/items/text", { method: "POST", body: JSON.stringify(data), auth: true }),
  saveUrl: (data: any) => 
    request<any>("/api/items/url", { method: "POST", body: JSON.stringify(data), auth: true }),
"""
content_api = content_api.replace("""  saveText: (data: { text: string; user_note?: string }) => 
    request<any>("/api/items/text", { method: "POST", body: JSON.stringify(data), auth: true }),
  saveUrl: (data: { url: string; user_note?: string }) => 
    request<any>("/api/items/url", { method: "POST", body: JSON.stringify(data), auth: true }),""", new_methods)

with open(path_api, "w", encoding="utf8") as f:
    f.write(content_api)


# 2. Fix startNewChat in PopupApp.tsx
path_app = "extension/src/popup/PopupApp.tsx"
with open(path_app, "r", encoding="utf8") as f:
    content_app = f.read()

startNewChat_def = """  const startNewChat = () => {
    setMessages([]);
    setChatQuery("");
    setConvId(null);
    chrome.storage.local.remove("extension_conv_id");
  };

  const openAuth = () => {"""
content_app = content_app.replace("  const openAuth = () => {", startNewChat_def)

with open(path_app, "w", encoding="utf8") as f:
    f.write(content_app)

print("Fixed Extension TypeScript errors")
