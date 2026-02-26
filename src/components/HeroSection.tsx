import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, Palette, Zap } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      </div>

      <div className="container relative z-10 pt-24 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8 animate-fade-in-up">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Available for freelance work</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold font-heading leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            I craft{" "}
            <span className="text-gradient">digital experiences</span>{" "}
            that stand out
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Full-stack developer & designer building modern web applications
            with clean code and bold aesthetics.
          </p>

          <div className="flex flex-wrap gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="glow-primary gap-2">
              View My Work <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline">
              Download CV
            </Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-6 max-w-md animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            {[
              { icon: Code, label: "Projects", value: "50+" },
              { icon: Palette, label: "Designs", value: "120+" },
              { icon: Zap, label: "Clients", value: "30+" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold font-heading">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
