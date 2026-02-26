import { Button } from "@/components/ui/button";
import { Mail, MapPin, Send } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="py-24">
      <div className="container max-w-2xl text-center">
        <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">
          Let's <span className="text-gradient">Connect</span>
        </h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto">
          Have a project in mind or just want to say hello? I'd love to hear from you.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <div className="glass rounded-xl px-6 py-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <span className="text-sm">hello@example.com</span>
          </div>
          <div className="glass rounded-xl px-6 py-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-accent" />
            <span className="text-sm">San Francisco, CA</span>
          </div>
        </div>

        <Button size="lg" className="glow-primary gap-2">
          <Send className="w-4 h-4" /> Send a Message
        </Button>
      </div>
    </section>
  );
};

export default ContactSection;
