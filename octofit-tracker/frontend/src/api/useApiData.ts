import { useEffect, useState } from 'react';
import { getJson } from './client.js';

interface ApiDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type ApiLoader<T> = (path: string) => Promise<T>;

export function useApiData<T>(path: string, load: ApiLoader<T>): ApiDataState<T> {
  const [state, setState] = useState<ApiDataState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    load(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unexpected error',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [path, load]);

  return state;
}