import re

path = "backend/server.py"
with open(path, "r", encoding="utf8") as f: content = f.read()

# Replace redirectTo with redirect_to
old_line = 'options={"redirectTo": "https://forgot-ai.vercel.app/reset-password"}'
new_line = 'options={"redirect_to": "https://forgot-ai.vercel.app/reset-password"}'

content = content.replace(old_line, new_line)

with open(path, "w", encoding="utf8") as f: f.write(content)

print("backend/server.py patched")
