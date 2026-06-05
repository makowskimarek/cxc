"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { TeamScore } from "@/lib/db/queries";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_INTERVAL = 10;

const medals = ["🥇", "🥈", "🥉"];

export default function TvPage() {
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const { data } = useSWR<TeamScore[]>("/api/dashboard", fetcher, {
    refreshInterval: REFRESH_INTERVAL * 1000,
    revalidateOnFocus: false,
    onSuccess: () => setCountdown(REFRESH_INTERVAL),
  });

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const competitions = data?.[0]?.competitions ?? [];

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-12 py-6 border-b border-white/10">
        <div>
          <div className="text-4xl font-black tracking-widest text-white">CXC</div>
          <div className="text-lg text-white/60 tracking-wide">Carbon Extreme Challenge</div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-mono font-bold text-white">{String(countdown).padStart(2, "0")}</div>
          <div className="text-sm text-white/40">do odświeżenia</div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-8 py-6">
        {!data ? (
          <div className="flex items-center justify-center h-full text-white/40 text-3xl">
            Ładowanie…
          </div>
        ) : (
          <table className="w-full h-full border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-4 px-4 text-white/50 text-lg font-normal w-16">#</th>
                <th className="text-left py-4 px-4 text-white/50 text-lg font-normal">Drużyna</th>
                {competitions.map((c) => (
                  <th key={c.competitionId} className="text-center py-4 px-3 text-white/50 text-base font-normal max-w-[100px]">
                    <span className="line-clamp-2">{c.competitionName}</span>
                  </th>
                ))}
                <th className="text-right py-4 px-6 text-white/70 text-xl font-semibold">PUNKTY</th>
              </tr>
            </thead>
            <tbody>
              {data.map((team, idx) => (
                <tr
                  key={team.teamId}
                  className="border-b border-white/10 transition-all duration-500"
                  style={{ opacity: 1 - idx * 0.04 }}
                >
                  <td className="py-5 px-4 text-3xl text-center">
                    {medals[idx] ?? <span className="text-white/40 text-2xl font-bold">{idx + 1}</span>}
                  </td>
                  <td className="py-5 px-4 text-3xl font-bold tracking-wide">{team.teamName}</td>
                  {team.competitions.map((c) => (
                    <td key={c.competitionId} className="py-5 px-3 text-center text-2xl font-mono">
                      {c.hasResult
                        ? <span className="text-white/80 font-semibold">{c.rankingPoints}</span>
                        : <span className="text-white/25">—</span>}
                    </td>
                  ))}
                  <td className="py-5 px-6 text-right text-4xl font-black text-white">
                    {team.totalRankingPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Countdown bar */}
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-white/60 transition-none"
          style={{ width: `${(countdown / REFRESH_INTERVAL) * 100}%`, transition: "width 1s linear" }}
        />
      </div>
    </div>
  );
}
