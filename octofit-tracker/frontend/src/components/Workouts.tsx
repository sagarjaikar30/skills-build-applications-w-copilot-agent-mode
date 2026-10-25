import { useApiData } from '../api/useApiData.js';

interface WorkoutSuggestion {
  _id?: string;
  title: string;
  focus: string;
  minutes: number;
  difficulty: string;
  reason?: string;
}

export default function Workouts() {
  const userEmail = 'mona@example.com';
  const { data, loading, error } = useApiData<{ suggestions: WorkoutSuggestion[] }>(
    `/api/workouts/suggestions/${encodeURIComponent(userEmail)}`,
  );
  const suggestions = data?.suggestions ?? [];

  return <section><h2>Workout suggestions</h2>
    {loading ? <p role="status">Loading workout suggestions...</p>
      : error ? <p role="alert">Unable to load workout suggestions: {error}</p>
        : suggestions.length === 0 ? <p>No workout suggestions yet.</p>
          : <ul>{suggestions.map((workout, index) => <li key={workout._id ?? `${workout.title}-${index}`}>
            <strong>{workout.title}</strong> ({workout.focus}, {workout.minutes} minutes, {workout.difficulty})
            {workout.reason && <p>{workout.reason}</p>}
          </li>)}</ul>}
  </section>;
}
