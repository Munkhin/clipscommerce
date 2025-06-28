// src/components/social-connection.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useState, useEffect } from 'react';

interface SocialAccount {
  platform: string;
  username: string;
}

export function SocialConnection() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/social-credentials');
        if (response.ok) {
          const data = await response.json();
          // TODO: Fetch username from a different endpoint
          const formattedAccounts = data.map((acc: any) => ({
            platform: acc.platform,
            username: 'Connected',
          }));
          setAccounts(formattedAccounts);
        }
      } catch (error) {
        console.error('Failed to fetch social accounts:', error);
      }
      setLoading(false);
    };

    fetchAccounts();
  }, []);

  const handleConnect = (platform: string) => {
    // TODO: Implement OAuth flow for the given platform
    console.log(`Connecting to ${platform}...`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Manage your connected social media accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading accounts...</p>
        ) : accounts.length > 0 ? (
          <ul className="space-y-4">
            {accounts.map((account) => (
              <li key={account.platform} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-bold">{account.platform}</p>
                  <p className="text-sm text-gray-500">{account.username}</p>
                </div>
                <Button variant="destructive">Disconnect</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No accounts connected yet.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={() => handleConnect('tiktok')}>Connect TikTok</Button>
        <Button onClick={() => handleConnect('instagram')}>Connect Instagram</Button>
        <Button onClick={() => handleConnect('youtube')}>Connect YouTube</Button>
      </CardFooter>
    </Card>
  );
}

