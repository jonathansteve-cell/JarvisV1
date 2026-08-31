import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  validateFirestoreConnection,
} from '../firebase';
import { TaskItem, ProcessItem, DriveData, HudTheme } from '../types';

export interface UserPreferences {
  theme: HudTheme;
  soundEnabled: boolean;
  showScanlines: boolean;
  stationName: string;
}

interface FirebaseContextValue {
  user: User | null;
  authLoading: boolean;
  firebaseConnected: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  userPreferences: UserPreferences | null;
  saveUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  // Cloud synced tasks
  cloudTasks: TaskItem[];
  addTaskToCloud: (text: string, priority?: 'HIGH' | 'MED' | 'LOW') => Promise<void>;
  toggleCloudTask: (id: string, currentStatus: boolean) => Promise<void>;
  deleteCloudTask: (id: string) => Promise<void>;
  // Cloud synced processes
  cloudProcesses: ProcessItem[] | null;
  updateCloudProcess: (process: ProcessItem) => Promise<void>;
  // Cloud synced drives
  cloudDrives: DriveData[] | null;
  updateCloudDrive: (drive: DriveData) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [cloudTasks, setCloudTasks] = useState<TaskItem[]>([]);
  const [cloudProcesses, setCloudProcesses] = useState<ProcessItem[] | null>(null);
  const [cloudDrives, setCloudDrives] = useState<DriveData[] | null>(null);

  // Validate connection on boot
  useEffect(() => {
    validateFirestoreConnection().then(() => {
      setFirebaseConnected(true);
    });
  }, []);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Initialize or fetch user document in Firestore
        const userDocPath = `users/${currentUser.uid}`;
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);

          if (!snap.exists()) {
            const initialPrefs: UserPreferences = {
              theme: 'classic-cyan',
              soundEnabled: true,
              showScanlines: true,
              stationName: 'GEO-STATION: ALPHA',
            };

            await setDoc(userDocRef, {
              id: currentUser.uid,
              email: currentUser.email || 'operator@cyberhud.net',
              displayName: currentUser.displayName || 'Cyber Operator',
              photoURL: currentUser.photoURL || '',
              theme: initialPrefs.theme,
              soundEnabled: initialPrefs.soundEnabled,
              showScanlines: initialPrefs.showScanlines,
              stationName: initialPrefs.stationName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            setUserPreferences(initialPrefs);
          } else {
            const data = snap.data();
            setUserPreferences({
              theme: data.theme || 'classic-cyan',
              soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : true,
              showScanlines: typeof data.showScanlines === 'boolean' ? data.showScanlines : true,
              stationName: data.stationName || 'GEO-STATION: ALPHA',
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, userDocPath);
        }
      } else {
        setUserPreferences(null);
        setCloudTasks([]);
        setCloudProcesses(null);
        setCloudDrives(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore sync for Tasks when user is authenticated
  useEffect(() => {
    if (!user) return;

    const tasksPath = `users/${user.uid}/tasks`;
    const tasksQuery = query(collection(db, 'users', user.uid, 'tasks'));

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const items: TaskItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            text: d.text || '',
            completed: Boolean(d.completed),
            priority: d.priority || 'MED',
          };
        });
        setCloudTasks(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, tasksPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Real-time Firestore sync for Processes when user is authenticated
  useEffect(() => {
    if (!user) return;

    const procPath = `users/${user.uid}/processes`;
    const procQuery = query(collection(db, 'users', user.uid, 'processes'));

    const unsubscribe = onSnapshot(
      procQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setCloudProcesses(null);
          return;
        }
        const items: ProcessItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name,
            status: d.status,
            cpu: Number(d.cpu),
            memory: d.memory,
          };
        });
        setCloudProcesses(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, procPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sign in with Google using popup
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  };

  // Save User Preferences
  const saveUserPreferences = async (prefs: Partial<UserPreferences>) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...prefs,
        updatedAt: serverTimestamp(),
      });
      setUserPreferences((prev) => (prev ? { ...prev, ...prefs } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Add Task to Cloud
  const addTaskToCloud = async (text: string, priority: 'HIGH' | 'MED' | 'LOW' = 'MED') => {
    if (!user) return;
    const taskId = `task-${Date.now()}`;
    const path = `users/${user.uid}/tasks/${taskId}`;
    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', taskId);
      await setDoc(taskRef, {
        id: taskId,
        text: text.toUpperCase(),
        completed: false,
        priority,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  // Toggle Task Completion
  const toggleCloudTask = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    const path = `users/${user.uid}/tasks/${id}`;
    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      await updateDoc(taskRef, {
        completed: !currentStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Delete Task
  const deleteCloudTask = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/tasks/${id}`;
    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', id);
      await deleteDoc(taskRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Update Process
  const updateCloudProcess = async (process: ProcessItem) => {
    if (!user) return;
    const path = `users/${user.uid}/processes/${process.id}`;
    try {
      const procRef = doc(db, 'users', user.uid, 'processes', process.id);
      await setDoc(
        procRef,
        {
          id: process.id,
          name: process.name,
          status: process.status,
          cpu: process.cpu,
          memory: process.memory,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Update Drive
  const updateCloudDrive = async (drive: DriveData) => {
    if (!user) return;
    const path = `users/${user.uid}/drives/${drive.id}`;
    try {
      const driveRef = doc(db, 'users', user.uid, 'drives', drive.id);
      await setDoc(
        driveRef,
        {
          id: drive.id,
          letter: drive.letter,
          label: drive.label,
          total: drive.total,
          used: drive.used,
          free: drive.free,
          usedPercent: drive.usedPercent,
          freePercent: drive.freePercent,
          temp: drive.temp,
          cacheTotal: drive.cacheTotal || '',
          cacheRead: drive.cacheRead || '',
          cacheWrite: drive.cacheWrite || '',
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authLoading,
        firebaseConnected,
        signInWithGoogle,
        signOutUser,
        userPreferences,
        saveUserPreferences,
        cloudTasks,
        addTaskToCloud,
        toggleCloudTask,
        deleteCloudTask,
        cloudProcesses,
        updateCloudProcess,
        cloudDrives,
        updateCloudDrive,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextValue => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
