import React, { useEffect, useRef } from "react";
import { audioEngine } from "../utils/audioEngine";

export default function OrbCanvas({
  gameState,
  activeColor = "#FF8B8B",
  activeShadow = "#D96C6C",
  nextColor = "#6ED1CF",
  turnProgress = 1, // 1 -> 0
  onOrbClick,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const isBlinkingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 2;

    const width = 280;
    const height = 280;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2 + 6;
    const baseRadius = 72;

    const render = () => {
      timeRef.current += 0.04;
      const t = timeRef.current;

      // Handle random blinks every 3-5 seconds
      blinkTimerRef.current += 1;
      if (blinkTimerRef.current > 140 && Math.random() < 0.02) {
        isBlinkingRef.current = true;
        blinkTimerRef.current = 0;
        setTimeout(() => {
          isBlinkingRef.current = false;
        }, 140);
      }

      ctx.clearRect(0, 0, width, height);

      // Audio analysis data
      const freqData = audioEngine.getFrequencyData();
      const avgFreq = audioEngine.getAverageFrequency();

      // Dynamic scale & bounce
      let squishY = 1;
      let squishX = 1;
      let bobY = 0;

      if (gameState === "STATE_AI_SPEAKING") {
        const audioBounce = (avgFreq / 255) * 12;
        bobY = -audioBounce * 0.8 + Math.sin(t * 5) * 3;
        squishY = 1 + (avgFreq / 255) * 0.18;
        squishX = 1 - (avgFreq / 255) * 0.1;
      } else if (gameState === "STATE_LISTENING") {
        const audioBounce = (avgFreq / 255) * 16;
        bobY = -audioBounce * 0.5 + Math.sin(t * 4) * 2;
        squishY = 1 + (avgFreq / 255) * 0.22;
        squishX = 1 - (avgFreq / 255) * 0.12;
      } else if (gameState === "STATE_BRIDGING") {
        bobY = Math.sin(t * 6) * 6;
        squishY = 1 + Math.sin(t * 8) * 0.08;
        squishX = 1 - Math.sin(t * 8) * 0.08;
      } else {
        // Idle gentle breathing
        bobY = Math.sin(t * 2) * 3;
        squishY = 1 + Math.sin(t * 2) * 0.03;
        squishX = 1 - Math.sin(t * 2) * 0.03;
      }

      const curCenterY = centerY + bobY;

      // 1. SOFT GROUND SHADOW (3D Claymorphic Drop)
      ctx.save();
      ctx.beginPath();
      const shadowRadiusX = baseRadius * 0.9 * squishX;
      const shadowRadiusY = 14 * squishY;
      ctx.ellipse(centerX, centerY + baseRadius + 18, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(44, 62, 80, 0.12)";
      ctx.fill();
      ctx.restore();

      // 2. 15-SECOND TURN PROGRESS RING (During STATE_LISTENING)
      if (gameState === "STATE_LISTENING") {
        const ringRadius = baseRadius + 38;
        ctx.save();
        ctx.lineWidth = 8;
        ctx.lineCap = "round";

        // Backdrop track ring
        ctx.strokeStyle = "#e2edf5";
        ctx.beginPath();
        ctx.arc(centerX, curCenterY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 3D Extruded Active Ring
        const startAngle = -Math.PI / 2;
        const currentAngle = startAngle + Math.PI * 2 * Math.max(0, Math.min(1, turnProgress));

        ctx.strokeStyle = activeColor;
        ctx.shadowColor = activeShadow || "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.arc(centerX, curCenterY, ringRadius, startAngle, currentAngle, false);
        ctx.stroke();
        ctx.restore();
      }

      // 3. MAIN CHARACTER BODY (Tactile 3D Clay Orb)
      ctx.save();
      ctx.translate(centerX, curCenterY);
      ctx.scale(squishX, squishY);

      // Base solid extruded bottom shadow (Reference 3D button lip)
      ctx.beginPath();
      ctx.arc(0, 7, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = activeShadow || "#D96C6C";
      ctx.fill();

      // Main spherical body
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);

      if (gameState === "STATE_BRIDGING") {
        // Dual-color swirl between active & next
        const grad = ctx.createLinearGradient(
          -baseRadius * Math.cos(t * 3),
          -baseRadius * Math.sin(t * 3),
          baseRadius * Math.cos(t * 3),
          baseRadius * Math.sin(t * 3)
        );
        grad.addColorStop(0, activeColor);
        grad.addColorStop(1, nextColor);
        ctx.fillStyle = grad;
      } else {
        const bodyGrad = ctx.createRadialGradient(
          -baseRadius * 0.25,
          -baseRadius * 0.25,
          4,
          0,
          0,
          baseRadius * 1.1
        );
        bodyGrad.addColorStop(0, "#ffffff");
        bodyGrad.addColorStop(0.28, activeColor);
        bodyGrad.addColorStop(1, activeShadow || activeColor);
        ctx.fillStyle = bodyGrad;
      }
      ctx.fill();

      // Soft cute blush cheeks
      ctx.beginPath();
      ctx.ellipse(-38, 12, 10, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(38, 12, 10, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fill();

      // 4. CHARMING EXPRESSIVE FACE
      const eyeSpacing = 24;
      const eyeY = -4;

      if (isBlinkingRef.current) {
        // Blinking lines
        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(-eyeSpacing - 6, eyeY);
        ctx.lineTo(-eyeSpacing + 6, eyeY);
        ctx.moveTo(eyeSpacing - 6, eyeY);
        ctx.lineTo(eyeSpacing + 6, eyeY);
        ctx.stroke();
      } else {
        // Friendly round cartoon eyes
        const eyeRadius = gameState === "STATE_LISTENING" ? 7.5 : 6.5;

        // Eye whites / dark pupil
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eyeSpacing, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Eye gleam highlights (kawaii reference style)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-eyeSpacing - 2, eyeY - 2, 2.5, 0, Math.PI * 2);
        ctx.arc(eyeSpacing - 2, eyeY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mouth animation
      ctx.strokeStyle = "#2c3e50";
      ctx.fillStyle = "#2c3e50";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      if (gameState === "STATE_AI_SPEAKING") {
        // Animated speaking mouth opening with voice volume
        const mouthHeight = Math.max(3, (avgFreq / 255) * 18);
        ctx.beginPath();
        ctx.ellipse(0, 16, 7, mouthHeight, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (gameState === "STATE_LISTENING") {
        // Listening "O" shape or attentive smile
        ctx.beginPath();
        ctx.arc(0, 14, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cheerful resting smile
        ctx.beginPath();
        ctx.arc(0, 10, 8, 0.2 * Math.PI, 0.8 * Math.PI, false);
        ctx.stroke();
      }

      // 5. CUTE TOP ANTENNA / CHIME (from reference characters!)
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -baseRadius);
      ctx.lineTo(0, -baseRadius - 12);
      ctx.stroke();

      // Top antenna bobble
      ctx.beginPath();
      ctx.arc(0, -baseRadius - 16, 6, 0, Math.PI * 2);
      ctx.fillStyle = nextColor || "#6ED1CF";
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameState, activeColor, activeShadow, nextColor, turnProgress]);

  return (
    <div
      onClick={onOrbClick}
      className={`relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${
        gameState === "STATE_LISTENING" ? "hover:scale-105 active:scale-95" : ""
      }`}
      style={{ width: "280px", height: "280px" }}
    >
      <canvas ref={canvasRef} className="w-[280px] h-[280px] block" />

      {/* Tactile prompt pill during listening */}
      {gameState === "STATE_LISTENING" && (
        <div className="absolute -bottom-4 px-4 py-1.5 rounded-full bg-white border-2 border-[#e2edf5] shadow-[0_3px_0_#d0e0ed] flex items-center gap-2 text-xs font-bold text-slate-600 animate-bounce-slow">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF8B8B] animate-ping" />
          <span>Tap me or stay silent when done!</span>
        </div>
      )}
    </div>
  );
}
