import { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import { Eye, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import * as THREE from 'three';

// === 3D Node Component ===
function Node3D({ position, label, color = '#007AFF', isActive = false }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      if (isActive) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
      }
    }
  });
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={color} emissive={isActive ? color : '#000'} emissiveIntensity={isActive ? 0.5 : 0.1} metalness={0.3} roughness={0.4} />
      </mesh>
      <Text position={[0, 0, 0.5]} fontSize={0.25} color="white" anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOVeR.woff">
        {label}
      </Text>
    </group>
  );
}

// === Edge Component ===
function Edge3D({ start, end, color = '#333' }) {
  return <Line points={[start, end]} color={color} lineWidth={2} />;
}

// === Binary Tree Visualization ===
function BinaryTreeViz({ data, activeIndex }) {
  const nodes = [];
  const edges = [];
  const buildTree = (arr, idx, x, y, spread) => {
    if (idx >= arr.length || arr[idx] === null) return;
    const pos = [x, y, 0];
    nodes.push({ pos, label: String(arr[idx]), isActive: idx === activeIndex });
    const leftIdx = 2 * idx + 1;
    const rightIdx = 2 * idx + 2;
    if (leftIdx < arr.length && arr[leftIdx] !== null) {
      const childPos = [x - spread, y - 1.5, 0];
      edges.push({ start: pos, end: childPos });
      buildTree(arr, leftIdx, x - spread, y - 1.5, spread * 0.55);
    }
    if (rightIdx < arr.length && arr[rightIdx] !== null) {
      const childPos = [x + spread, y - 1.5, 0];
      edges.push({ start: pos, end: childPos });
      buildTree(arr, rightIdx, x + spread, y - 1.5, spread * 0.55);
    }
  };
  buildTree(data, 0, 0, 3, 3);
  return (
    <>
      {edges.map((e, i) => <Edge3D key={`e${i}`} start={e.start} end={e.end} color="#007AFF33" />)}
      {nodes.map((n, i) => <Node3D key={`n${i}`} position={n.pos} label={n.label} isActive={n.isActive} />)}
    </>
  );
}

// === Linked List Visualization ===
function LinkedListViz({ data, activeIndex }) {
  return (
    <>
      {data.map((val, i) => {
        const x = i * 2 - (data.length - 1);
        return (
          <group key={i}>
            <Node3D position={[x, 0, 0]} label={String(val)} color="#22C55E" isActive={i === activeIndex} />
            {i < data.length - 1 && <Edge3D start={[x + 0.4, 0, 0]} end={[x + 1.6, 0, 0]} color="#22C55E44" />}
          </group>
        );
      })}
    </>
  );
}

