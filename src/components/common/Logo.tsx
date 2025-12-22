import React from 'react';

export interface LogoProps {
  width?: number | string;
  height?: number | string;
  type?: 'full' | 'icon' | 'text';
  theme?: 'light' | 'dark';
  style?: React.CSSProperties;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  width = 'auto',
  height = 48,
  type = 'full',
  theme = 'light',
  style,
  className,
}) => {
  const primaryColor = '#1677ff'; // Ant Design Blue
  const accentColor = '#faad14';  // Safety Orange
  const whiteColor = '#ffffff';
  
  const textColor = theme === 'light' ? '#1f1f1f' : '#ffffff';
  const subTextColor = theme === 'light' ? '#666666' : 'rgba(255,255,255,0.7)';

  // 新设计：徽章式图标 (Badge Style)
  // 外形：圆角矩形，象征稳固与工业标准
  // 内容：负空间或白色线条勾勒的“Z”形机械臂，更抽象、更现代

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        ...style,
      }}
    >
      {(type === 'full' || type === 'icon') && (
        <svg
          width={height}
          height={height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for gradients/shadows */}
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b9dff" />
              <stop offset="100%" stopColor="#1677ff" />
            </linearGradient>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Shape: Rounded Square (Industrial & Tech) */}
          <rect
            x="10"
            y="10"
            width="80"
            height="80"
            rx="20"
            fill="url(#logoGradient)"
            filter="url(#dropShadow)"
          />

          {/* Abstract Z / Boom Lift Shape */}
          <g transform="translate(20, 20) scale(0.6)">
             {/* Base Chassis Line */}
             <path
               d="M10 90 H 90"
               stroke={whiteColor}
               strokeWidth="8"
               strokeLinecap="round"
             />
             
             {/* Z-Boom Structure */}
             <path
               d="M20 80 L 70 30 L 30 30 L 80 0"
               stroke={whiteColor}
               strokeWidth="8"
               strokeLinecap="round"
               strokeLinejoin="round"
               fill="none"
             />

             {/* Platform/Basket at the top */}
             <path
               d="M75 0 H 95 V 15 H 75 Z"
               fill={accentColor}
             />
             
             {/* Joint Pivot Point */}
             <circle cx="70" cy="30" r="6" fill={whiteColor} />
             <circle cx="70" cy="30" r="3" fill={primaryColor} />
          </g>
        </svg>
      )}

      {(type === 'full' || type === 'text') && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span
            style={{
              fontSize: typeof height === 'number' ? height * 0.45 : '22px',
              fontWeight: 800,
              color: textColor,
              letterSpacing: '1px',
              fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
            }}
          >
            中达机械
          </span>
          <span
            style={{
              fontSize: typeof height === 'number' ? height * 0.18 : '10px',
              fontWeight: 500,
              color: subTextColor,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Zhongda Machinery
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
