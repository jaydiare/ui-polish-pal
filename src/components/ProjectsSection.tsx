import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const projects = [
  {
    title: "E-Commerce Platform",
    category: "Full Stack",
    description: "A modern shopping experience with real-time inventory and AI recommendations.",
    color: "from-primary/20 to-accent/20",
  },
  {
    title: "SaaS Dashboard",
    category: "Frontend",
    description: "Analytics dashboard with live data visualization and team collaboration.",
    color: "from-accent/20 to-primary/20",
  },
  {
    title: "Mobile Fitness App",
    category: "Mobile",
    description: "Cross-platform fitness tracker with social features and workout plans.",
    color: "from-primary/20 to-accent/10",
  },
];

const ProjectsSection = () => {
  return (
    <section id="projects" className="py-24">
      <div className="container">
        <div className="flex items-end justify-between mb-16">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">
              Featured <span className="text-gradient">Projects</span>
            </h2>
            <p className="text-muted-foreground max-w-md">
              A curated selection of recent work showcasing design and engineering.
            </p>
          </div>
          <Button variant="outline" className="hidden md:flex gap-2">
            View All <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <div
              key={project.title}
              className="group glass rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-300"
            >
              <div className={`h-48 bg-gradient-to-br ${project.color} flex items-center justify-center`}>
                <span className="text-4xl font-heading font-bold text-foreground/10">0{i + 1}</span>
              </div>
              <div className="p-6">
                <span className="text-xs text-primary font-medium uppercase tracking-wider">
                  {project.category}
                </span>
                <h3 className="text-xl font-bold font-heading mt-2 mb-3 group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
