import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/ui/button';

export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');

  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Clean markdown from text
    const cleanText = text.replace(/[#*`_~\[\]()]/g, '').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const startListening = useCallback((onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
      if (onResult) onResult(finalTranscript + interim);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    setListening(true);
    return recognition;
  }, []);

  return { speaking, listening, voiceEnabled, setVoiceEnabled, speak, stopSpeaking, startListening, transcript, setTranscript };
}

export function VoiceControls({ voiceEnabled, setVoiceEnabled, speaking, stopSpeaking, listening, onStartListening, onStopListening }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        data-testid="toggle-voice-btn"
        variant="outline"
        onClick={() => {
          if (speaking) stopSpeaking();
          setVoiceEnabled(!voiceEnabled);
        }}
        className={`h-7 px-2 text-[10px] border-white/10 ${voiceEnabled ? 'text-blue-400 border-blue-500/30' : 'text-zinc-500'}`}
        title={voiceEnabled ? 'Disable voice' : 'Enable voice (AI reads questions aloud)'}
      >
        {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      </Button>
      <Button
        data-testid="mic-btn"
        variant="outline"
        onClick={listening ? onStopListening : onStartListening}
        className={`h-7 px-2 text-[10px] border-white/10 ${listening ? 'text-red-400 border-red-500/30 animate-pulse' : 'text-zinc-500'}`}
        title={listening ? 'Stop recording' : 'Start voice input'}
      >
        {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}
