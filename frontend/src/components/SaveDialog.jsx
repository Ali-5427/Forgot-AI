import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/api";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Link2, Image as ImageIcon } from "lucide-react";

export const SaveDialog = ({ open, onOpenChange, onSaved }) => {
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setText("");
    setUrl("");
    setFile(null);
  };

  const done = (item) => {
    toast.success("Saved to Forgot AI ✓", { description: "Understanding your item…" });
    reset();
    onOpenChange(false);
    onSaved && onSaved(item);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (tab === "text") {
        if (!text.trim()) return toast.error("Enter some text");
        done(await api.saveText({ text }));
      } else if (tab === "url") {
        if (!url.trim()) return toast.error("Enter a URL");
        done(await api.saveUrl({ url }));
      } else {
        if (!file) return toast.error("Choose an image");
        const fd = new FormData();
        fd.append("file", file);
        done(await api.saveImage(fd));
      }
    } catch (e) {
      toast.error("Could not save", { description: e?.response?.data?.detail || "Try again" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="save-dialog">
        <DialogHeader>
          <DialogTitle>Save to Forgot AI</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
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

        <Button onClick={handleSave} disabled={saving} data-testid="save-submit-btn" className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
