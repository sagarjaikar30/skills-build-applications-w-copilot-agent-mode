import { useApiData } from '../api/useApiData.js';

interface Activity {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
}

export default function Activities() {
  const { data, loading, error } = useApiData<{ activities: Activity[] }>('/api/activities');
  const activities = data?.activities ?? [];

  return <section><h2>Activities</h2>
    {loading ? <p role="status">Loading activities...</p>
      : error ? <p role="alert">Unable to load activities: {error}</p>
        : activities.length === 0 ? <p>No activities yet.</p>
          : <ul>{activities.map((activity, index) => <li key={activity._id ?? `${activity.type}-${index}`}>
            {activity.type}: {activity.minutes} minutes, {activity.points} points
          </li>)}</ul>}
  </section>;
}
