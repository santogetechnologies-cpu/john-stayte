import React from "react";

export function DistributorBrandBanners() {
  return (
    <div aria-label="Authorised Gas Partners" className="w-full flex justify-center lg:justify-end">
      {/* 3D Keyframe Floating Motion */}
      <style>{`
        @keyframes float-hero-3d-brands {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-float-hero-brands {
          animation: float-hero-3d-brands 6s ease-in-out infinite;
        }
      `}</style>

      {/* 3D Floating Brand Visual Showcase (EXACTLY MATCHING REFERENCE 2) */}
      <div className="relative w-full max-w-[560px] sm:max-w-[620px] md:max-w-[680px] lg:max-w-[700px] xl:max-w-[740px] flex items-center justify-center select-none py-1 group">
        
        {/* Soft Volumetric Atmosphere Glows Behind Logos */}
        <div className="absolute top-1/2 left-[28%] -translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 right-[28%] translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Exact High-Resolution 3D Brand Render Asset */}
        <div className="relative z-10 w-full animate-float-hero-brands transition-transform duration-500 hover:scale-[1.02]">
          <img
            src="/order-gas-brands-3d.png"
            alt="Authorised Calor Gas & Air Liquide Premium 3D Brand Showcase"
            className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

