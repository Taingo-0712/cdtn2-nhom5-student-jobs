import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import { httpClient } from './api/httpClient.js';
import { useAuth } from './auth/AuthContext.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import CreateJobPage from './pages/CreateJobPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import EmployerJobsPage from './pages/employer/EmployerJobsPage.jsx';
import JobListPage from './pages/jobs/JobListPage.jsx';
import JobDetailPage from './pages/jobs/JobDetailPage.jsx';
import RequireRole from './routes/RequireRole.jsx';

function CreateJobRoute() {
  const { session } = useAuth();
  const navigate = useNavigate();

  // Quay về WF10 để danh sách tải lại sau khi đăng thành công.
  function returnToEmployerJobs() {
    navigate('/employer/jobs');
  }

  return (
    <CreateJobPage
      token={session.token}
      onCancel={returnToEmployerJobs}
      onCreated={returnToEmployerJobs}
    />
  );
}

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
          setResult({
            type: 'error',
            text: 'Không kết nối được backend. Kiểm tra cổng 8080.',
          });
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
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />

          {/* Cả WF10 và WF11 đều yêu cầu vai trò nhà tuyển dụng. */}
          <Route element={<RequireRole roles={['EMPLOYER']} />}>
            <Route
              path="/employer/jobs"
              element={<EmployerJobsPage createJobPath="/employer/jobs/new" />}
            />
            <Route path="/employer/jobs/new" element={<CreateJobRoute />} />
          </Route>

          <Route
            path="*"
            element={<StatusMessage type="empty">Trang không tồn tại.</StatusMessage>}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}