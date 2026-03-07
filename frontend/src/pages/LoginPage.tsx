import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({ email });

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setIsSent(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.join("");
    if (token.length < 6) return;
    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

    setIsLoading(false);
    if (error) setError(error.message);
  }

  function handleCodeChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every(Boolean)) {
      // auto-submit when all 6 digits entered
      supabase.auth.verifyOtp({ email, token: next.join(""), type: "email" }).then(({ error }) => {
        if (error) setError(error.message);
      });
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      supabase.auth.verifyOtp({ email, token: pasted, type: "email" }).then(({ error }) => {
        if (error) setError(error.message);
      });
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Macro Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-center">
                <p className="text-sm font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
              </div>
              <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className="w-10 h-12 text-center text-lg font-mono bg-secondary rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                ))}
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" disabled={isLoading || code.some((d) => !d)}>
                {isLoading ? "Verifying…" : "Sign in"}
              </Button>
              <Button variant="ghost" onClick={() => { setIsSent(false); setCode(["", "", "", "", "", ""]); setError(null); }}>
                Use a different email
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-secondary rounded-lg px-3 py-2 text-base outline-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send code"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
