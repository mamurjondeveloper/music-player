import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Music,
  Search,
  Upload,
  LogOut,
  ChevronDown,
  Plus,
  Link,
  Lock,
  User as UserIcon,
  Radio,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  Copy,
  Camera,
  CircleCheckBig,
  Clock,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  coverUrl: string | null;
  playCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
}

interface ImportItem {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'importing' | 'completed' | 'failed';
  error?: string;
}

interface UserInfo {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface InviteCodeItem {
  code: string;
  usedBy: string | null;
  createdAt: string;
  usedAt: string | null;
}

const documentDir = FileSystem.documentDirectory || 'file:///data/user/0/com.xisd.music/files/';
const SONGS_CACHE_DIR = documentDir + 'songs/';

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(SONGS_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SONGS_CACHE_DIR, { intermediates: true });
  }
}

async function getCachedAudioUri(songId: string, remoteUrl: string): Promise<string> {
  try {
    const localPath = SONGS_CACHE_DIR + songId + '.mp3';
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) {
      return localPath;
    }
    return remoteUrl;
  } catch {
    return remoteUrl;
  }
}

async function cacheAudioInBackground(songId: string, remoteUrl: string) {
  try {
    await ensureCacheDir();
    const localPath = SONGS_CACHE_DIR + songId + '.mp3';
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) {
      await FileSystem.downloadAsync(remoteUrl, localPath);
    }
  } catch {
    // Silent fail for background caching
  }
}

