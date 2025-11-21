import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const Viewport: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const cubeRef = useRef<THREE.Mesh | null>(null);
    const frameIdRef = useRef<number>(0);

    useEffect(() => {
        if (!containerRef.current) return;

        console.log("Viewport mounting...");

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        sceneRef.current = scene;

        // Camera
        const width = containerRef.current.clientWidth || 1;
        const height = containerRef.current.clientHeight || 1;
        console.log(`Initial dimensions: ${width}x${height}`);

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        cubeRef.current = cube;

        // Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);

            if (cubeRef.current) {
                cubeRef.current.rotation.x += 0.01;
                cubeRef.current.rotation.y += 0.01;
            }

            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        // Resize Handler
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;

            if (newWidth === 0 || newHeight === 0) return;

            // console.log(`Resizing to: ${newWidth}x${newHeight}`);

            cameraRef.current.aspect = newWidth / newHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(newWidth, newHeight);
        };

        // Use ResizeObserver for robust resizing
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        resizeObserver.observe(containerRef.current);

        // Cleanup
        return () => {
            console.log("Viewport unmounting...");
            cancelAnimationFrame(frameIdRef.current);
            resizeObserver.disconnect();
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    );
};
