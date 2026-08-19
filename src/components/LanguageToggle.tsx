import { useLanguage } from "@/i18n/LanguageProvider";

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle = ({ className = "" }: LanguageToggleProps) => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={`inline-flex items-center rounded-lg border border-border bg-secondary p-0.5 ${className}`}
    >
      {(["en", "es"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer border-none ${
            lang === code
              ? "bg-vzla-yellow/15 text-vzla-yellow"
              : "bg-transparent text-foreground/60 hover:text-foreground"
          }`}
        >
          {code === "en" ? "EN" : "ES"}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
