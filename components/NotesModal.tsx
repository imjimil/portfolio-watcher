'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  existingNotes?: string;
  onSave: (notes: string) => void;
}

export default function NotesModal({ 
  isOpen, 
  onClose, 
  symbol, 
  existingNotes,
  onSave 
}: NotesModalProps) {
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setNotes(existingNotes || '');
    }
  }, [isOpen, existingNotes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(notes.trim());
    setNotes('');
  };

  const handleRemove = () => {
    onSave('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold">Notes for {symbol}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this stock..."
              rows={6}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 resize-none"
            />
            <div className="text-xs text-gray-500 mt-1">{notes.length} characters</div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {existingNotes ? 'Update Notes' : 'Save Notes'}
            </button>
            {existingNotes && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

