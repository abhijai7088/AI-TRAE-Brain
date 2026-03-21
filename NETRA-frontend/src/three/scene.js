import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function initScene(canvas) {
    const loading = document.querySelector('#loader');
    const scene = new THREE.Scene();

    const sizes = {
        width: window.innerWidth / 2, 
        height: window.innerHeight
    };

    // Base camera
    const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 2, 12);
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 25;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Model
    let model = null;
    const loader = new GLTFLoader();
    
    loader.load(
        '/models/retro_camera.glb',
        (gltf) => {
            model = gltf.scene;
            
            // Center model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x + 1.2; // Shift more right for small model
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            model.scale.set(0.4, 0.4, 0.4);
            scene.add(model);

            if (loading) {
                loading.style.display = 'none';
            }
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }
    );

    // Resize handler
    const handleResize = () => {
        sizes.width = window.innerWidth / 2;
        sizes.height = window.innerHeight;
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationId = null;
    let isRunning = true;

    const tick = () => {
        if (!isRunning) return;

        controls.update();
        renderer.render(scene, camera);
        animationId = window.requestAnimationFrame(tick);
    };

    tick();

    return {
        scene,
        camera,
        renderer,
        controls,
        model: () => model,
        stop: () => {
            isRunning = false;
            if (animationId) window.cancelAnimationFrame(animationId);
        },
        start: () => {
            if (!isRunning) {
                isRunning = true;
                tick();
            }
        },
        dispose: () => {
            isRunning = false;
            if (animationId) window.cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    };
}
