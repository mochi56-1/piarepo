import { useEffect, useRef, useState } from 'react';

const messages = {
  'not-allowed': 'マイクの利用が許可されていません。ブラウザのサイト設定でマイクを許可してください。',
  'service-not-allowed': 'このブラウザでは音声認識を利用できません。別の対応ブラウザでお試しください。',
  'audio-capture': 'マイクが見つかりません。接続と端末の設定を確認してください。',
  'no-speech': '音声を聞き取れませんでした。もう一度マイクボタンを押して話してください。',
  network: '音声認識に接続できません。通信環境を確認して、もう一度お試しください。',
  language: '日本語の音声認識を利用できません。別のブラウザでお試しください。',
  'language-not-supported': '日本語の音声認識を利用できません。別のブラウザでお試しください。',
};

export default function useSpeechInput(enabled, setBody) {
  const recognition = useRef(null);
  const [status, setStatus] = useState('idle');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!Recognition && window.isSecureContext;

  useEffect(() => {
    if (!enabled) {
      const current = recognition.current;
      recognition.current = null;
      current?.abort();
      setStatus('idle');
      setInterim('');
      setError('');
    }
  }, [enabled]);

  useEffect(() => () => {
    const current = recognition.current;
    recognition.current = null;
    current?.abort();
  }, []);

  const start = () => {
    if (!enabled || !supported || recognition.current) return;
    setError('');
    setInterim('');
    try {
      const current = new Recognition();
      recognition.current = current;
      current.lang = 'ja-JP';
      current.continuous = true;
      current.interimResults = true;
      const finalized = new Set();
      current.onstart = () => {
        if (recognition.current === current) setStatus(previous => previous === 'stopping' ? previous : 'listening');
      };
      current.onresult = event => {
        if (recognition.current !== current) return;
        const complete = [], pending = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            if (!finalized.has(i)) { finalized.add(i); if (text.trim()) complete.push(text.trim()); }
          } else pending.push(text);
        }
        if (complete.length) {
          const text = complete.join('');
          setBody(previous => previous + (previous && !/\s$/.test(previous) ? '\n' : '') + text);
        }
        setInterim(pending.join(''));
      };
      current.onerror = event => {
        if (recognition.current !== current) return;
        if (event.error !== 'aborted') setError(messages[event.error] || '音声入力を続けられませんでした。もう一度お試しください。');
        setInterim('');
      };
      current.onend = () => {
        if (recognition.current !== current) return;
        recognition.current = null;
        setStatus('idle');
        setInterim('');
      };
      setStatus('starting');
      current.start();
    } catch {
      const current = recognition.current;
      recognition.current = null;
      try { current?.abort(); } catch { /* Already stopped. */ }
      setStatus('idle');
      setError('音声入力を開始できませんでした。マイクの許可とブラウザの対応状況を確認してください。');
    }
  };

  const stop = () => {
    if (!recognition.current || status === 'stopping') return;
    setStatus('stopping');
    try { recognition.current.stop(); }
    catch {
      const current = recognition.current;
      recognition.current = null;
      try { current?.abort(); } catch { /* Already stopped. */ }
      setStatus('idle'); setInterim('');
      setError('音声入力が終了しました。本文を確認してください。');
    }
  };
  return { supported, status, interim, error, start, stop, busy: status !== 'idle' };
}
