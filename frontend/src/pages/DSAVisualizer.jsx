import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, ChevronRight, Send, Loader2, Bug, Lightbulb, Clock, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import axios from 'axios';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Pure Three.js canvas - no R3F reconciler
function ThreeCanvas({ selectedDS, activeIndex }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const groupRef = useRef(null);

  const createTextSprite = useCallback((text, color = '#ffffff', fontSize = 48) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(String(text), 64, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1, 0.5, 1);
    return sprite;
  }, []);

  const createNode = useCallback((pos, label, color = '#007AFF', isActive = false) => {
    const group = new THREE.Group();
    group.position.set(...pos);
    const geo = new THREE.SphereGeometry(0.35, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: isActive ? color : '#111',
      emissiveIntensity: isActive ? 0.5 : 0.1, metalness: 0.3, roughness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    if (isActive) mesh.userData.pulse = true;
    group.add(mesh);
    const sprite = createTextSprite(label);
    sprite.position.set(0, 0, 0.5);
    group.add(sprite);
    return group;
  }, [createTextSprite]);

  const createEdge = useCallback((start, end, color = '#007AFF') => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(e, s);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.03, 0.03, len, 8);
    const mat = new THREE.MeshStandardMaterial({ color, opacity: 0.4, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.quaternion.copy(q);
    return mesh;
  }, []);

  const buildScene = useCallback(() => {
    if (!groupRef.current) return;
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0];
      groupRef.current.remove(child);
      child.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
      });
    }

    const ds = selectedDS;
    if (ds.key === 'array') {
      ds.data.forEach((val, i) => {
        const x = i * 1.2 - (ds.data.length * 0.6);
        const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const mat = new THREE.MeshStandardMaterial({
          color: i === activeIndex ? '#EAB308' : '#FF3B30',
          emissive: i === activeIndex ? '#EAB308' : '#111',
          emissiveIntensity: i === activeIndex ? 0.3 : 0, metalness: 0.2, roughness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0, 0);
        if (i === activeIndex) mesh.userData.pulse = true;
        groupRef.current.add(mesh);
        const valS = createTextSprite(String(val));
        valS.position.set(x, 0, 0.55);
        groupRef.current.add(valS);
        const idxS = createTextSprite(`[${i}]`, '#666666', 32);
        idxS.position.set(x, -0.75, 0);
        groupRef.current.add(idxS);
      });
    } else if (ds.key === 'linkedlist') {
      ds.data.forEach((val, i) => {
        const x = i * 2 - (ds.data.length - 1);
        groupRef.current.add(createNode([x, 0, 0], String(val), '#22C55E', i === activeIndex));
        if (i < ds.data.length - 1) groupRef.current.add(createEdge([x + 0.4, 0, 0], [x + 1.6, 0, 0], '#22C55E'));
      });
    } else if (ds.key === 'binarytree') {
      const build = (arr, idx, x, y, spread) => {
        if (idx >= arr.length || arr[idx] === null) return;
        groupRef.current.add(createNode([x, y, 0], String(arr[idx]), '#007AFF', idx === activeIndex));
        if (2*idx+1 < arr.length && arr[2*idx+1] !== null) {
          groupRef.current.add(createEdge([x, y, 0], [x-spread, y-1.5, 0], '#007AFF'));
          build(arr, 2*idx+1, x-spread, y-1.5, spread*0.55);
        }
        if (2*idx+2 < arr.length && arr[2*idx+2] !== null) {
          groupRef.current.add(createEdge([x, y, 0], [x+spread, y-1.5, 0], '#007AFF'));
          build(arr, 2*idx+2, x+spread, y-1.5, spread*0.55);
        }
      };
      build(ds.data, 0, 0, 3, 3);
    } else if (ds.key === 'stack') {
      ds.data.forEach((val, i) => {
        const y = i * 1.1 - (ds.data.length * 0.55);
        const geo = new THREE.BoxGeometry(1.5, 0.8, 0.8);
        const mat = new THREE.MeshStandardMaterial({
          color: i === ds.data.length-1 ? '#A855F7' : '#6B21A8',
          emissive: i === activeIndex ? '#A855F7' : '#111',
          emissiveIntensity: i === activeIndex ? 0.3 : 0, metalness: 0.2, roughness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, y, 0);
        if (i === activeIndex) mesh.userData.pulse = true;
        groupRef.current.add(mesh);
        const s = createTextSprite(String(val));
        s.position.set(0, y, 0.5);
        groupRef.current.add(s);
      });
      const top = createTextSprite('TOP', '#A855F7');
      top.position.set(0, (ds.data.length * 0.55) + 0.5, 0);
      groupRef.current.add(top);
    } else if (ds.key === 'graph') {
      const positions = [[-2,2,0],[2,2,0],[3,0,0],[1,-2,0],[-1,-2,0],[-3,0,0]];
      const labels = ['A','B','C','D','E','F'];
      const edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3],[1,4]];
      edges.forEach(([a,b]) => groupRef.current.add(createEdge(positions[a], positions[b], '#06B6D4')));
      positions.forEach((pos, i) => groupRef.current.add(createNode(pos, labels[i], '#06B6D4', i === activeIndex)));
    }
  }, [selectedDS, activeIndex, createNode, createEdge, createTextSprite]);

  // Init Three.js scene once
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pt1 = new THREE.PointLight(0xffffff, 0.8);
    pt1.position.set(10, 10, 10);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0x007AFF, 0.3);
    pt2.position.set(-10, -10, 5);
    scene.add(pt2);

    const group = new THREE.Group();
    scene.add(group);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;
    groupRef.current = group;

    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      group.traverse(child => {
        if (child.userData?.pulse && child.isMesh) {
          child.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
        }
      });
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild scene content when data or active index changes
  useEffect(() => { buildScene(); }, [buildScene]);

  return <div ref={containerRef} className="w-full h-full" data-testid="three-canvas" />;
}

