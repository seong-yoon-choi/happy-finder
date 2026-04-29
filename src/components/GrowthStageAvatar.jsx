import React, { useId } from 'react';

const stageThemes = {
  seed: {
    start: '#FFF4D8',
    end: '#FFCFA9',
    ring: '#FFF8ED',
    shadow: '#F1BC8C',
    accent: '#F8E39C',
    primary: '#82B567',
    secondary: '#5F8C49',
    detail: '#C98555'
  },
  sprout: {
    start: '#E7F9D9',
    end: '#BDEAB7',
    ring: '#F7FFF1',
    shadow: '#A5D39E',
    accent: '#D6F3B7',
    primary: '#5FBA5A',
    secondary: '#2E8B57',
    detail: '#8FD085'
  },
  clover: {
    start: '#E6F8DE',
    end: '#B8E48F',
    ring: '#F6FFF0',
    shadow: '#A5D27A',
    accent: '#D9F3BA',
    primary: '#4DAE4A',
    secondary: '#2F7E42',
    detail: '#89CB74'
  },
  'lucky-clover': {
    start: '#E5F9DB',
    end: '#99E28F',
    ring: '#F5FFF1',
    shadow: '#89CC7D',
    accent: '#D4F6B2',
    primary: '#45AD54',
    secondary: '#237443',
    detail: '#79CE8D'
  },
  tree: {
    start: '#EAF7D7',
    end: '#B8E29F',
    ring: '#F7FFF0',
    shadow: '#A6D092',
    accent: '#D8F2BB',
    primary: '#4F9A51',
    secondary: '#2F7040',
    detail: '#8AC36A'
  },
  'big-tree': {
    start: '#E1F4E5',
    end: '#97D0A1',
    ring: '#F1FFF4',
    shadow: '#7DB18D',
    accent: '#C8ECCD',
    primary: '#2F8A5B',
    secondary: '#1F5E42',
    detail: '#69B58B'
  },
  blossom: {
    start: '#FFF0F4',
    end: '#FFC9D8',
    ring: '#FFF8FB',
    shadow: '#F4B3C6',
    accent: '#FFE2EA',
    primary: '#F08BAE',
    secondary: '#A75372',
    detail: '#FFC4D7'
  }
};

