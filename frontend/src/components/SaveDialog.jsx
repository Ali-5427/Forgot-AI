import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/api";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Link2, Image as ImageIcon, AlertCircle } from "lucide-react";

export const SaveDialog = ({ open, onOpenChange, onSaved, onOpenExisting }) => {
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState(null); // existing item detected
  const fileRef = useRef(null);

  const reset = () => {
    setText("");
    setUrl("");
    setFile(null);
    setDup(null);
  };

  const done = (item) => {
    toast.success("Saved to Forgot AI ✓", { description: "Understanding your item…" });
    reset();
    onOpenChange(false);
    onSaved && onSaved(item);
  };

  const persist = async () => {
    if (tab === "text") return done(await api.saveText({ text }));
    if (tab === "url") return done(await api.saveUrl({ url }));
    const fd = new FormData();
    fd.append("file", file);
    return done(await api.saveImage(fd));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setDup(null);
      // validate
      if (tab === "text" && !text.trim()) return toast.error("Enter some text");
      if (tab === "url" && !url.trim()) return toast.error("Enter a URL");
      if (tab === "image" && !file) return toast.error("Choose an image");

      // duplicate awareness
      let check = { duplicate: false };
      if (tab === "text") check = await api.check({ content_type: "text", text });
      else if (tab === "url") check = await api.check({ content_type: "url", url });
      else if (tab === "image") check = await api.checkFile(file);

      if (check.duplicate) {
        setDup(check.item);
        return;
      }
      await persist();
    } catch (e) {
      toast.error("Could not save", { description: e?.response?.data?.detail || "Try again" });
    } finally {
      setSaving(false);
    }
  };

  const saveAnyway = async () => {
    try {
      setSaving(true);
      await persist();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg" data-testid="save-dialog">
        <DialogHeader>
          <DialogTitle>Save to Forgot AI</DialogTitle>
          <DialogDescription className="sr-only">Save text, a URL, or an image to your memory</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setDup(null); }}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="text" data-testid="save-tab-text">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Text
            </TabsTrigger>
            <TabsTrigger value="url" data-testid="save-tab-url">
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> URL
            </TabsTrigger>
            <TabsTrigger value="image" data-testid="save-tab-image">
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="pt-3">
            <Textarea
              data-testid="save-text-input"
              placeholder="Paste or type anything you want to remember…"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="url" className="pt-3">
            <Input
              data-testid="save-url-input"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              We'll try to read the page. If it can't be accessed, the link is still saved.
            </p>
          </TabsContent>

          <TabsContent value="image" className="pt-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-neutral-400 transition-colors"
              data-testid="save-image-dropzone"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="save-image-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground">{file ? file.name : "Click to choose a screenshot / image"}</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP</p>
            </div>
          </TabsContent>
        </Tabs>

        {dup ? (
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3" data-testid="duplicate-notice">
            <p className="text-sm text-amber-900 flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" /> Looks like you already saved this
            </p>
            <p className="text-xs text-amber-800 mt-1 truncate">{dup.title}</p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                data-testid="open-existing-btn"
                onClick={() => { const it = dup; reset(); onOpenChange(false); onOpenExisting && onOpenExisting(it.id); }}
              >
                Open existing
              </Button>
              <Button size="sm" onClick={saveAnyway} disabled={saving} data-testid="save-anyway-btn">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save anyway"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={handleSave} disabled={saving} data-testid="save-submit-btn" className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
