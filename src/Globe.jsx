import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const Globe = () => {
    const mountRef = useRef(null);
    const [selectedCountry, setSelectedCountry] = useState(null);
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
        // Rotate the sphere to align with standard map coordinates
        sphere.rotation.y = Math.PI; // Rotate 180 degrees around Y axis
        sphereRef.current = sphere;
        scene.add(sphere);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 3, 5);
        scene.add(pointLight);

        // Load texture from SVG
        const loadTexture = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Set canvas size to power of 2 for better texture mapping
                canvas.width = 2048;  // 2^11
                canvas.height = 1024; // 2^10

                // Fill background
                ctx.fillStyle = '#4477AA';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the image maintaining aspect ratio
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width - img.width * scale) / 2;
                const y = (canvas.height - img.height * scale) / 2;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                const texture = new THREE.CanvasTexture(canvas);
                // Set texture wrapping
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.repeat.x = 1;

                // Set texture filtering
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                material.map = texture;
                material.needsUpdate = true;
            };
            img.src = '/world-map.png';
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

        // Draw an orange circle at the clicked position
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
        </div>
    );
};

export default Globe;