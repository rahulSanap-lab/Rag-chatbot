import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { documentApi } from '../services/api';
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Cpu,
  Database,
} from 'lucide-react';

export const DocumentUploadModal = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, fetchDocuments } = useChat();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stage, setStage] = useState(null); // 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'completed' | 'failed'
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isUploadModalOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    setErrorMsg(null);
    if (!file) return false;

    const allowed = ['pdf', 'docx', 'doc', 'txt', 'md', 'markdown'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setErrorMsg(`Unsupported file type '.${ext}'. Please upload PDF, DOCX, TXT, or MD files.`);
      return false;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds maximum limit of 25MB.');
      return false;
    }

    if (file.size === 0) {
      setErrorMsg('Selected file is empty.');
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setStage('uploading');
    setUploadProgress(10);
    setErrorMsg(null);

    try {
      const res = await documentApi.upload(selectedFile, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
        if (percentCompleted === 100) {
          setStage('extracting');
        }
      });

      setStage('chunking');
      setTimeout(() => setStage('embedding'), 1000);
      setTimeout(() => {
        setStage('completed');
        fetchDocuments();
        setTimeout(() => {
          setIsUploadModalOpen(false);
          resetState();
        }, 1500);
      }, 2500);
    } catch (err) {
      setStage('failed');
      const detail = err.response?.data?.detail || err.message || 'Upload failed.';
      setErrorMsg(detail);
      setUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setStage(null);
    setErrorMsg(null);
  };

  const stagesList = [
    { key: 'uploading', label: 'Uploading File', icon: UploadCloud },
    { key: 'extracting', label: 'Extracting Text & OCR', icon: FileText },
    { key: 'chunking', label: 'Chunking Content', icon: Layers },
    { key: 'embedding', label: 'Generating Vectors (ChromaDB)', icon: Cpu },
    { key: 'completed', label: 'Processing Completed', icon: CheckCircle2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Upload Document
              </h3>
              <p className="text-xs text-slate-500">PDF, DOCX, TXT, Markdown (Max 25MB)</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsUploadModalOpen(false);
              resetState();
            }}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Zone */}
        {!uploading && stage !== 'completed' && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-indigo-400'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-indigo-500 animate-bounce" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Drag and drop your file here
              </p>
              <p className="text-xs text-slate-400">or click browse files below</p>
            </div>

            <label className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-500/20 cursor-pointer transition-all active:scale-95">
              Browse Files
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.markdown"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Selected File Details */}
        {selectedFile && !uploading && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="truncate font-medium text-indigo-900 dark:text-indigo-200">
                {selectedFile.name}
              </span>
              <span className="text-slate-400">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-slate-400 hover:text-rose-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pipeline Stage Tracker */}
        {uploading && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Processing Pipeline</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {stagesList.map((stg, i) => {
                const IconComponent = stg.icon;
                const isCurrent = stage === stg.key;
                const isDone =
                  stagesList.findIndex((s) => s.key === stage) > i || stage === 'completed';

                return (
                  <div
                    key={stg.key}
                    className={`flex items-center gap-3 p-2 rounded-xl text-xs transition-all ${
                      isCurrent
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : isDone
                        ? 'text-emerald-600 dark:text-emerald-400 opacity-90'
                        : 'text-slate-400 opacity-50'
                    }`}
                  >
                    {isCurrent && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {!isCurrent && !isDone && <IconComponent className="w-4 h-4 text-slate-400" />}
                    <span>{stg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Buttons */}
        {!uploading && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                resetState();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleStartUpload}
              disabled={!selectedFile}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all ${
                selectedFile
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              Upload & Process
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
