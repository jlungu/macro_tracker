import { useState, useRef } from "react";
import { Camera, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogMeal } from "@/hooks/useMeals";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface MealLoggerProps {
  onSuccess?: (claudeMessage: string) => void;
}

export default function MealLogger({ onSuccess }: MealLoggerProps) {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useLogMeal();

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.items)
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();
    if (!file) return;
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() && !imagePreview) return;

    const base64 = imagePreview ? imagePreview.split(",")[1] : undefined;

    mutate(
      {
        message: message.trim(),
        image_base64: base64,
        image_mime_type: base64 ? imageMime : undefined,
      },
      {
        onSuccess: (data) => {
          setMessage("");
          clearImage();
          if (data.meal) {
            toast({ title: "Meal logged!", description: data.claude_message });
          }
          if (data.new_targets) {
            toast({ title: "Targets updated!" });
          }
          onSuccess?.(data.claude_message);
        },
        onError: () => {
          toast({
            title: "Failed to log meal",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  const canSubmit = (message.trim() || imagePreview) && !isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {imagePreview && (
        <div className="relative rounded-lg overflow-hidden">
          <img src={imagePreview} alt="Meal preview" className="w-full max-h-48 object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileRef}
          onChange={handleImage}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground"
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="h-5 w-5" />
        </Button>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your meal or ask a question…"
          rows={1}
          className={cn(
            "flex-1 bg-transparent resize-none text-base leading-5 outline-none placeholder:text-muted-foreground",
            "min-h-[36px] max-h-32 py-2"
          )}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) handleSubmit(e as unknown as React.FormEvent);
            }
          }}
        />

        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canSubmit}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Describe a meal, take a photo, or ask about macros
      </p>
    </form>
  );
}
