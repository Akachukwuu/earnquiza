import { useState, useEffect } from "react";
import {
  Coins,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  LogOut,
  Shield,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { supabase } from "../lib/supabase";

interface DashboardProps {
  onNavigate: (page: "deposit" | "withdraw" | "admin" | "leaderboard") => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { signOut } = useAuth();
  const { userData, loading, refetch } = useUserData();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [timeUntilClaim, setTimeUntilClaim] = useState<string>("");
  const [canClaim, setCanClaim] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!userData) return;

    const updateTimer = () => {
      if (!userData.last_claim) {
        setCanClaim(true);
        setTimeUntilClaim("Ready to claim!");
        setProgress(100);
        return;
      }

      const lastClaim = new Date(userData.last_claim).getTime();
      const cooldownMs = userData.claim_cooldown * 60 * 10 * 1000;
      const nextClaim = lastClaim + cooldownMs;
      const now = Date.now();
      const diff = nextClaim - now;

      if (diff <= 0) {
        setCanClaim(true);
        setTimeUntilClaim("Ready to claim!");
        setProgress(100);
      } else {
        setCanClaim(false);
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeUntilClaim(`${hours}h ${minutes}m ${seconds}s`);

        const totalElapsed = cooldownMs - diff;
        const percent = (totalElapsed / cooldownMs) * 100;
        setProgress(Math.min(Math.max(percent, 0), 100));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleClaim = async () => {
    if (!userData || !canClaim) return;

    setClaiming(true);
    setClaimError("");

    try {
      const now = new Date().toISOString();
      const newBalance =
        parseFloat(userData.balance.toString()) +
        parseFloat(userData.earn_rate.toString());

      const { error } = await supabase
        .from("users")
        .update({
          balance: newBalance,
          last_claim: now,
        })
        .eq("id", userData.id);

      if (error) {
        setClaimError(error.message);
      } else {
        await refetch();
      }
    } catch (err) {
      setClaimError("Failed to claim reward");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">No user data found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Dashboard
          </h1>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="text-emerald-400" size={32} />
            <div>
              <p className="text-gray-400 text-sm">Your Balance</p>
              <p className="text-4xl md:text-5xl font-bold text-white">
                {parseFloat(userData.balance.toString()).toFixed(2)} PTs
              </p>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-emerald-400" size={20} />
              <p className="text-gray-300 font-medium">Next Claim</p>
            </div>
            <p
              className={`text-2xl font-bold ${
                canClaim ? "text-emerald-400" : "text-white"
              }`}
            >
              {timeUntilClaim}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Earn {parseFloat(userData.earn_rate.toString()).toFixed(2)} PTs
              per claim
            </p>

            {!canClaim && (
              <div className="w-full bg-gray-600/40 rounded-full h-3 mt-4 overflow-hidden">
                <motion.div
                  className="h-3 bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                />
              </div>
            )}
          </div>

          {claimError && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
              {claimError}
            </div>
          )}

          <button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className={`w-full py-4 font-bold text-lg rounded-lg transition-all duration-300 ${
              canClaim && !claiming
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-emerald-500/50 hover:scale-[1.02] animate-pulse"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {claiming
              ? "Claiming..."
              : canClaim
              ? "Claim Now"
              : "Cooldown Active"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => onNavigate("deposit")}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3 mb-2">
              <ArrowDownCircle className="text-blue-400" size={28} />
              <h3 className="text-xl font-bold text-white">
                Boost Your PT rate / Hour
              </h3>
            </div>
            <p className="text-gray-400 text-sm">Add funds to your account</p>
          </button>

          <button
            onClick={() => onNavigate("withdraw")}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3 mb-2">
              <ArrowUpCircle className="text-purple-400" size={28} />
              <h3 className="text-xl font-bold text-white">
                Convert PTs to cash(₦) and Withdraw
              </h3>
            </div>
            <p className="text-gray-400 text-sm">Transfer funds to your bank</p>
          </button>
        </div>

        {/* 🏆 Leaderboard Button */}
        <button
          onClick={() => onNavigate("leaderboard")}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-[1.02] mb-4 flex justify-center items-center gap-2"
        >
          <Trophy size={22} />
          View Leaderboard 🏆
        </button>

        {userData.is_admin && (
          <button
            onClick={() => onNavigate("admin")}
            className="w-full bg-gray-800 hover:bg-gray-750 border border-orange-700/50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3 mb-2">
              <Shield className="text-orange-400" size={28} />
              <h3 className="text-xl font-bold text-white">Admin Panel</h3>
            </div>
            <p className="text-gray-400 text-sm">Manage users and payments</p>
          </button>
        )}
      </div>

      {/* --- Social Media Links --- */}
      <div className="flex justify-center items-center gap-6 mt-8">
        {/* X / Twitter */}
        <a
          href="https://x.com/earnquiza"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.38 8.49 8.49 0 01-2.72 1.04A4.23 4.23 0 0016.11 4c-2.34 0-4.23 1.9-4.23 4.23 0 .33.04.66.11.97A12 12 0 013 5.15a4.2 4.2 0 001.31 5.63 4.17 4.17 0 01-1.91-.53v.05c0 2.03 1.44 3.73 3.35 4.11a4.3 4.3 0 01-1.9.07 4.25 4.25 0 003.96 2.95A8.5 8.5 0 012 19.54 12 12 0 008.29 21c7.55 0 11.68-6.26 11.68-11.68 0-.18 0-.36-.01-.54A8.36 8.36 0 0022.46 6z" />
          </svg>
        </a>

        {/* Facebook */}
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 4.99 3.66 9.12 8.44 9.88v-6.99H7.9v-2.89h2.4V9.83c0-2.38 1.42-3.7 3.6-3.7 1.04 0 2.12.18 2.12.18v2.33h-1.19c-1.17 0-1.53.73-1.53 1.47v1.76h2.61l-.42 2.89h-2.19v6.99c4.78-.76 8.44-4.89 8.44-9.88z" />
          </svg>
        </a>

        {/* Instagram */}
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zm4.25 4.25a5 5 0 110 10 5 5 0 010-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm5.25-.88a1.13 1.13 0 110 2.26 1.13 1.13 0 010-2.26z" />
          </svg>
        </a>

        {/* ✅ Telegram */}
        <a
          href="https://t.me/earnquiza"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-400 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M9.04 15.59l-.37 4.4c.53 0 .76-.23 1.03-.51l2.48-2.36 5.15 3.77c.95.53 1.62.25 1.88-.88l3.4-15.97v-.01c.3-1.34-.48-1.87-1.38-1.55L1.7 9.67c-1.3.51-1.28 1.25-.23 1.58l4.22 1.31L18.59 5.5c.56-.34 1.08-.15.66.19" />
          </svg>
        </a>
      </div>
    </div>
  );
}
