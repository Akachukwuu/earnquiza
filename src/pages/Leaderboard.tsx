import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardProps {
  onBack: () => void;
}

interface Fren {
  id: string;
  balance: number;
}

// ✅ Helper: Format large PT numbers (e.g. 45K, 1.2M)
function formatPT(value: number): string {
  if (value >= 1_000_000)
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1_000)
    return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return value.toFixed(2);
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [frens, setFrens] = useState<Fren[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopFrens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, balance")
      .order("balance", { ascending: false })
      .limit(10);

    if (!error && data) setFrens(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTopFrens();
    const interval = setInterval(fetchTopFrens, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* 🔙 Header Section */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-400" />
            Top 10 Frens 🏆
          </h1>
        </div>

        {/* 🏅 Leaderboard List */}
        <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl p-6">
          {loading ? (
            <div className="text-gray-400 text-center py-6">
              Loading leaderboard...
            </div>
          ) : frens.length === 0 ? (
            <div className="text-gray-400 text-center py-6">No frens yet!</div>
          ) : (
            <ul className="space-y-4">
              {frens.map((fren, index) => {
                const medal =
                  index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : "";

                return (
                  <motion.li
                    key={fren.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between bg-gray-700/40 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Circle */}
                      <div
                        className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                          index === 0
                            ? "bg-yellow-500 text-black"
                            : index === 1
                            ? "bg-gray-300 text-black"
                            : index === 2
                            ? "bg-amber-700 text-white"
                            : "bg-gray-600 text-white"
                        }`}
                      >
                        {index + 1}
                      </div>

                      {/* Fren Label + Medal */}
                      <span className="text-gray-200 font-medium flex items-center gap-1">
                        Fren #{index + 1} {medal && <span>{medal}</span>}
                      </span>
                    </div>

                    {/* PT Display */}
                    <span className="text-emerald-400 font-bold">
                      {formatPT(fren.balance)} PTs
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
