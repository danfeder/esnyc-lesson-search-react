import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableTitleProps {
  title: string;
  lessonId: string;
  onTitleChange: (lessonId: string, newTitle: string) => void;
  isEdited?: boolean;
  originalTitle?: string;
  className?: string;
  disabled?: boolean;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  lessonId,
  onTitleChange,
  isEdited = false,
  originalTitle,
  className = '',
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!disabled) {
      setIsEditing(true);
      setError(null);
    }
  };

  const handleCancel = () => {
    setLocalTitle(title);
    setIsEditing(false);
    setError(null);
  };

  const handleSave = () => {
    const trimmedTitle = localTitle.trim();

    // Validation
    if (!trimmedTitle) {
      setError('Title cannot be empty');
      return;
    }

    if (trimmedTitle.length > 500) {
      setError('Title must be less than 500 characters');
      return;
    }

    onTitleChange(lessonId, trimmedTitle);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={500}
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:text-green-800 transition-colors"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <p className="text-xs text-gray-500 mt-1">{localTitle.length}/500 characters</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <span
        className={`flex-1 ${isEdited ? 'italic text-blue-700' : ''}`}
        title={isEdited && originalTitle ? `Original: ${originalTitle}` : undefined}
      >
        {title}
        {isEdited && <span className="ml-2 text-xs text-blue-600 font-normal">(edited)</span>}
      </span>
      {!disabled && (
        <button
          onClick={handleStartEdit}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-700 transition-all"
          title="Edit title"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