// === Array Visualization ===
function ArrayViz({ data, activeIndex }) {
  return (
    <>
      {data.map((val, i) => {
        const x = i * 1.2 - (data.length * 0.6);
        return (
          <group key={i}>
            <mesh position={[x, 0, 0]}>
              <boxGeometry args={[0.9, 0.9, 0.9]} />
              <meshStandardMaterial color={i === activeIndex ? '#EAB308' : '#FF3B30'} emissive={i === activeIndex ? '#EAB308' : '#000'} emissiveIntensity={i === activeIndex ? 0.3 : 0} metalness={0.2} roughness={0.5} />
            </mesh>
            <Text position={[x, 0, 0.6]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
              {String(val)}
            </Text>
            <Text position={[x, -0.8, 0]} fontSize={0.15} color="#666" anchorX="center" anchorY="middle">
              [{i}]
            </Text>
          </group>
        );
      })}
    </>
  );
}

// === Stack Visualization ===
function StackViz({ data, activeIndex }) {
  return (
    <>
      {data.map((val, i) => {
        const y = i * 1.1 - (data.length * 0.55);
        return (
          <group key={i}>
            <mesh position={[0, y, 0]}>
              <boxGeometry args={[1.5, 0.8, 0.8]} />
              <meshStandardMaterial color={i === data.length - 1 ? '#A855F7' : '#6B21A8'} emissive={i === activeIndex ? '#A855F7' : '#000'} emissiveIntensity={i === activeIndex ? 0.3 : 0} metalness={0.2} roughness={0.5} />
            </mesh>
            <Text position={[0, y, 0.5]} fontSize={0.25} color="white" anchorX="center" anchorY="middle">
              {String(val)}
            </Text>
          </group>
        );
      })}
      <Text position={[0, (data.length * 0.55) + 0.5, 0]} fontSize={0.2} color="#A855F7" anchorX="center">TOP</Text>
    </>
  );
}

const DS_OPTIONS = [
  { key: 'array', label: 'Array', data: [5, 3, 8, 1, 9, 2, 7, 4], desc: 'Linear data structure storing elements in contiguous memory. O(1) access by index.' },
  { key: 'linkedlist', label: 'Linked List', data: [1, 2, 3, 4, 5, 6], desc: 'Nodes connected via pointers. O(1) insert/delete at head, O(n) search.' },
  { key: 'binarytree', label: 'Binary Tree', data: [10, 5, 15, 3, 7, 12, 20, 1, 4], desc: 'Each node has at most 2 children. BST: left < parent < right.' },
  { key: 'stack', label: 'Stack (LIFO)', data: [10, 20, 30, 40, 50], desc: 'Last-In-First-Out. Push/Pop from top in O(1). Used in DFS, recursion, undo.' },
];

export default function DSAVisualizer() {
  const [selectedDS, setSelectedDS] = useState(DS_OPTIONS[0]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [animating, setAnimating] = useState(false);

  const animate = () => {
    setAnimating(true);
    let i = 0;
    const interval = setInterval(() => {
      setActiveIndex(i);
      i++;
      if (i >= selectedDS.data.length) {
        clearInterval(interval);
        setTimeout(() => { setActiveIndex(-1); setAnimating(false); }, 800);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="dsa-visualizer">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <Eye className="w-7 h-7 text-blue-500" /> 3D Data Structure Visualizer
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Interactive 3D visualization of common data structures</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {DS_OPTIONS.map(ds => (
            <button
              key={ds.key}
              onClick={() => { setSelectedDS(ds); setActiveIndex(-1); }}
              data-testid={`ds-${ds.key}`}
              className={`p-4 rounded-md border text-left transition-all ${
                selectedDS.key === ds.key
                  ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                  : 'bg-[#141414] border-white/10 text-zinc-300 hover:border-white/25'
              }`}
            >
              <p className="text-sm font-semibold">{ds.label}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{ds.desc.slice(0, 60)}...</p>
            </button>
          ))}
        </div>

        <Card className="bg-[#141414] border-white/10 mb-6">
          <CardContent className="p-0">
            <div className="h-[450px] rounded-md overflow-hidden bg-black">
              <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={0.8} />
                <pointLight position={[-10, -10, 5]} intensity={0.3} color="#007AFF" />
                {selectedDS.key === 'array' && <ArrayViz data={selectedDS.data} activeIndex={activeIndex} />}
                {selectedDS.key === 'linkedlist' && <LinkedListViz data={selectedDS.data} activeIndex={activeIndex} />}
                {selectedDS.key === 'binarytree' && <BinaryTreeViz data={selectedDS.data} activeIndex={activeIndex} />}
                {selectedDS.key === 'stack' && <StackViz data={selectedDS.data} activeIndex={activeIndex} />}
                <OrbitControls enableDamping dampingFactor={0.05} />
              </Canvas>
            </div>
            <div className="p-4 flex items-center justify-between border-t border-white/10">
              <div>
                <p className="text-sm font-semibold">{selectedDS.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{selectedDS.desc}</p>
              </div>
              <Button
                data-testid="animate-ds-btn"
                onClick={animate}
                disabled={animating}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                {animating ? 'Animating...' : 'Traverse'} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#141414] border-white/10">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 mb-2">Data: [{selectedDS.data.join(', ')}]</p>
            <p className="text-xs text-zinc-400">Drag to rotate, scroll to zoom, right-click to pan. Click "Traverse" to see the animation.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
