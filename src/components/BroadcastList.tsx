import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Broadcast {
  id: string;
  broadcasterName: string;
  title: string;
  active: boolean;
  viewerCount: number;
  startTime: Date;
  thumbnail?: string;
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
    <div className="broadcast-list">
      <h2>Live Broadcasts</h2>
      {broadcasts.length === 0 ? (
        <p>No active broadcasts</p>
      ) : (
        <div className="broadcast-grid">
          {broadcasts.map(broadcast => (
            <div key={broadcast.id} className="broadcast-card">
              {broadcast.thumbnail ? (
                <div className="thumbnail-container">
                  <img 
                    src={broadcast.thumbnail} 
                    alt={`${broadcast.title} thumbnail`}
                    className="broadcast-thumbnail"
                  />
                </div>
              ) : (
                <div className="thumbnail-placeholder">
                  <span>No Preview</span>
                </div>
              )}
              <div className="broadcast-info">
                <h3>{broadcast.title}</h3>
                <p>Broadcaster: {broadcast.broadcasterName}</p>
                <p>Viewers: {broadcast.viewerCount}</p>
                <button 
                  onClick={() => handleBroadcastAction(broadcast)}
                  className={`button ${broadcast.broadcasterUid === user?.uid ? 'button-primary' : 'button-secondary'}`}
                >
                  {broadcast.broadcasterUid === user?.uid ? 'Manage Broadcast' : 'Join Broadcast'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 