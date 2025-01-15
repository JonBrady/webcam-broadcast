import React, { useState, useRef, useEffect } from 'react';
import { addDoc, collection, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useBroadcast } from '../contexts/BroadcastContext';

interface VideoFeedProps {
  isViewer?: boolean;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ isViewer = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { broadcastId: paramBroadcastId } = useParams();
  const { setIsCurrentlyBroadcasting } = useBroadcast();

  // Check if there's an active broadcast when component mounts
  useEffect(() => {
    const checkBroadcastStatus = async () => {
      if (paramBroadcastId) {
        try {
          const broadcastRef = doc(db, 'broadcasts', paramBroadcastId);
          const broadcastSnap = await getDoc(broadcastRef);
          
          if (broadcastSnap.exists()) {
            const broadcastData = broadcastSnap.data();
            if (broadcastData.broadcasterUid === user?.uid && broadcastData.active) {
              setBroadcastId(paramBroadcastId);
              setIsBroadcasting(true);
              setBroadcastTitle(broadcastData.title);
              setIsCurrentlyBroadcasting(true);
            }
          }
        } catch (err) {
          console.error('Error checking broadcast status:', err);
          setError('Failed to check broadcast status');
        }
      }
    };

    checkBroadcastStatus();
  }, [paramBroadcastId, user?.uid, setIsCurrentlyBroadcasting]);

  const tryDifferentConstraints = async () => {
    const constraints = [
      { video: true }, // Basic constraint
      { video: { facingMode: 'user' } }, // Front camera
      { video: { facingMode: 'environment' } }, // Back camera
      { video: { width: 640, height: 480 } }, // Lower resolution
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } } // HD
    ];

    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        return stream;
      } catch (err) {
        console.log(`Failed with constraint:`, constraint, err);
        continue;
      }
    }
    throw new Error('None of the camera constraints worked');
  };

  const setupCamera = async () => {
    try {
      setIsLoading(true);
      setError('');

      // First, check if any video devices are available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No video devices found');
      }

      console.log('Available video devices:', videoDevices);

      // Try to get the stream with different constraints
      const stream = await tryDifferentConstraints();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera setup error:', err);
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotReadableError':
            setError('Camera is in use by another application. Please close other apps using the camera.');
            break;
          case 'NotAllowedError':
            setError('Camera access denied. Please allow camera access in your browser settings.');
            break;
          case 'NotFoundError':
            setError('No camera found. Please connect a camera and try again.');
            break;
          case 'SecurityError':
            setError('Security error: Make sure you\'re using HTTPS or localhost.');
            break;
          default:
            setError(`Camera error: ${err.message}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  const handleRetry = () => {
    setupCamera();
  };

  const startBroadcast = async () => {
    if (!user || !broadcastTitle.trim()) {
      setError('Please enter a broadcast title');
      return;
    }

    try {
      const broadcastRef = await addDoc(collection(db, 'broadcasts'), {
        broadcasterUid: user.uid,
        broadcasterName: user.displayName || 'Anonymous',
        title: broadcastTitle.trim(),
        active: true,
        viewerCount: 0,
        startTime: serverTimestamp()
      });

      setBroadcastId(broadcastRef.id);
      setIsBroadcasting(true);
      setIsCurrentlyBroadcasting(true);
      navigate(`/broadcast/${broadcastRef.id}`);
    } catch (err) {
      console.error('Error starting broadcast:', err);
      setError('Failed to start broadcast. Please try again.');
    }
  };

  const stopBroadcast = async () => {
    if (!broadcastId) return;

    try {
      const broadcastRef = doc(db, 'broadcasts', broadcastId);
      await updateDoc(broadcastRef, {
        active: false,
        endTime: serverTimestamp()
      });
      
      setIsBroadcasting(false);
      setIsCurrentlyBroadcasting(false);
      setBroadcastId(null);
      setBroadcastTitle('');
      navigate('/');
    } catch (err) {
      console.error('Error stopping broadcast:', err);
      setError('Failed to stop broadcast. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="status-message">Initializing camera...</div>;
  }

  return (
    <div className={`video-container ${isViewer ? 'viewer-mode' : ''}`}>
      {error ? (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button 
            className="retry-button"
            onClick={handleRetry}
          >
            Try Again
          </button>
          <div className="troubleshooting-tips">
            Tips:
            <ul>
              <li>Close other applications using your camera</li>
              <li>Check browser permissions (click camera icon in address bar)</li>
              <li>Restart your browser</li>
              <li>Make sure your camera is properly connected</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
          </div>
          
          {!isViewer && (
            <div className="broadcast-controls">
              {!isBroadcasting ? (
                <>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Enter broadcast title..."
                    className="broadcast-title-input"
                  />
                  <button
                    className="start-broadcast-button"
                    onClick={startBroadcast}
                    disabled={!broadcastTitle.trim() || !user}
                  >
                    Start Broadcasting
                  </button>
                </>
              ) : (
                <button
                  className="stop-broadcast-button"
                  onClick={stopBroadcast}
                >
                  Stop Broadcasting
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoFeed; 