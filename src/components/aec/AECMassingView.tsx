import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Box, Environment, ContactShadows, Text } from '@react-three/drei';
import { SpatialElement } from 'supabase/functions/ai-studio/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Box as BoxIcon, Maximize, Rotate3d } from 'lucide-react';

interface AECMassingViewProps {
  elements: SpatialElement[];
}

const RoomVolume = ({ element, index }: { element: SpatialElement, index: number }) => {
  const { width, length, height } = element.dimensions;
  
  // Use coordinates if available, otherwise simplistic offset for visualization
  // In a real app, we'd use the center of the bounding box
  const position: [number, number, number] = [
    element.coordinates?.x || (index * 4), 
    height / 2, 
    element.coordinates?.y || 0
  ];

  return (
    <group position={position}>
      <Box args={[width, height, length]}>
        <meshStandardMaterial 
          color={index % 2 === 0 ? "#3b82f6" : "#6366f1"} 
          transparent 
          opacity={0.6} 
          roughness={0.1}
          metalness={0.2}
        />
      </Box>
      <Box args={[width, height, length]}>
        <meshStandardMaterial color="white" wireframe />
      </Box>
      
      {/* Room Label in 3D */}
      <Text
        position={[0, height / 2 + 0.5, 0]}
        fontSize={0.3}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {element.name}
      </Text>
    </group>
  );
};

const AECMassingView: React.FC<AECMassingViewProps> = ({ elements }) => {
  const validElements = elements.filter(el => el.type === 'room');

  if (validElements.length === 0) return null;

  return (
    <Card className="mt-6 border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-1000">
      <CardHeader className="bg-slate-50/50 dark:bg-white/5 py-3 border-b dark:border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
            <BoxIcon className="w-3 h-3 text-primary" />
            3D Massing Visualization (v1.0)
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary">
              <Rotate3d className="w-2 h-2 mr-1" /> ORBIT READY
            </Badge>
            <Badge variant="outline" className="text-[8px] font-black border-slate-200 text-slate-500">
              <Maximize className="w-2 h-2 mr-1" /> FULL VIEW
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative h-[400px] bg-slate-100 dark:bg-[#111214]">
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Constructing Mesh...</p>
            </div>
          </div>
        }>
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[12, 12, 12]} fov={40} />
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
            
            {/* Lights */}
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            {/* Stage */}
            <Grid 
                infiniteGrid 
                fadeDistance={50} 
                fadeStrength={5} 
                cellSize={1} 
                sectionSize={5} 
                sectionThickness={1.5} 
                sectionColor="#3b82f6" 
            />
            
            {/* Architectural Massing */}
            {validElements.map((el, i) => (
              <RoomVolume key={el.id || i} element={el} index={i} />
            ))}
            
            <ContactShadows 
                position={[0, 0, 0]} 
                opacity={0.4} 
                scale={20} 
                blur={2.4} 
                far={4.5} 
            />
            
            <Environment preset="city" />
          </Canvas>
        </Suspense>
        
        <div className="absolute bottom-4 left-4 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Spatial Context</p>
            <p className="text-[10px] font-bold text-slate-800 dark:text-white">Isometric Structural Massing</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AECMassingView;