const LeafCluster = ({ positions, fill, stroke, detail }) => (
  <>
    {positions.map(({ cx, cy, r }) => (
      <g key={`${cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="2.5" />
        <circle cx={cx - (r * 0.24)} cy={cy - (r * 0.24)} r={r * 0.26} fill={detail} opacity="0.72" />
      </g>
    ))}
  </>
);

const SeedArt = ({ theme }) => (
  <>
    <ellipse cx="60" cy="82" rx="20" ry="14" fill={theme.detail} opacity="0.18" />
    <ellipse cx="59" cy="81" rx="14" ry="18" fill={theme.detail} />
    <ellipse cx="57" cy="76" rx="5" ry="7" fill="#F8D5B8" opacity="0.65" />
    <path d="M59 70 C58 60 60 51 63 44" fill="none" stroke={theme.secondary} strokeWidth="4" strokeLinecap="round" />
    <path d="M61 57 C48 56 40 48 42 38 C54 38 61 45 61 57 Z" fill={theme.primary} />
    <path d="M61 51 C74 50 82 41 80 31 C68 32 61 39 61 51 Z" fill={theme.accent} stroke={theme.primary} strokeWidth="2" strokeLinejoin="round" />
  </>
);

const SproutArt = ({ theme }) => (
  <>
    <path d="M60 87 C57 73 57 58 61 39" fill="none" stroke={theme.secondary} strokeWidth="4.5" strokeLinecap="round" />
    <path d="M60 57 C42 58 30 49 31 35 C48 34 58 42 60 57 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M61 48 C79 48 90 37 88 23 C71 24 62 33 61 48 Z" fill={theme.accent} stroke={theme.primary} strokeWidth="2.5" strokeLinejoin="round" />
    <ellipse cx="62" cy="64" rx="8" ry="12" fill={theme.detail} opacity="0.18" />
    <circle cx="75" cy="34" r="3.5" fill="#FFFFFF" opacity="0.75" />
    <circle cx="49" cy="29" r="2.6" fill="#FFFFFF" opacity="0.55" />
  </>
);

const CloverArt = ({ theme, lucky = false }) => (
  <>
    <path d="M60 88 C60 74 59 63 60 54" fill="none" stroke={theme.secondary} strokeWidth="4" strokeLinecap="round" />
    <LeafCluster
      positions={
        lucky
          ? [
            { cx: 60, cy: 34, r: 14 },
            { cx: 43, cy: 51, r: 14 },
            { cx: 77, cy: 51, r: 14 },
            { cx: 60, cy: 68, r: 14 }
          ]
          : [
            { cx: 60, cy: 35, r: 15 },
            { cx: 43, cy: 57, r: 15 },
            { cx: 77, cy: 57, r: 15 }
          ]
      }
      fill={theme.primary}
      stroke={theme.secondary}
      detail={theme.detail}
    />
    <circle cx="60" cy={lucky ? '51' : '49'} r="7" fill={theme.secondary} />
    {lucky && <circle cx="60" cy="22" r="3" fill="#FFFBE6" opacity="0.9" />}
  </>
);

const TreeArt = ({ theme }) => (
  <>
    <rect x="53" y="58" width="14" height="28" rx="6" fill="#8E613C" />
    <LeafCluster
      positions={[
        { cx: 60, cy: 34, r: 18 },
        { cx: 42, cy: 47, r: 15 },
        { cx: 77, cy: 47, r: 15 },
        { cx: 60, cy: 52, r: 17 }
      ]}
      fill={theme.primary}
      stroke={theme.secondary}
      detail={theme.detail}
    />
  </>
);

const BigTreeArt = ({ theme }) => (
  <>
    <rect x="53" y="61" width="14" height="25" rx="6" fill="#7E5841" />
    <path d="M60 24 L86 63 H70 L82 84 H38 L50 63 H34 Z" fill={theme.primary} stroke={theme.secondary} strokeWidth="3" strokeLinejoin="round" />
    <path d="M60 34 L74 58 H64 L71 71 H49 L56 58 H46 Z" fill={theme.detail} opacity="0.72" />
    <circle cx="60" cy="24" r="4" fill="#FFFFFF" opacity="0.58" />
  </>
);

const BlossomArt = ({ theme }) => (
  <>
    <rect x="54" y="60" width="12" height="26" rx="6" fill="#8A5A45" />
    <LeafCluster
      positions={[
        { cx: 60, cy: 35, r: 14 },
        { cx: 44, cy: 47, r: 11 },
        { cx: 76, cy: 47, r: 11 },
        { cx: 50, cy: 62, r: 10 },
        { cx: 70, cy: 62, r: 10 }
      ]}
      fill={theme.primary}
      stroke={theme.secondary}
      detail={theme.detail}
    />
    <circle cx="60" cy="35" r="5" fill="#FFF7D6" />
    <circle cx="44" cy="47" r="4" fill="#FFF7D6" />
    <circle cx="76" cy="47" r="4" fill="#FFF7D6" />
  </>
);

const renderStageArt = (stageId, theme) => {
  switch (stageId) {
    case 'seed':
      return <SeedArt theme={theme} />;
    case 'sprout':
      return <SproutArt theme={theme} />;
    case 'clover':
      return <CloverArt theme={theme} />;
    case 'lucky-clover':
      return <CloverArt theme={theme} lucky />;
    case 'tree':
      return <TreeArt theme={theme} />;
    case 'big-tree':
      return <BigTreeArt theme={theme} />;
    case 'blossom':
      return <BlossomArt theme={theme} />;
    default:
      return <SproutArt theme={theme} />;
  }
};

const GrowthStageAvatar = ({ stageId, label }) => {
  const theme = stageThemes[stageId] || stageThemes.sprout;
  const uniqueId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `growth-stage-${stageId}-${uniqueId}-gradient`;
  const glowId = `growth-stage-${stageId}-${uniqueId}-glow`;

  return (
    <svg
      className="growth-stage-avatar"
      viewBox="0 0 120 120"
      role="img"
      aria-label={label || '행복 성장 단계'}
    >
      <defs>
        <linearGradient id={gradientId} x1="22" y1="14" x2="96" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={theme.start} />
          <stop offset="100%" stopColor={theme.end} />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(44 34) rotate(45) scale(50)">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="60" fill={`url(#${gradientId})`} />
      <circle cx="60" cy="60" r="60" fill={`url(#${glowId})`} opacity="0.82" />
      <circle cx="60" cy="97" r="18" fill={theme.shadow} opacity="0.18" />
      <g transform="translate(60 61) scale(1.06) translate(-60 -60)">
        {renderStageArt(stageId, theme)}
      </g>
    </svg>
  );
};

export default GrowthStageAvatar;
