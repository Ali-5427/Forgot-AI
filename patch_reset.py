import re

path = "frontend/src/pages/ResetPasswordPage.jsx"
with open(path, "r", encoding="utf8") as f: content = f.read()

# Replace import line to include Link
old_import = 'import { useNavigate, useSearchParams } from "react-router-dom";'
new_import = 'import { useNavigate, useSearchParams, Link } from "react-router-dom";'

content = content.replace(old_import, new_import)

with open(path, "w", encoding="utf8") as f: f.write(content)

print("ResetPasswordPage patched")
