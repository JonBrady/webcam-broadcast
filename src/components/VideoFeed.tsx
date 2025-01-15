import React, { useState, useRef, useEffect } from 'react';
import { addDoc, collection, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useBroadcast } from '../contexts/BroadcastContext';
import { User } from 'firebase/auth';

interface VideoFeedProps {
  isViewer?: boolean;
  broadcastId?: string;
}

export default function VideoFeed({ isViewer, broadcastId }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasUserMedia, setHasUserMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const { user } = useAuth();
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();
  const { setIsCurrentlyBroadcasting } = useBroadcast();
  const { broadcastId: paramBroadcastId } = useParams();

  // Check if there's an active broadcast when component mounts
  useEffect(() => {
    const checkBroadcastStatus = async () => {
      if (!paramBroadcastId) {
        // If no broadcast ID and we're not broadcasting, reset state
        if (!isBroadcasting) {
          setIsBroadcasting(false);
          setIsCurrentlyBroadcasting(false);
          setBroadcastTitle('');
        }
        return;
      }

      try {
        const broadcastRef = doc(db, 'broadcasts', paramBroadcastId);
        const broadcastSnap = await getDoc(broadcastRef);
        
        if (broadcastSnap.exists()) {
          const broadcastData = broadcastSnap.data();
          if (broadcastData.broadcasterUid === user?.uid && broadcastData.active) {
            setBroadcastTitle(broadcastData.title);
            setIsBroadcasting(true);
            setIsCurrentlyBroadcasting(true);
          } else {
            // If broadcast exists but we're not the broadcaster or it's not active
            setIsBroadcasting(false);
            setIsCurrentlyBroadcasting(false);
            setBroadcastTitle('');
          }
        } else {
          // If broadcast doesn't exist
          setIsBroadcasting(false);
          setIsCurrentlyBroadcasting(false);
          setBroadcastTitle('');
        }
      } catch (err) {
        console.error('Error checking broadcast status:', err);
        setError('Failed to check broadcast status');
      }
    };

    checkBroadcastStatus();
  }, [paramBroadcastId, user?.uid, setIsCurrentlyBroadcasting, isBroadcasting]);

  const stopStream = async () => {
    try {
      // First update the broadcast status
      if (user && !isViewer && (broadcastId || paramBroadcastId)) {
        const broadcastRef = doc(db, 'broadcasts', broadcastId || paramBroadcastId || '');
        await updateDoc(broadcastRef, {
          active: false,
          endTime: serverTimestamp()
        });
      }

      // Then stop the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Finally update component state
      setIsBroadcasting(false);
      setIsCurrentlyBroadcasting(false);
      setBroadcastTitle('');
      setHasUserMedia(false);
      navigate('/');
    } catch (error) {
      console.error('Error stopping broadcast:', error);
      setError('Failed to stop broadcast. Please try again.');
    }
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

      setIsBroadcasting(true);
      setIsCurrentlyBroadcasting(true);
      navigate(`/broadcast/${broadcastRef.id}`);
    } catch (err) {
      console.error('Error starting broadcast:', err);
      setError('Failed to start broadcast. Please try again.');
    }
  };

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

  useEffect(() => {
    const initializeCamera = async () => {
      if (isViewer) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // If we already have a stream, reuse it
        if (streamRef.current) {
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            setHasUserMedia(true);
          }
          setIsLoading(false);
          return;
        }

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
          streamRef.current = stream;
          setHasUserMedia(true);
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

    // Initialize camera if we're not a viewer and we don't have a stream yet
    if (!isViewer && !streamRef.current) {
      initializeCamera();
    }

    // Only cleanup when component is unmounting AND we're not just navigating
    return () => {
      const isNavigating = paramBroadcastId || window.location.pathname.includes('/broadcast/');
      if (!isNavigating && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isViewer, paramBroadcastId]);

  // Add auth state change listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        await stopStream();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <div className="status-message">Initializing camera...</div>;
  }

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', maxWidth: '600px' }}
      />
      {error && (
        <div className="error-container">
          <div className="error-message" style={{ color: '#ff4444' }}>{error}</div>
          <div className="troubleshooting-tips" style={{ marginTop: '10px', color: '#ffffff' }}>
            Tips:
            <ul>
              <li>Close other applications using your camera</li>
              <li>Check browser permissions (click camera icon in address bar)</li>
              <li>Restart your browser</li>
              <li>Make sure your camera is properly connected</li>
            </ul>
          </div>
        </div>
      )}
      {!isViewer && hasUserMedia && !isBroadcasting && (
        <div className="broadcast-controls" style={{ marginTop: '20px' }}>
          <input
            type="text"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Enter broadcast title..."
            style={{
              padding: '10px',
              marginRight: '10px',
              borderRadius: '5px',
              border: '1px solid #ccc'
            }}
          />
          <button 
            onClick={startBroadcast}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            disabled={!broadcastTitle.trim()}
          >
            Start Broadcasting
          </button>
        </div>
      )}
      {!isViewer && hasUserMedia && isBroadcasting && (
        <button 
          onClick={stopStream}
          className="stop-broadcast-button"
          style={{
            backgroundColor: '#ff4444',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Stop Broadcasting
        </button>
      )}
    </div>
  );
} 