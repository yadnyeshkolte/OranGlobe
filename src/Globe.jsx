import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Globe = () => {
    const mountRef = useRef(null);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const controlsRef = useRef(null);
    const sphereRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 2;
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.5;
        controls.minDistance = 1.5;
        controls.maxDistance = 4;
        controlsRef.current = controls;

        // Create sphere geometry
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: null,
            bumpScale: 0.005,
            specular: new THREE.Color('grey'),
            shininess: 5
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.rotation.y = Math.PI;
        sphereRef.current = sphere;
        scene.add(sphere);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 3, 5);
        scene.add(pointLight);

        // Load texture with better error handling
        const loadTexture = () => {
            const img = new Image();

            img.onload = () => {
                console.log('Image loaded successfully');
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 2048;
                canvas.height = 1024;

                ctx.fillStyle = '#4477AA';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width - img.width * scale) / 2;
                const y = (canvas.height - img.height * scale) / 2;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.x = 1;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                material.map = texture;
                material.needsUpdate = true;
                setLoadError(null);
            };

            img.onerror = (error) => {
                console.error('Error loading image:', error);
                setLoadError('Failed to load map texture');
            };

            // Try multiple paths - adjust these based on your actual file structure
            const imagePaths = [

                './world-map.png'


            ];

            // Function to try loading the next path
            const tryNextPath = (pathIndex) => {
                if (pathIndex >= imagePaths.length) {
                    setLoadError('Could not load map texture from any path');
                    return;
                }

                img.src = imagePaths[pathIndex];
                console.log('Trying to load image from:', imagePaths[pathIndex]);

                // If this path fails, try the next one after a short delay
                setTimeout(() => {
                    if (!img.complete || img.naturalWidth === 0) {
                        tryNextPath(pathIndex + 1);
                    }
                }, 1000);
            };

            // Start trying paths
            tryNextPath(0);
        };

        loadTexture();

        // Handle click events
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handleClick = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(sphere);

            if (intersects.length > 0) {
                const intersect = intersects[0];
                const point = intersect.point.clone();
                point.normalize();

                const lat = Math.asin(point.y) * (180 / Math.PI);
                const lon = Math.atan2(point.x, point.z) * (180 / Math.PI);

                console.log(`Clicked at lat: ${lat.toFixed(2)}, lon: ${lon.toFixed(2)}`);
                updateCountryColor(intersect.uv.x, intersect.uv.y);
            }
        };

        renderer.domElement.addEventListener('click', handleClick);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle window resize
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('click', handleClick);
            mountRef.current?.removeChild(renderer.domElement);
            geometry.dispose();
            material.dispose();
            if (material.map) material.map.dispose();
        };
    }, []);

    const updateCountryColor = (u, v) => {
        if (!sphereRef.current?.material.map) return;

        const texture = sphereRef.current.material.map;
        const canvas = texture.image;
        const ctx = canvas.getContext('2d');

        const x = u * canvas.width;
        const y = v * canvas.height;
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();

        texture.needsUpdate = true;
    };

    return (
        <div className="w-full h-full" ref={mountRef}>
            {selectedCountry && (
                <div className="absolute top-4 left-4 bg-white p-2 rounded shadow">
                    Selected: {selectedCountry}
                </div>
            )}
            {loadError && (
                <div className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded shadow">
                    {loadError}
                </div>
            )}
        </div>
    );
};

export default Globe;