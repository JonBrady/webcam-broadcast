import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Broadcast {
  id: string;
  broadcasterName: string;
  broadcasterUid: string;
  title: string;
  active: boolean;
  viewerCount: number;
  startTime: Date;
  endTime?: Date;
}

const BroadcastList: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Only get active broadcasts and ensure they have no endTime
    const broadcastsQuery = query(
      collection(db, 'broadcasts'),
      where('active', '==', true),
      where('endTime', '==', null)
    );
    
    const unsubscribe = onSnapshot(broadcastsQuery, (snapshot) => {
      const broadcastList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          viewerCount: doc.data().viewerCount || 0
        } as Broadcast))
        .filter(broadcast => broadcast.active && !broadcast.endTime)
        .sort((a, b) => b.viewerCount - a.viewerCount);

      setBroadcasts(broadcastList);
    });

    return () => unsubscribe();
  }, []);

  const handleJoinBroadcast = (broadcastId: string) => {
    navigate(`/watch/${broadcastId}`);
  };

  return (
    <div className="broadcast-list">
      <h2>Live Broadcasts</h2>
      {broadcasts.length === 0 ? (
        <p style={{ color: 'white' }}>No active broadcasts at the moment.</p>
      ) : (
        <div className="broadcast-grid">
          {broadcasts.map(broadcast => (
            <div key={broadcast.id} className="broadcast-card">
              <h3>{broadcast.title}</h3>
              <div className="broadcast-info">
                <p>Broadcaster: {broadcast.broadcasterName}</p>
                <p>Viewers: {broadcast.viewerCount}</p>
                <p>Started: {broadcast.startTime?.toLocaleTimeString()}</p>
              </div>
              {broadcast.broadcasterUid === user?.uid ? (
                <button 
                  onClick={() => navigate(`/broadcast/${broadcast.id}`)}
                  className="manage-broadcast-button"
                >
                  Manage Broadcast
                </button>
              ) : (
                <button 
                  onClick={() => handleJoinBroadcast(broadcast.id)}
                  className="join-button"
                >
                  Join Broadcast
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BroadcastList; 