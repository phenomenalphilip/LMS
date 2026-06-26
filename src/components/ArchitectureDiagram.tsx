import { motion } from "motion/react";
import { Database, Monitor, Server, Workflow, FileJson, CreditCard, Lock, Play } from "lucide-react";
import { Card, CardHeader } from "./Card";

function BaseNode({ icon: Icon, title, subtitle, className = "" }: { icon: any, title: string, subtitle: string, className?: string }) {
  return (
    <div className={`relative flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-[#161618] hover:bg-[#1a1a1c] transition-colors ${className}`}>
      <div className="p-3 bg-white/5 rounded-lg text-white/80">
        <Icon size={20} />
      </div>
      <div>
        <h4 className="text-white font-medium tracking-tight text-sm">{title}</h4>
        <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <Card className="w-full">
      <CardHeader 
        title="System Architecture" 
        description="Data flow from client to Edge, CMS, Database, Video Delivery, and Payment Gateway."
        icon={<Workflow size={24} />}
      />
      <div className="relative mt-12 mb-8 mx-auto max-w-3xl">
        <div className="flex flex-col items-center">
          
          <BaseNode 
            icon={Monitor} 
            title="Client Devices" 
            subtitle="Web & Mobile SPA (Optimistic Updates)" 
            className="w-64 z-10"
          />

          <div className="w-px h-12 bg-white/10 relative">
             <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent w-px" />
             <div className="absolute top-1/2 left-4 text-[10px] text-white/30 tracking-widest font-mono uppercase translate-y-[-50%]">Sync / Req</div>
          </div>

          <BaseNode 
            icon={Server} 
            title="Next.js App Router" 
            subtitle="Vercel Edge Network / Server Components" 
            className="w-72 z-10 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
          />

          <div className="w-px h-12 bg-white/10 relative my-2 z-0" />

          {/* Sub-systems row */}
          <div className="relative w-full border-t border-white/10 pt-8 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="absolute top-0 left-1/2 w-4 h-4 rounded-full border border-white/10 bg-[#111113] translate-x-[-50%] translate-y-[-100%] mt-[-4px]" />
            
            <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y:0}} transition={{delay: 0.1}}>
              <BaseNode 
                icon={FileJson} 
                title="Sanity Studio" 
                subtitle="Courses, Copy, Pricing" 
                className="h-full border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
              />
            </motion.div>
            
            <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y:0}} transition={{delay: 0.2}}>
              <BaseNode 
                icon={Database} 
                title="PostgreSQL" 
                subtitle="Supabase / Users, Progress" 
                className="h-full border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
              />
            </motion.div>
            
            <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y:0}} transition={{delay: 0.3}}>
              <BaseNode 
                icon={Play} 
                title="Mux Stream" 
                subtitle="HLS Adaptive Bitrate" 
                className="h-full border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10"
              />
            </motion.div>

            <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y:0}} transition={{delay: 0.4}}>
              <BaseNode 
                icon={CreditCard} 
                title="Paystack API" 
                subtitle="NGN/USD Webhooks" 
                className="h-full border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
              />
            </motion.div>

          </div>
        </div>
      </div>
    </Card>
  );
}
