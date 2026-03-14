import { useMemo } from "react";
import { motion } from "framer-motion";
import AthleteCard from "@/components/AthleteCard";
import { useAthleteData } from "@/hooks/useAthleteData";
import type { Athlete } from "@/data/athletes";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function CardTrackerAthleteRef() {
  const {
    athletes, byName, byKey, gradedByName, gradedByKey,
    ebaySoldRaw, ebayGradedSoldRaw, athleteHistory,
  } = useAthleteData();

  const refAthletes = useMemo(() => {
    const names = ["Ronald Acuna Jr.", "Gleyber Torres"];
    return names
      .map((n) => athletes.find((a) => normalize(a.name) === normalize(n)))
      .filter(Boolean) as Athlete[];
  }, [athletes]);

  if (!refAthletes.length) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-display font-bold text-foreground mb-4">Athlete Reference</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        {refAthletes.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <AthleteCard
              athlete={a}
              byName={byName}
              byKey={byKey}
              gradedByName={gradedByName}
              gradedByKey={gradedByKey}
              ebaySoldRaw={ebaySoldRaw}
              ebayGradedSoldRaw={ebayGradedSoldRaw}
              history={athleteHistory?.[a.name]}
              priceMode="both"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
