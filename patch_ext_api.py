import re

path = "extension/src/lib/api.ts"
with open(path, "r", encoding="utf8") as f: content = f.read()

get_lib_func = """export async function getLibraryId(): Promise<string> {
  const data = await chrome.storage.local.get("forgot_ai_library");
  let id = data.forgot_ai_library;
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    await chrome.storage.local.set({ forgot_ai_library: id });
  }
  return id;
}

export async function request"""

content = content.replace("export async function request", get_lib_func)

# Fix request
req_old = """  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }"""
req_new = """  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Library-Id", await getLibraryId());"""
content = content.replace(req_old, req_new)

# Fix fetchStream
stream_old = """export async function fetchStream(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");"""
stream_new = """export async function fetchStream(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("X-Library-Id", await getLibraryId());"""
content = content.replace(stream_old, stream_new)

with open(path, "w", encoding="utf8") as f: f.write(content)

print("api.ts patched")
