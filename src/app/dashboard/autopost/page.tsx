// src/app/dashboard/autopost/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AutopostModal } from '@/components/autopost-modal';
import { SocialConnection } from '@/components/social-connection';

interface Schedule {
  id: string;
  platform: string;
  content: string;
  post_time: string;
  status: string;
}

export default function AutopostPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/autopost');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Autopost Dashboard</h1>
        <AutopostModal onSuccess={fetchSchedules} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading schedules...</p>
          ) : schedules.length > 0 ? (
            <ul className="space-y-4">
              {schedules.map((schedule) => (
                <li key={schedule.id} className="p-4 border rounded-lg">
                  <p><strong>Platform:</strong> {schedule.platform}</p>
                  <p><strong>Content:</strong> {schedule.content}</p>
                  <p><strong>Post Time:</strong> {new Date(schedule.post_time).toLocaleString()}</p>
                  <p><strong>Status:</strong> {schedule.status}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No posts scheduled yet.</p>
          )}
        </CardContent>
      </Card>

      <SocialConnection />
    </div>
  );
}
