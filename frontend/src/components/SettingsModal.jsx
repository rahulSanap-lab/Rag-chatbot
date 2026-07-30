import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { settingsApi } from '../services/api';
import { Settings, X, Save, Sparkles, Sliders, Layers, Cpu } from 'lucide-react';

export const SettingsModal = () => {
  const { isSettingsModalOpen, setIsSettingsModalOpen, ragSettings, setRagSettings } =
    useChat();

  const [formData, setFormData] = useState({ ...ragSettings });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await settingsApi.update(formData);
      setRagSettings(res.data);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setIsSettingsModalOpen(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to save RAG settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                RAG Pipeline Settings
              </h3>
              <p className="text-xs text-slate-500">Tune LLM and Vector Retrieval parameters</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
          {/* LLM Model */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> LLM Model
            </label>
            <select
              value={formData.llm_model}
              onChange={(e) => handleChange('llm_model', e.target.value)}
              className="w-full p-2.5 rounded-xl glass-input text-slate-800 dark:text-slate-200"
            >
              <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B (Fast & High Intelligence - Recommended)</option>
              <option value="llama-3.1-8b-instant">LLaMA 3.1 8B (Ultra Fast)</option>
              <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill 70B (Reasoning)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k Context)</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-500" /> Temperature
              </span>
              <span>{formData.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Lower values (0.0 - 0.3) provide strict factual answers.
            </p>
          </div>

          {/* Max Tokens & Top-K */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Max Tokens
              </label>
              <input
                type="number"
                value={formData.max_tokens}
                onChange={(e) => handleChange('max_tokens', parseInt(e.target.value) || 1024)}
                className="w-full p-2 rounded-xl glass-input text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Top-K Retrieval
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.top_k}
                onChange={(e) => handleChange('top_k', parseInt(e.target.value) || 5)}
                className="w-full p-2 rounded-xl glass-input text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Chunk Size & Overlap */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-pink-500" /> Chunk Size
              </label>
              <input
                type="number"
                value={formData.chunk_size}
                onChange={(e) => handleChange('chunk_size', parseInt(e.target.value) || 800)}
                className="w-full p-2 rounded-xl glass-input text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Chunk Overlap
              </label>
              <input
                type="number"
                value={formData.chunk_overlap}
                onChange={(e) => handleChange('chunk_overlap', parseInt(e.target.value) || 150)}
                className="w-full p-2 rounded-xl glass-input text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Embedding Provider */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Embedding Provider
            </label>
            <select
              value={formData.embedding_provider}
              onChange={(e) => handleChange('embedding_provider', e.target.value)}
              className="w-full p-2.5 rounded-xl glass-input text-slate-800 dark:text-slate-200"
            >
              <option value="sentence-transformers">SentenceTransformers (Local - Fast)</option>
              <option value="gemini">Gemini Embeddings (text-embedding-004)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <span>Saved!</span>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
