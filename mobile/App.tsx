import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  Modal,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  UploadCloud,
  ListMusic,
  LogOut,
  ChevronDown,
  Check,
  Plus,
  Link,
  Lock,
  User as UserIcon,
  Globe,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Interfaces
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

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home' | 'playlists' | 'upload'>('login');
  
  // Auth States
  const [serverUrl, setServerUrl] = useState('https://api.music.xisd.uz');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Music Player States
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

  // YouTube Importer States
  const [ytUrl, setYtUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importQueue, setImportQueue] = useState<ImportItem[]>([]);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressWidthRef = useRef<number>(0);

  // Axios instance creator
  const getApi = () => {
    return axios.create({
      baseURL: serverUrl,
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  };

  // Initialize Auth
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedServer = await AsyncStorage.getItem('symphony_server_url');
        if (savedServer) setServerUrl(savedServer);

        const savedToken = await SecureStore.getItemAsync('symphony_jwt_token');
        if (savedToken) {
          setToken(savedToken);
          setCurrentScreen('home');
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // Configure Audio Mode for Background Playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn('Failed to set audio mode:', err);
      }
    };
    setupAudio();
  }, []);

  // Fetch Music Library Data
  const fetchLibrary = async () => {
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
  };

  // Trigger library fetch on screen change
  useEffect(() => {
    if (token && currentScreen !== 'login') {
      fetchLibrary();
    }
  }, [currentScreen, token]);

  // Poll YouTube background downloads when on the upload screen
  useEffect(() => {
    if (currentScreen !== 'upload' || !token) return;

    const fetchImports = async () => {
      try {
        const res = await getApi().get('/songs/import-status');
        setImportQueue(res.data);
      } catch (err) {}
    };

    fetchImports();
    const interval = setInterval(fetchImports, 3000);
    return () => clearInterval(interval);
  }, [currentScreen, token]);

  // Login handler
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
      setCurrentScreen('home');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Check server URL and credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('symphony_jwt_token');
      setToken(null);
      setCurrentSong(null);
      setIsPlaying(false);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setCurrentScreen('login');
    } catch (err) {}
  };

  // Playback Control Handlers
  const playSong = async (song: Song, contextQueue: Song[] = []) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Track play count on server
      getApi().post(`/songs/${song.id}/play`).catch(() => {});
      getApi().post(`/songs/${song.id}/history`).catch(() => {});

      const audioUri = `${serverUrl}${song.audioUrl}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentSong(song);
      setIsPlaying(true);
      setDuration(song.duration);

      // Setup queue context
      if (contextQueue.length > 0) {
        setQueue(contextQueue);
      } else if (!queue.some((s) => s.id === song.id)) {
        setQueue([song, ...queue]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not play audio stream.');
      setIsPlaying(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;

    setCurrentTime(status.positionMillis / 1000);
    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }

    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      handleSongEnded();
    }
  };

  const handleSongEnded = () => {
    if (isLoop === 'one') {
      soundRef.current?.setStatusAsync({ positionMillis: 0, shouldPlay: true });
    } else {
      playNext();
    }
  };

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
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

    if (nextSong) playSong(nextSong, queue);
  };

  const playPrevious = async () => {
    if (queue.length === 0 || !currentSong) return;

    if (currentTime > 3) {
      await soundRef.current?.setStatusAsync({ positionMillis: 0 });
      return;
    }

    const idx = queue.findIndex((s) => s.id === currentSong.id);
    let prevSong: Song | null = null;
    if (idx > 0) {
      prevSong = queue[idx - 1];
    } else if (isLoop === 'all') {
      prevSong = queue[queue.length - 1];
    }

    if (prevSong) playSong(prevSong, queue);
  };

  const handleSeek = async (event: any) => {
    if (progressWidthRef.current === 0 || !soundRef.current) return;
    const { locationX } = event.nativeEvent;
    const percent = locationX / progressWidthRef.current;
    const seekTime = Math.max(0, Math.min(duration, percent * duration));
    await soundRef.current.setStatusAsync({ positionMillis: seekTime * 1000 });
  };

  // YouTube Importer Submission
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
      // Force refresh status
      const statusRes = await getApi().get('/songs/import-status');
      setImportQueue(statusRes.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit download.';
      Alert.alert('Error', msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Open specific Playlist Screen
  const openPlaylist = async (playlist: Playlist) => {
    setActivePlaylist(playlist);
    try {
      const res = await getApi().get(`/playlists/${playlist.id}`);
      // Playlist detail endpoint returns playlist with its songs array
      setPlaylistSongs(res.data.playlistSongs.map((ps: any) => ps.song));
      setCurrentScreen('playlists');
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch playlist tracks.');
    }
  };

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter Search Results
  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initializing Loader Screen
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // Login Screen
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.loginScroll}>
          <View style={styles.loginCard}>
            <View style={styles.logoContainer}>
              <Music size={54} color="#22c55e" />
              <Text style={styles.logoText}>Symphony</Text>
              <Text style={styles.logoSubtext}>Private Music Player</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SERVER URL</Text>
              <View style={styles.inputWrapper}>
                <Globe size={18} color="#71717a" style={styles.inputIcon} />
                <TextInput
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="https://api.music.xisd.uz"
                  placeholderTextColor="#52525b"
                  style={styles.textInput}
                  autoCapitalize="none"
                />
              </View>
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
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#71717a" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  style={styles.textInput}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.loginButtonText}>Connect & Log In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      {/* Screen Headers */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentScreen === 'home' && 'Symphony'}
          {currentScreen === 'playlists' && (activePlaylist ? activePlaylist.name : 'Playlists')}
          {currentScreen === 'upload' && 'Add Music'}
        </Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* SCREEN ROUTING */}
      <View style={{ flex: 1 }}>
        {/* HOME SCREEN */}
        {currentScreen === 'home' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Search Box */}
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
              // Search Results List
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
                {/* Playlists Horizontal Slider */}
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

                {/* Recently Added Section */}
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

                {/* Trending Section */}
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

            {/* Background Downloads Queue */}
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
      </View>

      {/* BOTTOM PERSISTENT MINI-PLAYER CAPSULE */}
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

      {/* FOOTER TAB NAV BAR */}
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

        <TouchableOpacity onPress={() => setCurrentScreen('upload')} style={styles.tabItem}>
          <UploadCloud size={20} color={currentScreen === 'upload' ? '#22c55e' : '#71717a'} />
          <Text style={[styles.tabLabel, currentScreen === 'upload' && { color: '#22c55e' }]}>Import</Text>
        </TouchableOpacity>
      </View>

      {/* FULL SCREEN PLAYER MODAL DIALOG */}
      <Modal animationType="slide" transparent={false} visible={isPlayerModalVisible}>
        {currentSong && (
          <SafeAreaView style={styles.fullPlayerContainer}>
            <StatusBar barStyle="light-content" />

            {/* Back Handle */}
            <View style={styles.fullPlayerHeader}>
              <TouchableOpacity onPress={() => setIsPlayerModalVisible(false)} style={styles.closePlayerButton}>
                <ChevronDown size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.fullPlayerHeaderTitle}>NOW PLAYING</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Album Cover Art */}
            <View style={styles.fullPlayerCoverContainer}>
              <Image
                source={{
                  uri: currentSong.coverUrl ? `${serverUrl}${currentSong.coverUrl}` : 'https://placehold.co/400',
                }}
                style={styles.fullPlayerCover as any}
              />
            </View>

            {/* Song Meta Information */}
            <View style={styles.fullPlayerMeta}>
              <Text style={styles.fullPlayerTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={styles.fullPlayerArtist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </View>

            {/* Custom Precision Touch Seek Bar */}
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

            {/* Player Controls (Shuffle, Prev, Play, Next, Loop) */}
            <View style={styles.controlsRow}>
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
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// Styling system
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
