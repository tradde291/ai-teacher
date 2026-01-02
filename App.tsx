import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClassSelector } from './components/ClassSelector';
import { SmartReader } from './components/SmartReader';
import { AIAssistant } from './components/AIAssistant';
import { AdminPanel } from './components/AdminPanel';
import { LiveService } from './services/liveService';
import { AppState } from './types';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [file, setFile] = useState<File | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Advanced AI State
  const [aiAudioLevel, setAiAudioLevel] = useState(0);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [aiTranscript, setAiTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');

  const liveServiceRef = useRef<LiveService | null>(null);
  const lastPageTextRef = useRef<string>('');

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setState(AppState.CLASSROOM);
  };

  const toggleLiveSession = async () => {
    if (isLive) {
      // Disconnect
      if (liveServiceRef.current) {
        await liveServiceRef.current.disconnect();
        liveServiceRef.current = null;
      }
      setIsLive(false);
      setAiTranscript('');
      setUserTranscript('');
    } else {
      // Connect
      if (!process.env.API_KEY) {
        setError("API Key not found in environment.");
        return;
      }

      setIsConnecting(true);
      setError(null);
      
      try {
        const service = new LiveService({
          apiKey: process.env.API_KEY,
          onAudioLevel: (level, source) => {
             if (source === 'user') setUserAudioLevel(level);
             else setAiAudioLevel(level);
          },
          onTranscription: (text, source, isFinal) => {
             if (source === 'user') setUserTranscript(text);
             else {
                setAiTranscript(text);
             }
          }
        });
        
        await service.connect();
        liveServiceRef.current = service;
        
        // If we already have page text, send it now
        if (lastPageTextRef.current) {
            service.sendPageContext(lastPageTextRef.current);
        }
        
        setIsLive(true);
      } catch (err) {
        console.error(err);
        setError("Failed to connect. Check internet/API key.");
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const handleFrameCapture = useCallback((base64: string) => {
    if (isLive && liveServiceRef.current) {
      liveServiceRef.current.sendImageFrame(base64).catch(e => console.error("Frame send error", e));
    }
  }, [isLive]);

  const handlePageText = useCallback((text: string) => {
    lastPageTextRef.current = text;
    if (isLive && liveServiceRef.current) {
        liveServiceRef.current.sendPageContext(text).catch(e => console.error("Context send error", e));
    }
  }, [isLive]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {state === AppState.HOME && (
          <div className="h-full flex items-center justify-center bg-slate-50 overflow-y-auto">
            <ClassSelector 
              onFileSelect={handleFileSelect} 
              onAdminClick={() => setState(AppState.ADMIN)}
            />
          </div>
        )}

        {state === AppState.ADMIN && (
          <div className="h-full overflow-y-auto">
             <AdminPanel onBack={() => setState(AppState.HOME)} />
          </div>
        )}

        {state === AppState.CLASSROOM && file && (
          <SmartReader 
            file={file} 
            onFrameCapture={handleFrameCapture} 
            onPageText={handlePageText}
            isLive={isLive}
            onBack={() => {
                if (isLive) toggleLiveSession();
                setState(AppState.HOME);
            }}
          />
        )}
      </main>
      
      {/* Premium AI Overlay */}
      <AIAssistant 
        isActive={isLive}
        userAudioLevel={userAudioLevel}
        aiAudioLevel={aiAudioLevel}
        aiTranscript={aiTranscript}
        userTranscript={userTranscript}
        onDisconnect={toggleLiveSession}
      />
      
      {/* Start Button Overlay for Classroom (Only when inactive) */}
      {state === AppState.CLASSROOM && !isLive && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 w-full px-4">
          
          {error && (
             <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-bounce shadow-lg">
                 <AlertCircle size={16} />
                 <span>{error}</span>
             </div>
          )}

          <button
            onClick={toggleLiveSession}
            disabled={isConnecting}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-2xl transition-all transform hover:scale-105 hover:-translate-y-1 ${
               isConnecting 
                 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                 : 'bg-indigo-600 text-white ring-4 ring-indigo-600/20 hover:ring-indigo-600/40'
            }`}
          >
             {isConnecting ? (
               <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <Mic size={24} />
             )}
             <span>{isConnecting ? 'Connecting...' : 'Start AI Tutor'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;