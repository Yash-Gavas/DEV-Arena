import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, ChevronRight, Send, Loader2, Bug, Lightbulb, Clock, Zap, ArrowLeft, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import axios from 'axios';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ThreeCanvas({ selectedDS, activeIndices, highlightEdges }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);
  const groupRef = useRef(null);

  const createTextSprite = useCallback((text, color = '#ffffff', fontSize = 48) => {
    const canvas = document.createElement('canvas');
    const len = String(text).length;
    canvas.width = Math.max(128, len * 32);
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(String(text), canvas.width / 2, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(canvas.width / 64, 0.5, 1);
    return sprite;
  }, []);

  const createNode = useCallback((pos, label, color = '#007AFF', isActive = false) => {
    const group = new THREE.Group();
    group.position.set(...pos);
    const geo = new THREE.SphereGeometry(0.38, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: isActive ? color : '#111',
      emissiveIntensity: isActive ? 0.6 : 0.1, metalness: 0.3, roughness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    if (isActive) mesh.userData.pulse = true;
    group.add(mesh);
    const sprite = createTextSprite(label, '#ffffff', 40);
    sprite.position.set(0, 0, 0.5);
    group.add(sprite);
    return group;
  }, [createTextSprite]);

  const createArrow = useCallback((start, end, color = '#007AFF', isHighlighted = false) => {
    const group = new THREE.Group();
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(e, s);
    const len = dir.length();
    if (len < 0.01) return group;

    const arrowHeadLen = Math.min(0.25, len * 0.2);
    const shaftLen = len - arrowHeadLen;
    const unitDir = dir.clone().normalize();
    const opacity = isHighlighted ? 0.9 : 0.5;

    // Shaft (cylinder)
    const shaftGeo = new THREE.CylinderGeometry(0.035, 0.035, shaftLen, 8);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: isHighlighted ? '#EAB308' : color, opacity, transparent: true
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    const shaftCenter = s.clone().add(unitDir.clone().multiplyScalar(shaftLen / 2));
    shaft.position.copy(shaftCenter);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDir);
    shaft.quaternion.copy(q);
    group.add(shaft);

    // Arrowhead (cone)
    const coneGeo = new THREE.ConeGeometry(0.12, arrowHeadLen, 12);
    const coneMat = new THREE.MeshStandardMaterial({
      color: isHighlighted ? '#EAB308' : color, opacity, transparent: true
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    const conePos = s.clone().add(unitDir.clone().multiplyScalar(shaftLen + arrowHeadLen / 2));
    cone.position.copy(conePos);
    cone.quaternion.copy(q);
    group.add(cone);

    return group;
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
    const activeSet = new Set(activeIndices || []);
    const hlEdges = new Set((highlightEdges || []).map(e => `${e[0]}-${e[1]}`));

    if (ds.key === 'array') {
      const data = ds.data || [];
      const spacing = 1.3;
      const offset = (data.length - 1) * spacing / 2;
      data.forEach((val, i) => {
        const x = i * spacing - offset;
        const isActive = activeSet.has(i);
        const geo = new THREE.BoxGeometry(1, 1, 0.5);
        const mat = new THREE.MeshStandardMaterial({
          color: isActive ? '#EAB308' : '#FF3B30',
          emissive: isActive ? '#EAB308' : '#111',
          emissiveIntensity: isActive ? 0.4 : 0, metalness: 0.2, roughness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0, 0);
        if (isActive) mesh.userData.pulse = true;
        groupRef.current.add(mesh);
        const valS = createTextSprite(String(val), '#fff', 44);
        valS.position.set(x, 0, 0.35);
        groupRef.current.add(valS);
        const idxS = createTextSprite(`[${i}]`, '#666666', 28);
        idxS.position.set(x, -0.85, 0);
        groupRef.current.add(idxS);
        // Direction arrow to next element
        if (i < data.length - 1) {
          const hl = hlEdges.has(`${i}-${i + 1}`);
          groupRef.current.add(createArrow([x + 0.55, 0.6, 0], [x + spacing - 0.55, 0.6, 0], '#FF6B6B', hl));
        }
      });
      // Index direction label
      if (data.length > 1) {
        const lbl = createTextSprite('index direction', '#555', 24);
        lbl.position.set(0, 1.2, 0);
        groupRef.current.add(lbl);
      }
    } else if (ds.key === 'linkedlist') {
      const data = ds.data || [];
      const spacing = 2.2;
      const offset = (data.length - 1) * spacing / 2;
      data.forEach((val, i) => {
        const x = i * spacing - offset;
        const isActive = activeSet.has(i);
        groupRef.current.add(createNode([x, 0, 0], String(val), '#22C55E', isActive));
        // Arrow to next node
        if (i < data.length - 1) {
          const hl = hlEdges.has(`${i}-${i + 1}`);
          groupRef.current.add(createArrow([x + 0.45, 0, 0], [x + spacing - 0.45, 0, 0], '#22C55E', hl));
        }
      });
      // HEAD label
      if (data.length > 0) {
        const headLbl = createTextSprite('HEAD', '#22C55E', 28);
        headLbl.position.set(-offset, 0.9, 0);
        groupRef.current.add(headLbl);
      }
      // NULL at end
      if (data.length > 0) {
        const nullLbl = createTextSprite('NULL', '#EF4444', 28);
        nullLbl.position.set((data.length - 1) * spacing - offset + 1.4, 0, 0);
        groupRef.current.add(nullLbl);
      }
      // "next" labels on arrows
      data.forEach((_, i) => {
        if (i < data.length - 1) {
          const x = i * spacing - offset;
          const nxt = createTextSprite('next', '#888', 20);
          nxt.position.set(x + spacing / 2, 0.45, 0);
          groupRef.current.add(nxt);
        }
      });
    } else if (ds.key === 'binarytree') {
      const data = ds.data || [];
      const positions = [];
      const build = (idx, x, y, spread) => {
        if (idx >= data.length || data[idx] === null || data[idx] === 'null') return;
        const isActive = activeSet.has(idx);
        groupRef.current.add(createNode([x, y, 0], String(data[idx]), '#007AFF', isActive));
        positions[idx] = [x, y, 0];
        const leftIdx = 2 * idx + 1;
        const rightIdx = 2 * idx + 2;
        if (leftIdx < data.length && data[leftIdx] !== null && data[leftIdx] !== 'null') {
          const childX = x - spread;
          const childY = y - 1.8;
          const hl = hlEdges.has(`${idx}-${leftIdx}`);
          groupRef.current.add(createArrow([x - 0.3, y - 0.4, 0], [childX + 0.3, childY + 0.4, 0], '#007AFF', hl));
          // "L" label
          const mid = createTextSprite('L', '#4488FF', 20);
          mid.position.set((x + childX) / 2 - 0.3, (y + childY) / 2 + 0.3, 0);
          groupRef.current.add(mid);
          build(leftIdx, childX, childY, spread * 0.55);
        }
        if (rightIdx < data.length && data[rightIdx] !== null && data[rightIdx] !== 'null') {
          const childX = x + spread;
          const childY = y - 1.8;
          const hl = hlEdges.has(`${idx}-${rightIdx}`);
          groupRef.current.add(createArrow([x + 0.3, y - 0.4, 0], [childX - 0.3, childY + 0.4, 0], '#007AFF', hl));
          const mid = createTextSprite('R', '#4488FF', 20);
          mid.position.set((x + childX) / 2 + 0.3, (y + childY) / 2 + 0.3, 0);
          groupRef.current.add(mid);
          build(rightIdx, childX, childY, spread * 0.55);
        }
      };
      const depth = Math.ceil(Math.log2(data.length + 1));
      const baseSpread = Math.max(2, depth * 1.2);
      build(0, 0, depth * 0.9, baseSpread);
      // ROOT label
      if (data.length > 0 && data[0] !== null) {
        const root = createTextSprite('ROOT', '#007AFF', 24);
        root.position.set(0, depth * 0.9 + 0.8, 0);
        groupRef.current.add(root);
      }
    } else if (ds.key === 'stack') {
      const data = ds.data || [];
      data.forEach((val, i) => {
        const y = i * 1.1 - (data.length * 0.55);
        const isActive = activeSet.has(i);
        const isTop = i === data.length - 1;
        const geo = new THREE.BoxGeometry(1.8, 0.85, 0.5);
        const mat = new THREE.MeshStandardMaterial({
          color: isTop ? '#A855F7' : '#6B21A8',
          emissive: isActive ? '#A855F7' : '#111',
          emissiveIntensity: isActive ? 0.4 : 0, metalness: 0.2, roughness: 0.5
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, y, 0);
        if (isActive) mesh.userData.pulse = true;
        groupRef.current.add(mesh);
        const s = createTextSprite(String(val));
        s.position.set(0, y, 0.35);
        groupRef.current.add(s);
      });
      // TOP pointer arrow
      if (data.length > 0) {
        const topY = (data.length - 1) * 1.1 - (data.length * 0.55);
        groupRef.current.add(createArrow([1.5, topY, 0], [1.05, topY, 0], '#A855F7', true));
        const topLbl = createTextSprite('TOP', '#A855F7', 32);
        topLbl.position.set(2.0, topY, 0);
        groupRef.current.add(topLbl);
      }
      // Push/Pop arrows
      const topY2 = data.length * 1.1 - (data.length * 0.55) + 0.3;
      groupRef.current.add(createArrow([-0.8, topY2 + 0.8, 0], [-0.8, topY2, 0], '#22C55E', false));
      const pushLbl = createTextSprite('PUSH', '#22C55E', 22);
      pushLbl.position.set(-0.8, topY2 + 1.2, 0);
      groupRef.current.add(pushLbl);
      groupRef.current.add(createArrow([0.8, topY2, 0], [0.8, topY2 + 0.8, 0], '#EF4444', false));
      const popLbl = createTextSprite('POP', '#EF4444', 22);
      popLbl.position.set(0.8, topY2 + 1.2, 0);
      groupRef.current.add(popLbl);
    } else if (ds.key === 'graph') {
      const { nodes = [], edges = [] } = ds.graphData || {};
      const count = nodes.length || 6;
      const radius = Math.max(2, count * 0.6);
      const positions = nodes.map((_, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
      });
      // Draw edges with arrows
      edges.forEach(([a, b]) => {
        if (a < positions.length && b < positions.length) {
          const hl = hlEdges.has(`${a}-${b}`);
          const startP = positions[a];
          const endP = positions[b];
          const dir = [endP[0] - startP[0], endP[1] - startP[1], 0];
          const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2);
          const unit = [dir[0] / len, dir[1] / len, 0];
          const arrowStart = [startP[0] + unit[0] * 0.45, startP[1] + unit[1] * 0.45, 0];
          const arrowEnd = [endP[0] - unit[0] * 0.45, endP[1] - unit[1] * 0.45, 0];
          groupRef.current.add(createArrow(arrowStart, arrowEnd, '#06B6D4', hl));
        }
      });
      // Draw nodes on top of edges
      nodes.forEach((label, i) => {
        const isActive = activeSet.has(i);
        groupRef.current.add(createNode(positions[i], String(label), '#06B6D4', isActive));
      });
    }
  }, [selectedDS, activeIndices, highlightEdges, createNode, createArrow, createTextSprite]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0A0A0A');

    // Grid helper for subtle background
    const gridHelper = new THREE.GridHelper(30, 30, 0x111111, 0x111111);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -1;
    scene.add(gridHelper);

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 12);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pt1 = new THREE.PointLight(0xffffff, 0.8);
    pt1.position.set(10, 10, 10);
    scene.add(pt1);
    const pt2 = new THREE.PointLight(0x007AFF, 0.4);
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
          child.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
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
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { buildScene(); }, [buildScene]);

  return <div ref={containerRef} className="w-full h-full" data-testid="three-canvas" />;
}

// Parse helpers
function parseArray(input) {
  return input.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const n = Number(s);
    return isNaN(n) ? s : n;
  });
}

