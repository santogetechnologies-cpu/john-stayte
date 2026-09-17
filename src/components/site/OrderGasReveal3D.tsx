import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface OrderGasReveal3DProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  rotateX?: number;
  translateY?: number;
  scale?: number;
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
}

/**
 * Premium 3D scroll-reveal wrapper for Order Gas page sections and components.
 * Combines smooth fade-in, upward translation, subtle 3D perspective, very small rotateX,
 * and gentle scale (0.96 -> 1.0) with cubic-bezier easing.
 * Respects prefers-reduced-motion automatically.
 */
export function OrderGasReveal3D({
  children,
  className,
  delay = 0,
  duration = 750,
  rotateX = 5,
  translateY = 22,
  scale = 0.97,
  threshold = 0.08,
  rootMargin = "0px 0px -40px 0px",
  disabled = false,
}: OrderGasReveal3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isTransitionDone, setIsTransitionDone] = useState(false);

  useEffect(() => {
    if (disabled) {
      setHasRevealed(true);
      setIsTransitionDone(true);
      return;
    }

    // Check prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setHasRevealed(true);
      setIsTransitionDone(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setHasRevealed(true);
      setIsTransitionDone(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasRevealed(true);
            observer.unobserve(el);
            break;
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, disabled]);

  // Clean up inline transform once reveal transition completes to ensure hover effects work 100% cleanly
  useEffect(() => {
    if (hasRevealed && !isTransitionDone) {
      const timer = setTimeout(() => {
        setIsTransitionDone(true);
      }, duration + delay + 60);
      return () => clearTimeout(timer);
    }
  }, [hasRevealed, isTransitionDone, duration, delay]);

  // Reduce 3D rotation on narrow mobile screens
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
  const effectiveRotateX = isMobile ? Math.min(rotateX, 3.5) : rotateX;
  const effectiveTranslateY = isMobile ? Math.min(translateY, 16) : translateY;
  const effectiveScale = isMobile ? Math.max(scale, 0.98) : scale;

  const animatedStyle: React.CSSProperties = {
    opacity: hasRevealed ? 1 : 0,
    transform: hasRevealed
      ? "perspective(1000px) rotateX(0deg) translateY(0px) scale(1)"
      : `perspective(1000px) rotateX(${effectiveRotateX}deg) translateY(${effectiveTranslateY}px) scale(${effectiveScale})`,
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: hasRevealed && isTransitionDone ? "auto" : "transform, opacity",
    backfaceVisibility: "hidden",
  };

  return (
    <div
      ref={ref}
      className={cn("w-full", className)}
      style={isTransitionDone ? undefined : animatedStyle}
    >
      {children}
    </div>
  );
}
