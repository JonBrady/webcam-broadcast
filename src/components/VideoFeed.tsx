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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [shouldCameraBeOn, setShouldCameraBeOn] = useState(false);
  const [localBroadcastId, setLocalBroadcastId] = useState<string | null>(null);

  // Function to ensure camera is completely stopped
  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasUserMedia(false);
  };

  // Move initializeCamera to component scope
  const initializeCamera = async () => {
    if (isViewer) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No video devices found');
      }

      const stream = await tryDifferentConstraints();
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasUserMedia(true);
        setShouldCameraBeOn(true);
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

  // Camera initialization effect
  useEffect(() => {
    // Initialize camera when on broadcast page or when starting a broadcast
    if (!isViewer && (!paramBroadcastId || isBroadcasting)) {
      initializeCamera();
    }

    // Cleanup function
    return () => {
      if (!shouldCameraBeOn) {
        stopCamera();
      }
    };
  }, [isViewer, paramBroadcastId, isBroadcasting]);

  // Check broadcast status effect
  useEffect(() => {
    const checkBroadcastStatus = async () => {
      if (!paramBroadcastId) {
        // If no broadcast ID and we're not broadcasting, reset state
        if (!isBroadcasting) {
          setIsBroadcasting(false);
          setIsCurrentlyBroadcasting(false);
          setBroadcastTitle('');
          setShouldCameraBeOn(false);
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
            setShouldCameraBeOn(true);
            
            // Reconnect the video element to the stream if it exists
            if (streamRef.current && videoRef.current) {
              videoRef.current.srcObject = streamRef.current;
              setHasUserMedia(true);
            } else {
              // If we don't have a stream, initialize the camera
              initializeCamera();
            }
          } else {
            // If broadcast exists but we're not the broadcaster or it's not active
            setIsBroadcasting(false);
            setIsCurrentlyBroadcasting(false);
            setBroadcastTitle('');
            setShouldCameraBeOn(false);
          }
        } else {
          // If broadcast doesn't exist
          setIsBroadcasting(false);
          setIsCurrentlyBroadcasting(false);
          setBroadcastTitle('');
          setShouldCameraBeOn(false);
        }
      } catch (err) {
        console.error('Error checking broadcast status:', err);
        setError('Failed to check broadcast status');
      }
    };

    checkBroadcastStatus();
  }, [paramBroadcastId, user?.uid, setIsCurrentlyBroadcasting, isBroadcasting]);

  const stopStream = async () => {
    // Stop camera immediately
    stopCamera();
    setShouldCameraBeOn(false);

    try {
      // Then update broadcast status
      if (user && !isViewer && (broadcastId || paramBroadcastId)) {
        const broadcastRef = doc(db, 'broadcasts', broadcastId || paramBroadcastId || '');
        await updateDoc(broadcastRef, {
          active: false,
          endTime: serverTimestamp()
        });
      }

      // Reset state
      setIsBroadcasting(false);
      setIsCurrentlyBroadcasting(false);
      setBroadcastTitle('');
      navigate('/');
    } catch (error) {
      console.error('Error stopping broadcast:', error);
      setError('Failed to stop broadcast. Please try again.');
    }
  };

  const captureThumbnail = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject('Video or canvas reference not available');
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Could not get canvas context');
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64 image
      try {
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      } catch (err) {
        reject('Failed to create thumbnail');
      }
    });
  };

  const startBroadcast = async () => {
    if (!user || !broadcastTitle.trim()) {
      setError('Please enter a broadcast title');
      return;
    }

    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      setError('Video stream is not ready yet. Please wait a moment and try again.');
      return;
    }

    try {
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          resolve(true);
        } else if (videoRef.current) {
          videoRef.current.addEventListener('loadeddata', () => resolve(true), { once: true });
        }
      });

      // Now capture thumbnail
      const thumbnail = await captureThumbnail();

      const broadcastRef = await addDoc(collection(db, 'broadcasts'), {
        broadcasterUid: user.uid,
        broadcasterName: user.displayName || 'Anonymous',
        title: broadcastTitle.trim(),
        active: true,
        viewerCount: 0,
        startTime: serverTimestamp(),
        endTime: null,
        thumbnail: thumbnail
      });

      setLocalBroadcastId(broadcastRef.id);
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

  // Auth state change listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (!user) {
        setShouldCameraBeOn(false);
        await stopStream();
      }
    });

    return () => {
      unsubscribe();
      setShouldCameraBeOn(false);
      stopCamera();
    };
  }, []);

  const updateThumbnail = async () => {
    try {
      const thumbnail = await captureThumbnail();
      const broadcastRef = doc(db, 'broadcasts', broadcastId || paramBroadcastId || '');
      await updateDoc(broadcastRef, { thumbnail });
    } catch (err) {
      console.error('Error updating thumbnail:', err);
      setError('Failed to update thumbnail');
    }
  };

  if (isLoading) {
    return <div className="status-message">Initializing camera...</div>;
  }

  return (
    <div className="video-container">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
        {/* Hidden canvas for thumbnail capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </div>
      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
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
      )}
      {!isViewer && hasUserMedia && !isBroadcasting && (
        <div className="broadcast-controls">
          <input
            type="text"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Enter broadcast title..."
          />
          <button 
            onClick={startBroadcast}
            className="button button-primary"
            disabled={!broadcastTitle.trim()}
          >
            Start Broadcasting
          </button>
        </div>
      )}
      {!isViewer && hasUserMedia && isBroadcasting && (
        <div className="broadcast-controls">
          <button 
            onClick={stopStream}
            className="button button-danger"
          >
            Stop Broadcasting
          </button>
          <button
            onClick={updateThumbnail}
            className="button button-secondary"
          >
            Update Thumbnail
          </button>
        </div>
      )}
    </div>
  );
} 