function parseLinkedList(input) {
  const clean = input.replace(/->|→/g, ',');
  return clean.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const n = Number(s);
    return isNaN(n) ? s : n;
  });
}

function parseBinaryTree(input) {
  return input.split(',').map(s => {
    const t = s.trim();
    if (!t || t.toLowerCase() === 'null' || t === '_') return null;
    const n = Number(t);
    return isNaN(n) ? t : n;
  });
}

function parseGraph(input) {
  // Format: "A-B,B-C,C-D" or "0-1,1-2,2-3"
  const edges = [];
  const nodeSet = new Set();
  input.split(',').forEach(pair => {
    const parts = pair.trim().split(/[->/]+/);
    if (parts.length === 2) {
      const a = parts[0].trim();
      const b = parts[1].trim();
      if (a && b) {
        nodeSet.add(a);
        nodeSet.add(b);
        edges.push([a, b]);
      }
    }
  });
  const nodes = Array.from(nodeSet);
  const nodeIndex = {};
  nodes.forEach((n, i) => { nodeIndex[n] = i; });
  return {
    nodes,
    edges: edges.map(([a, b]) => [nodeIndex[a], nodeIndex[b]])
  };
}

const DS_CONFIGS = [
  { key: 'array', label: 'Array', color: '#FF3B30', placeholder: '5, 3, 8, 1, 9, 2, 7, 4', hint: 'Comma-separated values', desc: 'Linear structure. O(1) access by index.' },
  { key: 'linkedlist', label: 'Linked List', color: '#22C55E', placeholder: '1 -> 2 -> 3 -> 4 -> 5 -> 6', hint: 'Use -> or commas between values', desc: 'Nodes with next pointers. O(1) insert at head.' },
  { key: 'binarytree', label: 'Binary Tree', color: '#007AFF', placeholder: '10, 5, 15, 3, 7, null, 20, 1, 4', hint: 'Level-order (BFS). Use null for empty nodes.', desc: 'BST: left < parent < right. O(log n) operations.' },
  { key: 'stack', label: 'Stack', color: '#A855F7', placeholder: '10, 20, 30, 40, 50', hint: 'Bottom to top. Last element = TOP.', desc: 'LIFO. O(1) push/pop. Used in DFS, undo.' },
  { key: 'graph', label: 'Graph', color: '#06B6D4', placeholder: 'A-B, B-C, C-D, D-E, E-A, A-C', hint: 'Edge pairs: Node1-Node2, separated by commas', desc: 'Nodes + directed edges. BFS/DFS traversal.' },
];

