import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import GridPlus from './GridPlus';

gsap.registerPlugin(ScrollTrigger);

export default function SectionStudio() {
    const containerRef = useRef(null);
    const marqueeContainerRef = useRef(null);
    const marqueeTrackRef = useRef(null);
    const studioSectionRef = useRef(null);
    const mediaContainerRef = useRef(null);
    const textColumnRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // 1. INFINITE AUTO-MARQUEE
            const marquee = marqueeTrackRef.current;
            const totalWidth = marquee.scrollWidth / 2;

            gsap.to(marquee, {
                x: -totalWidth,
                duration: 20,
                ease: 'none',
                repeat: -1,
            });

            // 2. SECTION 2 — MEDIA + TEXT SPLIT
            gsap.to(mediaContainerRef.current, {
                y: -40,
                ease: 'none',
                scrollTrigger: {
                    trigger: mediaContainerRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                }
            });

            // Text Motion
            const textLines = textColumnRef.current.querySelectorAll('.text-reveal-line');
            gsap.fromTo(textLines,
                { opacity: 0, y: 10 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    stagger: 0.15,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: textColumnRef.current,
                        start: 'top 80%',
                        toggleActions: 'play none none reverse',
                    }
                }
            );

            // 4. NAVBAR COLOR TOGGLE
            ScrollTrigger.create({
                trigger: containerRef.current,
                start: 'top 60px',
                end: 'bottom 60px',
                toggleClass: { targets: 'nav', className: 'navbar-dark' },
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    const handleButtonHover = (e, isEnter) => {
        const chars = e.currentTarget.querySelectorAll('.btn-char');
        if (isEnter) {
            gsap.to(chars, {
                y: -2,
                opacity: 0.7,
                stagger: { each: 0.01, from: "random" },
                duration: 0.05,
                overwrite: true,
                onComplete: () => {
                    gsap.to(chars, {
                        y: 0,
                        opacity: 1,
                        stagger: { each: 0.01, from: "random" },
                        duration: 0.1
                    });
                }
            });
        }
    };

    const marqueePhrases = [
        "NETRA AI SYSTEM",
        "TRAE MULTI-AGENT",
        "URBAN INTELLIGENCE",
        "AUTONOMOUS RESPONSE",
        "EXPLAINABLE AI",
        "SCALABLE DEPLOYMENT"
    ];

    return (
        <div ref={containerRef} className="section-studio relative bg-[#E6E6E4] text-[#111111] overflow-hidden">
            <GridPlus className="left-8 top-12 md:left-16" />
            <GridPlus className="right-8 top-12 md:right-16 translate-x-1/2" />

            {/* MARQUEE */}
            <div ref={marqueeContainerRef} className="SectionMarquee w-full border-b border-[#1c1c1c] bg-[#E6E6E4] z-50 overflow-hidden py-12">
                <div
                    ref={marqueeTrackRef}
                    className="flex items-center whitespace-nowrap"
                >
                    {[...Array(2)].map((_, groupIdx) => (
                        <div key={groupIdx} className="flex items-center">
                            {marqueePhrases.map((phrase, idx) => (
                                <div key={idx} className="flex items-center">
                                    <h2 className="font-['Druk_Wide'] text-4xl lg:text-5xl font-black uppercase tracking-[-0.02em]">
                                        {phrase}
                                    </h2>
                                    <span className="mx-12 text-4xl lg:text-5xl font-black opacity-30">·</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* MEDIA + TEXT SPLIT */}
            <div ref={studioSectionRef} className="StudioSection max-w-[1440px] mx-auto px-6 md:px-16 pt-24 pb-12 lg:pt-32 lg:pb-20">
                <div className="grid grid-cols-12 gap-8 items-start lg:items-center">
                    {/* LEFT SIDE — MEDIA */}
                    <div
                        ref={mediaContainerRef}
                        className="StudioMedia col-span-12 lg:col-span-7 flex flex-col items-start gap-12"
                    >
                        <div className="VideoContainer relative w-full aspect-video bg-[#111111] rounded-[2px] overflow-hidden shadow-xl"
                            style={{ maxWidth: '840px' }}>
                            <video
                                className="w-full h-full object-cover opacity-80"
                                autoPlay
                                loop
                                muted
                                playsInline
                                src="/media/video/4TH.mp4"
                            />
                            <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>
                        </div>

                        <div className="pl-2">
                            <button
                                ref={buttonRef}
                                onMouseEnter={(e) => handleButtonHover(e, true)}
                                className="group relative py-4 bg-transparent text-[#111111] overflow-hidden rounded-sm transition-all duration-300"
                            >
                                <span className="relative z-10 font-grotesk font-extrabold text-base tracking-[0.4em] flex gap-[2px]">
                                    {"INITIATE SYSTEM".split("").map((char, i) => (
                                        <span key={i} className="btn-char inline-block">{char === " " ? "\u00A0" : char}</span>
                                    ))}
                                </span>
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#111111] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT SIDE — TEXT */}
                    <div
                        ref={textColumnRef}
                        className="StudioText col-span-12 lg:col-span-4 lg:col-start-9 space-y-10"
                    >
                        <div className="text-reveal-line">
                            <span className="font-['Neue_Montreal'] text-[10px] tracking-[0.25em] font-bold text-black uppercase opacity-100">
                                PROACTIVE ECOSYSTEM
                            </span>
                        </div>

                        <div className="text-reveal-line">
                            <h3 className="font-['Druk_Wide'] text-4xl lg:text-5xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                                REASONING,<br />RESPONSE,<br />RESOLVE.
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <div className="text-reveal-line">
                                <p className="font-['Neue_Montreal'] text-base md:text-lg leading-relaxed max-w-[480px] font-normal opacity-90">
                                    NETRA redefines urban monitoring by replacing passive detection with active reasoning. 
                                    <br /><br />
                                    By correlating multiple data streams, our agents can identify complex scenarios like traffic congestion patterns or emerging safety hazards before they escalate.
                                </p>
                            </div>

                            <div className="text-reveal-line">
                                <p className="font-['Neue_Montreal'] text-base md:text-lg leading-relaxed max-w-[480px] font-normal opacity-90">
                                    The result is an explainable outcomes framework where users can see exactly why a particular decision was made, bridging the gap between machine intelligence and human trust.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
