import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import VideoFeed from './components/VideoFeed';
import BroadcastList from './components/BroadcastList';
import { BroadcastProvider, useBroadcast } from './contexts/BroadcastContext';
import './App.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './config/firebase';

const Navigation: React.FC = () => {
  const { user, signIn, signOut, error } = useAuth();
  const { isCurrentlyBroadcasting, setIsCurrentlyBroadcasting } = useBroadcast();
  const [currentBroadcastTitle, setCurrentBroadcastTitle] = useState<string>('');
  const [broadcastId, setBroadcastId] = useState<string>('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (user) {
      try {
        const broadcastsQuery = query(
          collection(db, 'broadcasts'),
          where('broadcasterUid', '==', user.uid),
          where('active', '==', true)
        );

        unsubscribe = onSnapshot(broadcastsQuery, (snapshot) => {
          const activeBroadcast = snapshot.docs[0];
          if (activeBroadcast) {
            setCurrentBroadcastTitle(activeBroadcast.data().title);
            setBroadcastId(activeBroadcast.id);
            setIsCurrentlyBroadcasting(true);
          } else {
            setCurrentBroadcastTitle('');
            setBroadcastId('');
            setIsCurrentlyBroadcasting(false);
          }
        });
      } catch (error) {
        console.error('Error setting up broadcast listener:', error);
      }
    } else {
      setCurrentBroadcastTitle('');
      setBroadcastId('');
      setIsCurrentlyBroadcasting(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, setIsCurrentlyBroadcasting]);

  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <Link to="/">Webcam Broadcast</Link>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        {user && !isCurrentlyBroadcasting && (
          <Link to="/broadcast">Start Broadcasting</Link>
        )}
        {user && isCurrentlyBroadcasting && broadcastId && (
          <Link to={`/broadcast/${broadcastId}`} className="current-broadcast">
            {currentBroadcastTitle}
          </Link>
        )}
      </div>
      <div className="nav-auth">
        {error && <div className="auth-error">{error}</div>}
        {user ? (
          <div className="user-info">
            <span>{user.displayName}</span>
            <button onClick={signOut}>Sign Out</button>
          </div>
        ) : (
          <button onClick={signIn}>Sign In</button>
        )}
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <BroadcastProvider>
        <Router>
          <div className="app-container">
            <Navigation />
            <Routes>
              <Route path="/" element={<BroadcastList />} />
              <Route path="/broadcast" element={<VideoFeed />} />
              <Route path="/broadcast/:broadcastId" element={<VideoFeed />} />
              <Route path="/watch/:broadcastId" element={<VideoFeed isViewer={true} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </BroadcastProvider>
    </AuthProvider>
  );
}

export default App;
