'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './staff.css';

interface StaffAssignment {
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Candidate {
  id: string;
  email: string;
}

export default function StaffClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [staffRes, candRes] = await Promise.all([
        fetch(`/api/events/${eventId}/staff`),
        fetch('/api/staff/candidates')
      ]);

      if (staffRes.status === 401 || candRes.status === 401) {
        router.push('/login');
        return;
      }
      if (staffRes.status === 403 || candRes.status === 403) {
        setError('You are not authorized to manage staff for this event.');
        return;
      }

      if (!staffRes.ok) throw new Error('Failed to load assignments');
      if (!candRes.ok) throw new Error('Failed to load candidates');

      const staffData = await staffRes.json();
      const candData = await candRes.json();

      setAssignments(staffData.data || []);
      setCandidates(candData.data || []);
    } catch {
      setError('An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      setAssigning(true);
      setAssignError('');
      
      const res = await fetch(`/api/events/${eventId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedCandidate }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 409) {
        setAssignError('Staff tersebut sudah ditugaskan pada event ini.');
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setAssignError(errorData.message || 'Failed to assign staff.');
        return;
      }

      // Success
      setSelectedCandidate('');
      fetchData(); // revalidate
    } catch {
      setAssignError('Network error during assignment.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/staff/${userId}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        setError('Forbidden');
        return;
      }

      if (!res.ok && res.status !== 404) {
        throw new Error('Failed to remove assignment');
      }

      fetchData(); // revalidate
    } catch {
      setError('An error occurred while removing the assignment.');
    }
  };

  if (loading) return <div aria-live="polite">Loading...</div>;
  if (error) return <div className="error-card" aria-live="assertive">{error}</div>;

  return (
    <div className="staff-client-container">
      <section className="staff-assignment-form">
        <h2>Assign New Staff</h2>
        <form onSubmit={handleAssign} className="assign-form">
          <select 
            value={selectedCandidate}
            onChange={(e) => setSelectedCandidate(e.target.value)}
            disabled={assigning || candidates.length === 0}
            aria-label="Select staff candidate"
          >
            <option value="">-- Select Staff --</option>
            {candidates.map(cand => (
              <option key={cand.id} value={cand.id}>{cand.email}</option>
            ))}
          </select>
          <button type="submit" disabled={!selectedCandidate || assigning}>
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
        </form>
        {assignError && <p className="assign-error" aria-live="polite">{assignError}</p>}
      </section>

      <section className="staff-assignment-list">
        <h2>Assigned Staff</h2>
        {assignments.length === 0 ? (
          <p>No staff assigned yet.</p>
        ) : (
          <ul className="assignment-list">
            {assignments.map(assignment => {
              const isStale = !assignment.isActive || assignment.role !== 'STAFF';
              return (
                <li key={assignment.userId} className={`assignment-item ${isStale ? 'stale' : ''}`}>
                  <div className="assignment-info">
                    <span className="email">{assignment.email}</span>
                    {isStale && <span className="stale-badge" aria-label="stale assignment">Inactive / Role Changed</span>}
                    <div className="meta">
                      Assigned: {new Date(assignment.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    className="remove-btn" 
                    onClick={() => handleRemove(assignment.userId)}
                    aria-label={`Remove assignment for ${assignment.email}`}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
