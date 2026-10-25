import { useApiData } from '../api/useApiData.js';
import { getJson } from '../api/client.js';

interface LeaderboardEntry {
  teamName: string;
  totalPoints: number;
  rank: number;
}

const loadLeaderboard = (path: string) => getJson<{ leaderboard: LeaderboardEntry[] }>(path);

export default function Leaderboard() {
  const { data, loading, error } = useApiData('/api/leaderboard', loadLeaderboard);
  const entries = data?.leaderboard ?? [];

  return <section><h2>Leaderboard</h2>
    {loading ? <p role="status">Loading leaderboard...</p>
      : error ? <p role="alert">Unable to load leaderboard: {error}</p>
        : entries.length === 0 ? <p>No leaderboard scores yet.</p>
          : <ol>{entries.map((entry) => <li key={`${entry.rank}-${entry.teamName}`}>
            {entry.teamName}: {entry.totalPoints} points
          </li>)}</ol>}
  </section>;
}
