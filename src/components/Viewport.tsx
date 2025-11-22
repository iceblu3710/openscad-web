import React, { useEffect, useRef, useState, useContext } from 'react';
import * as THREE from 'three';
import { ComponentContainer } from 'golden-layout';
import { ModelContext } from './contexts';
// @ts-ignore
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ViewportProps {
    container?: ComponentContainer;
}

export const Viewport: React.FC<ViewportProps> = ({ container }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
    const controlsRef = useRef<any>(null); // We might want OrbitControls later, but for now just camera
    const frameIdRef = useRef<number>(0);
    const [viewType, setViewType] = useState<string>('Perspective');
    const [cameraType, setCameraType] = useState<string>('Perspective');
    const [showGrid, setShowGrid] = useState<boolean>(true);
    const [showAxes, setShowAxes] = useState<boolean>(false);
    const gridHelperRef = useRef<THREE.GridHelper | null>(null);
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null);

    const model = useContext(ModelContext);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);

    // Listen for state changes from GoldenLayout
    useEffect(() => {
        if (!container) return;

        const updateState = () => {
            const state = container.getState() as any;
            console.log("Viewport state changed:", state);
            if (state) {
                // Only handle persistent state here (cameraType)
                if (state.cameraType) {
                    setCameraType(state.cameraType);
                }
            }
        };

        // Initial state
        updateState();

        container.on('stateChanged', updateState);

        // Listen for actions
        (container as any).on('action', (action: string) => {
            if (action === 'fitToView') {
                fitToView();
            } else if (action === 'toggleGrid') {
                setShowGrid(prev => !prev);
            } else if (action === 'toggleAxes') {
                setShowAxes(prev => !prev);
            } else if (action.startsWith('setView:')) {
                const type = action.split(':')[1];
                setViewType(type);
                updateCamera(type);
            }
        });

        return () => {
            container.unbind('stateChanged', updateState);
            (container as any).unbind('action');
        };
    }, [container]);

    // Subscribe to model output changes
    useEffect(() => {
        if (!model) return;

        // We need to poll or subscribe to the model state. 
        // Since model.state is not reactive in the React sense (it's a class property), 
        // we rely on the fact that Model calls setState which triggers re-renders in App, 
        // but Viewport is a child of LayoutManager which might not re-render if props don't change.
        // However, ModelContext provides the model instance.
        // We need a way to know when the output changes.
        // The App component passes the model instance down.
        // Let's use a simple polling or check if we can hook into state updates.
        // Actually, the Model class calls a setStateCallback. 
        // But we are deep in the tree.
        // Let's check if we can use a hook or if we need to force update.

        // Wait, App.tsx passes `model` to `LayoutManager`.
        // `LayoutManager` passes `model` to `ModelContext.Provider`.
        // But `model` object itself doesn't change, its internal state does.
        // We need to subscribe to the state changes.
        // The `Model` class takes a `setStateCallback`.
        // In `App.tsx`: `const model = useMemo(() => new Model(fs, initialState, setState, statePersister), ...)`
        // `setState` updates the `state` in `App`.
        // But `App` doesn't pass `state` to `LayoutManager`, only `model`.
        // And `LayoutManager` doesn't pass `state` to `Viewport`.
        // So `Viewport` won't re-render when `App` state changes unless we use a context that provides the state.
        // Currently `ModelContext` only provides the `model` instance.

        // Let's look at `contexts.ts`. It exports `ModelContext`.
        // We might need to add a `StateContext` or expose state via `Model`.
        // Or better, we can use the `model.state` directly if we can trigger a re-render.
        // But `model.state` is just a value.

        // HACK: For now, let's poll or use an event listener if possible. 
        // But wait, `App` re-renders on state change.
        // `LayoutManager` receives `model`. `model` is stable.
        // So `LayoutManager` doesn't re-render.
        // This is a problem. The Viewport won't know about new output.

        // Let's check `ScadEditor`. It uses `model.state`.
        // `ScadEditor` is also inside `LayoutManager`.
        // How does `ScadEditor` update?
        // `const state = model.state;`
        // It seems it might NOT be updating reactively!
        // Let's check `App.tsx` again.
        // `App` has `const [state, setState] = useState(initialState);`
        // `model` calls `setState`.
        // `App` re-renders.
        // `LayoutManager` is a child of `App`.
        // `<LayoutManager model={model} fs={fs} />`
        // `model` is memoized: `useMemo(..., [fs, initialState, statePersister])`.
        // `initialState` is a prop to `App`.
        // `state` (the state variable) is NOT passed to `LayoutManager`.
        // So `LayoutManager` does NOT re-render when `state` changes.

        // This seems to be a bug in the current architecture or I am missing something.
        // However, I can fix this locally in Viewport by checking `model.state.output` periodically or adding a listener.
        // Or better, I can assume the user wants me to fix the plumbing if needed.
        // But for now, let's try to implement a simple poller or just use the fact that maybe `model` emits events?
        // No, `Model` class doesn't extend EventEmitter.

        // Let's add a listener to the model if possible, or just poll.
        // Polling is dirty but safe for now.
        const interval = setInterval(() => {
            if (model && model.state.output?.displayFileURL !== outputUrl) {
                setOutputUrl(model.state.output?.displayFileURL || null);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [model, outputUrl]);

    const updateCamera = (type: string) => {
        console.log("updateCamera called with:", type);
        if (!cameraRef.current) return;

        const camera = cameraRef.current;

        // Determine new position
        let newPos = new THREE.Vector3(50, 50, 50);
        switch (type) {
            case 'Front':
                newPos.set(0, 0, 50);
                break;
            case 'Back':
                newPos.set(0, 0, -50);
                break;
            case 'Left':
                newPos.set(-50, 0, 0);
                break;
            case 'Right':
                newPos.set(50, 0, 0);
                break;
            case 'Top':
                newPos.set(0, 50, 0);
                break;
            case 'Bottom':
                newPos.set(0, -50, 0);
                break;
            case 'Perspective':
            case 'Free':
            default:
                newPos.set(50, 50, 50);
                break;
        }

        camera.position.copy(newPos);

        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        } else {
            camera.lookAt(0, 0, 0);
        }
    };

    useEffect(() => {
        if (!containerRef.current) return;

        console.log("Viewport mounting...");

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x002b36); // Solarized Base03
        sceneRef.current = scene;

        // Camera
        const width = containerRef.current.clientWidth || 1;
        const height = containerRef.current.clientHeight || 1;

        let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

        if (cameraType === 'Orthographic') {
            const aspect = width / height;
            const frustumSize = 100;
            camera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                frustumSize / -2,
                0.1,
                1000
            );
        } else {
            camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        }

        cameraRef.current = camera;
        updateCamera(viewType); // Set initial camera position

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 10);
        scene.add(gridHelper);
        gridHelperRef.current = gridHelper;
        gridHelper.visible = showGrid;

        // Axes Helper
        const axesHelper = new THREE.AxesHelper(50);
        scene.add(axesHelper);
        axesHelperRef.current = axesHelper;
        axesHelper.visible = showAxes;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;
        controlsRef.current = controls;

        // Animation Loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);

            if (controlsRef.current) {
                controlsRef.current.update();
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

            const camera = cameraRef.current;
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
            } else if (camera instanceof THREE.OrthographicCamera) {
                const frustumSize = 100; // Should match init
                const aspect = newWidth / newHeight;
                camera.left = -frustumSize * aspect / 2;
                camera.right = frustumSize * aspect / 2;
                camera.top = frustumSize / 2;
                camera.bottom = -frustumSize / 2;
                camera.updateProjectionMatrix();
            }

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
            if (controlsRef.current) {
                controlsRef.current.dispose();
            }
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, []);

    // Update camera if viewType changes from state - NO, we handle this via action now
    // useEffect(() => {
    //     updateCamera(viewType);
    // }, [viewType]);

    // Update grid/axes visibility
    useEffect(() => {
        if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
        if (axesHelperRef.current) axesHelperRef.current.visible = showAxes;
    }, [showGrid, showAxes]);

    // Re-create camera when type changes
    useEffect(() => {
        if (!containerRef.current || !rendererRef.current || !sceneRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Save old position/rotation?
        const oldPos = cameraRef.current?.position.clone() || new THREE.Vector3(50, 50, 50);
        const oldRot = cameraRef.current?.rotation.clone() || new THREE.Euler();

        let newCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

        if (cameraType === 'Orthographic') {
            const aspect = width / height;
            const frustumSize = 100;
            newCamera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                frustumSize / -2,
                0.1,
                1000
            );
        } else {
            newCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        }

        newCamera.position.copy(oldPos);
        newCamera.rotation.copy(oldRot);

        cameraRef.current = newCamera;

        // Update controls
        if (controlsRef.current) {
            controlsRef.current.object = newCamera;
            controlsRef.current.update();
        }
    }, [cameraType]);

    const fitToView = () => {
        if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

        const mesh = sceneRef.current.getObjectByName("OpenSCAD_Mesh");
        if (!mesh) return;

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Move camera to fit
        const fov = 75; // Perspective
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * Math.PI / 360));
        cameraZ *= 2.5; // Zoom out more (was 1.5)

        // For Orthographic, we need to adjust zoom
        if (cameraRef.current instanceof THREE.OrthographicCamera) {
            cameraRef.current.zoom = 100 / maxDim; // Rough approximation
            cameraRef.current.updateProjectionMatrix();
        } else {
            const direction = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
            const newPos = center.clone().add(direction.multiplyScalar(cameraZ));
            cameraRef.current.position.copy(newPos);
        }

        controlsRef.current.target.copy(center);
        controlsRef.current.update();
    };

    // Load Geometry
    useEffect(() => {
        if (!outputUrl || !sceneRef.current) return;

        const loader = new GLTFLoader();
        loader.load(outputUrl, (gltf: any) => {
            if (!sceneRef.current) return;

            // Remove old mesh
            const oldMesh = sceneRef.current.getObjectByName("OpenSCAD_Mesh");
            if (oldMesh) sceneRef.current.remove(oldMesh);

            const mesh = gltf.scene;
            mesh.name = "OpenSCAD_Mesh";

            // Center geometry?
            // const box = new THREE.Box3().setFromObject(mesh);
            // const center = box.getCenter(new THREE.Vector3());
            // mesh.position.sub(center);

            sceneRef.current.add(mesh);
            console.log("Loaded mesh from", outputUrl);
        }, undefined, (error: unknown) => {
            console.error("An error happened loading the GLB:", error);
        });

    }, [outputUrl]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', pointerEvents: 'none' }}>
                {viewType} View
            </div>
        </div>
    );
};
