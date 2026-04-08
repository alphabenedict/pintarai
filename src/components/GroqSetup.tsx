import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Eye, EyeOff, ExternalLink, Trash2 } from 'lucide-react';
import { setGroqKey, clearGroqKey, getGroqKey } from '../lib/groq';

interface GroqSetupProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function GroqSetup({ open, onClose, onSaved }: GroqSetupProps) {
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hasKey = !!getGroqKey();

  const handleSave = async () => {
    if (!input.trim()) { setError('Masukkan API key dulu'); return; }
    if (!input.trim().startsWith('gsk_')) { setError('API key Groq harus diawali "gsk_"'); return; }

    setSaving(true);
    setError('');

    // Quick test call
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${input.trim()}` },
      });
      if (!res.ok) { setError('API key tidak valid. Coba lagi.'); setSaving(false); return; }
    } catch {
      setError('Tidak bisa terhubung ke Groq. Cek koneksi internet.'); setSaving(false); return;
    }

    setGroqKey(input.trim());
    setSaving(false);
    setInput('');
    onSaved();
    onClose();
  };

  const handleClear = () => {
    clearGroqKey();
    onSaved();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="glass-strong rounded-glass-lg w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">AI Cloud (Groq)</h2>
                  <p className="text-xs text-slate-500">Respons instan saat ada internet</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Tutup">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Info */}
            <div className="glass rounded-glass px-4 py-3 mb-4 border-l-2 border-indigo-300 space-y-1.5">
              <p className="text-xs font-medium text-slate-700">Cara mendapatkan API key gratis:</p>
              <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
                <li>Buka <span className="font-medium text-indigo-600">console.groq.com</span></li>
                <li>Daftar akun gratis</li>
                <li>Buat API key baru</li>
                <li>Salin & tempel di sini</li>
              </ol>
              <p className="text-xs text-slate-400 pt-0.5">Gratis 14.400 pesan/hari 🎁</p>
            </div>

            {/* Current status */}
            {hasKey && !input && (
              <div className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">API key tersimpan</span>
                </div>
                <button onClick={handleClear} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            )}

            {/* Input */}
            <div className="mb-2">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  placeholder={hasKey ? 'Masukkan key baru untuk mengganti...' : 'gsk_...'}
                  className="w-full text-sm rounded-xl px-4 py-3 pr-10 border border-slate-200 bg-white/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  style={{ fontFamily: show ? 'monospace' : undefined }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1.5 ml-1">{error}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving || !input.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
              >
                {saving ? 'Memeriksa...' : 'Simpan & Aktifkan'}
              </motion.button>
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-3 rounded-xl text-xs font-medium text-slate-500 glass"
                aria-label="Buka Groq Console"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
