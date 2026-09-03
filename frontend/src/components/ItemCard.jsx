import { Badge } from "@/components/ui/badge";
import { fileUrl } from "@/api";
import { typeMeta, timeAgo } from "@/lib/format";
import { Loader2, AlertTriangle } from "lucide-react";

export const ItemCard = ({ item, onClick }) => {
  const { label, Icon } = typeMeta(item.content_type);
  const preview =
    item.summary ||
    item.original_text ||
    item.source_url ||
    (item.status === "processing" ? "" : "");

  return (
    <button
      data-testid={`item-card-${item.id}`}
      onClick={() => onClick(item)}
      className="group w-full text-left border border-border rounded-lg bg-card hover:border-neutral-400 hover:shadow-sm transition-[border-color,box-shadow] overflow-hidden flex flex-col"
    >
      {item.content_type === "image" && item.image_path && (
        <div className="h-36 w-full bg-neutral-100 border-b border-border overflow-hidden">
          <img
            src={fileUrl(item.image_path)}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="mono-label text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Icon className="h-3 w-3" /> {label}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
        </div>

        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
          {item.title}
        </h3>

        {item.status === "processing" ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Understanding…
          </p>
        ) : item.status === "failed" ? (
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Processing failed — open to retry
          </p>
        ) : (
          <p className="text-xs text-muted-foreground line-clamp-2">{preview}</p>
        )}

        <div className="mt-auto flex items-center gap-1.5 flex-wrap pt-1">
          {item.category && item.status === "ready" && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              {item.category}
            </Badge>
          )}
          {(item.keywords || []).slice(0, 3).map((k) => (
            <span key={k} className="text-[10px] text-muted-foreground">
              #{k}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
};
