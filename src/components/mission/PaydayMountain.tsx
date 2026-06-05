import React from 'react';
import type { UserLevel } from '../../types';

interface PaydayMountainProps {
  activeLevel: UserLevel;
  unlockedLevels: UserLevel[];
  onOpenCommunity?: () => void;
  onOpenQuant?: () => void;
  onOpenMentorship?: () => void;
  mentorshipRequested?: boolean;
}

export const PaydayMountain: React.FC<PaydayMountainProps> = ({
  unlockedLevels,
  onOpenCommunity,
  onOpenQuant,
  onOpenMentorship,
  mentorshipRequested,
}) => {
  const offpisteUnlocked = unlockedLevels.includes('offpiste');

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[var(--line)]">
      <svg viewBox="0 0 800 420" className="w-full block" style={{ aspectRatio: '800 / 420', fontFamily: "'Inter Tight', Inter, sans-serif" }}>
        <defs>
          <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EAF1FB" /><stop offset="1" stopColor="#F6F9FD" /></linearGradient>
          <linearGradient id="pm-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C3D5EE" /><stop offset="1" stopColor="#DDE8F6" /></linearGradient>
          <linearGradient id="pm-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8FB1D9" /><stop offset="1" stopColor="#B9D0EA" /></linearGradient>
          <linearGradient id="pm-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5A8DC4" /><stop offset="1" stopColor="#88B0DA" /></linearGradient>
          <linearGradient id="pm-valley" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ECF3FC" /><stop offset="1" stopColor="#FCFDFF" /></linearGradient>
          <linearGradient id="pm-cabin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#DCE7F4" /></linearGradient>
          <radialGradient id="pm-glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stopColor="#FFD37A" stopOpacity="0.95" /><stop offset="1" stopColor="#FFD37A" stopOpacity="0" /></radialGradient>
          <radialGradient id="pm-mogul" cx="0.4" cy="0.3" r="0.78"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#CBDDF1" /></radialGradient>
          <filter id="pm-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#0B1E36" floodOpacity="0.18" /></filter>
        </defs>

        <rect width="800" height="420" fill="url(#pm-sky)" />
        <circle cx="735" cy="58" r="34" fill="rgba(255,231,170,0.5)" /><circle cx="735" cy="58" r="15" fill="rgba(255,231,170,0.85)" />
        <path d="M0 240 L130 175 L250 215 L380 150 L520 200 L650 150 L800 188 L800 300 L0 300Z" fill="url(#pm-far)" opacity="0.65" />
        <path d="M0 285 L110 235 L230 275 L360 205 L470 255 L600 195 L720 240 L800 215 L800 320 L0 320Z" fill="url(#pm-mid)" opacity="0.85" />
        <path d="M0 332 L120 272 L250 212 L370 152 L495 92 L585 50 L660 76 L770 128 L800 148 L800 332Z" fill="url(#pm-near)" />
        <path d="M495 92 L585 50 L660 76 L636 92 L606 68 L578 90 L530 102Z" fill="#fff" />
        <path d="M584 60 Q512 138 432 198 Q352 256 300 318" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" opacity="0.45" />
        <path d="M584 60 Q512 138 432 198 Q352 256 300 318" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
        <path d="M0 332 L800 332 L800 420 L0 420Z" fill="url(#pm-valley)" />
        <g fill="#0E4C92"><polygon points="22,376 14,394 30,394" /><polygon points="52,384 44,402 60,402" /><polygon points="10,390 4,404 16,404" /></g>

        {/* ski-lift base station */}
        <g transform="translate(48 360)" filter="url(#pm-soft)">
          <rect x="-22" y="0" width="44" height="26" rx="3" fill="#FFFFFF" stroke="#D8E1EC" />
          <polygon points="-26,0 0,-12 26,0" fill="#2F6CAE" />
          <rect x="-15" y="7" width="11" height="12" rx="1.5" fill="#CFE0F3" /><rect x="4" y="7" width="11" height="12" rx="1.5" fill="#CFE0F3" />
        </g>
        {/* towers */}
        <g stroke="#33425C" strokeWidth="2.4" strokeLinecap="round">
          <line x1="190" y1="288" x2="190" y2="332" /><line x1="178" y1="288" x2="202" y2="288" />
          <line x1="350" y1="208" x2="350" y2="300" /><line x1="338" y1="208" x2="362" y2="208" />
          <line x1="490" y1="132" x2="490" y2="240" /><line x1="478" y1="132" x2="502" y2="132" />
        </g>
        <g transform="translate(592 60)" filter="url(#pm-soft)"><rect x="-16" y="-6" width="32" height="18" rx="3" fill="#FFFFFF" stroke="#D8E1EC" /><polygon points="-19,-6 0,-15 19,-6" fill="#2F6CAE" /></g>
        <path id="pm-cable" d="M 56 350 Q 230 268 350 208 Q 470 148 588 58" fill="none" stroke="#33425C" strokeWidth="1.4" />
        {/* gondolas */}
        <g>
          <g id="pm-gondola">
            <rect x="-3" y="-2.6" width="6" height="3.2" rx="1.2" fill="#33425C" />
            <path d="M0 0.6 q3 4.4 0 7.4" stroke="#33425C" strokeWidth="1.3" fill="none" />
            <rect x="-9" y="7.5" width="18" height="13.5" rx="4" fill="url(#pm-cabin)" stroke="#9FB6D2" strokeWidth="0.7" filter="url(#pm-soft)" />
            <rect x="-6.5" y="10" width="13" height="6" rx="2" fill="#9FC4EA" />
            <rect x="-7.5" y="17.6" width="15" height="3" rx="1.5" fill="#0B4A8F" />
          </g>
          <animateMotion dur="22s" repeatCount="indefinite"><mpath href="#pm-cable" /></animateMotion>
        </g>
        <g><use href="#pm-gondola" /><animateMotion dur="22s" begin="-7.3s" repeatCount="indefinite"><mpath href="#pm-cable" /></animateMotion></g>
        <g><use href="#pm-gondola" /><animateMotion dur="22s" begin="-14.6s" repeatCount="indefinite"><mpath href="#pm-cable" /></animateMotion></g>

        {/* off-piste mogul corridor (clickable → quant) */}
        <g onClick={onOpenQuant} style={{ cursor: onOpenQuant ? 'pointer' : 'default' }}>
          <path d="M626 78 Q672 108 650 148 Q632 178 658 206 L630 206 Q606 174 624 146 Q646 108 602 82 Z" fill="#fff" opacity="0.26" />
          <g>
            <ellipse cx="630" cy="104" rx="13" ry="6" fill="url(#pm-mogul)" /><ellipse cx="652" cy="124" rx="14" ry="6.5" fill="url(#pm-mogul)" />
            <ellipse cx="632" cy="146" rx="13" ry="6" fill="url(#pm-mogul)" /><ellipse cx="652" cy="168" rx="14" ry="6.5" fill="url(#pm-mogul)" />
            <ellipse cx="636" cy="190" rx="13" ry="6" fill="url(#pm-mogul)" />
            <g fill="#9DB6D6" opacity="0.3"><ellipse cx="643" cy="115" rx="6.5" ry="2" /><ellipse cx="643" cy="157" rx="6.5" ry="2" /><ellipse cx="645" cy="179" rx="6.5" ry="2" /></g>
          </g>
          <path d="M630 92 Q662 110 634 130 Q608 150 650 174 Q672 190 638 202" fill="none" stroke="#9DB6D6" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 6" />
        </g>

        {/* uniform label pills */}
        <g fontSize="9.5" fontWeight="600" fill="#0F1E36">
          <g transform="translate(150 300)" filter="url(#pm-soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><circle cx="-19" cy="0" r="4.5" fill="#0F9D58" /><text x="6" y="3" textAnchor="middle">GROEN</text></g>
          <g transform="translate(300 224)" filter="url(#pm-soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><rect x="-23.5" y="-4.5" width="9" height="9" fill="#2F6CAE" /><text x="6" y="3" textAnchor="middle">BLAUW</text></g>
          <g transform="translate(431 164)" filter="url(#pm-soft)"><rect x="-30" y="-9" width="60" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><rect x="-20" y="-4.5" width="9" height="9" fill="#D14343" transform="rotate(45 -15.5 0)" /><text x="6" y="3" textAnchor="middle">ROOD</text></g>
          <g transform="translate(560 104)" filter="url(#pm-soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><g transform="translate(-21 0)"><rect x="-5" y="-3.5" width="6.5" height="6.5" fill="#0F1E36" transform="rotate(45 -1.75 0)" /><rect x="2" y="-3.5" width="6.5" height="6.5" fill="#0F1E36" transform="rotate(45 5.25 0)" /></g><text x="7" y="3" textAnchor="middle">ZWART</text></g>
          <g transform="translate(692 171)" filter="url(#pm-soft)" onClick={onOpenQuant} style={{ cursor: onOpenQuant ? 'pointer' : 'default' }}>
            <rect x="-52" y="-9" width="104" height="18" rx="9" fill="#fff" stroke="#F3D2B0" />
            <g transform="translate(-34 0)"><rect x="-5" y="-3.5" width="6.5" height="6.5" fill="#F08C2E" transform="rotate(45 -1.75 0)" /><rect x="2" y="-3.5" width="6.5" height="6.5" fill="#F08C2E" transform="rotate(45 5.25 0)" /></g>
            <text x="6" y="3" textAnchor="middle" fill="#9A3412">OFF-PISTE</text>
          </g>
          {!offpisteUnlocked && (
            <g transform="translate(692 184)" filter="url(#pm-soft)" onClick={onOpenQuant} style={{ cursor: onOpenQuant ? 'pointer' : 'default' }}>
              <rect x="-39" y="-7.5" width="78" height="15" rx="7.5" fill="#FFF7ED" stroke="#F08C2E" strokeWidth="0.9" />
              <text x="0" y="2.6" fontSize="7.6" fontWeight="700" fill="#9A3412" textAnchor="middle" letterSpacing="0.04em">ONTGRENDELEN</text>
            </g>
          )}
        </g>

        {/* ski-school = mentorship (clickable) */}
        <g transform="translate(390 352)" onClick={onOpenMentorship} style={{ cursor: onOpenMentorship ? 'pointer' : 'default' }}>
          {/* schaduw */}
          <ellipse cx="0" cy="20" rx="34" ry="5" fill="#0B4A8F" opacity="0.10" />
          {/* leraar (instructeur, rood) */}
          <g filter="url(#pm-soft)">
            <circle cx="-9" cy="-14" r="4" fill="#F4C9A0" />
            <rect x="-12.5" y="-10" width="7" height="15" rx="3" fill="#D14343" />
            {/* arm met stok, wijzend */}
            <line x1="-6" y1="-6" x2="4" y2="-12" stroke="#D14343" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="-12" x2="6" y2="2" stroke="#7A4E2A" strokeWidth="1.2" strokeLinecap="round" />
            {/* benen + ski */}
            <line x1="-10.5" y1="5" x2="-12" y2="13" stroke="#33425C" strokeWidth="2" strokeLinecap="round" />
            <line x1="-7.5" y1="5" x2="-6" y2="13" stroke="#33425C" strokeWidth="2" strokeLinecap="round" />
            <rect x="-18" y="13" width="18" height="2.4" rx="1.2" fill="#2F6CAE" />
          </g>
          {/* leerling (kleiner, blauw) */}
          <g filter="url(#pm-soft)">
            <circle cx="11" cy="-7" r="3.3" fill="#F4C9A0" />
            <rect x="8" y="-3.5" width="6" height="12" rx="2.6" fill="#2F6CAE" />
            <line x1="9.5" y1="8" x2="8.5" y2="14" stroke="#33425C" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12.5" y1="8" x2="13.5" y2="14" stroke="#33425C" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="4" y="14" width="15" height="2.2" rx="1.1" fill="#0F9D58" />
          </g>
          {/* label-pill */}
          <g transform="translate(0 30)" filter="url(#pm-soft)">
            <rect x="-66" y="-9" width="132" height="18" rx="9" fill="#fff" stroke="#E3E8EF" />
            <text y="3" fontSize="9.5" fontWeight="700" fill="#9A3412" textAnchor="middle">SKI-SCHOOL · MENTORSHIP</text>
          </g>
          {/* status: aangevraagd */}
          {mentorshipRequested && (
            <g transform="translate(0 45)" filter="url(#pm-soft)">
              <rect x="-34" y="-7.5" width="68" height="15" rx="7.5" fill="#ECFDF3" stroke="#0F9D58" strokeWidth="0.9" />
              <text y="2.6" fontSize="7.6" fontWeight="700" fill="#0A6B3B" textAnchor="middle" letterSpacing="0.04em">AANGEVRAAGD</text>
            </g>
          )}
        </g>

        {/* après-ski bar = community (clickable) */}
        <g transform="translate(700 300)" onClick={onOpenCommunity} style={{ cursor: onOpenCommunity ? 'pointer' : 'default' }}>
          <ellipse cx="0" cy="58" rx="86" ry="9" fill="#0B4A8F" opacity="0.12" />
          <circle cx="0" cy="30" r="64" fill="url(#pm-glow)" />
          <g filter="url(#pm-soft)">
            <rect x="-50" y="20" width="100" height="40" rx="2.5" fill="#7A4E2A" />
            <polygon points="-58,20 0,-10 58,20" fill="#4A2F18" />
            <polygon points="-58,20 0,-10 58,20" fill="#fff" opacity="0.5" />
          </g>
          <rect x="-35" y="30" width="17" height="17" rx="1.5" fill="#FFD37A" /><rect x="18" y="30" width="17" height="17" rx="1.5" fill="#FFD37A" />
          <rect x="-7.5" y="34" width="15" height="26" rx="1.5" fill="#3A2410" />
          <rect x="33" y="-2" width="9" height="15" fill="#4A2F18" />
          <path d="M37.5 -4 q-6.5 -8 0 -14 q6.5 -6.5 0 -13" fill="none" stroke="#cfd8e3" strokeWidth="2.2" opacity="0.7" />
          <path d="M-55 16 Q0 7 55 16" fill="none" stroke="#C2410C" strokeWidth="1.1" />
          <circle cx="-35" cy="12.5" r="2.1" fill="#FFB347" /><circle cx="-13" cy="10" r="2.1" fill="#7AD1FF" /><circle cx="13" cy="10" r="2.1" fill="#FF8FA3" /><circle cx="35" cy="12.5" r="2.1" fill="#9DFFB0" />
          <g transform="translate(-58 38)"><rect x="-1.8" y="-35" width="3.4" height="47" rx="1.7" fill="#D14343" transform="rotate(14)" /><rect x="-1.8" y="-35" width="3.4" height="47" rx="1.7" fill="#2F6CAE" transform="rotate(-14)" /><ellipse cx="0" cy="13" rx="10" ry="3" fill="#fff" opacity="0.8" /></g>
          <g transform="translate(58 26)"><rect x="-6" y="0" width="13" height="38" rx="6.5" fill="#0F9D58" transform="rotate(12)" /></g>
          <g fill="#5A3A1E"><rect x="-25" y="58" width="10" height="6" rx="1" /><rect x="12" y="60" width="10" height="6" rx="1" /></g>
          <g transform="translate(0 76)" filter="url(#pm-soft)"><rect x="-72" y="-9" width="144" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><text y="3" fontSize="9.5" fontWeight="700" fill="#9A3412" textAnchor="middle">APRÈS-SKI · COMMUNITY</text></g>
        </g>
      </svg>
    </div>
  );
};
