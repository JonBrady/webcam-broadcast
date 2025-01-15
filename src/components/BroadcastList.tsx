import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Broadcast {
  id: string;
  title: string;
  broadcasterName: string;
  broadcasterUid: string;
  viewerCount: number;
  active: boolean;
  startTime: { toMillis(): number } | null;
}

export default function BroadcastList() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const broadcastsQuery = query(
      collection(db, 'broadcasts'),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(broadcastsQuery, (snapshot) => {
      const broadcastList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Broadcast))
        .sort((a, b) => {
          const timeA = a.startTime?.toMillis?.() || 0;
          const timeB = b.startTime?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setBroadcasts(broadcastList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching broadcasts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBroadcastAction = (broadcast: Broadcast) => {
    if (broadcast.broadcasterUid === user?.uid) {
      navigate(`/broadcast/${broadcast.id}`);
    } else {
      navigate(`/watch/${broadcast.id}`);
    }
  };

  if (loading) {
    return <div>Loading broadcasts...</div>;
  }

  return (
    <div>
      <h2>Live Broadcasts</h2>
      {broadcasts.length === 0 ? (
        <p>No active broadcasts at the moment.</p>
      ) : (
        <div className="broadcast-grid">
          {broadcasts.map((broadcast) => (
            <div key={broadcast.id} className="broadcast-card">
              <h3>{broadcast.title}</h3>
              <p>Broadcaster: {broadcast.broadcasterName}</p>
              <p>Viewers: {broadcast.viewerCount}</p>
              <button
                onClick={() => handleBroadcastAction(broadcast)}
                style={{
                  backgroundColor: broadcast.broadcasterUid === user?.uid ? '#4CAF50' : '#2196F3',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {broadcast.broadcasterUid === user?.uid ? 'Manage Broadcast' : 'Join Broadcast'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 