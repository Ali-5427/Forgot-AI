import { Image, FileText, Link2 } from "lucide-react";

export function typeMeta(type) {
  if (type === "image") return { label: "Image", Icon: Image };
  if (type === "url") return { label: "Link", Icon: Link2 };
  return { label: "Text", Icon: FileText };
}

export function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
