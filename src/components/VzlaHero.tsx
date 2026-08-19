import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";

interface VzlaHeroProps {
  lastUpdated: string;
}

const VzlaHero = forwardRef<HTMLElement, VzlaHeroProps>(({ lastUpdated }, ref) => {
  const { t } = useLanguage();

  const intro = t("hero.intro");
  const strong = t("hero.introStrong");
  const [introBefore, introAfter] = intro.split(strong);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="hero-panel text-center mb-8 p-10 md:p-14"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border text-xs font-semibold text-muted-foreground mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        {t("hero.lastUpdate")} · {lastUpdated}
      </motion.div>

      <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-[1.05] text-glow">
        {t("hero.titleA")} <span className="text-flag-gradient">{t("hero.titleB")}</span> {t("hero.titleC")}
      </h1>

      <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-3">
        {t("hero.subtitle")}
      </p>

      <p className="text-muted-foreground text-xs max-w-2xl mx-auto leading-relaxed mb-6">
        {introBefore}
        <strong className="text-foreground">{strong}</strong>
        {introAfter}
      </p>

      <div className="hero-sub text-sm leading-relaxed text-left md:text-center">
        <p className="mb-2">
          <strong className="text-foreground">{t("hero.stabilityScore")}</strong> {t("hero.stabilityLead")}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: t("hero.stable"), range: "0–10%", color: "text-emerald-400", desc: t("hero.stableDesc") },
            { label: t("hero.active"), range: "10–20%", color: "text-sky-400", desc: t("hero.activeDesc") },
            { label: t("hero.volatile"), range: "20–35%", color: "text-amber-400", desc: t("hero.volatileDesc") },
            { label: t("hero.unstable"), range: "35%+", color: "text-red-400", desc: t("hero.unstableDesc") },
          ].map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-background/50">
              <div className={`text-xs font-bold ${item.color}`}>{item.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{item.range}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-vzla-yellow/5 border border-vzla-yellow/15 w-fit mx-auto">
          <span className="text-[13px]">🔄</span>
          <span className="text-xs text-muted-foreground">
            <strong className="text-vzla-yellow">{t("hero.flipPotential")}</strong> — {t("hero.flipDesc")}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 w-fit mx-auto">
          <span className="text-[13px]">🔻</span>
          <span className="text-xs text-muted-foreground">
            <strong className="text-emerald-400">{t("hero.buyLow")}</strong> — {t("hero.buyLowDesc")}
          </span>
        </div>
      </div>


    </motion.section>
  );
});

VzlaHero.displayName = "VzlaHero";

export default VzlaHero;
