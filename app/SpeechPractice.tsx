"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error: string; message?: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type Props = {
  answerText: string;
  language: string;
  onTranscript: (text: string) => void;
  onAnnounce: (message: string) => void;
};

export function SpeechPractice({ answerText, language, onTranscript, onAnnounce }: Props) {
  const [captureState, setCaptureState] = useState<"idle" | "requesting" | "listening" | "recording" | "error">("idle");
  const [message, setMessage] = useState("Free live transcription with an audio recording fallback.");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const baseTextRef = useRef("");
  const finalTextRef = useRef("");
  const stoppingRef = useRef(false);
  const fallbackRecordingRef = useRef(false);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  function announce(nextMessage: string) {
    setMessage(nextMessage);
    onAnnounce(nextMessage);
  }

  function stopMedia() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function finishTranscript() {
    const transcript = finalTextRef.current.trim();
    if (transcript) onTranscript(`${baseTextRef.current} ${transcript}`.trim());
  }

  function finishCapture() {
    finishTranscript();
    stopMedia();
    recognitionRef.current = null;
    stoppingRef.current = false;
    fallbackRecordingRef.current = false;
    setCaptureState("idle");
  }

  async function startCapture() {
    if (captureState === "listening" || captureState === "recording") { stopCapture(); return; }
    setCaptureState("requesting");
    announce("Waiting for microphone permission…");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCaptureState("error");
      announce("Microphone access needs the secure MockMate site in Chrome, Edge or Safari.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      if (typeof MediaRecorder !== "undefined") {
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
        recorder.onstop = () => {
          if (!chunksRef.current.length) return;
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })));
        };
        recorder.start(500);
      }

      type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
      const speechWindow = window as SpeechWindow;
      const RecognitionConstructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      if (!RecognitionConstructor) {
        setCaptureState("recording");
        announce("Live transcription is not supported here, but your answer is recording for playback. Type notes while you speak, then press Stop.");
        return;
      }

      baseTextRef.current = answerText.trim();
      finalTextRef.current = "";
      fallbackRecordingRef.current = false;
      const recognition = new RecognitionConstructor();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      recognition.onresult = (event) => {
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) finalTextRef.current = `${finalTextRef.current} ${result[0].transcript}`.trim();
          else interim += result[0].transcript;
        }
        onTranscript(`${baseTextRef.current} ${finalTextRef.current} ${interim}`.trim());
      };
      recognition.onerror = (event) => {
        const blocked = event.error === "not-allowed" || event.error === "service-not-allowed";
        if (blocked) announce("Speech recognition was blocked. Allow microphone and speech access in your browser settings. The audio recording remains available.");
        else if (event.error === "no-speech") announce("No speech was detected. Move closer to the microphone and try again.");
        else announce("Live transcription became unavailable, but audio recording is still active. Press Stop when you finish.");
        fallbackRecordingRef.current = recorderRef.current?.state === "recording";
        setCaptureState(fallbackRecordingRef.current ? "recording" : "error");
      };
      recognition.onend = () => {
        finishTranscript();
        if (fallbackRecordingRef.current && recorderRef.current?.state === "recording" && !stoppingRef.current) {
          recognitionRef.current = null;
          setCaptureState("recording");
          return;
        }
        if (!stoppingRef.current && recorderRef.current?.state === "recording") {
          announce("Transcription ended after a pause. Your recording is ready to review.");
        }
        finishCapture();
      };
      recognition.start();
      setCaptureState("listening");
      announce(`Listening in ${language}. Speak naturally; your words will appear below.`);
    } catch (error) {
      stopMedia();
      setCaptureState("error");
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      announce(denied ? "Microphone permission is off. Allow microphone access for MockMate, then try again." : "The microphone could not start. Check that another app is not using it, then try again.");
    }
  }

  function stopCapture() {
    stoppingRef.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
    else { finishCapture(); announce("Recording stopped. Play it back below or add notes to your answer."); }
  }

  const active = captureState === "listening" || captureState === "recording";
  return (
    <div className="speech-capture">
      <button className={active ? "record-button listening" : "record-button"} onClick={startCapture} disabled={captureState === "requesting"} aria-pressed={active}>
        <span aria-hidden="true">{active ? "■" : captureState === "requesting" ? "…" : "●"}</span>
        <div><b>{active ? "Stop speaking" : captureState === "requesting" ? "Starting microphone…" : "Start speaking"}</b><small>{message}</small></div>
      </button>
      <div className="speech-status" role="status" aria-live="polite"><span className={`speech-state ${captureState}`} aria-hidden="true" />{message}</div>
      {audioUrl && <div className="audio-review"><div><b>Your answer recording</b><small>Playback is stored only in this browser session. The editable transcript is directly below.</small></div>{/* The adjacent live transcript is the caption for the user's own recording. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={audioUrl} aria-label="Recorded interview answer" /><a href={audioUrl} download="mockmate-interview-answer.webm">Download</a><button onClick={() => { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }} aria-label="Remove recording">×</button></div>}
    </div>
  );
}
