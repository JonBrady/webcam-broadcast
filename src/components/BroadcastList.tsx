import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Broadcast {
  id: string;
  title: string;
  broadcasterName: string;
  broadcasterUid: string;
  viewerCount: number;
  startTime: any;
  active: boolean;
}

const BroadcastList: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const broadcastsQuery = query(
      collection(db, 'broadcasts'),
      where('active', '==', true),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(broadcastsQuery, (snapshot) => {
      const broadcastsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Broadcast));
      setBroadcasts(broadcastsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching broadcasts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBroadcastAction = (broadcast: Broadcast) => {
    if (broadcast.broadcasterUid === user?.uid) {
      // If user is the broadcaster, navigate to manage broadcast
      navigate(`/broadcast/${broadcast.id}`);
    } else {
      // If user is a viewer, navigate to watch broadcast
      navigate(`/watch/${broadcast.id}`);
    }
  };

  if (loading) {
    return <div className="broadcast-list">Loading broadcasts...</div>;
  }

  return (
    <div className="broadcast-list">
      <h2>Live Broadcasts</h2>
      {broadcasts.length === 0 ? (
        <p>No active broadcasts at the moment.</p>
      ) : (
        <div className="broadcast-grid">
          {broadcasts.map((broadcast) => (
            <div key={broadcast.id} className="broadcast-card">
              <h3>{broadcast.title}</h3>
              <div className="broadcast-info">
                <p>Broadcaster: {broadcast.broadcasterName}</p>
                <p>Viewers: {broadcast.viewerCount}</p>
              </div>
              <button
                className="join-button"
                onClick={() => handleBroadcastAction(broadcast)}
              >
                {broadcast.broadcasterUid === user?.uid ? 'Manage Broadcast' : 'Join Broadcast'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BroadcastList; 