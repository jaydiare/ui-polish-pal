import { Code, Database, Layout, Smartphone, Globe, Cpu } from "lucide-react";

const skills = [
  { icon: Code, title: "Frontend", description: "React, TypeScript, Tailwind CSS, Next.js" },
  { icon: Database, title: "Backend", description: "Node.js, PostgreSQL, REST & GraphQL APIs" },
  { icon: Layout, title: "UI/UX Design", description: "Figma, prototyping, design systems" },
  { icon: Smartphone, title: "Mobile", description: "React Native, responsive design" },
  { icon: Globe, title: "Deployment", description: "AWS, Vercel, Docker, CI/CD pipelines" },
  { icon: Cpu, title: "AI & ML", description: "OpenAI, LangChain, data pipelines" },
];

const SkillsSection = () => {
  return (
    <section id="skills" className="py-24">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">
            What I <span className="text-gradient">Do Best</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A broad skillset spanning design and engineering, focused on delivering polished digital products.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {skills.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="glass rounded-xl p-6 hover:border-primary/40 transition-all duration-300 group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-primary transition-shadow">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold font-heading mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
