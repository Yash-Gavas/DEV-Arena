import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, TrendingUp, Crown, Medal, ChevronUp, Code2, BrainCircuit } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const positionStyles = {
  1: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Crown, color: 'text-amber-400' },
  2: { bg: 'bg-zinc-400/10', border: 'border-zinc-400/30', icon: Medal, color: 'text-zinc-300' },
  3: { bg: 'bg-orange-600/10', border: 'border-orange-600/30', icon: Medal, color: 'text-orange-400' },
};

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/leaderboard`, { withCredentials: true })
      .then(r => setLeaderboard(r.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const myEntry = leaderboard.find(e => e.user_id === user?.user_id);

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-20 pb-10 px-4 sm:px-6 lg:px-8" data-testid="leaderboard-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl tracking-tight font-bold font-['Chivo'] flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" /> Leaderboard
          </h1>
          <p className="text-zinc-400 text-sm mt-1">See how you rank against other candidates</p>
        </div>

        {/* Your Position Card */}
        {myEntry && (
          <Card className="bg-blue-600/10 border-blue-500/30 mb-6" data-testid="my-rank-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold font-['Chivo'] text-xl">
                  #{myEntry.position}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Your Position</p>
                  <p className="text-xs text-zinc-400">{myEntry.xp} XP - <span style={{ color: myEntry.rank_color }}>{myEntry.rank}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-center">
                <div>
                  <p className="text-lg font-bold text-emerald-400">{myEntry.problems_solved}</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Solved</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-400">{myEntry.interviews_completed}</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Interviews</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-400">{myEntry.max_score || '-'}</p>
                  <p className="text-[9px] text-zinc-500 uppercase">Best Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Table */}
        <Card className="bg-[#141414] border-white/10">
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              <div className="col-span-1">#</div>
              <div className="col-span-4">User</div>
              <div className="col-span-2 text-center">Rank</div>
              <div className="col-span-1 text-center">XP</div>
              <div className="col-span-1 text-center flex items-center justify-center gap-1"><Code2 className="w-3 h-3" /> Solved</div>
              <div className="col-span-1 text-center flex items-center justify-center gap-1"><BrainCircuit className="w-3 h-3" /> Intv</div>
              <div className="col-span-2 text-center">Best Score</div>
            </div>

            {/* Rows */}
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">No users yet. Be the first to climb the ranks!</div>
            ) : (
              leaderboard.map((entry) => {
                const isMe = entry.user_id === user?.user_id;
                const ps = positionStyles[entry.position];
                const PosIcon = ps?.icon || ChevronUp;
                return (
                  <div key={entry.user_id}
                    data-testid={`leaderboard-row-${entry.position}`}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5 transition-all ${
                      isMe ? 'bg-blue-600/5 border-l-2 border-l-blue-500' : ''
                    } ${ps ? ps.bg : 'hover:bg-white/[0.02]'}`}>
                    {/* Position */}
                    <div className="col-span-1">
                      {entry.position <= 3 ? (
                        <PosIcon className={`w-5 h-5 ${ps?.color}`} />
                      ) : (
                        <span className="text-sm font-mono text-zinc-500">{entry.position}</span>
                      )}
                    </div>
                    {/* User */}
                    <div className="col-span-4 flex items-center gap-2">
                      {entry.picture ? (
                        <img src={entry.picture} alt="" className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {(entry.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className={`text-sm font-semibold ${isMe ? 'text-blue-400' : 'text-zinc-200'}`}>
                          {entry.name} {isMe && <span className="text-[9px] text-blue-400 ml-1">(You)</span>}
                        </p>
                      </div>
                    </div>
                    {/* Rank */}
                    <div className="col-span-2 text-center">
                      <span className="text-xs font-bold" style={{ color: entry.rank_color }}>{entry.rank}</span>
                    </div>
                    {/* XP */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-mono text-zinc-300">{entry.xp}</span>
                    </div>
                    {/* Problems Solved */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-mono text-emerald-400">{entry.problems_solved}</span>
                    </div>
                    {/* Interviews */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-mono text-blue-400">{entry.interviews_completed}</span>
                    </div>
                    {/* Best Score */}
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-sm font-bold font-['Chivo'] ${
                          entry.max_score >= 75 ? 'text-green-400' : entry.max_score >= 50 ? 'text-yellow-400' : entry.max_score > 0 ? 'text-red-400' : 'text-zinc-600'
                        }`}>
                          {entry.max_score || '-'}
                        </span>
                        {entry.avg_score > 0 && (
                          <span className="text-[9px] text-zinc-600">avg {entry.avg_score}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
