import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function ThreeBackground({ variant = 'particles', opacity = 0.6 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    let group;
    let animateFn;

    if (variant === 'particles') {
      group = createParticleField(scene);
      animateFn = (t) => animateParticles(group, t);
    } else if (variant === 'grid') {
      group = createFloatingGrid(scene);
      animateFn = (t) => animateGrid(group, t);
    } else if (variant === 'nodes') {
      group = createNodeNetwork(scene);
      animateFn = (t) => animateNodes(group, t);
    }

    const clock = new THREE.Clock();
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (animateFn) animateFn(t);
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
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity, zIndex: 0 }}
      data-testid="three-background"
    />
  );
}

function createParticleField(scene) {
  const group = new THREE.Group();
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const palette = [
    new THREE.Color('#3B82F6'),
    new THREE.Color('#06B6D4'),
    new THREE.Color('#8B5CF6'),
    new THREE.Color('#22C55E'),
    new THREE.Color('#F59E0B'),
  ];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 35;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  group.add(points);

  // Connection lines between nearby particles
  const lineGeo = new THREE.BufferGeometry();
  const linePositions = [];
  const lineColors = [];
  for (let i = 0; i < particleCount; i++) {
    for (let j = i + 1; j < particleCount; j++) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 6) {
        linePositions.push(
          positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
          positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
        );
        const a = 1 - dist / 5;
        lineColors.push(0.2, 0.5, 1.0, a, 0.2, 0.5, 1.0, a);
      }
    }
  }
  if (linePositions.length > 0) {
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3B82F6,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);
  }

  group.userData.positions = positions;
  group.userData.particleCount = particleCount;
  scene.add(group);
  return group;
}

function animateParticles(group, t) {
  group.rotation.y = t * 0.02;
  group.rotation.x = Math.sin(t * 0.01) * 0.1;
  const points = group.children[0];
  if (points) {
    const pos = points.geometry.attributes.position.array;
    for (let i = 0; i < group.userData.particleCount; i++) {
      pos[i * 3 + 1] += Math.sin(t * 0.5 + i * 0.3) * 0.002;
      pos[i * 3] += Math.cos(t * 0.3 + i * 0.5) * 0.001;
    }
    points.geometry.attributes.position.needsUpdate = true;
  }
}

function createFloatingGrid(scene) {
  const group = new THREE.Group();
  const gridSize = 20;
  const spacing = 2;

  for (let x = -gridSize / 2; x <= gridSize / 2; x += spacing) {
    for (let y = -gridSize / 2; y <= gridSize / 2; y += spacing) {
      const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const brightness = Math.random() * 0.5;
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(brightness * 0.3, brightness * 0.5, brightness),
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
      });
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(x, y, -5 + Math.random() * 3);
      cube.userData.baseY = cube.position.y;
      cube.userData.phase = Math.random() * Math.PI * 2;
      cube.userData.speed = 0.3 + Math.random() * 0.5;
      group.add(cube);
    }
  }

  scene.add(group);
  return group;
}

function animateGrid(group, t) {
  group.children.forEach((cube) => {
    cube.position.y = cube.userData.baseY + Math.sin(t * cube.userData.speed + cube.userData.phase) * 0.3;
    cube.rotation.x = t * 0.2;
    cube.rotation.z = t * 0.15;
  });
  group.rotation.z = Math.sin(t * 0.05) * 0.05;
}

function createNodeNetwork(scene) {
  const group = new THREE.Group();
  const nodeCount = 40;
  const nodes = [];
  const palette = [0x3B82F6, 0x06B6D4, 0x8B5CF6, 0xF59E0B, 0x22C55E];

  for (let i = 0; i < nodeCount; i++) {
    const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: palette[Math.floor(Math.random() * palette.length)],
      transparent: true,
      opacity: 0.5 + Math.random() * 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 10
    );
    mesh.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.005
    );
    group.add(mesh);
    nodes.push(mesh);
  }

  // Dynamic edges will be recalculated in animate
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x3B82F6,
    transparent: true,
    opacity: 0.06,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lineGeo = new THREE.BufferGeometry();
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.userData.isLines = true;
  group.add(lines);

  group.userData.nodes = nodes;
  scene.add(group);
  return group;
}

function animateNodes(group, t) {
  const nodes = group.userData.nodes;
  nodes.forEach((node) => {
    node.position.add(node.userData.velocity);
    // Bounce at boundaries
    if (Math.abs(node.position.x) > 16) node.userData.velocity.x *= -1;
    if (Math.abs(node.position.y) > 10) node.userData.velocity.y *= -1;
    if (Math.abs(node.position.z) > 6) node.userData.velocity.z *= -1;
  });

  // Update connection lines every few frames
  const lines = group.children.find(c => c.userData?.isLines);
  if (lines && Math.floor(t * 10) % 3 === 0) {
    const linePositions = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < 6) {
          linePositions.push(
            nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
            nodes[j].position.x, nodes[j].position.y, nodes[j].position.z
          );
        }
      }
    }
    if (linePositions.length > 0) {
      lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lines.geometry.attributes.position.needsUpdate = true;
    }
  }

  group.rotation.y = t * 0.01;
}
