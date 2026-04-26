"use client";

import { useEffect, useState } from "react";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

export function HeroPromoShaderBackground() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      setIsReady(false);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {isReady ? (
        <ShaderGradientCanvas
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          pixelDensity={0.8}
          fov={40}
        >
          <ShaderGradient
            animate="on"
            axesHelper="off"
            bgColor1="#000000"
            bgColor2="#000000"
            brightness={2.8}
            cAzimuthAngle={170}
            cDistance={4.39}
            cPolarAngle={70}
            cameraZoom={1}
            color1="#ff24af"
            color2="#9e1fff"
            color3="#00006c"
            destination="onCanvas"
            embedMode="off"
            envPreset="city"
            format="gif"
            fov={40}
            frameRate={10}
            gizmoHelper="hide"
            grain="on"
            lightType="3d"
            pixelDensity={0.8}
            positionX={0}
            positionY={0.9}
            positionZ={-0.3}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={1}
            rotationX={45}
            rotationY={0}
            rotationZ={0}
            shader="defaults"
            type="waterPlane"
            uAmplitude={0}
            uDensity={1.5}
            uFrequency={0}
            uSpeed={0.2}
            uStrength={2.3}
            uTime={0}
            wireframe={false}
            zoomOut={false}
          />
        </ShaderGradientCanvas>
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(4,4,8,0.06)_0%,rgba(4,4,8,0.42)_74%,rgba(4,4,8,0.62)_100%)]" />
    </div>
  );
}
