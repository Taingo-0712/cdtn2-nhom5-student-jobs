import { Route, Routes } from 'react-router-dom';
import EmployerApplicantsPage from '../../pages/EmployerApplicantsPage.jsx';
import ApplicationDetailPage from '../../pages/ApplicationDetailPage.jsx';

// Optional route subtree for Tài to mount inside the EXISTING BrowserRouter.
// No BrowserRouter, auth storage, job API or CV implementation is created here.
export default function ApplicantRoutes({ token, getJob, renderCv }) {
  return (
    <Routes>
      <Route path="/employer/jobs/:job_id/applications" element={<EmployerApplicantsPage token={token} getJob={getJob} />} />
      <Route path="/employer/applications/:application_id" element={<ApplicationDetailPage token={token} renderCv={renderCv} />} />
    </Routes>
  );
}
