import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { httpClient } from './api/httpClient.js';
import StatusMessage from './components/StatusMessage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import JobListPage from './pages/jobs/JobListPage.jsx';
import JobDetailPage from './pages/jobs/JobDetailPage.jsx'; // Nạp màn WF05.

function FoundationPage() {
  const [result, setResult] = useState({ type: 'loading', text: 'Đang kết nối…' });

  useEffect(() => {
    const controller = new AbortController();

    httpClient('/health', { signal: controller.signal })
      .then((response) => {
        if (response?.data?.status === 'ok') {
          setResult({ type: 'success', text: 'Đã kết nối backend' });
        } else {
          setResult({ type: 'empty', text: 'Chưa có dữ liệu trạng thái.' });
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult({ type: 'error', text: 'Không kết nối được backend. Kiểm tra cổng 8080.' });
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <h1>Bộ khung Demo 1</h1>
      <StatusMessage type={result.type}>{result.text}</StatusMessage>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <header className="shell">
        <Link to="/">Việc làm sinh viên Nhóm 5</Link>
      </header>
      <main className="shell">
        <Routes>
          <Route path="/" element={<FoundationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/jobs" element={<JobListPage />} />
          {/* WF05: jobId là mã tin lấy từ URL. */}
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          <Route path="*" element={<StatusMessage type="empty">Trang không tồn tại.</StatusMessage>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}