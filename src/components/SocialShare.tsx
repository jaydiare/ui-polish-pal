import { useState } from "react";
import { Share2, Facebook, Twitter, Link as LinkIcon, Check } from "lucide-react";

interface SocialShareProps {
  url?: string;
  title?: string;
  compact?: boolean;
}

const SocialShare = ({ url, title, compact = false }: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareTitle = title || document.title;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(shareTitle);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: do nothing */
    }
  };

  const links = [
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      hoverClass: "hover:text-[#1877F2] hover:border-[#1877F2]/30",
    },
    {
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      hoverClass: "hover:text-foreground hover:border-foreground/30",
    },
    {
      label: "WhatsApp",
      icon: Share2,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      hoverClass: "hover:text-[#25D366] hover:border-[#25D366]/30",
    },
  ];

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${l.label}`}
            className={`p-1.5 rounded-lg border border-transparent text-muted-foreground transition-all ${l.hoverClass}`}
          >
            <l.icon className="w-3.5 h-3.5" />
          </a>
        ))}
        <button
          onClick={copyLink}
          aria-label="Copy link"
          className="p-1.5 rounded-lg border border-transparent text-muted-foreground hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <LinkIcon className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.label}`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm text-xs text-muted-foreground transition-all ${l.hoverClass}`}
        >
          <l.icon className="w-3.5 h-3.5" />
          {l.label}
        </a>
      ))}
      <button
        onClick={copyLink}
        aria-label="Copy link"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm text-xs transition-all cursor-pointer ${
          copied ? "text-green-400 border-green-400/30" : "text-muted-foreground hover:text-primary hover:border-primary/30"
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
};

export default SocialShare;
