"use client";

import type { ReactNode, MouseEvent } from "react";
import { useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface AuroraBackgroundProps {
  children?: ReactNode;
  className?: string;
}

export default function AuroraBackground({ children, className }: AuroraBackgroundProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  useSpring(mouseX, { stiffness: 50, damping: 20 });
  useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY],
  );

  return (
    <div
      className={className ? `relative w-full min-h-screen overflow-hidden ${className}` : "relative w-full min-h-screen overflow-hidden"}
      onMouseMove={handleMouseMove}
      style={{ filter: "saturate(1.33)" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(131deg, #09090b 0%, #18181b 100%)" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          backgroundColor: "rgba(217, 70, 239, 0.3)",
          width: "42.793959362380235%",
          height: "81%",
          top: "22.03933895631228%",
          left: "8%",
          opacity: 0.3,
          filter: "blur(37.14253253578674px)",
          mixBlendMode: "screen",
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.24, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          backgroundColor: "#ff00a2",
          width: "89.00305437868951%",
          height: "49.723401972379264%",
          top: "47.9491220110691%",
          left: "32.156245620588166%",
          opacity: 0.2,
          filter: "blur(105.82903530105635px)",
          mixBlendMode: "screen",
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.16000000000000003, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          backgroundColor: "rgba(217, 70, 239, 0.3)",
          width: "95%",
          height: "97%",
          top: "27.03933895631228%",
          left: "42%",
          opacity: 0.17,
          filter: "blur(37.14253253578674px)",
          mixBlendMode: "screen",
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.17, 0.136, 0.17] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          backgroundColor: "#ff00a2",
          width: "89.00305437868951%",
          height: "49.723401972379264%",
          top: "6%",
          left: "-7%",
          opacity: 0.2,
          filter: "blur(105.82903530105635px)",
          mixBlendMode: "screen",
          transform: "translate(-50%, -50%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.16000000000000003, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.33) 100%)" }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.1,
          backgroundImage:
            "linear-gradient(#d946ef 1px, transparent 1px), linear-gradient(90deg, #d946ef 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: 0.13,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.75'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />

      <div className="relative z-30">{children}</div>
    </div>
  );
}
