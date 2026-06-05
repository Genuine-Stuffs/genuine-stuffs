import React, { useEffect, useRef, useState } from 'react';
import { SolvedLayout } from 'supabase/functions/ai-studio/schema';
import { ifcEngine } from '@/lib/aec/ifc/authoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Sparkles } from 'lucide-react';
// @thatopen/components is loaded dynamically at runtime to avoid Rollup
// failing to resolve the WebGL/WASM package during static build analysis.

interface AECMassingViewProps {
  layout?: SolvedLayout;
}

const AECMassingView: React.FC<AECMassingViewProps> = ({ layout }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !layout) return;

    let components: any;

    const setupViewer = async () => {
      setIsLoading(true);
      try {
        // Dynamically import at runtime — keeps the build clean on Netlify
        const OBC = await import("@thatopen/components");

        // 1. Initialize That Open Components
        components = new OBC.Components();
        const worlds = components.get(OBC.Worlds);
        
        const world = worlds.create<
          typeof OBC.SimpleScene,
          typeof OBC.SimpleCamera,
          typeof OBC.SimpleRenderer
        >();

        world.scene = new OBC.SimpleScene(components);
        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!);
        world.camera = new OBC.SimpleCamera(components);

        components.init();

        world.scene.setup();
        world.camera.controls.setLookAt(20, 20, 20, 0, 0, 0);

        // 2. Generate the IFC File from the layout via web-ifc wrapper
        await ifcEngine.init();
        const ifcBuffer = await ifcEngine.generateModel(layout);

        // 3. Load the generated IFC Buffer into the viewer
        const fragments = components.get(OBC.FragmentsManager);
        const fragmentIfcLoader = components.get(OBC.IfcLoader);
        
        await fragmentIfcLoader.setup();
        const model = await fragmentIfcLoader.load(ifcBuffer);
        
        world.scene.three.add(model);
        
        console.log("Successfully loaded Generated IFC into That Open Viewer");

      } catch (error) {
        console.error("Failed to load IFC Viewer:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setupViewer();

    return () => {
      // Cleanup viewer on unmount
      if (components) {
        components.dispose();
      }
    };
  }, [layout]);

  if (!layout) return null;

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] bg-[#020617]">
      <CardHeader className="bg-black/60 py-5 border-b border-white/5 backdrop-blur-xl px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <BoxIcon className="w-5 h-5" />
            </div>
            <div>
                <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">
                    IFC Structural Viewer
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Powered by That Open Engine</span>
                </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-black border-primary/40 text-primary bg-primary/10 px-4 py-1.5">
              <Sparkles className="w-3 h-3 mr-1.5" /> DYNAMIC IFC MODE
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative h-[650px] bg-[#020617]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617] z-10">
            <div className="flex flex-col items-center gap-6">
              <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.2)]" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Compiling IFC Mesh...</p>
            </div>
          </div>
        )}
        {/* The That Open Engine will mount its canvas here */}
        <div ref={containerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
