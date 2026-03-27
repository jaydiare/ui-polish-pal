import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "data", label: "Data / Accuracy" },
];

const API_URL = "https://script.google.com/macros/s/AKfycbyGuGb3lyDbupU1TUqDMCIWAKDszPWGmWmOvjaEYz-n_dc67VpaDqDTywpGCqYEvbQtrg/exec";

const FeedbackForm = ({ onClose }: { onClose?: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), category, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success("Thanks for your feedback!");
      setName("");
      setEmail("");
      setMessage("");
      setCategory("general");
      onClose?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 min-w-[280px]">
      <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider m-0">
        Send Feedback
      </p>

      <input
        type="text"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-vzla-yellow/40"
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={255}
        required
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-vzla-yellow/40"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-vzla-yellow/40 appearance-none cursor-pointer"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <textarea
        placeholder="Your feedback…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={3}
        required
        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-vzla-yellow/40 resize-none"
      />

      <button
        type="submit"
        disabled={sending || !message.trim()}
        className="w-full py-2 rounded-lg text-sm font-bold cta-flag text-white disabled:opacity-50 transition-opacity"
      >
        {sending ? "Sending…" : "Submit"}
      </button>
    </form>
  );
};

export default FeedbackForm;
