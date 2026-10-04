import re

file_path = "backend/server.py"
with open(file_path, "r", encoding="utf8") as f:
    content = f.read()

# For text, url, image saves we need to figure out user_id
# the easiest way is to add a try/except get_current_user in the _handle_new_group call,
# so let's modify the save methods.
# Actually in `_handle_new_group` I can just use `lib` as `user_id` if we can't easily pass it.

text_old = """item = SavedItem(library_id=lib, content_type="text", original_text=payload.text,
                     source_url=payload.source_url, source_title=payload.source_title,
                     source_domain=domain_of(payload.source_url) if payload.source_url else None,
                     user_note=payload.user_note,
                     dedup_key=text_hash(payload.text), title=payload.text.strip()[:60])"""
text_new = """group_id, group_name, group_color = await _handle_new_group(payload, lib, lib)
    item = SavedItem(library_id=lib, content_type="text", original_text=payload.text,
                     source_url=payload.source_url, source_title=payload.source_title,
                     source_domain=domain_of(payload.source_url) if payload.source_url else None,
                     user_note=payload.user_note,
                     group_id=group_id, group_name=group_name, group_color=group_color,
                     dedup_key=text_hash(payload.text), title=payload.text.strip()[:60])"""
content = content.replace(text_old, text_new)

url_old = """item = SavedItem(library_id=lib, content_type="url", source_url=url,
                     original_text=payload.context_text, source_title=payload.source_title,
                     source_domain=domain_of(url), dedup_key=normalize_url(url), title=url[:60],
                     user_note=payload.user_note)"""
url_new = """group_id, group_name, group_color = await _handle_new_group(payload, lib, lib)
    item = SavedItem(library_id=lib, content_type="url", source_url=url,
                     original_text=payload.context_text, source_title=payload.source_title,
                     source_domain=domain_of(url), dedup_key=normalize_url(url), title=url[:60],
                     user_note=payload.user_note,
                     group_id=group_id, group_name=group_name, group_color=group_color)"""
content = content.replace(url_old, url_new)

img_old = """item = SavedItem(library_id=lib, content_type="image", image_path=stored_path,
                     source_url=source_url, source_title=source_title,
                     source_domain=domain_of(source_url) if source_url else None,
                     user_note=user_note,
                     title="Image")"""
img_new = """
    # For images, we can pack it into an object that resembles payload
    class _ImgPayload:
        pass
    p = _ImgPayload()
    p.group_id = None # could be pulled from form if needed later
    p.new_group_name = None
    group_id, group_name, group_color = await _handle_new_group(p, lib, lib)
    
    item = SavedItem(library_id=lib, content_type="image", image_path=stored_path,
                     source_url=source_url, source_title=source_title,
                     source_domain=domain_of(source_url) if source_url else None,
                     user_note=user_note,
                     group_id=group_id, group_name=group_name, group_color=group_color,
                     title="Image")"""
content = content.replace(img_old, img_new)

with open(file_path, "w", encoding="utf8") as f:
    f.write(content)
print("Updated save functions.")
