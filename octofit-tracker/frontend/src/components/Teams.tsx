import { useApiData } from '../api/useApiData.js';

interface Team {
  _id?: string;
  name: string;
  mascot: string;
  members: string[];
}

export default function Teams() {
  const { data, loading, error } = useApiData<{ teams: Team[] }>('/api/teams');
  const teams = data?.teams ?? [];

  return <section><h2>Teams</h2>
    {loading ? <p role="status">Loading teams...</p>
      : error ? <p role="alert">Unable to load teams: {error}</p>
        : teams.length === 0 ? <p>No teams yet.</p>
          : <ul>{teams.map((team, index) => <li key={team._id ?? `${team.name}-${index}`}>
            {team.name} ({team.mascot}) <span>Members: {team.members.join(', ') || 'None'}</span>
          </li>)}</ul>}
  </section>;
}
