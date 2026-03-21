import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link, useLocation } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

export default function Navbar({ isMenuOpen, onToggle, lenisInstance, onHomeClick }) {
    const navRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        gsap.fromTo(navRef.current,
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5 }
        );
    }, []);

    const handleLogoClick = () => {
        if (onHomeClick) {
            onHomeClick();
        } else {
            if (isMenuOpen) onToggle();
            if (lenisInstance) {
                lenisInstance.scrollTo('#hero', { duration: 2 });
            }
        }
    };

    return (
        <nav
            ref={navRef}
            className={`fixed top-0 left-0 w-full z-[120] px-6 md:px-8 py-2 flex justify-between items-center transition-colors duration-500 ${isMenuOpen ? 'text-[#EDEDED]' : ''}`}
        >
            <button
                onClick={handleLogoClick}
                className={`nav-product-name product-label font-montreal font-black tracking-tighter text-4xl ${isMenuOpen ? 'opacity-100' : ''} text-left pointer-events-auto`}
            >
                NETRA
            </button>

            <div className="flex items-center gap-4">
                <Link
                    to="/dashboard"
                    className={`nav-menu-button menu-button font-grotesk pointer-events-auto transition-all ${location.pathname === '/dashboard' ? 'bg-[#ff4d00] !border-[#ff4d00] text-white' : ''} ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    [ DASHBOARD ]
                </Link>

                <button
                    onClick={onToggle}
                    className={`nav-menu-button menu-button font-grotesk pointer-events-auto ${isMenuOpen ? '!border-[#EDEDED] !text-[#EDEDED] hover:!bg-[#EDEDED] hover:!text-[#1A1A1A]' : ''}`}
                >
                    {isMenuOpen ? '[ CLOSE ]' : '[ MENU ]'}
                </button>
            </div>
        </nav>
    );
}
