/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useState, useEffect } from 'react';

const CSIR_LABS = [
    "CSIR-NPL", "CSIR-IGIB", "CSIR-CDRI", "CSIR-CECRI", "CSIR-CLRI", "CSIR-CMERI",
    "CSIR-CRRI", "CSIR-CSIO", "CSIR-CSMCRI", "CSIR-IICT", "CSIR-IIIM", "CSIR-IIP",
    "CSIR-IITR", "CSIR-NAL", "CSIR-NBRI", "CSIR-NCL", "CSIR-NEERI", "CSIR-NGRI",
    "CSIR-NIO", "CSIR-NIScPR", "CSIR-NML", "CSIR-AMPRI", "CSIR-CBRI", "CSIR-CCMB",
    "CSIR-CFTRI", "CSIR-CGCRI", "CSIR-CIMAP", "CSIR-CIMFR", "CSIR-IMMT", "CSIR-SERC"
];

export default function FloatingLabs() {
    const [items, setItems] = useState<{ id: number; name: string; x: number; y: number; duration: number; delay: number; scale: number; opacity: number; dx: number; dy: number }[]>([]);

    useEffect(() => {
        const newItems = Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            name: CSIR_LABS[Math.floor(Math.random() * CSIR_LABS.length)],
            x: Math.random() * 100, // start x (vw)
            y: Math.random() * 100, // start y (vh)
            dx: (Math.random() - 0.5) * 300, // move x distance (vw) - larger range (was 100)
            dy: (Math.random() - 0.5) * 300, // move y distance (vh)
            duration: 10 + Math.random() * 30, // Much slower, smoother movement
            delay: Math.random() * -30,
            scale: 0.2,//+ Math.random() * 1.0, // Slightly larger range
            opacity: 0.14 + Math.random() * 0.2 // More prominent (0.12 - 0.32)
        }));
        setItems(newItems);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="absolute whitespace-nowrap font-black text-slate-300 dark:text-slate-700 select-none animate-float-wander"
                    style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        fontSize: `${2 + item.scale}rem`,
                        opacity: item.opacity,
                        animationDuration: `${item.duration}s`,
                        animationDelay: `${item.delay}s`,
                        // @ts-ignore
                        '--tx': `${item.dx}vw`,
                        '--ty': `${item.dy}vh`,
                    }}
                >
                    {item.name}
                </div>
            ))}
            <style>{`
                @keyframes float-wander {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(var(--tx), var(--ty)) rotate(5deg); }
                    66% { transform: translate(calc(var(--tx) * -0.5), calc(var(--ty) * 1.2)) rotate(-5deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                .animate-float-wander {
                    animation-name: float-wander;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                }
            `}</style>
        </div>
    );
}
