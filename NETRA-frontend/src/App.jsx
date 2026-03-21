import { useEffect, useRef, useState, lazy, Suspense } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Preloader from "./components/Preloader";
import MenuOverlay from "./components/MenuOverlay";
import { AnimatePresence } from "framer-motion";
import "./styles/globals.css";

// Lazy load essential components
const Hero = lazy(() => import("./components/Hero"));
const ParallaxObject = lazy(() => import("./components/ParallaxObject"));
const SectionVision = lazy(() => import("./components/SectionVision"));
const SectionCapabilities = lazy(
    () => import("./components/SectionCapabilities"),
);
const SectionStudio = lazy(() => import("./components/SectionStudio"));
const ContactSection = lazy(() => import("./components/ContactSection"));
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard"));
const Login = lazy(() => import("./components/Login"));

function App() {
    const navigate = useNavigate();
    const location = useLocation();
    const [lenis, setLenis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuInitialView, setMenuInitialView] = useState("main");
    const [isAuth, setIsAuth] = useState(localStorage.getItem("isAuth") === "true");

    const cursorRef = useRef(null);

    const handleLogin = () => {
        setIsAuth(true);
    };

    const handleLogout = () => {
        setIsAuth(false);
        localStorage.removeItem("isAuth");
        navigate("/login");
    };

    useEffect(() => {
        // Initialize Lenis smooth scroll
        const lenisInstance = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });

        setLenis(lenisInstance);

        function raf(time) {
            lenisInstance.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        lenisInstance.on("scroll", () => {
            if (window.ScrollTrigger) window.ScrollTrigger.update();
        });

        return () => {
            lenisInstance.destroy();
        };
    }, []);

    useEffect(() => {
        if (!lenis) return;

        const isOverlayActive = isMenuOpen;

        if (isOverlayActive) {
            lenis.stop();
        } else {
            lenis.start();
        }
    }, [lenis, isMenuOpen]);

    useEffect(() => {
        // Custom cursor
        const cursor = cursorRef.current;
        if (!cursor) return;

        const xSetter = gsap.quickSetter(cursor, "x", "px");
        const ySetter = gsap.quickSetter(cursor, "y", "px");

        const moveCursor = (e) => {
            xSetter(e.clientX - 4);
            ySetter(e.clientY - 4);
        };

        const handleMouseOver = (e) => {
            const isHoverable =
                e.target.tagName === "BUTTON" ||
                e.target.tagName === "A" ||
                e.target.classList.contains("menu-button") ||
                e.target.classList.contains("group") ||
                e.target.classList.contains("product-label");

            const isMenuItem =
                e.target.closest("button")?.classList.contains("group") && isMenuOpen;

            if (isMenuItem) {
                cursor.classList.add("crosshair");
                cursor.classList.remove("hover");
            } else if (isHoverable) {
                cursor.classList.add("hover");
                cursor.classList.remove("crosshair");
            } else {
                cursor.classList.remove("hover");
                cursor.classList.remove("crosshair");
            }
        };

        window.addEventListener("mousemove", moveCursor);
        window.addEventListener("mouseover", handleMouseOver);

        return () => {
            window.removeEventListener("mousemove", moveCursor);
            window.removeEventListener("mouseover", handleMouseOver);
        };
    }, [isMenuOpen]);

    const handleHomeClick = () => {
        if (location.pathname !== "/") {
            navigate("/");
        } else if (lenis) {
            lenis.scrollTo("#hero", { duration: 2 });
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="app relative bg-[#e5e5e5]">
            {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}

            <MenuOverlay
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                lenisInstance={lenis}
                initialView={menuInitialView}
            />

            <Navbar
                isMenuOpen={isMenuOpen}
                onToggle={() => {
                    if (!isMenuOpen) setMenuInitialView("main");
                    setIsMenuOpen(!isMenuOpen);
                }}
                lenisInstance={lenis}
                onHomeClick={handleHomeClick}
            />

            {/* Custom cursor */}
            <div ref={cursorRef} className="cursor-dot"></div>

            <AnimatePresence mode="wait">
                <Suspense
                    fallback={
                        <div className="fixed inset-0 bg-[#1c1c1c] z-[100] flex items-center justify-center font-grotesk text-white text-xs tracking-widest uppercase">
                            Initializing...
                        </div>
                    }
                >
                    <Routes location={location} key={location.pathname}>
                        <Route
                            path="/"
                            element={
                                <>
                                    <ParallaxObject
                                        lenisInstance={lenis}
                                        isActive={location.pathname === "/" && !isMenuOpen}
                                    />
                                    <Hero isSiteLoaded={!isLoading} />
                                    <div className="relative z-[50]">
                                        <SectionVision />
                                    </div>
                                    <div className="w-full h-px bg-[#1c1c1c] opacity-20 relative z-[50]"></div>
                                    <div className="relative z-[50]">
                                        <SectionCapabilities />
                                    </div>
                                    <div className="w-full h-px bg-[#1c1c1c] opacity-20 relative z-[50]"></div>
                                    <div className="relative z-[50]">
                                        <SectionStudio />
                                    </div>
                                    <div className="w-full h-px bg-[#1c1c1c] opacity-20 relative z-[50]"></div>
                                    <div className="relative z-[50]">
                                        <ContactSection />
                                    </div>
                                </>
                            }
                        />
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/dashboard" element={isAuth ? <Dashboard onLogout={handleLogout} /> : <Login onLogin={handleLogin} />} />
                    </Routes>
                </Suspense>
            </AnimatePresence>
        </div>
    );
}

export default App;