export default function DSAVisualizer() {
  const [dsKey, setDsKey] = useState('array');
  const [userInput, setUserInput] = useState('');
  const [selectedDS, setSelectedDS] = useState({ key: 'array', data: [5, 3, 8, 1, 9, 2, 7, 4] });
  const [activeIndices, setActiveIndices] = useState([]);
  const [highlightEdges, setHighlightEdges] = useState([]);
  const [animating, setAnimating] = useState(false);

  // Custom question visualizer
  const [questionInput, setQuestionInput] = useState('');
  const [customViz, setCustomViz] = useState(null);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customStep, setCustomStep] = useState(0);

  const config = DS_CONFIGS.find(d => d.key === dsKey);

  const applyInput = useCallback(() => {
    const raw = userInput.trim() || config.placeholder;
    if (dsKey === 'array' || dsKey === 'stack') {
      setSelectedDS({ key: dsKey, data: parseArray(raw) });
    } else if (dsKey === 'linkedlist') {
      setSelectedDS({ key: dsKey, data: parseLinkedList(raw) });
    } else if (dsKey === 'binarytree') {
      setSelectedDS({ key: dsKey, data: parseBinaryTree(raw) });
    } else if (dsKey === 'graph') {
      const parsed = parseGraph(raw);
      setSelectedDS({ key: dsKey, data: parsed.nodes, graphData: parsed });
    }
    setActiveIndices([]);
    setHighlightEdges([]);
    setCustomViz(null);
  }, [dsKey, userInput, config]);

  // Apply default data on DS change
  useEffect(() => {
    setUserInput('');
    const defaultInput = config.placeholder;
    if (dsKey === 'array' || dsKey === 'stack') {
      setSelectedDS({ key: dsKey, data: parseArray(defaultInput) });
    } else if (dsKey === 'linkedlist') {
      setSelectedDS({ key: dsKey, data: parseLinkedList(defaultInput) });
    } else if (dsKey === 'binarytree') {
      setSelectedDS({ key: dsKey, data: parseBinaryTree(defaultInput) });
    } else if (dsKey === 'graph') {
      const parsed = parseGraph(defaultInput);
      setSelectedDS({ key: dsKey, data: parsed.nodes, graphData: parsed });
    }
    setActiveIndices([]);
    setHighlightEdges([]);
    setCustomViz(null);
  }, [dsKey]);

  const animate = () => {
    setAnimating(true);
    const data = selectedDS.data || [];
    let i = 0;
    setHighlightEdges([]);
    const interval = setInterval(() => {
      setActiveIndices([i]);
      if (i > 0 && (dsKey === 'array' || dsKey === 'linkedlist')) {
        setHighlightEdges(prev => [...prev, [i - 1, i]]);
      }
      if (dsKey === 'binarytree' && i > 0) {
        const parent = Math.floor((i - 1) / 2);
        setHighlightEdges(prev => [...prev, [parent, i]]);
      }
      i++;
      if (i >= data.length) {
        clearInterval(interval);
        setTimeout(() => { setActiveIndices([]); setHighlightEdges([]); setAnimating(false); }, 1000);
      }
    }, 700);
  };

  const visualizeQuestion = async () => {
    if (!questionInput.trim() || loadingCustom) return;
    setLoadingCustom(true);
    setCustomViz(null);
    setCustomStep(0);
    try {
      const res = await axios.post(`${API}/visualize/question`, { message: questionInput }, { withCredentials: true });
      setCustomViz(res.data);
      if (res.data.data?.length > 0) {
        const matchedKey = res.data.data_structure || 'array';
        if (['array', 'stack'].includes(matchedKey)) {
          setDsKey(matchedKey);
          setSelectedDS({ key: matchedKey, data: res.data.data });
        } else if (matchedKey === 'linkedlist') {
          setDsKey('linkedlist');
          setSelectedDS({ key: 'linkedlist', data: res.data.data });
        } else if (matchedKey === 'binarytree') {
          setDsKey('binarytree');
          setSelectedDS({ key: 'binarytree', data: res.data.data });
        } else if (matchedKey === 'graph') {
          setDsKey('graph');
          const nodes = res.data.data.map((_, i) => String(i));
          setSelectedDS({ key: 'graph', data: nodes, graphData: { nodes, edges: [] } });
        } else {
          setSelectedDS({ key: 'array', data: res.data.data });
        }
        setUserInput(res.data.data.join(', '));
      }
    } catch {}
    setLoadingCustom(false);
  };

  const animateCustom = () => {
    if (!customViz?.steps?.length) return;
    setAnimating(true);
    let i = 0;
    setCustomStep(0);
    setHighlightEdges([]);
    const interval = setInterval(() => {
      setCustomStep(i);
      const step = customViz.steps[i];
      if (step?.active_indices?.length > 0) {
        setActiveIndices(step.active_indices);
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
          <p className="text-zinc-400 text-sm mt-1">Enter your own data, see it visualized in 3D with direction arrows</p>
        </div>

        {/* DS Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {DS_CONFIGS.map(ds => (
            <button key={ds.key} onClick={() => setDsKey(ds.key)} data-testid={`ds-${ds.key}`}
              className={`p-3 rounded-md border text-left transition-all ${dsKey === ds.key ? 'border-opacity-60 text-white' : 'bg-[#141414] border-white/10 text-zinc-300 hover:border-white/25'}`}
              style={dsKey === ds.key ? { backgroundColor: `${ds.color}15`, borderColor: `${ds.color}60` } : {}}>
              <p className="text-sm font-semibold" style={dsKey === ds.key ? { color: ds.color } : {}}>{ds.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{ds.desc}</p>
            </button>
          ))}
        </div>

        {/* Custom Data Input */}
        <Card className="bg-[#141414] border-white/10 mb-4" data-testid="data-input-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Pencil className="w-3.5 h-3.5 text-zinc-400" />
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Enter Your Data</p>
              <span className="text-[10px] text-zinc-600 ml-auto">{config.hint}</span>
            </div>
            <div className="flex gap-2">
              <input
                data-testid="data-input"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyInput()}
                placeholder={config.placeholder}
                className="flex-1 bg-black border border-white/10 text-white rounded-md px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-zinc-600"
              />
              <Button data-testid="apply-input-btn" onClick={applyInput}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 text-xs">
                <Eye className="w-3.5 h-3.5 mr-1" /> Visualize
              </Button>
              <Button data-testid="reset-input-btn" variant="outline" onClick={() => { setUserInput(''); setDsKey(dsKey); }}
                className="border-white/10 text-zinc-400 px-3 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Question Visualizer */}
        <Card className="bg-[#141414] border-white/10 mb-4">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wider">Or paste a DSA question for AI visualization</p>
            <div className="flex gap-2">
              <Textarea
                data-testid="custom-question-input"
                value={questionInput}
                onChange={e => setQuestionInput(e.target.value)}
                placeholder="e.g. Given an array [2,7,11,15] and target 9, find two numbers that add up to target..."
                className="bg-black border-white/10 text-white text-xs min-h-[44px] max-h-[80px] resize-none flex-1"
                rows={2}
              />
              <Button data-testid="visualize-question-btn" onClick={visualizeQuestion}
                disabled={!questionInput.trim() || loadingCustom}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 self-end">
                {loadingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> AI Visualize</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3D Canvas */}
        <Card className="bg-[#141414] border-white/10 mb-4">
          <CardContent className="p-0">
            <div className="h-[450px] rounded-md overflow-hidden bg-black">
              <ThreeCanvas selectedDS={selectedDS} activeIndices={activeIndices} highlightEdges={highlightEdges} />
            </div>
            <div className="p-4 flex items-center justify-between border-t border-white/10">
              <div>
                <p className="text-sm font-semibold">{config.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedDS.data?.length || 0} elements | Drag to rotate, scroll to zoom
                </p>
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

              {customViz.steps?.length > 0 && (
                <div>
                  <div className="w-full bg-[#0A0A0A] rounded-full h-1.5 mb-3 border border-white/5">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((customStep + 1) / customViz.steps.length) * 100}%` }} />
                  </div>

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
