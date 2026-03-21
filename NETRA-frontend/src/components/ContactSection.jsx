import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GridPlus from './GridPlus';

gsap.registerPlugin(ScrollTrigger);

export default function ContactSection() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const navSt = ScrollTrigger.create({
            trigger: containerRef.current,
            start: 'top 60px',
            end: 'bottom 60px',
            toggleClass: { targets: 'nav', className: 'navbar-dark' },
        });

        if (!canvasRef.current) return;

        let scene, camera, renderer, shape, myArray;
        let mouseX = 0, mouseY = 0;
        let animationId;
        let isInitialized = false;

        const init = () => {
            if (isInitialized || !canvasRef.current) return;
            scene = new THREE.Scene();
            const aspect = window.innerWidth / window.innerHeight;
            const d = 500;
            camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
            camera.position.set(500, 500, 500);
            camera.lookAt(scene.position);

            renderer = new THREE.WebGLRenderer({
                canvas: canvasRef.current,
                antialias: true,
                alpha: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const light = new THREE.DirectionalLight(0xffffff, 1.8);
            light.position.set(60, 100, 20);
            scene.add(light);

            const backLight = new THREE.DirectionalLight(0xffffff, 1);
            backLight.position.set(-40, 100, 20);
            scene.add(backLight);

            myArray = new THREE.Group();
            scene.add(myArray);

            const geometry = new THREE.BoxGeometry(50, 50, 50);
            const material = new THREE.MeshLambertMaterial({ color: 0xF9F8ED });
            shape = new THREE.Mesh(geometry, material);
            myArray.add(shape);

            isInitialized = true;
            render();
        };

        const render = () => {
            if (!isInitialized) return;
            const time = Date.now() * 0.001;
            const scaleBase = 1.0;
            const breathing = Math.sin(time * 0.8) * 0.15;
            shape.scale.set(scaleBase + breathing, scaleBase + breathing, scaleBase + breathing);
            shape.rotation.y += 0.003;
            shape.rotation.z += 0.001;

            myArray.rotation.y += ((mouseX / window.innerWidth) * Math.PI * 0.5 - myArray.rotation.y) * 0.08;
            myArray.rotation.x += ((mouseY / window.innerHeight) * Math.PI * 0.5 - myArray.rotation.x) * 0.08;

            renderer.render(scene, camera);
            animationId = requestAnimationFrame(render);
        };

        const handleMouseMove = (event) => {
            mouseX = (event.clientX - window.innerWidth / 2);
            mouseY = (event.clientY - window.innerHeight / 2);
        };

        const handleResize = () => {
            if (!isInitialized || !camera || !renderer) return;
            const aspect = window.innerWidth / window.innerHeight;
            const d = 500;
            camera.left = -d * aspect;
            camera.right = d * aspect;
            camera.top = d;
            camera.bottom = -d;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (!isInitialized) init();
                if (animationId) cancelAnimationFrame(animationId);
                animationId = requestAnimationFrame(render);
            } else {
                if (animationId) cancelAnimationFrame(animationId);
            }
        }, { rootMargin: '200px' });

        if (containerRef.current) observer.observe(containerRef.current);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        return () => {
            navSt.kill();
            observer.disconnect();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (renderer) renderer.dispose();
            isInitialized = false;
        };
    }, []);

    return (
        <section
            id="contact"
            ref={containerRef}
            className="section-contact relative min-h-screen bg-[#E6E6E2] text-[#1c1c1c] overflow-hidden flex flex-col justify-between pt-0 pb-8 px-8 md:px-16"
        >
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[#dfdfda] to-transparent opacity-40"></div>
            <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black"></div>
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black"></div>
                <GridPlus className="left-1/2 top-1/2" />
            </div>
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            <div className="relative z-20 flex-grow grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="flex flex-col gap-12 self-start md:self-center">
                    <div className="metadata-block">
                        <h4 className="text-[10px] tracking-[0.3em] font-grotesk font-bold text-black uppercase mb-4 opacity-100">EXPLORE</h4>
                        <ul className="flex flex-col gap-2 text-sm font-montreal font-bold">
                            <li>GET STARTED</li>
                            <li>SYSTEM STATUS</li>
                            <li>DOCUMENTATION</li>
                        </ul>
                    </div>
                </div>
                <div className="flex flex-col gap-4 text-right md:text-left">
                    <h2 className="text-[clamp(2rem,6vw,8rem)] font-montreal font-black leading-none tracking-tighter">
                        NETRA.<br />URBAN.<br />INTELLIGENCE.
                    </h2>
                    <p className="text-xs md:text-sm font-grotesk font-bold text-black tracking-[0.2em] uppercase opacity-100 mt-8">
                        JOIN THE FUTURE OF SMART CITIES
                    </p>
                </div>
            </div>
            <div className="relative z-20 w-full flex justify-between items-end border-t border-black/10 pt-4 mt-12 pb-2">
                <div className="text-[10px] md:text-xs font-grotesk font-bold text-black tracking-widest opacity-100 uppercase">NETRA © 2026</div>
                <div className="text-[10px] md:text-xs font-grotesk font-bold text-black tracking-widest opacity-100 uppercase">ALL RIGHTS RESERVED</div>
            </div>
        </section>
    );
}
