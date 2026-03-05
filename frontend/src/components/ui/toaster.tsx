import { useToast } from "@/hooks/useToast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-bottom-2 ${
            toast.variant === "destructive"
              ? "bg-destructive text-destructive-foreground"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {toast.title && <p className="font-semibold">{toast.title}</p>}
          {toast.description && <p className="opacity-90">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}
