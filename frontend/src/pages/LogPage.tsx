import { useState, useEffect, useRef } from "react";
import MealLogger from "@/components/meals/MealLogger";
import { useLogMeal } from "@/hooks/useMeals";
import { toast } from "@/hooks/useToast";
import type { LogMealPayload, Meal, HistoryMessage } from "@/lib/api";

interface UserMsg {
  role: "user";
  content: string;
  image?: string;
}
interface BotMsg {
  role: "assistant";
  content: string;
  meal: Meal | null;
}
type ChatMsg = UserMsg | BotMsg;

export default function LogPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { mutate, isPending } = useLogMeal();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function handleSubmit(payload: LogMealPayload, imagePreview?: string) {
    const history: HistoryMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [
      ...prev,
      { role: "user", content: payload.message, image: imagePreview },
    ]);

    mutate({ ...payload, history }, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.claude_message, meal: data.meal },
        ]);
        if (data.meal) toast({ title: "Meal logged!" });
        if (data.new_targets) toast({ title: "Targets updated!" });
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong. Please try again.",
            meal: null,
          },
        ]);
        toast({ title: "Error", variant: "destructive" });
      },
    });
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 80px)" }}>
      {/* Scrollable messages — min-h-full + justify-end anchors messages to bottom */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-end gap-3 px-4 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pb-4">
              Describe a meal, snap a photo,
              <br />
              or ask about your macros
            </p>
          )}

          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex flex-col items-end gap-1">
                {msg.image && (
                  <img
                    src={msg.image}
                    alt=""
                    className="rounded-xl max-w-[70%] max-h-48 object-cover"
                  />
                )}
                {msg.content && (
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start max-w-[85%]">
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.meal && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground flex gap-2 flex-wrap">
                      <span>{Math.round(msg.meal.macros.calories)} cal</span>
                      <span>{Math.round(msg.meal.macros.protein_g)}g protein</span>
                      <span>{Math.round(msg.meal.macros.carbs_g)}g carbs</span>
                      <span>{Math.round(msg.meal.macros.fat_g)}g fat</span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {isPending && (
            <div className="flex items-start">
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — always at bottom */}
      <div className="border-t border-border/40 bg-background px-4 pb-4 pt-2">
        <MealLogger onSubmit={handleSubmit} isPending={isPending} />
      </div>
    </div>
  );
}
