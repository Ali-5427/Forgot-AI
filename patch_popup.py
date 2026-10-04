import re

path = "extension/src/popup/PopupApp.tsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

chat_old = """      try {
        const res = await fetchStream("/api/chat", {
          method: "POST",
          body: JSON.stringify({ query: q, stream: true, history: historyToSend, context_item_ids: contextIds }),
          signal: controller.signal
        });

        const idsHeader = res.headers.get("X-Context-Ids");
        if (idsHeader) setContextIds(idsHeader.split(",").filter(Boolean));"""

chat_new = """      try {
        const res = await fetchStream("/api/chat/v2/stream", {
          method: "POST",
          body: JSON.stringify({ conversation_id: convId, query: q }),
          signal: controller.signal
        });

        const returnedConvId = res.headers.get("x-conversation-id");
        if (returnedConvId && returnedConvId !== convId) {
          setConvId(returnedConvId);
          chrome.storage.local.set({ extension_conv_id: returnedConvId });
        }"""

content = content.replace(chat_old, chat_new)

with open(path, "w", encoding="utf8") as f: f.write(content)
print("PopupApp patched")
