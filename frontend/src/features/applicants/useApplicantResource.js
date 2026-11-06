import { useEffect, useState } from 'react';

// Isolated K01 loader: never show an old applicant after ID/token/page changes.
export function useApplicantResource(load, token) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (token) {
      Promise.resolve().then(() => load(controller.signal))
        .then((data) => { if (active) setResult({ load, token, attempt, data }); })
        .catch((error) => { if (active) setResult({ load, token, attempt, error }); });
    }
    return () => { active = false; controller.abort(); };
  }, [load, token, attempt]);

  const retry = () => setAttempt((value) => value + 1);
  if (!token) return { error: new Error('Cần đăng nhập để xem ứng viên.'), retry };
  if (!result || result.load !== load || result.token !== token || result.attempt !== attempt) {
    return { loading: true, retry };
  }
  return { data: result.data, error: result.error, retry };
}
