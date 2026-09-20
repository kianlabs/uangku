"use client";

import { motion, MotionConfig } from "motion/react";

export type MascotMood =
  | "happy"
  | "excited"
  | "thinking"
  | "worried"
  | "sleepy"
  | "celebrating";

interface MascotProps {
  size?: number;
  label?: string;
  className?: string;
  animated?: boolean;
  mood?: MascotMood;
}

const SVG_ORIGIN = {
  transformBox: "fill-box",
  transformOrigin: "center",
} as const;

const EASE_IN_OUT = "easeInOut" as const;

/**
 * Mochi — maskot pemandu UangKu (dompet biru + koin hijau).
 *
 * 6 mood dengan gaya animasi berbeda:
 * - happy: mengambang + kedip + melambai (default)
 * - excited: memantul + mata berbinar
 * - thinking: diam + gelembung "?" (khidmat)
 * - worried: gelisah + tetes keringat
 * - sleepy: pelan + "Zzz" (nyaris diam)
 * - celebrating: melompat + topi pesta + konfeti
 *
 * Hormat prefers-reduced-motion via MotionConfig.
 */
export function Mascot({
  size = 120,
  label = "Maskot UangKu",
  className = "",
  animated = true,
  mood = "happy",
}: MascotProps) {
  const motionProps = animated
    ? {
        bob:
          mood === "celebrating"
            ? {
                animate: { y: [0, -10, 0] },
                transition: { duration: 1.9, repeat: Infinity, ease: EASE_IN_OUT },
              }
            : mood === "sleepy"
              ? {
                  animate: { y: [0, -3, 0] },
                  transition: { duration: 4.6, repeat: Infinity, ease: EASE_IN_OUT },
                }
              : {
                  animate: { y: [0, -5, 0] },
                  transition: { duration: 3.2, repeat: Infinity, ease: EASE_IN_OUT },
                },
        blink: {
          animate: { scaleY: [1, 1, 0.08, 1, 1] },
          transition: { duration: 4.4, repeat: Infinity, ease: EASE_IN_OUT },
        },
        wave: {
          animate: { rotate: [0, -22, 10, 0] },
          transition: { duration: 2.4, repeat: Infinity, ease: EASE_IN_OUT },
        },
        coin: {
          animate: { y: [0, -6, 0], rotate: [0, 8, 0] },
          transition: { duration: 3.8, repeat: Infinity, ease: EASE_IN_OUT },
        },
        drip: {
          animate: { y: [0, 4, 0], opacity: [1, 0.7, 1] },
          transition: { duration: 2, repeat: Infinity, ease: EASE_IN_OUT },
        },
        floaty: {
          animate: { y: [0, -5, 0], opacity: [0.7, 1, 0.7] },
          transition: { duration: 3, repeat: Infinity, ease: EASE_IN_OUT },
        },
      }
    : { bob: {}, blink: {}, wave: {}, coin: {}, drip: {}, floaty: {} };

  const showBlush =
    mood === "happy" || mood === "excited" || mood === "celebrating";

  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        role="img"
        aria-label={label}
        className={`inline-flex ${className}`}
        {...motionProps.bob}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          aria-hidden="true"
        >
          {/* koin hijau melayang */}
          <motion.g {...motionProps.coin} style={SVG_ORIGIN}>
            <circle cx="128" cy="34" r="15" fill="#27865a" />
            <circle
              cx="128"
              cy="34"
              r="10.5"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="2"
            />
            <text
              x="128"
              y="38.5"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#ffffff"
              fontFamily="inherit"
            >
              Rp
            </text>
          </motion.g>

          {/* topi pesta */}
          {mood === "celebrating" && (
            <g>
              <polygon points="80,14 60,54 100,54" fill="#27865a" />
              <rect x="58" y="50" width="44" height="8" rx="4" fill="#ffffff" fillOpacity="0.92" />
              <circle cx="80" cy="14" r="5.5" fill="#f9a8d4" />
            </g>
          )}

          {/* konfeti */}
          {mood === "celebrating" && (
            <motion.g {...motionProps.floaty} style={SVG_ORIGIN}>
              <circle cx="28" cy="46" r="3.5" fill="#27865a" />
              <circle cx="136" cy="72" r="3" fill="#024691" />
              <circle cx="22" cy="108" r="3" fill="#f43f5e" />
            </motion.g>
          )}

          {/* gelembung berpikir */}
          {mood === "thinking" && (
            <g>
              <circle cx="120" cy="66" r="3.5" fill="#ffffff" fillOpacity="0.95" />
              <circle cx="129" cy="56" r="5.5" fill="#ffffff" fillOpacity="0.95" />
              <circle cx="140" cy="41" r="11" fill="#ffffff" />
              <text
                x="140"
                y="46"
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="#024691"
                fontFamily="inherit"
              >
                ?
              </text>
            </g>
          )}

          {/* Zzz */}
          {mood === "sleepy" && (
            <motion.g {...motionProps.floaty} style={SVG_ORIGIN}>
              <text x="124" y="62" fontSize="15" fontWeight="700" fill="#798787" fontFamily="inherit">
                Z
              </text>
              <text x="136" y="44" fontSize="20" fontWeight="700" fill="#798787" fontFamily="inherit">
                Z
              </text>
            </motion.g>
          )}

          {/* kaki */}
          <rect x="58" y="126" width="16" height="9" rx="4.5" fill="#0b1f3a" />
          <rect x="86" y="126" width="16" height="9" rx="4.5" fill="#0b1f3a" />

          {/* tangan kiri */}
          <line
            x1="33"
            y1="104"
            x2="19"
            y2="94"
            stroke="#024691"
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* badan dompet */}
          <rect x="30" y="54" width="100" height="74" rx="20" fill="#024691" />
          {/* tutup dompet */}
          <path
            d="M30 74 a20 20 0 0 1 20 -20 h60 a20 20 0 0 1 20 20 v6 h-100 Z"
            fill="#1259ad"
          />
          {/* kartu mengintip */}
          <rect x="44" y="60" width="46" height="10" rx="5" fill="#ffffff" fillOpacity="0.92" />
          {/* pengait hijau */}
          <circle cx="122" cy="102" r="11" fill="#27865a" />
          <circle cx="122" cy="102" r="4" fill="#ffffff" />

          {/* tangan kanan: melambai, kecuali sleepy (turun) */}
          {mood === "sleepy" ? (
            <line
              x1="127"
              y1="102"
              x2="137"
              y2="118"
              stroke="#024691"
              strokeWidth="7"
              strokeLinecap="round"
            />
          ) : (
            <motion.g
              {...motionProps.wave}
              style={{ transformBox: "fill-box", transformOrigin: "left bottom" }}
            >
              <line
                x1="127"
                y1="100"
                x2="143"
                y2="80"
                stroke="#024691"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="143" cy="80" r="5" fill="#024691" />
            </motion.g>
          )}

          {/* mata */}
          {mood === "excited" ? (
            <g stroke="#0b1f3a" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M56 101 Q64 91 72 101" />
              <path d="M88 101 Q96 91 104 101" />
            </g>
          ) : mood === "sleepy" ? (
            <g stroke="#0b1f3a" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M56 100 Q64 105 72 100" />
              <path d="M88 100 Q96 105 104 100" />
            </g>
          ) : (
            <motion.g {...motionProps.blink} style={SVG_ORIGIN}>
              <ellipse cx="64" cy="100" rx="7.5" ry="8.5" fill="#ffffff" />
              <ellipse cx="96" cy="100" rx="7.5" ry="8.5" fill="#ffffff" />
              <circle
                cx={mood === "thinking" ? 66.5 : 65.5}
                cy="101.5"
                r="3.6"
                fill="#0b1f3a"
              />
              <circle
                cx={mood === "thinking" ? 98.5 : 97.5}
                cy="101.5"
                r="3.6"
                fill="#0b1f3a"
              />
              <circle cx="66.8" cy="100" r="1.2" fill="#ffffff" />
              <circle cx="98.8" cy="100" r="1.2" fill="#ffffff" />
            </motion.g>
          )}

          {/* alis khawatir */}
          {mood === "worried" && (
            <g stroke="#0b1f3a" strokeWidth="3" strokeLinecap="round">
              <line x1="55" y1="86" x2="70" y2="82.5" />
              <line x1="90" y1="82.5" x2="105" y2="86" />
            </g>
          )}

          {/* pipi */}
          {showBlush && (
            <>
              <ellipse cx="53" cy="110" rx="5.5" ry="3.4" fill="#f9a8d4" fillOpacity="0.85" />
              <ellipse cx="107" cy="110" rx="5.5" ry="3.4" fill="#f9a8d4" fillOpacity="0.85" />
            </>
          )}

          {/* mulut */}
          {mood === "excited" || mood === "celebrating" ? (
            <g>
              <ellipse cx="80" cy="117" rx="8" ry="9" fill="#0b1f3a" />
              <ellipse cx="80" cy="120.5" rx="4" ry="3.4" fill="#f9a8d4" />
            </g>
          ) : mood === "thinking" ? (
            <line
              x1="74"
              y1="116"
              x2="88"
              y2="116"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : mood === "worried" ? (
            <path
              d="M70 117 q5 -5 10 0 q5 5 10 0"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : mood === "sleepy" ? (
            <circle cx="80" cy="117" r="3" stroke="#ffffff" strokeWidth="2.5" fill="none" />
          ) : (
            <path
              d="M70 114 Q80 123 90 114"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* keringat khawatir */}
          {mood === "worried" && (
            <motion.path
              d="M113 74 c4 6 6 9 6 13 a6 6 0 1 1 -12 0 c0 -4 2 -7 6 -13 Z"
              fill="#93c5fd"
              {...motionProps.drip}
              style={SVG_ORIGIN}
            />
          )}
        </svg>
      </motion.span>
    </MotionConfig>
  );
}
