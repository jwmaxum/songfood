import React from 'react';

interface RecyclingSymbolProps {
  symbolId: string;
  size?: number;
  className?: string;
}

/**
 * Japanese Plastic Identification Mark (プラマーク)
 */
export function JapanPlasticMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>プラマーク (プラスチック製容器包装識別表示)</title>
      <rect x="5" y="5" width="90" height="90" rx="20" stroke="currentColor" strokeWidth="8" />
      <text
        x="50"
        y="66"
        fontSize="46"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
        fill="currentColor"
      >
        プラ
      </text>
    </svg>
  );
}

/**
 * Japanese Paper Identification Mark (紙マーク)
 */
export function JapanPaperMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>紙マーク (紙製容器包装識別表示)</title>
      <path
        d="M 50 8 L 92 50 L 50 92 L 8 50 Z"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <text
        x="50"
        y="64"
        fontSize="44"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
        fill="currentColor"
      >
        紙
      </text>
    </svg>
  );
}

/**
 * European / French Triman Recycling Symbol (Info-tri)
 */
export function EuTrimanMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Triman Logo (French AGEC Law)</title>
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="7" />
      {/* Human figure sorting into 3 circular arrows */}
      <circle cx="50" cy="30" r="8" fill="currentColor" />
      <path d="M 45 42 L 55 42 L 62 60 L 52 60 L 50 50 L 48 60 L 38 60 Z" fill="currentColor" />
      <path
        d="M 22 55 A 28 28 0 0 1 78 55"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray="10 5"
        strokeLinecap="round"
      />
      <polygon points="80,50 88,58 76,62" fill="currentColor" />
    </svg>
  );
}

/**
 * German Green Dot Recycling Symbol (Der Grüne Punkt)
 */
export function GreenDotMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Der Grüne Punkt (Green Dot)</title>
      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" />
      {/* Interlocking arrows */}
      <path
        d="M 50 18 A 32 32 0 0 1 78 54 L 66 54 A 20 20 0 0 0 50 30 Z"
        fill="currentColor"
      />
      <path
        d="M 50 82 A 32 32 0 0 1 22 46 L 34 46 A 20 20 0 0 0 50 70 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * US Mobius Loop / How2Recycle Symbol (Resin Identification Code)
 */
export function MobiusLoopMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>How2Recycle Mobius Loop</title>
      {/* 3 chasing arrows */}
      <path
        d="M 50 15 L 75 55 L 63 55 L 50 34 L 37 55 L 25 55 Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M 72 60 L 52 92 L 40 85 L 56 60 Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M 28 60 L 48 92 L 60 85 L 44 60 Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <text
        x="50"
        y="62"
        fontSize="22"
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="middle"
        fill="currentColor"
      >
        RIC
      </text>
    </svg>
  );
}

/**
 * Universal Recycling Symbol Renderer
 */
export default function RecyclingSymbol({ symbolId, size = 32, className = '' }: RecyclingSymbolProps) {
  switch (symbolId) {
    case 'JP_PLA_MARK':
      return <JapanPlasticMark size={size} className={className} />;
    case 'JP_PAPER_MARK':
      return <JapanPaperMark size={size} className={className} />;
    case 'EU_TRIMAN_LOGO':
      return <EuTrimanMark size={size} className={className} />;
    case 'EU_GREEN_DOT':
      return <GreenDotMark size={size} className={className} />;
    case 'US_HOW2RECYCLE':
    case 'KR_CAN_RECYCLE':
      return <MobiusLoopMark size={size} className={className} />;
    default:
      return <MobiusLoopMark size={size} className={className} />;
  }
}