export default function App() {
  const [hasError, setHasError] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home' | 'playlists' | 'upload' | 'radio' | 'profile'>('login');

  const [serverUrl] = useState('https://api.music.xisd.uz');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState<'none' | 'one' | 'all'>('none');
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);

  // Profile screen
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const [isLoadingInviteCodes, setIsLoadingInviteCodes] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const [isRadioMode, setIsRadioMode] = useState(false);
  const [radioSongs, setRadioSongs] = useState<Song[]>([]);
  const [isRadioLoading, setIsRadioLoading] = useState(false);
  const vinylRotation = useRef(new Animated.Value(0)).current;
  const vinylAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [ytUrl, setYtUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importQueue, setImportQueue] = useState<ImportItem[]>([]);

  const soundRef = useRef<AudioPlayer | null>(null);
  const progressWidthRef = useRef<number>(0);
  const passwordInputRef = useRef<TextInput>(null);
  const inviteCodeInputRef = useRef<TextInput>(null);

  // Refs that mirror state so callbacks always read current values
  const isLoopRef = useRef(isLoop);
  const queueRef = useRef(queue);
  const currentSongRef = useRef(currentSong);
  const isShuffleRef = useRef(isShuffle);
  const isRadioModeRef = useRef(isRadioMode);

  useEffect(() => { isLoopRef.current = isLoop; }, [isLoop]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { isRadioModeRef.current = isRadioMode; }, [isRadioMode]);

  // Vinyl spin animation
  useEffect(() => {
    if (isPlaying && isRadioMode) {
      vinylRotation.setValue(0);
      const anim = Animated.loop(
        Animated.timing(vinylRotation, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      vinylAnimRef.current = anim;
      anim.start();
    } else {
      vinylAnimRef.current?.stop();
    }
  }, [isPlaying, isRadioMode]);

  const vinylSpin = vinylRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getApi = useCallback(() => {
    return axios.create({
      baseURL: serverUrl,
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  }, [serverUrl, token]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync('symphony_jwt_token');
        if (savedToken) {
          setToken(savedToken);
          setCurrentScreen('home');
          axios
            .get(`${serverUrl}/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
            .then((res) => setCurrentUser(res.data))
            .catch(() => {});
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          shouldPlayInBackground: true,
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        });
      } catch (err) {
        console.warn('Failed to set audio mode:', err);
      }
    };
    setupAudio();
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!token) return;
    try {
      const api = getApi();
      const [songsRes, playlistsRes, recentRes, trendingRes] = await Promise.all([
        api.get('/songs'),
        api.get('/playlists'),
        api.get('/songs/recent?limit=8'),
        api.get('/songs/trending?limit=6'),
      ]);
      setSongs(songsRes.data);
      setPlaylists(playlistsRes.data);
      setRecentSongs(recentRes.data);
      setTrendingSongs(trendingRes.data);
    } catch (err) {
      console.error('Failed to fetch library:', err);
    }
  }, [token, getApi]);

  useEffect(() => {
    if (token && currentScreen !== 'login') {
      fetchLibrary();
    }
  }, [currentScreen, token, fetchLibrary]);

  useEffect(() => {
    if (currentScreen !== 'upload' || !token) return;

    const fetchImports = async () => {
      try {
        const res = await getApi().get('/songs/import-status');
        setImportQueue(res.data);
      } catch {}
    };

    fetchImports();
    const interval = setInterval(fetchImports, 3000);
    return () => clearInterval(interval);
  }, [currentScreen, token, getApi]);

  // Fetch radio songs when navigating to radio tab
  useEffect(() => {
    if (currentScreen !== 'radio' || !token) return;
    const fetchRadioSongs = async () => {
      try {
        const res = await getApi().get('/songs');
        setRadioSongs(res.data);
      } catch {}
    };
    fetchRadioSongs();
  }, [currentScreen, token, getApi]);

  // Sync editable username field and load invite codes when the Profile screen opens
  useEffect(() => {
    if (currentScreen !== 'profile') return;
    setProfileUsername(currentUser?.username || '');
    fetchInviteCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  const handleLogin = async () => {
    if (!username || !password || !serverUrl) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await axios.post(`${serverUrl}/auth/login`, {
        username,
        password,
      });
      const jwtToken = res.data.access_token;

      await SecureStore.setItemAsync('symphony_jwt_token', jwtToken);
      await AsyncStorage.setItem('symphony_server_url', serverUrl);

      setToken(jwtToken);
      setCurrentUser(res.data.user);
      setCurrentScreen('home');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Check server URL and credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !inviteCode) {
      Alert.alert('Error', 'Please fill in all fields, including the invite code');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await axios.post(`${serverUrl}/auth/register`, {
        username,
        password,
        inviteCode,
      });
      const jwtToken = res.data.access_token;

      await SecureStore.setItemAsync('symphony_jwt_token', jwtToken);
      await AsyncStorage.setItem('symphony_server_url', serverUrl);

      setToken(jwtToken);
      setCurrentUser(res.data.user);
      setCurrentScreen('home');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Check your details.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('symphony_jwt_token');
      setToken(null);
      setCurrentUser(null);
      setCurrentSong(null);
      setIsPlaying(false);
      setIsRadioMode(false);
      if (soundRef.current) {
        soundRef.current.remove();
        soundRef.current = null;
      }
      setCurrentScreen('login');
    } catch {}
  };

  const fetchInviteCodes = useCallback(async () => {
    setIsLoadingInviteCodes(true);
    try {
      const res = await getApi().get('/auth/invite-code');
      setInviteCodes(res.data);
    } catch {
      // Non-critical - leave list as-is
    } finally {
      setIsLoadingInviteCodes(false);
    }
  }, [getApi]);

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const res = await getApi().post('/auth/invite-code');
      setInviteCodes((prev) => [
        { code: res.data.code, usedBy: null, usedAt: null, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      Alert.alert('Error', 'Failed to generate invite code');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', 'Invite code copied to clipboard');
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'avatar.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);

    setIsUploadingAvatar(true);
    try {
      const res = await getApi().post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCurrentUser(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!profileUsername.trim() || profileUsername === currentUser?.username) return;
    setIsSavingUsername(true);
    try {
      const res = await getApi().patch('/auth/profile', { username: profileUsername.trim() });
      setCurrentUser(res.data);
      Alert.alert('Saved', 'Username updated!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update username');
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPasswordInput !== confirmPasswordInput) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    setIsSavingPassword(true);
    try {
      await getApi().post('/auth/change-password', {
        currentPassword: currentPasswordInput,
        newPassword: newPasswordInput,
      });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSongEndedFromCallback = useCallback(() => {
    const loop = isLoopRef.current;
    const q = queueRef.current;
    const song = currentSongRef.current;
    const shuffle = isShuffleRef.current;
    const radioMode = isRadioModeRef.current;

    if (loop === 'one') {
      soundRef.current?.seekTo(0).then(() => soundRef.current?.play());
      return;
    }

    if (q.length === 0 || !song) return;

    let nextSong: Song | null = null;

    if (radioMode || shuffle) {
      if (q.length > 1) {
        let rand = Math.floor(Math.random() * q.length);
        while (q[rand].id === song.id) {
          rand = Math.floor(Math.random() * q.length);
        }
        nextSong = q[rand];
      } else {
        nextSong = q[0];
      }
    } else {
      const idx = q.findIndex((s) => s.id === song.id);
      if (idx !== -1 && idx < q.length - 1) {
        nextSong = q[idx + 1];
      } else if (loop === 'all') {
        nextSong = q[0];
      }
    }

    if (nextSong) {
      playSongInternal(nextSong, q);
    }
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AudioStatus) => {
    if (!status.isLoaded) return;

    setCurrentTime(status.currentTime);
    if (status.duration) {
      setDuration(status.duration);
    }

    setIsPlaying(status.playing);

    if (status.didJustFinish) {
      handleSongEndedFromCallback();
    }
  }, [handleSongEndedFromCallback]);

  const playSongInternal = async (song: Song, contextQueue: Song[]) => {
    try {
      if (soundRef.current) {
        soundRef.current.remove();
        soundRef.current = null;
      }

      getApi().post(`/songs/${song.id}/play`).catch(() => {});
      getApi().post(`/songs/${song.id}/history`).catch(() => {});

      const remoteUri = `${serverUrl}${song.audioUrl}`;
      const audioUri = await getCachedAudioUri(song.id, remoteUri);

      const player = createAudioPlayer({ uri: audioUri });
      player.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
      player.play();

      soundRef.current = player;
      setCurrentSong(song);
      setIsPlaying(true);
      setDuration(song.duration);

      if (contextQueue.length > 0) {
        setQueue(contextQueue);
      }

      // Background cache if playing from remote
      if (audioUri === remoteUri) {
        cacheAudioInBackground(song.id, remoteUri);
      }
    } catch {
      Alert.alert('Error', 'Could not play audio stream.');
      setIsPlaying(false);
    }
  };

  const playSong = async (song: Song, contextQueue: Song[] = []) => {
    setIsRadioMode(false);
    if (contextQueue.length > 0) {
      await playSongInternal(song, contextQueue);
    } else {
      const q = queueRef.current;
      if (!q.some((s) => s.id === song.id)) {
        const newQueue = [song, ...q];
        setQueue(newQueue);
        await playSongInternal(song, newQueue);
      } else {
        await playSongInternal(song, q);
      }
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      soundRef.current.pause();
      setIsPlaying(false);
    } else {
      soundRef.current.play();
      setIsPlaying(true);
    }
  };

  const playNext = () => {
    if (queue.length === 0 || !currentSong) return;

    let nextSong: Song | null = null;
    if (isShuffle && queue.length > 1) {
      let rand = Math.floor(Math.random() * queue.length);
      while (queue[rand].id === currentSong.id) {
        rand = Math.floor(Math.random() * queue.length);
      }
      nextSong = queue[rand];
    } else {
      const idx = queue.findIndex((s) => s.id === currentSong.id);
      if (idx !== -1 && idx < queue.length - 1) {
        nextSong = queue[idx + 1];
      } else if (isLoop === 'all') {
        nextSong = queue[0];
      }
    }

    if (nextSong) playSongInternal(nextSong, queue);
  };

  const playPrevious = async () => {
    if (queue.length === 0 || !currentSong) return;

    if (currentTime > 3) {
      await soundRef.current?.seekTo(0);
      return;
    }

    const idx = queue.findIndex((s) => s.id === currentSong.id);
    let prevSong: Song | null = null;
    if (idx > 0) {
      prevSong = queue[idx - 1];
    } else if (isLoop === 'all') {
      prevSong = queue[queue.length - 1];
    }

    if (prevSong) playSongInternal(prevSong, queue);
  };

  const handleSeek = async (event: any) => {
    if (progressWidthRef.current === 0 || !soundRef.current) return;
    const { locationX } = event.nativeEvent;
    const percent = locationX / progressWidthRef.current;
    const seekTime = Math.max(0, Math.min(duration, percent * duration));
    await soundRef.current.seekTo(seekTime);
  };

  const startRadio = async () => {
    if (radioSongs.length === 0) return;
    setIsRadioLoading(true);
    try {
      const shuffled = [...radioSongs].sort(() => Math.random() - 0.5);
      setIsRadioMode(true);
      setQueue(shuffled);
      await playSongInternal(shuffled[0], shuffled);
    } finally {
      setIsRadioLoading(false);
    }
  };

  const handleYoutubeImport = async () => {
    if (!ytUrl.trim()) return;
    setIsImporting(true);
    const url = ytUrl.trim();
    setYtUrl('');

    try {
      const res = await getApi().post('/songs/youtube', { url });
      if (res.data.status === 'completed') {
        Alert.alert('Imported', `"${res.data.song.title}" is already in your library.`);
      } else {
        Alert.alert('Queued', 'Added to background download queue.');
      }
      const statusRes = await getApi().get('/songs/import-status');
      setImportQueue(statusRes.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit download.';
      Alert.alert('Error', msg);
    } finally {
      setIsImporting(false);
    }
  };

  const openPlaylist = async (playlist: Playlist) => {
    setActivePlaylist(playlist);
    try {
      const res = await getApi().get(`/playlists/${playlist.id}`);
      setPlaylistSongs(res.data.playlistSongs.map((ps: any) => ps.song));
      setCurrentScreen('playlists');
    } catch {
      Alert.alert('Error', 'Failed to fetch playlist tracks.');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Error boundary fallback
  if (hasError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff', fontSize: 18, marginBottom: 16 }}>Something went wrong</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => {
            setHasError(false);
            setCurrentScreen('home');
          }}
        >
          <Text style={styles.loginButtonText}>Reload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.loginScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.loginCard}>
              <View style={styles.logoContainer}>
                <Music size={54} color="#22c55e" />
                <Text style={styles.logoText}>Symphony</Text>
                <Text style={styles.logoSubtext}>
                  {authMode === 'login' ? 'Private Music Player' : 'Create Your Account'}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>USERNAME</Text>
                <View style={styles.inputWrapper}>
                  <UserIcon size={18} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="admin"
                    placeholderTextColor="#52525b"
                    style={styles.textInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    autoComplete="username"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#52525b"
                    style={styles.textInput}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType={authMode === 'register' ? 'next' : 'done'}
                    onSubmitEditing={() =>
                      authMode === 'register'
                        ? inviteCodeInputRef.current?.focus()
                        : handleLogin()
                    }
                    blurOnSubmit={authMode === 'login'}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#71717a" />
                    ) : (
                      <Eye size={18} color="#71717a" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {authMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>INVITE CODE</Text>
                  <View style={styles.inputWrapper}>
                    <KeyRound size={18} color="#71717a" style={styles.inputIcon} />
                    <TextInput
                      ref={inviteCodeInputRef}
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      placeholder="Ask the owner for this"
                      placeholderTextColor="#52525b"
                      style={styles.textInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => handleRegister()}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.loginButton}
                onPress={authMode === 'login' ? handleLogin : handleRegister}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {authMode === 'login' ? 'Connect & Log In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authModeToggle}
                onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                <Text style={styles.authModeToggleText}>
                  {authMode === 'login' ? "Have an invite code? " : 'Already have an account? '}
                  <Text style={styles.authModeToggleLink}>
                    {authMode === 'login' ? 'Create an account' : 'Sign in'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  try {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {currentScreen === 'home' && 'Symphony'}
            {currentScreen === 'playlists' && (activePlaylist ? activePlaylist.name : 'Playlists')}
            {currentScreen === 'upload' && 'Add Music'}
            {currentScreen === 'radio' && 'Radio'}
            {currentScreen === 'profile' && 'Profile'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setCurrentScreen('profile')} style={styles.logoutButton}>
              <UserPlus size={16} color="#22c55e" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <LogOut size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {/* HOME SCREEN */}
          {currentScreen === 'home' && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.searchContainer}>
                <Search size={18} color="#71717a" style={styles.searchIcon} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search songs, artists..."
                  placeholderTextColor="#71717a"
                  style={styles.searchInput}
                />
              </View>

              {searchQuery ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Search Results</Text>
                  {filteredSongs.length === 0 ? (
                    <Text style={styles.emptyText}>No songs found</Text>
                  ) : (
                    filteredSongs.map((song) => (
                      <TouchableOpacity
                        key={song.id}
                        style={styles.songRow}
                        onPress={() => playSong(song, filteredSongs)}
                      >
                        <Image
                          source={{ uri: song.coverUrl ? `${serverUrl}${song.coverUrl}` : 'https://placehold.co/100' }}
                          style={styles.songRowImage as any}
                        />
                        <View style={styles.songRowDetails}>
                          <Text style={[styles.songRowTitle, currentSong?.id === song.id && { color: '#22c55e' }]}>
                            {song.title}
                          </Text>
                          <Text style={styles.songRowArtist}>{song.artist}</Text>
                        </View>
                        <Play size={16} color="#71717a" />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : (
                <>
                  {playlists.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Playlists</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {playlists.map((playlist) => (
                          <TouchableOpacity
                            key={playlist.id}
                            style={styles.playlistCard}
                            onPress={() => openPlaylist(playlist)}
                          >
                            <Image
                              source={{
                                uri: playlist.coverUrl ? `${serverUrl}${playlist.coverUrl}` : 'https://placehold.co/200',
                              }}
                              style={styles.playlistImage as any}
                            />
                            <Text style={styles.playlistTitle} numberOfLines={1}>
                              {playlist.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {recentSongs.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Recently Uploaded</Text>
                      {recentSongs.map((song) => (
                        <TouchableOpacity
                          key={song.id}
                          style={styles.songRow}
                          onPress={() => playSong(song, recentSongs)}
                        >
                          <Image
                            source={{ uri: song.coverUrl ? `${serverUrl}${song.coverUrl}` : 'https://placehold.co/100' }}
                            style={styles.songRowImage as any}
                          />
                          <View style={styles.songRowDetails}>
                            <Text style={[styles.songRowTitle, currentSong?.id === song.id && { color: '#22c55e' }]}>
                              {song.title}
                            </Text>
                            <Text style={styles.songRowArtist}>{song.artist}</Text>
                          </View>
                          <Play size={16} color="#71717a" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {trendingSongs.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Most Played</Text>
                      <View style={styles.gridContainer}>
                        {trendingSongs.map((song) => (
                          <TouchableOpacity
                            key={song.id}
                            style={styles.gridCard}
                            onPress={() => playSong(song, trendingSongs)}
                          >
                            <Image
                              source={{ uri: song.coverUrl ? `${serverUrl}${song.coverUrl}` : 'https://placehold.co/150' }}
                              style={styles.gridImage as any}
                            />
                            <Text style={[styles.gridTitle, currentSong?.id === song.id && { color: '#22c55e' }]} numberOfLines={1}>
                              {song.title}
                            </Text>
                            <Text style={styles.gridArtist} numberOfLines={1}>
                              {song.artist}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}

          {/* PLAYLIST TRACKS SCREEN */}
          {currentScreen === 'playlists' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => setCurrentScreen('home')} style={styles.backButton}>
                <ChevronDown size={18} color="#22c55e" style={{ transform: [{ rotate: '90deg' }] }} />
                <Text style={styles.backButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {playlistSongs.length === 0 ? (
                  <Text style={styles.emptyText}>No tracks in this playlist</Text>
                ) : (
                  playlistSongs.map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={styles.songRow}
                      onPress={() => playSong(song, playlistSongs)}
                    >
                      <Image
                        source={{ uri: song.coverUrl ? `${serverUrl}${song.coverUrl}` : 'https://placehold.co/100' }}
                        style={styles.songRowImage as any}
                      />
                      <View style={styles.songRowDetails}>
                        <Text style={[styles.songRowTitle, currentSong?.id === song.id && { color: '#22c55e' }]}>
                          {song.title}
                        </Text>
                        <Text style={styles.songRowArtist}>{song.artist}</Text>
                      </View>
                      <Play size={16} color="#71717a" />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* RADIO SCREEN */}
          {currentScreen === 'radio' && (
            <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingTop: 40 }]} showsVerticalScrollIndicator={false}>
              {isRadioMode && currentSong ? (
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <Animated.View style={{
                    width: 220,
                    height: 220,
                    borderRadius: 110,
                    borderWidth: 6,
                    borderColor: '#22c55e',
                    overflow: 'hidden',
                    marginBottom: 32,
                    transform: [{ rotate: vinylSpin }],
                  }}>
                    <Image
                      source={{ uri: currentSong.coverUrl ? `${serverUrl}${currentSong.coverUrl}` : 'https://placehold.co/400' }}
                      style={{ width: '100%', height: '100%' }}
                    />
                    <View style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#09090b',
                        borderWidth: 2,
                        borderColor: '#27272a',
                      }} />
                    </View>
                  </Animated.View>

                  <Text style={styles.fullPlayerTitle} numberOfLines={1}>{currentSong.title}</Text>
                  <Text style={[styles.fullPlayerArtist, { marginTop: 6, marginBottom: 24 }]} numberOfLines={1}>{currentSong.artist}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                    <TouchableOpacity onPress={togglePlay} style={styles.fullPlayButton}>
                      {isPlaying ? (
                        <Pause size={28} color="#000" fill="#000" />
                      ) : (
                        <Play size={28} color="#000" fill="#000" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <Text style={{ color: '#71717a', fontSize: 12, marginTop: 24, fontWeight: '600' }}>
                    RADIO MODE • {queue.length} songs in queue
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <View style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: '#18181b',
                    borderWidth: 2,
                    borderColor: '#27272a',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 32,
                  }}>
                    <Radio size={48} color="#22c55e" />
                  </View>

                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 }}>
                    Symphony Radio
                  </Text>
                  <Text style={{ color: '#71717a', fontSize: 13, textAlign: 'center', paddingHorizontal: 40, marginBottom: 32 }}>
                    Shuffle through your entire library. Sit back and enjoy the mix.
                  </Text>

                  <TouchableOpacity
                    style={[styles.loginButton, { width: 200 }]}
                    onPress={startRadio}
                    disabled={isRadioLoading || radioSongs.length === 0}
                  >
                    {isRadioLoading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.loginButtonText}>
                        {radioSongs.length === 0 ? 'No Songs' : 'Start Radio'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {radioSongs.length > 0 && (
                    <Text style={{ color: '#52525b', fontSize: 11, marginTop: 12 }}>
                      {radioSongs.length} songs available
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          )}

          {/* UPLOAD & YOUTUBE IMPORT SCREEN */}
          {currentScreen === 'upload' && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.importerCard}>
                <View style={styles.importerHeader}>
                  <Link size={20} color="#22c55e" />
                  <Text style={styles.importerTitle}>YouTube Link Importer</Text>
                </View>
                <Text style={styles.importerDescription}>
                  Paste any YouTube video or playlist URL. The server will download and convert it to MP3 in the background.
                </Text>

                <View style={styles.importerForm}>
                  <TextInput
                    value={ytUrl}
                    onChangeText={setYtUrl}
                    placeholder="https://www.youtube.com/watch?v=..."
                    placeholderTextColor="#52525b"
                    style={styles.importerInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.importerButton}
                    onPress={handleYoutubeImport}
                    disabled={isImporting || !ytUrl.trim()}
                  >
                    {isImporting ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.importerButtonText}>Import</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {importQueue.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Import Progress Queue</Text>
                  {importQueue.map((item, idx) => (
                    <View key={`${item.id}-${idx}`} style={styles.queueItem}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.queueItemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.queueItemUrl} numberOfLines={1}>
                          {item.url}
                        </Text>
                        {item.status === 'failed' && item.error && (
                          <Text style={styles.queueItemError} numberOfLines={2}>
                            {item.error}
                          </Text>
                        )}
                      </View>
                      <View style={styles.queueStatusContainer}>
                        {item.status === 'pending' && (
                          <Text style={[styles.queueStatusText, { color: '#71717a' }]}>Queued...</Text>
                        )}
                        {item.status === 'importing' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#22c55e" style={{ marginRight: 4 }} />
                            <Text style={[styles.queueStatusText, { color: '#22c55e' }]}>Importing...</Text>
                          </View>
                        )}
                        {item.status === 'completed' && (
                          <Text style={[styles.queueStatusText, { color: '#22c55e' }]}>Ready</Text>
                        )}
                        {item.status === 'failed' && (
                          <Text style={[styles.queueStatusText, { color: '#ef4444' }]}>Failed</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* PROFILE SCREEN */}
          {currentScreen === 'profile' && !currentUser && (
            <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
              <ActivityIndicator size="large" color="#22c55e" />
            </View>
          )}
          {currentScreen === 'profile' && currentUser && (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.profileCard}>
                <TouchableOpacity onPress={handlePickAvatar} style={styles.profileAvatarWrapper}>
                  {currentUser.avatarUrl ? (
                    <Image
                      source={{ uri: `${serverUrl}${currentUser.avatarUrl}` }}
                      style={styles.profileAvatarImage as any}
                    />
                  ) : (
                    <View style={styles.profileAvatarPlaceholder}>
                      <Text style={styles.profileAvatarInitials}>
                        {currentUser.username.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.profileAvatarOverlay}>
                    {isUploadingAvatar ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Camera size={18} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.profileUsernameLabel}>{currentUser.username}</Text>
                <Text style={styles.profileHint}>Tap your photo to change it</Text>
              </View>

              <View style={styles.profileCard}>
                <Text style={styles.profileSectionTitle}>Username</Text>
                <View style={styles.inputWrapper}>
                  <UserIcon size={18} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    value={profileUsername}
                    onChangeText={setProfileUsername}
                    placeholderTextColor="#52525b"
                    style={styles.textInput}
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    { marginTop: 14 },
                    (!profileUsername.trim() || profileUsername === currentUser.username) && { opacity: 0.5 },
                  ]}
                  onPress={handleSaveUsername}
                  disabled={isSavingUsername || !profileUsername.trim() || profileUsername === currentUser.username}
                >
                  {isSavingUsername ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.loginButtonText}>Save Username</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.profileCard}>
                <Text style={styles.profileSectionTitle}>Change Password</Text>
                <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                  <Lock size={18} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    value={currentPasswordInput}
                    onChangeText={setCurrentPasswordInput}
                    placeholder="Current password"
                    placeholderTextColor="#52525b"
                    style={styles.textInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                  <Lock size={18} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    value={newPasswordInput}
                    onChangeText={setNewPasswordInput}
                    placeholder="New password"
                    placeholderTextColor="#52525b"
                    style={styles.textInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#71717a" style={styles.inputIcon} />
                  <TextInput
                    value={confirmPasswordInput}
                    onChangeText={setConfirmPasswordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#52525b"
                    style={styles.textInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    { marginTop: 14 },
                    (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) && { opacity: 0.5 },
                  ]}
                  onPress={handleChangePassword}
                  disabled={isSavingPassword || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput}
                >
                  {isSavingPassword ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.loginButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.profileCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.profileSectionTitle}>Invite Friends</Text>
                  <TouchableOpacity
                    style={styles.profileGenerateButton}
                    onPress={handleGenerateInvite}
                    disabled={isGeneratingInvite}
                  >
                    {isGeneratingInvite ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.profileGenerateButtonText}>Generate</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.profileHint}>
                  Each code is single-use. Share one with a friend to let them register.
                </Text>

                {isLoadingInviteCodes ? (
                  <ActivityIndicator color="#22c55e" style={{ marginTop: 16 }} />
                ) : inviteCodes.length === 0 ? (
                  <Text style={[styles.emptyText, { marginTop: 12 }]}>No invite codes yet</Text>
                ) : (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {inviteCodes.map((invite) => (
                      <View key={invite.code} style={styles.inviteRow}>
                        <Text style={styles.inviteRowCode}>{invite.code}</Text>
                        {invite.usedBy ? (
                          <View style={styles.inviteRowStatus}>
                            <CircleCheckBig size={14} color="#71717a" />
                            <Text style={styles.inviteRowStatusText}>Used</Text>
                          </View>
                        ) : (
                          <View style={styles.inviteRowStatus}>
                            <Clock size={14} color="#22c55e" />
                            <Text style={[styles.inviteRowStatusText, { color: '#22c55e' }]}>Unused</Text>
                            <TouchableOpacity onPress={() => handleCopyInviteCode(invite.code)} style={{ marginLeft: 8 }}>
                              <Copy size={14} color="#71717a" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>

        {/* MINI PLAYER */}
        {currentSong && (
          <TouchableOpacity style={styles.miniPlayer} onPress={() => setIsPlayerModalVisible(true)}>
            <Image
              source={{ uri: currentSong.coverUrl ? `${serverUrl}${currentSong.coverUrl}` : 'https://placehold.co/100' }}
              style={styles.miniPlayerImage as any}
            />
            <View style={styles.miniPlayerDetails}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={styles.miniPlayerArtist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </View>
            <TouchableOpacity onPress={togglePlay} style={styles.miniPlayerPlayButton}>
              {isPlaying ? (
                <Pause size={18} color="#000" fill="#000" />
              ) : (
                <Play size={18} color="#000" fill="#000" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* TAB BAR */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => {
              setCurrentScreen('home');
              setActivePlaylist(null);
            }}
            style={styles.tabItem}
          >
            <Music size={20} color={currentScreen === 'home' ? '#22c55e' : '#71717a'} />
            <Text style={[styles.tabLabel, currentScreen === 'home' && { color: '#22c55e' }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCurrentScreen('radio')} style={styles.tabItem}>
            <Radio size={20} color={currentScreen === 'radio' ? '#22c55e' : '#71717a'} />
            <Text style={[styles.tabLabel, currentScreen === 'radio' && { color: '#22c55e' }]}>Radio</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCurrentScreen('upload')} style={styles.tabItem}>
            <Upload size={20} color={currentScreen === 'upload' ? '#22c55e' : '#71717a'} />
            <Text style={[styles.tabLabel, currentScreen === 'upload' && { color: '#22c55e' }]}>Import</Text>
          </TouchableOpacity>
        </View>

        {/* FULL PLAYER MODAL */}
        <Modal animationType="slide" transparent={false} visible={isPlayerModalVisible}>
          {currentSong && (
            <SafeAreaView style={styles.fullPlayerContainer}>
              <StatusBar barStyle="light-content" />

              <View style={styles.fullPlayerHeader}>
                <TouchableOpacity onPress={() => setIsPlayerModalVisible(false)} style={styles.closePlayerButton}>
                  <ChevronDown size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.fullPlayerHeaderTitle}>
                  {isRadioMode ? 'RADIO' : 'NOW PLAYING'}
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={styles.fullPlayerCoverContainer}>
                <Image
                  source={{
                    uri: currentSong.coverUrl ? `${serverUrl}${currentSong.coverUrl}` : 'https://placehold.co/400',
                  }}
                  style={styles.fullPlayerCover as any}
                />
              </View>

              <View style={styles.fullPlayerMeta}>
                <Text style={styles.fullPlayerTitle} numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text style={styles.fullPlayerArtist} numberOfLines={1}>
                  {currentSong.artist}
                </Text>
              </View>

              <View style={styles.seekContainer}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleSeek}
                  onLayout={(e) => {
                    progressWidthRef.current = e.nativeEvent.layout.width;
                  }}
                  style={styles.progressBarWrapper}
                >
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${((currentTime || 0) / (duration || 1)) * 100}%` },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>

              <View style={styles.controlsRow}>
                {isRadioMode ? (
                  <TouchableOpacity onPress={togglePlay} style={styles.fullPlayButton}>
                    {isPlaying ? (
                      <Pause size={28} color="#000" fill="#000" />
                    ) : (
                      <Play size={28} color="#000" fill="#000" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)}>
                      <Shuffle size={20} color={isShuffle ? '#22c55e' : '#71717a'} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playPrevious}>
                      <SkipBack size={32} color="#fff" fill="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={togglePlay} style={styles.fullPlayButton}>
                      {isPlaying ? (
                        <Pause size={28} color="#000" fill="#000" />
                      ) : (
                        <Play size={28} color="#000" fill="#000" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playNext}>
                      <SkipForward size={32} color="#fff" fill="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
                        const next = (modes.indexOf(isLoop) + 1) % modes.length;
                        setIsLoop(modes[next]);
                      }}
                    >
                      <Repeat size={20} color={isLoop !== 'none' ? '#22c55e' : '#71717a'} />
                      {isLoop === 'one' && (
                        <Text style={styles.loopOneIndicator}>1</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </SafeAreaView>
          )}
        </Modal>
      </SafeAreaView>
    );
  } catch (e) {
    console.error('Render error:', e);
    if (!hasError) setHasError(true);
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Something went wrong</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#a1a1aa',
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#22c55e',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  authModeToggle: {
    marginTop: 20,
    alignItems: 'center',
  },
  authModeToggleText: {
    color: '#71717a',
    fontSize: 13,
  },
  authModeToggleLink: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#18181b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 13,
    fontStyle: 'italic',
  },
  horizontalScroll: {
    paddingLeft: 0,
  },
  playlistCard: {
    width: 140,
    marginRight: 16,
  },
  playlistImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#18181b',
  },
  playlistTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  songRowImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#09090b',
  },
  songRowDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  songRowTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  songRowArtist: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#09090b',
  },
  gridTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  gridArtist: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  importerCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  importerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  importerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  importerDescription: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 18,
    marginBottom: 16,
  },
  importerForm: {
    flexDirection: 'row',
    gap: 8,
  },
  importerInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 13,
  },
  importerButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importerButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  queueItemUrl: {
    color: '#52525b',
    fontSize: 10,
    marginTop: 2,
  },
  queueItemError: {
    color: '#ef4444',
    fontSize: 10,
    marginTop: 4,
  },
  queueStatusContainer: {
    alignItems: 'flex-end',
  },
  queueStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 72,
    left: 16,
    right: 16,
    height: 60,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  miniPlayerImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#09090b',
  },
  miniPlayerDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  miniPlayerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  miniPlayerArtist: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 1,
  },
  miniPlayerPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#09090b',
    borderTopWidth: 1,
    borderTopColor: '#18181b',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 8,
    width: 80,
  },
  tabLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  fullPlayerContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  fullPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closePlayerButton: {
    padding: 8,
  },
  fullPlayerHeaderTitle: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  fullPlayerCoverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxHeight: SCREEN_WIDTH * 0.9,
    marginVertical: 20,
  },
  fullPlayerCover: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: 24,
    backgroundColor: '#18181b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  fullPlayerMeta: {
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  fullPlayerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  fullPlayerArtist: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  seekContainer: {
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  progressBarWrapper: {
    height: 12,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#18181b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fullPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  profileCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  profileAvatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitials: {
    color: '#22c55e',
    fontSize: 26,
    fontWeight: '900',
  },
  profileAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileUsernameLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  profileHint: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  profileSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  profileGenerateButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  profileGenerateButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
  },
  inviteRowCode: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  inviteRowStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteRowStatusText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
  },
  loopOneIndicator: {
    position: 'absolute',
    top: -4,
    right: -6,
    fontSize: 8,
    color: '#000',
    fontWeight: 'bold',
    backgroundColor: '#22c55e',
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
