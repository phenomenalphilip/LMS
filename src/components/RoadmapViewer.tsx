import { CheckCircle2, CircleDashed, Rocket } from "lucide-react";
import { Card, CardHeader } from "./Card";
import { roadmapPhases } from "../data";
import { motion } from "motion/react";

export function RoadmapViewer() {
  return (
    <Card className="w-full">
      <CardHeader 
        title="Development Roadmap" 
        description="Agile sprint execution plan."
        icon={<Rocket size={24} />}
      />
      <div className="mt-8 space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
        {roadmapPhases.map((phase, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-[#161618] text-white/50 group-[.is-active]:text-white md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shrink-0 z-10 transition-colors">
              {i === 0 ? <CheckCircle2 size={16} className="text-blue-400" /> : <CircleDashed size={16} />}
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors shadow shadow-black/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white text-sm tracking-tight">{phase.phase}</h4>
                <span className="text-[10px] uppercase tracking-wider font-mono text-white/40">{phase.duration}</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">{phase.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
