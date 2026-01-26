import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import SetupWizard from '../components/admin/SetupWizard';
import AdminDashboard from '../components/admin/AdminDashboard';

export default function AdminPanel({ mode }: { mode: 'setup' | 'dashboard' }) {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/api/admin/setup/status');
      setCompleted(Boolean(data?.completed));
    })().catch(() => setCompleted(false));
  }, []);

  if (completed === null) return <div className="p-6">Loading...</div>;

  if (mode === 'setup') {
    if (completed) {
      return <AdminDashboard />;
    }
    return <SetupWizard />;
  }

  // mode dashboard
  if (!completed) {
    return <SetupWizard />;
  }
  return <AdminDashboard />;
}
