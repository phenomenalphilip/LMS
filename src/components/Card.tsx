import { motion } from "motion/react";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-[#111113] border border-white/10 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      {icon && <div className="p-3 bg-white/5 rounded-xl text-white/80">{icon}</div>}
      <div>
        <h3 className="text-xl font-medium text-white tracking-tight">{title}</h3>
        {description && <p className="text-white/50 text-sm mt-1 leading-relaxed">{description}</p>}
      </div>
    </div>
  );
}
