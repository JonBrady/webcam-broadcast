import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithPopup, signOut as firebaseSignOut, AuthError } from 'firebase/auth';
import { auth, provider, db } from '../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stopAllActiveBroadcasts = async (userId: string) => {
    try {
      // Query for all active broadcasts by this user
      const broadcastsQuery = query(
        collection(db, 'broadcasts'),
        where('broadcasterUid', '==', userId),
        where('active', '==', true)
      );

      const snapshot = await getDocs(broadcastsQuery);
      
      // Update each broadcast to inactive
      const updates = snapshot.docs.map(async (broadcastDoc) => {
        const broadcastRef = doc(db, 'broadcasts', broadcastDoc.id);
        await updateDoc(broadcastRef, {
          active: false,
          endTime: serverTimestamp()
        });
      });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error stopping broadcasts:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user && loading) {
        // User has signed out, stop their broadcasts
        const previousUser = auth.currentUser;
        if (previousUser) {
          stopAllActiveBroadcasts(previousUser.uid);
        }
      }
      setUser(user);
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error('Auth state change error:', error);
      setError(error.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [loading]);

  const signIn = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error('Authentication error:', error);
      if (error instanceof Error) {
        const authError = error as AuthError;
        switch (authError.code) {
          case 'auth/popup-closed-by-user':
            setError('Sign-in cancelled. Please try again.');
            break;
          case 'auth/popup-blocked':
            setError('Pop-up blocked by browser. Please allow pop-ups for this site.');
            break;
          case 'auth/cancelled-popup-request':
            setError('Previous sign-in still in progress. Please wait.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your internet connection.');
            break;
          default:
            setError(authError.message || 'Failed to sign in. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      if (user) {
        await stopAllActiveBroadcasts(user.uid);
      }
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out. Please try again.');
      throw error;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}; 