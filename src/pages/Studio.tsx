import { defineConfig, Studio as SanityStudio } from 'sanity';
import { structureTool } from 'sanity/structure';
import { muxInput } from 'sanity-plugin-mux-input';
import { schemaTypes } from '../sanity/schema';

const config = defineConfig({
  name: 'default',
  title: 'Course Platform',
  projectId: 'wj0t8ags',
  dataset: 'production',
  basePath: '/studio', 
  plugins: [structureTool(), muxInput()],
  schema: {
    types: schemaTypes,
  },
});

export function StudioPage() {
  return (
    <div className="h-screen w-full bg-white absolute inset-0 z-50">
      <SanityStudio config={config} />
    </div>
  );
}
