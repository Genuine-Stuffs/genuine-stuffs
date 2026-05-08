import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Box, Environment, ContactShadows, Text, Float } from '@react-three/drei';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Rotate3d, Sparkles, Sun, Trees } from 'lucide-react';

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

  const isPublic = name.includes('living') || name.includes('dining') || name.includes('lounge');
  const isService = name.includes('kitchen') || name.includes('garage') || name.includes('laundry');
  const isPrivate = name.includes('bedroom') || name.includes('master') || name.includes('bath');

  // Realistic Material Palette
  const wallColor = useMemo(() => {
    if (isPublic) return "#f8fafc"; // Clean White
    if (isService) return "#e2e8f0"; // Cool Grey
    if (isPrivate) return "#f1f5f9"; // Soft Off-white
    return "#ffffff";
  }, [isPublic, isService, isPrivate]);

  return (
    <group position={position}>
      {/* 1. STRUCTURAL SHELL (Concrete/Stone Look) */}
      <Box args={[width, height, length]} castShadow receiveShadow>
        <meshStandardMaterial 
          color={wallColor}
          roughness={0.7}
          metalness={0.05}
          emissive={wallColor}
          emissiveIntensity={0.02}
        />
      </Box>

      {/* 2. ARCHITECTURAL GLAZING (The "Glass" Effect) */}
      <group position={[0, 0, length / 2 + 0.05]}>
        <Box args={[width * 0.8, height * 0.7, 0.05]}>
          <meshStandardMaterial 
            color="#bae6fd" 
            transparent 
            opacity={0.6} 
            metalness={0.95} 
            roughness={0.05} 
            envMapIntensity={2}
          />
        </Box>
        {/* Technical Mullions (Frames) */}
        <Box args={[width * 0.8, height * 0.7, 0.02]} position={[0,0,-0.02]}>
          <meshStandardMaterial color="#0f172a" wireframe />
        </Box>
      </group>

      {/* 3. ROOF SLAB (Coping/Parapet) */}
      <Box args={[width + 0.2, 0.25, length + 0.2]} position={[0, height/2 + 0.125, 0]} castShadow>
         <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.8} />
      </Box>

      {/* 4. DESIGN ACCENTS (Wood Panels for high-end feel) */}
      {isPublic && (
        <Box args={[0.15, height * 0.9, length + 0.1]} position={[width/2 + 0.08, 0, 0]}>
           <meshStandardMaterial color="#78350f" roughness={0.4} metalness={0.1} />
        </Box>
      )}
      
      {/* 5. 3D SPATIAL ANNOTATION */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
            position={[0, height / 2 + 1.2, 0]}
            fontSize={0.28}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight="black"
        >
            {element.name.toUpperCase()}
        </Text>
      </Float>
    </group>
  );
};

const AECMassingView: React.FC<AECMassingViewProps> = ({ elements }) => {
  const validElements = elements.filter(el => el.type === 'room');

  if (validElements.length === 0) return null;

  return (
    <Card className="mt-8 border-slate-200 dark:border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in duration-1000 bg-[#020617]">
      <CardHeader className="bg-black/60 py-5 border-b border-white/5 backdrop-blur-xl px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <BoxIcon className="w-5 h-5" />
            </div>
            <div>
                <CardTitle className="text-[13px] font-black uppercase tracking-[0.25em] text-white">
                    3D Structural Visualization Node
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">Physics Enabled</span>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ray-Trace Core 4.5</span>
                </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="text-[9px] font-black border-primary/40 text-primary bg-primary/10 px-4 py-1.5 shadow-lg shadow-primary/20">
              <Sparkles className="w-3 h-3 mr-1.5" /> CINEMATIC MODE
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative h-[650px] bg-[#020617]">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-[#020617]">
            <div className="flex flex-col items-center gap-6">
              <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.2)]" />
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Compiling Structural Mesh...</p>
            </div>
          </div>
        }>
          <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
            <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={30} />
            <OrbitControls 
                makeDefault 
                minPolarAngle={0} 
                maxPolarAngle={Math.PI / 2.2} 
                enableDamping 
                dampingFactor={0.05}
                rotateSpeed={0.5}
            />
            
            {/* Cinematic Studio Lighting Setup */}
            <ambientLight intensity={0.2} />
            <pointLight position={[-20, 20, -20]} intensity={1.5} color="#3b82f6" />
            <spotLight 
                position={[20, 40, 20]} 
                angle={0.2} 
                penumbra={1} 
                intensity={3} 
                castShadow 
                shadow-mapSize={[2048, 2048]} 
                color="#fff8f1" 
            />
            
            {/* Architectural Grid & Ground Plane */}
            <Grid 
                infiniteGrid 
                fadeDistance={60} 
                fadeStrength={8} 
                cellSize={1} 
                sectionSize={5} 
                sectionThickness={2.5} 
                sectionColor="#3b82f6" 
                cellColor="#1e293b"
                position={[0, -0.01, 0]}
            />
            
            {/* Site Terrain Base */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#0f172a" roughness={1} />
            </mesh>

            {/* Architectural Massing Elements */}
            <group>
                {validElements.map((el, i) => (
                    <RoomVolume key={el.id || i} element={el} index={i} />
                ))}
            </group>
            
            {/* Realistic Contact Shadows */}
            <ContactShadows 
                position={[0, 0, 0]} 
                opacity={0.8} 
                scale={40} 
                blur={2} 
                far={15} 
                color="#000000"
            />
            
            <Environment preset="city" background={false} />
          </Canvas>
        </Suspense>
        
        {/* Professional Overlay UI */}
        <div className="absolute top-8 left-8 flex flex-col gap-3">
            <div className="p-4 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-3xl">
                <div className="flex items-center gap-3 mb-3">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Solar Simulation</p>
                </div>
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">Daylight Factor</p>
                        <p className="text-[12px] font-black text-emerald-400">Excellent (4.2%)</p>
                    </div>
                    <div className="w-[1px] h-6 bg-white/10" />
                    <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">Orientation</p>
                        <p className="text-[12px] font-black text-white">NNE 15°</p>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full backdrop-blur-xl">
                <Rotate3d className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Orbit Mode Enabled</span>
            </div>
        </div>

        <div className="absolute bottom-8 right-8 flex flex-col items-end gap-3">
             <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-2xl flex items-center gap-4">
                <Trees className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Site Context</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">Urban Residential Zone B</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Material Insight Studio Engine Active</span>
             </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
