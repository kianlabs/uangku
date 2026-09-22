"use client";

import { motion, MotionConfig } from "motion/react";

export type MascotMood =
  | "happy"
  | "excited"
  | "thinking"
  | "worried"
  | "sleepy"
  | "celebrating"
  | "ok"
  | "firm";

type MascotVariant =
  | "classic"
  | "glasses"
  | "peace"
  | "cap"
  | "bow"
  | "sparkle";

interface MascotProps {
  size?: number;
  label?: string;
  className?: string;
  animated?: boolean;
  mood?: MascotMood;
  variant?: MascotVariant;
  /**
   * Offset fase loop (detik, negatif untuk mulai di tengah siklus).
   * Dipakai agar beberapa Mochi di satu layar tidak bergerak sinkron.
   */
  delay?: number;
}

const SVG_ORIGIN = {
  transformBox: "fill-box",
  transformOrigin: "center",
} as const;

const EASE_IN_OUT = "easeInOut" as const;

/**
 * Mochi — maskot pemandu UangKu (dompet biru + koin hijau).
 *
 * 8 mood dengan gaya animasi berbeda:
 * - happy: mengambang + kedip + melambai (default)
 * - ok: mengambang pelan + acungan jempol (rekomendasi aman baik-baik saja)
 * - firm: nyaris diam + alis tegas (refleksi/teguran santai)
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
  variant = "classic",
  delay = 0,
}: MascotProps) {
  const loop = (duration: number) => ({
    duration,
    repeat: Infinity,
    ease: EASE_IN_OUT,
    delay,
  });

  const motionProps = animated
    ? {
        // Tiap mood punya sidik gerak sendiri — tidak ada yang sama persis.
        bob:
          mood === "celebrating"
            ? {
                animate: { y: [0, -10, 0], rotate: [0, -3, 3, 0] },
                transition: loop(1.9),
              }
            : mood === "excited"
              ? {
                  animate: { y: [0, -8, 0], rotate: [0, -2, 2, 0] },
                  transition: loop(1.6),
                }
              : mood === "worried"
                ? {
                    animate: { x: [0, -1.5, 1.5, 0], y: [0, -2, 0] },
                    transition: loop(1.1),
                  }
                : mood === "thinking"
                  ? {
                      animate: { rotate: [-1.2, 1.2, -1.2] },
                      transition: loop(5),
                    }
                  : mood === "ok"
                    ? {
                        animate: { y: [0, -4, 0] },
                        transition: loop(3.6),
                      }
                  : mood === "firm"
                    ? {
                        animate: { y: [0, -3, 0] },
                        transition: loop(4.2),
                      }
                  : mood === "sleepy"
                    ? {
                        animate: { y: [0, -3, 0], rotate: [0, 1.2, 0] },
                        transition: loop(4.6),
                      }
                    : {
                        animate: { y: [0, -5, 0] },
                        transition: loop(3.2),
                      },
        blink: {
          animate: { scaleY: [1, 1, 0.08, 1, 1] },
          transition: loop(
            mood === "worried" ? 2.2 : mood === "thinking" ? 6 : mood === "celebrating" ? 3.2 : mood === "ok" ? 4.8 : mood === "firm" ? 5.4 : 4.4
          ),
        },
        wave: {
          animate: {
            rotate:
              mood === "excited"
                ? [0, -30, 14, 0]
                : mood === "celebrating"
                  ? [0, -26, 12, 0]
                  : mood === "worried"
                    ? [0, -14, 8, 0]
                    : mood === "thinking"
                      ? [0, -8, 4, 0]
                      : [0, -22, 10, 0],
          },
          transition: loop(
            mood === "excited" || mood === "worried"
              ? 1.2
              : mood === "celebrating"
                ? 1.6
                : mood === "thinking"
                  ? 5
                  : 2.4
          ),
        },
        coin: {
          animate: { y: [0, -6, 0], rotate: [0, 8, 0] },
          transition: loop(mood === "excited" ? 2.4 : mood === "sleepy" ? 5 : mood === "firm" ? 4.4 : 3.8),
        },
        drip: {
          animate: { y: [0, 4, 0], opacity: [1, 0.7, 1] },
          transition: loop(2),
        },
        floaty: {
          animate: { y: [0, -5, 0], opacity: [0.7, 1, 0.7] },
          transition: loop(3.5),
        },
        confetti: {
          animate: { y: [0, -8, 0], rotate: [0, 20, 0], opacity: [0.6, 1, 0.6] },
          transition: loop(1.8),
        },
      }
    : { bob: {}, blink: {}, wave: {}, coin: {}, drip: {}, floaty: {}, confetti: {} };

  const showBlush =
    mood === "happy" || mood === "excited" || mood === "celebrating" || mood === "ok";

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
          data-mascot-variant={variant}
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

          {/* aksesori kepala alternatif */}
          {variant === "cap" && mood !== "celebrating" && (
            <g>
              <path d="M46 58 Q80 34 114 58 L108 68 H52 Z" fill="#27865a" />
              <path d="M101 58 Q124 58 132 66 Q116 70 103 66 Z" fill="#1259ad" />
            </g>
          )}

          {variant === "bow" && (
            <g>
              <path d="M67 55 Q56 43 48 54 Q55 65 68 60 Z" fill="#f9a8d4" />
              <path d="M93 55 Q104 43 112 54 Q105 65 92 60 Z" fill="#f9a8d4" />
              <circle cx="80" cy="57" r="6" fill="#f43f5e" />
            </g>
          )}

          {variant === "sparkle" && (
            <g fill="#f9a8d4">
              <path d="M25 67 l3 8 8 3-8 3-3 8-3-8-8-3 8-3 Z" />
              <path d="M137 91 l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5 Z" />
            </g>
          )}

          {/* konfeti */}
          {mood === "celebrating" && (
            <motion.g {...motionProps.confetti} style={SVG_ORIGIN}>
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

          {/* tangan kanan: tiap variant punya gestur khas bila tidak ditentukan mood. */}
          {variant === "peace" ? (
            <g>
              <line x1="127" y1="100" x2="139" y2="82" stroke="#024691" strokeWidth="7" strokeLinecap="round" />
              <line x1="139" y1="82" x2="134" y2="68" stroke="#024691" strokeWidth="5" strokeLinecap="round" />
              <line x1="139" y1="82" x2="147" y2="70" stroke="#024691" strokeWidth="5" strokeLinecap="round" />
              <circle cx="139" cy="82" r="5" fill="#024691" />
            </g>
          ) : mood === "sleepy" ? (
            <line
              x1="127"
              y1="102"
              x2="137"
              y2="118"
              stroke="#024691"
              strokeWidth="7"
              strokeLinecap="round"
            />
          ) : mood === "firm" ? (
            <line
              x1="129"
              y1="100"
              x2="133"
              y2="121"
              stroke="#024691"
              strokeWidth="7"
              strokeLinecap="round"
            />
          ) : mood === "ok" ? (
            <g>
              <line
                x1="127"
                y1="100"
                x2="140"
                y2="84"
                stroke="#024691"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="141" cy="80" r="7.5" fill="#024691" />
              <rect x="137.5" y="64" width="7" height="15" rx="3.5" fill="#024691" />
            </g>
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

          {/* alis tegas: miring ke dalam */}
          {mood === "firm" && (
            <g stroke="#0b1f3a" strokeWidth="3" strokeLinecap="round">
              <line x1="55" y1="83" x2="70" y2="87" />
              <line x1="90" y1="87" x2="105" y2="83" />
            </g>
          )}

          {/* kacamata */}
          {variant === "glasses" && (
            <g stroke="#0b1f3a" strokeWidth="3" fill="#ffffff" fillOpacity="0.2">
              <rect x="51" y="91" width="25" height="18" rx="7" />
              <rect x="84" y="91" width="25" height="18" rx="7" />
              <line x1="76" y1="96" x2="84" y2="96" />
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
          ) : mood === "thinking" || mood === "firm" ? (
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