const DS_OPTIONS = [
  { key: 'array', label: 'Array', data: [5,3,8,1,9,2,7,4], desc: 'Linear structure. O(1) access by index. O(n) insert/delete.' },
  { key: 'linkedlist', label: 'Linked List', data: [1,2,3,4,5,6], desc: 'Nodes with pointers. O(1) insert at head. O(n) search.' },
  { key: 'binarytree', label: 'Binary Tree', data: [10,5,15,3,7,12,20,1,4], desc: 'BST: left < parent < right. O(log n) search/insert.' },
  { key: 'stack', label: 'Stack (LIFO)', data: [10,20,30,40,50], desc: 'Last-In-First-Out. O(1) push/pop. DFS, recursion, undo.' },
  { key: 'graph', label: 'Graph', data: [0,1,2,3,4,5], desc: 'Nodes + edges. BFS/DFS traversal. Shortest path, cycles.' },
];

export default function DSAVisualizer() {
  const [selectedDS, setSelectedDS] = useState(DS_OPTIONS[0]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [animating, setAnimating] = useState(false);

  // Custom question visualizer
  const [questionInput, setQuestionInput] = useState('');
  const [customViz, setCustomViz] = useState(null);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customStep, setCustomStep] = useState(0);

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

  const visualizeQuestion = async () => {
    if (!questionInput.trim() || loadingCustom) return;
    setLoadingCustom(true);
    setCustomViz(null);
    setCustomStep(0);
    try {
      const res = await axios.post(`${API}/visualize/question`, { message: questionInput }, { withCredentials: true });
      setCustomViz(res.data);
      // Also update the 3D view with the data
      if (res.data.data?.length > 0) {
        const dsKey = res.data.data_structure || 'array';
        const matched = DS_OPTIONS.find(d => d.key === dsKey) || DS_OPTIONS[0];
        setSelectedDS({ ...matched, data: res.data.data, label: res.data.title || matched.label, desc: res.data.explanation?.slice(0, 100) || matched.desc });
      }
    } catch { }
    setLoadingCustom(false);
  };

  const animateCustom = () => {
    if (!customViz?.steps?.length) return;
    setAnimating(true);
    let i = 0;
    setCustomStep(0);
    const interval = setInterval(() => {
      setCustomStep(i);
      const step = customViz.steps[i];
      if (step?.active_indices?.length > 0) {
        setActiveIndex(step.active_indices[0]);
      }
      i++;
      if (i >= customViz.steps.length) {
        clearInterval(interval);
        setTimeout(() => { setAnimating(false); }, 1000);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="dsa-visualizer">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <Eye className="w-7 h-7 text-blue-500" /> 3D Data Structure Visualizer
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Interactive 3D visualization - drag to rotate, scroll to zoom</p>
        </div>

        {/* Custom Question Input */}
        <Card className="bg-[#141414] border-white/10 mb-6">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wider">Paste a DSA question to visualize</p>
            <div className="flex gap-2">
              <Textarea
                data-testid="custom-question-input"
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                placeholder="e.g. Given an array [2,7,11,15] and target 9, find two numbers that add up to target. OR just paste any LeetCode question here..."
                className="bg-black border-white/10 text-white text-xs min-h-[50px] max-h-[100px] resize-none flex-1"
                rows={2}
              />
              <Button
                data-testid="visualize-question-btn"
                onClick={visualizeQuestion}
                disabled={!questionInput.trim() || loadingCustom}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 self-end"
              >
                {loadingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Eye className="w-4 h-4 mr-1" /> Visualize</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Structure Options */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {DS_OPTIONS.map(ds => (
            <button key={ds.key} onClick={() => { setSelectedDS(ds); setActiveIndex(-1); setCustomViz(null); }} data-testid={`ds-${ds.key}`}
              className={`p-3 rounded-md border text-left transition-all ${selectedDS.key === ds.key ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-[#141414] border-white/10 text-zinc-300 hover:border-white/25'}`}>
              <p className="text-sm font-semibold">{ds.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{ds.desc}</p>
            </button>
          ))}
        </div>

        {/* 3D Canvas */}
        <Card className="bg-[#141414] border-white/10 mb-4">
          <CardContent className="p-0">
            <div className="h-[450px] rounded-md overflow-hidden bg-black">
              <ThreeCanvas selectedDS={selectedDS} activeIndex={activeIndex} />
            </div>
            <div className="p-4 flex items-center justify-between border-t border-white/10">
              <div>
                <p className="text-sm font-semibold">{selectedDS.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{selectedDS.desc}</p>
              </div>
              <div className="flex gap-2">
                {customViz?.steps?.length > 0 && (
                  <Button data-testid="animate-custom-btn" onClick={animateCustom} disabled={animating}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs">
                    {animating ? 'Running...' : 'Run Algorithm'} <Bug className="w-3 h-3 ml-1" />
                  </Button>
                )}
                <Button data-testid="animate-ds-btn" onClick={animate} disabled={animating}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                  {animating ? 'Traversing...' : 'Traverse'} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Visualization Steps */}
        {customViz && (
          <Card className="bg-[#141414] border-white/10 mb-4" data-testid="custom-viz-result">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold">{customViz.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{customViz.explanation}</p>
                </div>
                {customViz.complexity && (
                  <div className="flex gap-2">
                    <span className="text-[10px] text-zinc-400 bg-[#0A0A0A] px-2 py-1 rounded border border-white/5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" /> {customViz.complexity.time}
                    </span>
                    <span className="text-[10px] text-zinc-400 bg-[#0A0A0A] px-2 py-1 rounded border border-white/5 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" /> {customViz.complexity.space}
                    </span>
                  </div>
                )}
              </div>

              {/* Step-by-step */}
              {customViz.steps?.length > 0 && (
                <div>
                  {/* Progress bar */}
                  <div className="w-full bg-[#0A0A0A] rounded-full h-1.5 mb-3 border border-white/5">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((customStep + 1) / customViz.steps.length) * 100}%` }} />
                  </div>

                  {/* Current Step */}
                  <div className="bg-[#0A0A0A] rounded-md p-3 border border-blue-500/20 mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-600/20 px-1.5 py-0.5 rounded">
                        Step {customViz.steps[customStep]?.step}
                      </span>
                      <span className="text-xs font-semibold text-white">{customViz.steps[customStep]?.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-2">{customViz.steps[customStep]?.description}</p>
                    {customViz.steps[customStep]?.state && (
                      <pre className="text-[11px] font-mono text-emerald-400 bg-black/50 p-2 rounded overflow-x-auto">{customViz.steps[customStep].state}</pre>
                    )}
                    {customViz.steps[customStep]?.highlight && (
                      <p className="text-[10px] text-amber-400 mt-1.5 flex items-start gap-1">
                        <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />{customViz.steps[customStep].highlight}
                      </p>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => setCustomStep(s => Math.max(0, s - 1))} disabled={customStep === 0}
                      className="border-white/10 text-zinc-400 h-7 text-xs px-3">
                      <ArrowLeft className="w-3 h-3 mr-1" /> Prev
                    </Button>
                    <div className="flex gap-1">
                      {customViz.steps.map((_, i) => (
                        <button key={i} onClick={() => setCustomStep(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === customStep ? 'bg-blue-500 scale-125' : i < customStep ? 'bg-blue-500/40' : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <Button variant="outline" onClick={() => setCustomStep(s => Math.min(customViz.steps.length - 1, s + 1))}
                      disabled={customStep === customViz.steps.length - 1}
                      className="border-white/10 text-zinc-400 h-7 text-xs px-3">
                      Next <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
