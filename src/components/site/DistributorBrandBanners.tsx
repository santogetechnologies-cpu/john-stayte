import React from "react";

export function DistributorBrandBanners() {
  return (
    <div aria-label="Authorised Gas & Forecourt Partners" className="w-full flex justify-center lg:justify-end">
      {/* 3D Keyframe Subtle Floating & Breathing Motion */}
      <style>{`
        @keyframes float-hero-4-brands {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .animate-float-hero-brands {
          animation: float-hero-4-brands 7s ease-in-out infinite;
        }
      `}</style>

      {/* 3D Floating 4-Brand Visual Showcase (Slightly increased size ~10%) */}
      <div className="relative w-full max-w-[520px] sm:max-w-[580px] md:max-w-[620px] lg:max-w-[590px] xl:max-w-[660px] flex items-center justify-center select-none py-1 group">

        {/* Soft Volumetric Atmosphere Glows Behind Pedestals */}
        <div className="absolute top-[25%] left-[25%] -translate-x-1/2 -translate-y-1/2 w-52 sm:w-64 h-52 sm:h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-[25%] right-[25%] translate-x-1/2 -translate-y-1/2 w-52 sm:w-64 h-52 sm:h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-[25%] left-[25%] -translate-x-1/2 translate-y-1/2 w-52 sm:w-60 h-52 sm:h-60 bg-red-600/12 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-[25%] right-[25%] translate-x-1/2 translate-y-1/2 w-52 sm:w-60 h-52 sm:h-60 bg-red-600/12 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Exact High-Resolution 4-Brand Visual Asset */}
        <div className="relative z-10 w-full animate-float-hero-brands transition-transform duration-500 hover:scale-[1.015]">
          <img
            src="/brands/order-gas-brands-4-showcase.jpg"
            alt="Authorised Calor, Air Liquide, Texaco & BOC Gases Partner Showcase"
            className="w-full h-auto object-contain rounded-2xl drop-shadow-[0_20px_45px_rgba(0,0,0,0.85)]"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}


