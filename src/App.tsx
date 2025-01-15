import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import VideoFeed from './components/VideoFeed';
import BroadcastList from './components/BroadcastList';
import { BroadcastProvider } from './contexts/BroadcastContext';
import './App.css';

const Navigation: React.FC = () => {
  const { user, signIn, signOut } = useAuth();

  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <Link to="/">Webcam Broadcast</Link>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        {user && <Link to="/broadcast">Start Broadcasting</Link>}
      </div>
      <div className="nav-auth">
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
