import { Database } from "lucide-react";
import { Card, CardHeader } from "./Card";
import { sanitySchemas } from "../data";

export function SchemaExplorer() {
  return (
    <Card className="w-full">
      <CardHeader 
        title="Sanity Schema Blueprint" 
        description="GROQ/Sanity document structures for core LMS models."
        icon={<Database size={24} />}
      />
      <div className="mt-6 overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0c]">
        <div className="flex px-4 py-2 bg-white/5 border-b border-white/5 text-xs font-mono text-white/50 space-x-6 overflow-x-auto">
          <span className="text-white">schemas/course.ts</span>
          <span>schemas/lesson.ts</span>
          <span>schemas/quiz.ts</span>
          <span>schemas/author.ts</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-white/70 leading-relaxed">
            <code>{sanitySchemas}</code>
          </pre>
        </div>
      </div>
    </Card>
  );
}
