import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { loadCachedSnapshot, saveCachedSnapshot } from '../lib/cache';
import { DEFAULT_SEED_DATA } from '../lib/seedData';
import { stripUndefinedKeys } from '../lib/validation';
import type {
  ActivityAction,
  ActivityLog,
  AdminUser,
  ContactMessage,
  MediaAsset,
  PortfolioSnapshot,
} from '../types/portfolio';

interface PortfolioContextValue {
  data: PortfolioSnapshot;
  loading: boolean;
  hasCachedSnapshot: boolean;
  isSeededInDb: boolean;
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isBootstrappedAdmin: boolean;
  adminRole: 'super_admin' | 'editor' | null;
  driveAccessToken: string | null;
  contactMessages: ContactMessage[];
  activityLogs: ActivityLog[];
  adminUsers: AdminUser[];
  resolveMedia: (mediaId: string | undefined) => MediaAsset | undefined;
  signInWithGoogle: () => Promise<void>;
  connectGoogleDrive: () => Promise<string | null>;
  clearDriveAccessToken: () => void;
  logoutAdmin: () => Promise<void>;
  seedDatabase: () => Promise<void>;
  saveSingleton: <T extends Record<string, unknown>>(
    collectionName: string,
    docId: string,
    payload: T,
    summary: string
  ) => Promise<void>;
  upsertDocument: <T extends Record<string, unknown>>(
    collectionName: string,
    docId: string,
    payload: T,
    isNew: boolean,
    summary: string,
    hasCreatedAt?: boolean
  ) => Promise<void>;
  deleteDocument: (
    collectionName: string,
    docId: string,
    summary: string
  ) => Promise<void>;
  submitContactMessage: (input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => Promise<void>;
  updateContactMessage: (
    id: string,
    existing: ContactMessage,
    updates: { status: ContactMessage['status']; adminNotes: string }
  ) => Promise<void>;
  logActivity: (
    action: ActivityAction,
    entityType: string,
    entityId: string,
    summary: string
  ) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

function sortByOrder<T extends { sortOrder?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

// In-memory cache only for Google Workspace OAuth access token (never localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminDoc, setAdminDoc] = useState<AdminUser | null>(null);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(
    () => cachedDriveAccessToken
  );

  const [cachedInitial] = useState<PortfolioSnapshot | null>(() =>
    loadCachedSnapshot(DEFAULT_SEED_DATA)
  );
  const hasCachedSnapshot = Boolean(cachedInitial);
  const [isSeededInDb, setIsSeededInDb] = useState(
    Boolean(cachedInitial?.siteSettings.seeded)
  );
  const isSeededRef = useRef(Boolean(cachedInitial?.siteSettings.seeded));
  const [loading, setLoading] = useState(!hasCachedSnapshot);
  const [hasLiveSync, setHasLiveSync] = useState(false);
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(
    cachedInitial ?? DEFAULT_SEED_DATA
  );
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser && nextUser.emailVerified) {
        try {
          const ref = doc(db, 'admins', nextUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setAdminDoc({ id: snap.id, ...(snap.data() as Omit<AdminUser, 'id'>) });
          } else {
            setAdminDoc(null);
          }
        } catch {
          setAdminDoc(null);
        }
      } else {
        cachedDriveAccessToken = null;
        setDriveAccessToken(null);
        setAdminDoc(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isBootstrappedAdmin = Boolean(
    user && user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL
  );
  const isAdmin = Boolean(isBootstrappedAdmin || (user?.emailVerified && adminDoc));
  const adminRole: 'super_admin' | 'editor' | null = isBootstrappedAdmin
    ? 'super_admin'
    : adminDoc?.role ?? null;

  // 2. Subscribe to Public Singletons + Collections
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const pendingCritical = new Set<keyof PortfolioSnapshot>([
      'siteSettings',
      'profile',
      'hero',
      'about',
      'contactInfo',
      'footer',
      'seo',
      'mediaLibrary',
    ]);

    const markCriticalReady = (key: keyof PortfolioSnapshot) => {
      pendingCritical.delete(key);
      if (pendingCritical.size === 0) {
        setLoading(false);
      }
    };

    const fallbackTimer = window.setTimeout(() => {
      setLoading(false);
    }, 2500);

    const subscribeSingleton = <K extends keyof PortfolioSnapshot>(
      colName: string,
      docId: string,
      key: K
    ) => {
      const unsub = onSnapshot(
        doc(db, colName, docId),
        (snap) => {
          if (snap.exists()) {
            const val = snap.data() as PortfolioSnapshot[K];
            if (colName === 'site_settings' && 'seeded' in val) {
              const seededVal = Boolean((val as { seeded: boolean }).seeded);
              isSeededRef.current = seededVal;
              setIsSeededInDb(seededVal);
            }
            setHasLiveSync(true);
            setSnapshot((prev) => ({ ...prev, [key]: val }));
          }
          markCriticalReady(key);
        },
        (err) => {
          markCriticalReady(key);
          handleFirestoreError(err, OperationType.GET, `${colName}/${docId}`);
        }
      );
      unsubs.push(unsub);
    };

    const subscribeList = <T extends { id: string; sortOrder?: number }>(
      colName: string,
      key: keyof PortfolioSnapshot,
      filterPublished: boolean
    ) => {
      const colRef = collection(db, colName);
      const q =
        filterPublished && !isBootstrappedAdmin
          ? query(colRef, where('isPublished', '==', true))
          : colRef;

      const unsub = onSnapshot(
        q,
        (qs) => {
          const items = qs.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<T, 'id'>),
          })) as T[];
          if (items.length > 0 || isSeededRef.current) {
            setHasLiveSync(true);
            setSnapshot((prev) => ({
              ...prev,
              [key]: sortByOrder(items),
            }));
          }
          markCriticalReady(key);
        },
        (err) => {
          markCriticalReady(key);
          handleFirestoreError(err, OperationType.LIST, colName);
        }
      );
      unsubs.push(unsub);
    };

    subscribeSingleton('site_settings', 'main', 'siteSettings');
    subscribeSingleton('personal_profiles', 'main', 'profile');
    subscribeSingleton('hero_contents', 'main', 'hero');
    subscribeSingleton('about_contents', 'main', 'about');
    subscribeSingleton('contact_information', 'main', 'contactInfo');
    subscribeSingleton('footer_settings', 'main', 'footer');
    subscribeSingleton('seo_settings', 'main', 'seo');

    subscribeList('portfolio_sections', 'sections', false);
    subscribeList('navigation_items', 'navigation', false);
    subscribeList('social_links', 'socialLinks', false);
    subscribeList('skill_categories', 'skillCategories', false);
    subscribeList('gallery_categories', 'galleryCategories', false);
    subscribeList('media_library', 'mediaLibrary', false);

    subscribeList('experiences', 'experiences', true);
    subscribeList('skills', 'skills', true);
    subscribeList('projects', 'projects', true);
    subscribeList('galleries', 'galleries', true);
    subscribeList('achievements', 'achievements', true);
    subscribeList('certifications', 'certifications', true);
    subscribeList('education', 'education', true);

    return () => {
      window.clearTimeout(fallbackTimer);
      unsubs.forEach((u) => u());
    };
  }, [isBootstrappedAdmin]);

  useEffect(() => {
    if (hasLiveSync) {
      saveCachedSnapshot(snapshot);
    }
  }, [hasLiveSync, snapshot]);

  // 3. Admin-Only Subscriptions (Messages, Activity Logs, Admin Users)
  useEffect(() => {
    if (!authReady || !isBootstrappedAdmin) {
      setContactMessages([]);
      setActivityLogs([]);
      setAdminUsers([]);
      return;
    }

    const unsubMsgs = onSnapshot(
      query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc')),
      (qs) => {
        setContactMessages(
          qs.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ContactMessage, 'id'>),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contact_messages')
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(30)),
      (qs) => {
        setActivityLogs(
          qs.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ActivityLog, 'id'>),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs')
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (qs) => {
        setAdminUsers(
          qs.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AdminUser, 'id'>),
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => {
      unsubMsgs();
      unsubLogs();
      unsubAdmins();
    };
  }, [authReady, isBootstrappedAdmin]);

  const mediaMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const item of snapshot.mediaLibrary) {
      map.set(item.id, item);
    }
    return map;
  }, [snapshot.mediaLibrary]);

  const resolveMedia = useCallback(
    (mediaId: string | undefined) => {
      if (!mediaId) return undefined;
      return mediaMap.get(mediaId);
    },
    [mediaMap]
  );

  const logActivity = useCallback(
    async (
      action: ActivityAction,
      entityType: string,
      entityId: string,
      summary: string
    ) => {
      if (!auth.currentUser?.uid || !auth.currentUser?.email) return;
      const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        await setDoc(doc(db, 'activity_logs', logId), {
          actorUid: auth.currentUser.uid,
          actorEmail: auth.currentUser.email,
          action,
          entityType,
          entityId,
          summary: summary.slice(0, 300),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `activity_logs/${logId}`);
      }
    },
    []
  );

  const clearDriveAccessToken = useCallback(() => {
    cachedDriveAccessToken = null;
    setDriveAccessToken(null);
  }, []);

  const connectGoogleDrive = useCallback(async (): Promise<string | null> => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    if (token) {
      cachedDriveAccessToken = token;
      setDriveAccessToken(token);
    }
    return token;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await connectGoogleDrive();
  }, [connectGoogleDrive]);

  const logoutAdmin = useCallback(async () => {
    cachedDriveAccessToken = null;
    setDriveAccessToken(null);
    await signOut(auth);
  }, []);

  const seedDatabase = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Authentication required.');
    const uid = auth.currentUser.uid;
    const now = serverTimestamp();

    try {
      // Check immutable fields on collections that lock createdAt / createdBy on updates
      const checkExisting = async (colName: string, ids: string[]) => {
        const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, colName, id))));
        const map = new Map<string, Record<string, unknown>>();
        snaps.forEach((s) => {
          if (s.exists()) {
            map.set(s.id, s.data() as Record<string, unknown>);
          }
        });
        return map;
      };

      const [existingMedia, existingExp, existingProj, existingGal] = await Promise.all([
        checkExisting('media_library', DEFAULT_SEED_DATA.mediaLibrary.map((m) => m.id)),
        checkExisting('experiences', DEFAULT_SEED_DATA.experiences.map((e) => e.id)),
        checkExisting('projects', DEFAULT_SEED_DATA.projects.map((p) => p.id)),
        checkExisting('galleries', DEFAULT_SEED_DATA.galleries.map((g) => g.id)),
      ]);

      // Batch 1: Singletons, taxonomy categories, media, and independent collections
      const baseBatch = writeBatch(db);

      baseBatch.set(doc(db, 'personal_profiles', 'main'), {
        ...DEFAULT_SEED_DATA.profile,
        updatedAt: now,
      });
      baseBatch.set(doc(db, 'hero_contents', 'main'), {
        ...DEFAULT_SEED_DATA.hero,
        updatedAt: now,
      });
      baseBatch.set(doc(db, 'about_contents', 'main'), {
        ...DEFAULT_SEED_DATA.about,
        updatedAt: now,
      });
      baseBatch.set(doc(db, 'contact_information', 'main'), {
        ...DEFAULT_SEED_DATA.contactInfo,
        updatedAt: now,
      });
      baseBatch.set(doc(db, 'footer_settings', 'main'), {
        ...DEFAULT_SEED_DATA.footer,
        updatedAt: now,
      });
      baseBatch.set(doc(db, 'seo_settings', 'main'), {
        ...DEFAULT_SEED_DATA.seo,
        updatedAt: now,
      });

      for (const sec of DEFAULT_SEED_DATA.sections) {
        const { id, ...rest } = sec;
        baseBatch.set(doc(db, 'portfolio_sections', id), { ...rest, updatedAt: now });
      }
      for (const nav of DEFAULT_SEED_DATA.navigation) {
        const { id, ...rest } = nav;
        baseBatch.set(doc(db, 'navigation_items', id), { ...rest, updatedAt: now });
      }
      for (const soc of DEFAULT_SEED_DATA.socialLinks) {
        const { id, ...rest } = soc;
        baseBatch.set(doc(db, 'social_links', id), { ...rest, updatedAt: now });
      }
      for (const media of DEFAULT_SEED_DATA.mediaLibrary) {
        const { id, ...rest } = media;
        const prev = existingMedia.get(id);
        baseBatch.set(doc(db, 'media_library', id), {
          ...rest,
          createdBy: (prev?.createdBy as string) || uid,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
        });
      }
      for (const cat of DEFAULT_SEED_DATA.skillCategories) {
        const { id, ...rest } = cat;
        baseBatch.set(doc(db, 'skill_categories', id), { ...rest, updatedAt: now });
      }
      for (const gcat of DEFAULT_SEED_DATA.galleryCategories) {
        const { id, ...rest } = gcat;
        baseBatch.set(doc(db, 'gallery_categories', id), { ...rest, updatedAt: now });
      }
      for (const exp of DEFAULT_SEED_DATA.experiences) {
        const { id, ...rest } = exp;
        const prev = existingExp.get(id);
        baseBatch.set(doc(db, 'experiences', id), {
          ...rest,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
        });
      }
      for (const proj of DEFAULT_SEED_DATA.projects) {
        const { id, ...rest } = proj;
        const prev = existingProj.get(id);
        baseBatch.set(doc(db, 'projects', id), {
          ...rest,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
        });
      }
      for (const ach of DEFAULT_SEED_DATA.achievements) {
        const { id, ...rest } = ach;
        baseBatch.set(doc(db, 'achievements', id), { ...rest, updatedAt: now });
      }
      for (const cert of DEFAULT_SEED_DATA.certifications) {
        const { id, ...rest } = cert;
        baseBatch.set(doc(db, 'certifications', id), { ...rest, updatedAt: now });
      }
      for (const edu of DEFAULT_SEED_DATA.education) {
        const { id, ...rest } = edu;
        baseBatch.set(doc(db, 'education', id), { ...rest, updatedAt: now });
      }

      await baseBatch.commit();

      // Batch 2: Category-dependent collections (skills, galleries) + final seeded flag
      const depBatch = writeBatch(db);

      for (const sk of DEFAULT_SEED_DATA.skills) {
        const { id, ...rest } = sk;
        depBatch.set(doc(db, 'skills', id), { ...rest, updatedAt: now });
      }
      for (const gal of DEFAULT_SEED_DATA.galleries) {
        const { id, ...rest } = gal;
        const prev = existingGal.get(id);
        depBatch.set(doc(db, 'galleries', id), {
          ...rest,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
        });
      }
      depBatch.set(doc(db, 'site_settings', 'main'), {
        ...DEFAULT_SEED_DATA.siteSettings,
        seeded: true,
        updatedAt: now,
      });

      await depBatch.commit();
      setIsSeededInDb(true);
      await logActivity('seed', 'database', 'main', 'Initialized full portfolio seed data in Firestore');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
    }
  }, [logActivity]);

  const saveSingleton = useCallback(
    async <T extends Record<string, unknown>>(
      collectionName: string,
      docId: string,
      payload: T,
      summary: string
    ) => {
      try {
        const cleanPayload = stripUndefinedKeys(payload);
        await setDoc(doc(db, collectionName, docId), {
          ...cleanPayload,
          updatedAt: serverTimestamp(),
        });
        await logActivity('update', collectionName, docId, summary);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
      }
    },
    [logActivity]
  );

  const upsertDocument = useCallback(
    async <T extends Record<string, unknown>>(
      collectionName: string,
      docId: string,
      payload: T,
      isNew: boolean,
      summary: string,
      hasCreatedAt = false
    ) => {
      try {
        const docRef = doc(db, collectionName, docId);
        const cleanPayload = stripUndefinedKeys(payload);
        delete cleanPayload.id;
        if (hasCreatedAt) {
          if (isNew) {
            cleanPayload.createdAt = serverTimestamp();
          } else if (!cleanPayload.createdAt) {
            const existingSnap = await getDoc(docRef);
            if (!existingSnap.exists()) {
              cleanPayload.createdAt = serverTimestamp();
              if (
                collectionName === 'media_library' &&
                !cleanPayload.createdBy &&
                auth.currentUser?.uid
              ) {
                cleanPayload.createdBy = auth.currentUser.uid;
              }
            }
          }
        }
        cleanPayload.updatedAt = serverTimestamp();
        await setDoc(docRef, cleanPayload, {
          merge: !isNew,
        });
        await logActivity(isNew ? 'create' : 'update', collectionName, docId, summary);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${docId}`);
      }
    },
    [logActivity]
  );

  const deleteDocument = useCallback(
    async (collectionName: string, docId: string, summary: string) => {
      try {
        await deleteDoc(doc(db, collectionName, docId));
        await logActivity('delete', collectionName, docId, summary);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
      }
    },
    [logActivity]
  );

  const submitContactMessage = useCallback(
    async (input: { name: string; email: string; subject: string; message: string }) => {
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        await setDoc(doc(db, 'contact_messages', msgId), {
          name: input.name.trim().slice(0, 120),
          email: input.email.trim().slice(0, 200),
          subject: input.subject.trim().slice(0, 200),
          message: input.message.trim().slice(0, 4000),
          status: 'unread',
          adminNotes: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `contact_messages/${msgId}`);
      }
    },
    []
  );

  const updateContactMessage = useCallback(
    async (
      id: string,
      existing: ContactMessage,
      updates: { status: ContactMessage['status']; adminNotes: string }
    ) => {
      try {
        await setDoc(doc(db, 'contact_messages', id), {
          name: existing.name,
          email: existing.email,
          subject: existing.subject,
          message: existing.message,
          status: updates.status,
          adminNotes: updates.adminNotes.slice(0, 1000),
          createdAt: existing.createdAt,
          updatedAt: serverTimestamp(),
        });
        await logActivity(
          'update',
          'contact_messages',
          id,
          `Marked inquiry "${existing.subject}" as ${updates.status}`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `contact_messages/${id}`);
      }
    },
    [logActivity]
  );

  return (
    <PortfolioContext.Provider
      value={{
        data: snapshot,
        loading,
        hasCachedSnapshot,
        isSeededInDb,
        user,
        authReady,
        isAdmin,
        isBootstrappedAdmin,
        adminRole,
        driveAccessToken,
        contactMessages,
        activityLogs,
        adminUsers,
        resolveMedia,
        signInWithGoogle,
        connectGoogleDrive,
        clearDriveAccessToken,
        logoutAdmin,
        seedDatabase,
        saveSingleton,
        upsertDocument,
        deleteDocument,
        submitContactMessage,
        updateContactMessage,
        logActivity,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error('usePortfolio must be used inside PortfolioProvider');
  }
  return ctx;
}
