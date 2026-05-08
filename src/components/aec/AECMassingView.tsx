import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Box, Environment, ContactShadows, Text } from '@react-three/drei';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Maximize, Rotate3d, Sparkles } from 'lucide-react';

interface AECMassingViewProps {
  elements: SpatialElement[];
}

const RoomVolume = ({ element, index }: { element: SpatialElement, index: number }) => {
  const { width, height, length } = element.dimensions;
  const name = element.name.toLowerCase();
  
  // Coordinates from AI or fallback for demo grid
  const position: [number, number, number] = [
    element.coordinates?.x || (index * 6 - 6), 
    height / 2, 
    element.coordinates?.y || 0
  ];

  const isGarage = name.includes('garage');
  const isLiving = name.includes('living') || name.includes('parlor');
  const isMaster = name.includes('master');

  return (
    <group position={position}>
      {/* Structural Main Mass (Concrete Finish) */}
      <Box args={[width, height, length]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={isGarage ? "#334155" : "#f1f5f9"} 
          roughness={0.6}
          metalness={0.1}
        />
      </Box>

      {/* Roof Parapet / Cap */}
      <Box args={[width + 0.1, 0.2, length + 0.1]} position={[0, height/2 + 0.1, 0]} castShadow>
         <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
      </Box>

      {/* Glass Window Planes (Simulated) */}
      {width > 1.5 && (
        <group position={[0, 0, length / 2 + 0.02]}>
          <Box args={[width * 0.7, height * 0.6, 0.05]}>
             <meshStandardMaterial 
               color="#0ea5e9" 
               transparent 
               opacity={0.4} 
               metalness={0.9} 
               roughness={0.1} 
             />
          </Box>
          {/* Window Frame */}
          <Box args={[width * 0.7, height * 0.6, 0.02]} position={[0,0,-0.01]}>
             <meshStandardMaterial color="#0f172a" wireframe />
          </Box>
        </group>
      )}

      {/* Wood Vertical Accents (The eBay look) */}
      {(isLiving || isMaster) && (
        <Box args={[0.1, height, length + 0.05]} position={[width/2 + 0.05, 0, 0]}>
           <meshStandardMaterial color="#78350f" roughness={0.3} />
        </Box>
      )}
      
      {/* Room Label in 3D Space */}
      <Text
        position={[0, height / 2 + 1, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="black"
        backgroundColor="#0f172a"
        padding={0.1}
      >
        {element.name.toUpperCase()}
      </Text>
    </group>
  );
};

const AECMassingView: React.FC<AECMassingViewProps> = ({ elements }) => {
  const validElements = elements.filter(el => el.type === 'room');

  if (validElements.length === 0) return null;

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-1000 bg-slate-900">
      <CardHeader className="bg-black/40 py-4 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <BoxIcon className="w-4 h-4" />
            </div>
            <div>
                <CardTitle className="text-[12px] font-black uppercase tracking-[0.2em] text-white">
                    3D Structural Massing Node
                </CardTitle>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 text-primary">AEC Render Engine v4.0 (Active)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] font-black border-primary/40 text-primary bg-primary/10">
              <Sparkles className="w-2.5 h-2.5 mr-1" /> HD RENDERING
            </Badge>
            <Badge variant="outline" className="text-[9px] font-black border-white/10 text-slate-400">
              <Rotate3d className="w-2.5 h-2.5 mr-1" /> ORBIT
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative h-[500px] bg-[#020617]">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Calibrating Mesh...</p>
            </div>
          </div>
        }>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={35} />
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
            
            {/* Professional Studio Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
            <pointLight position={[-10, 10, -10]} intensity={0.8} color="#0ea5e9" />
            
            {/* Stage */}
            <Grid 
                infiniteGrid 
                fadeDistance={40} 
                fadeStrength={5} 
                cellSize={1} 
                sectionSize={5} 
                sectionThickness={2} 
                sectionColor="#3b82f6" 
                cellColor="#1e293b"
            />
            
            {/* Architectural Massing */}
            {validElements.map((el, i) => (
              <RoomVolume key={el.id || i} element={el} index={i} />
            ))}
            
            <ContactShadows 
                position={[0, 0, 0]} 
                opacity={0.6} 
                scale={30} 
                blur={2.5} 
                far={10} 
                color="#000000"
            />
            
            <Environment preset="city" />
          </Canvas>
        </Suspense>
        
        <div className="absolute top-6 left-6 p-3 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Architectural Analysis</p>
            <div className="flex items-center gap-4">
                <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">Massing Type</p>
                    <p className="text-[11px] font-black text-white">Prismatic Structural</p>
                </div>
                <div className="w-[1px] h-6 bg-white/10" />
                <div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase">Est. Height</p>
                    <p className="text-[11px] font-black text-white">3.6m (Single Level)</p>
                </div>
            </div>
        </div>

        <div className="absolute bottom-6 right-6 flex items-center gap-3">
             <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Ray-Trace Simulation Ready</span>
             </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
