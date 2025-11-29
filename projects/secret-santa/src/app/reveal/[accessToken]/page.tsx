"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import confetti to avoid SSR issues
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

interface RevealData {
  participantName: string;
  assignedToName: string;
  event: {
    name: string;
    budget: string | null;
    eventDate: string | null;
    rules: string | null;
  };
}

type Phase = "loading" | "error" | "idle" | "opening" | "revealed";

// Snowflake component for background animation
function Snowfall() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="snowflake absolute text-white opacity-80"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${10 + Math.random() * 20}s`,
            fontSize: `${8 + Math.random() * 16}px`,
          }}
        >
          ❄
        </div>
      ))}
      <style jsx>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0.3;
          }
        }
        .snowflake {
          animation: snowfall linear infinite;
        }
      `}</style>
    </div>
  );
}

// Floating ornaments for extra festivity
function FloatingOrnaments() {
  const ornaments = ["🎄", "⭐", "🔔", "❄️", "✨", "🎅"];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {ornaments.map((ornament, i) => (
        <div
          key={i}
          className="absolute text-4xl opacity-20 animate-float"
          style={{
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + i}s`,
          }}
        >
          {ornament}
        </div>
      ))}
    </div>
  );
}

// Gift box component with 3D animation
function GiftBox({
  isOpening,
  isOpened,
  onClick,
  participantName,
}: {
  isOpening: boolean;
  isOpened: boolean;
  onClick: () => void;
  participantName: string;
}) {
  return (
    <div
      className={`relative cursor-pointer transition-all duration-700 transform perspective-1000 ${
        isOpening ? "scale-110" : isOpened ? "scale-100" : "hover:scale-105"
      }`}
      onClick={onClick}
    >
      {/* Gift box container */}
      <div
        className={`relative w-64 h-64 mx-auto transition-all duration-1000 ${
          isOpened ? "opacity-0 scale-50" : "opacity-100"
        }`}
      >
        {/* Box body */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-2xl transition-all duration-500 ${
            isOpening ? "animate-shake" : ""
          }`}
          style={{
            boxShadow: isOpening
              ? "0 0 60px rgba(239, 68, 68, 0.6), 0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Ribbon vertical */}
          <div className="absolute left-1/2 -translate-x-1/2 w-8 h-full bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500" />
          {/* Ribbon horizontal */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-8 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500" />
          {/* Bow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl filter drop-shadow-lg">
            🎀
          </div>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
        </div>

        {/* Sparkles around the box */}
        {!isOpened && (
          <div className="absolute -inset-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-sparkle"
                style={{
                  left: `${50 + 45 * Math.cos((i * Math.PI * 2) / 8)}%`,
                  top: `${50 + 45 * Math.sin((i * Math.PI * 2) / 8)}%`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Text prompt */}
      {!isOpened && (
        <div className="mt-8 text-center">
          <p className="text-2xl font-semibold text-white mb-2 drop-shadow-lg">
            Hi, {participantName}!
          </p>
          <p className="text-white/90 text-lg mb-4">
            Your Secret Santa assignment awaits...
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-medium transition-all hover:bg-white/20 hover:scale-105">
            <span>Tap to unwrap</span>
            <span className="animate-bounce">🎁</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Revealed content with staggered animations
function RevealedContent({
  data,
  show,
}: {
  data: RevealData;
  show: boolean;
}) {
  if (!show) return null;

  return (
    <div className="text-center space-y-8 animate-fadeInUp">
      {/* Main reveal */}
      <div className="space-y-4">
        <p className="text-xl text-white/80 font-medium">
          You&apos;re getting a gift for...
        </p>
        <div className="relative inline-block">
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-200 bg-clip-text text-transparent animate-shimmerText py-2">
            {data.assignedToName}
          </h2>
          <div className="absolute -inset-4 bg-yellow-400/20 blur-2xl rounded-full -z-10" />
        </div>
        <div className="text-6xl animate-bounce mt-4">🎄</div>
      </div>

      {/* Event details card */}
      <div className="mx-auto max-w-md backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-6 shadow-2xl animate-fadeInUp animation-delay-300">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
          <span>📋</span> Event Details
        </h3>
        <div className="space-y-4 text-left">
          {data.event.eventDate && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-white/60 text-sm font-medium">Date</p>
                <p className="text-white">
                  {new Date(data.event.eventDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
          {data.event.budget && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-white/60 text-sm font-medium">Budget</p>
                <p className="text-white">{data.event.budget}</p>
              </div>
            </div>
          )}
          {data.event.rules && (
            <div className="flex items-start gap-3">
              <span className="text-2xl">📜</span>
              <div>
                <p className="text-white/60 text-sm font-medium">Rules</p>
                <p className="text-white/90 text-sm whitespace-pre-wrap">{data.event.rules}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer message */}
      <div className="text-white/60 text-sm flex items-center justify-center gap-2">
        <span>Keep it secret, keep it safe!</span>
        <span className="text-lg">🤫</span>
      </div>
    </div>
  );
}

// Loading spinner with festive theme
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-white/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
          🎁
        </div>
      </div>
      <p className="text-white/80 text-lg font-medium animate-pulse">
        Loading your assignment...
      </p>
    </div>
  );
}

// Error display
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="backdrop-blur-xl bg-red-500/20 rounded-3xl border border-red-400/30 p-8 max-w-md mx-auto text-center">
      <div className="text-5xl mb-4">😔</div>
      <h2 className="text-xl font-semibold text-white mb-2">Oops!</h2>
      <p className="text-white/80">{message}</p>
    </div>
  );
}

export default function RevealPage() {
  const params = useParams();
  const accessToken = params.accessToken as string;

  const [data, setData] = useState<RevealData | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Track window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fetch assignment data
  useEffect(() => {
    async function fetchAssignment() {
      try {
        const response = await fetch(`/api/reveal/${accessToken}`);
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to load assignment");
        }
        const result = await response.json();
        setData(result);
        setPhase("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setPhase("error");
      }
    }

    fetchAssignment();
  }, [accessToken]);

  // Handle the reveal action
  const handleReveal = useCallback(() => {
    if (phase !== "idle") return;

    setPhase("opening");

    // After shake animation, reveal
    setTimeout(() => {
      setPhase("revealed");
      setShowConfetti(true);

      // Stop confetti after a few seconds
      setTimeout(() => setShowConfetti(false), 5000);
    }, 800);
  }, [phase]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-transparent to-transparent" />
      <Snowfall />
      <FloatingOrnaments />

      {/* Confetti */}
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.1}
          colors={["#fbbf24", "#ef4444", "#22c55e", "#ffffff", "#f97316"]}
        />
      )}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Event title */}
        {data && (
          <div className="text-center mb-12 animate-fadeInDown">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {data.event.name}
            </h1>
            <p className="text-white/70 text-lg">Secret Santa Gift Exchange</p>
          </div>
        )}

        {/* Phase-based content */}
        {phase === "loading" && <LoadingSpinner />}
        {phase === "error" && <ErrorDisplay message={error || "Unknown error"} />}
        {(phase === "idle" || phase === "opening") && data && (
          <GiftBox
            isOpening={phase === "opening"}
            isOpened={false}
            onClick={handleReveal}
            participantName={data.participantName}
          />
        )}
        {phase === "revealed" && data && (
          <RevealedContent data={data} show={true} />
        )}
      </div>

      {/* Custom styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) rotate(-2deg); }
          20%, 40%, 60%, 80% { transform: translateX(5px) rotate(2deg); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes shimmerText {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-shimmerText {
          background-size: 200% auto;
          animation: shimmerText 3s linear infinite;
        }

        .animate-sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.8s ease-out forwards;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
        }

        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </main>
  );
}
