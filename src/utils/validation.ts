// Title validation constants and functions
export const MAX_TITLE_LENGTH = 500;

export function prepareTitleUpdatesForRpc(
  titleEdits: Record<string, string>
): Record<string, string> | null {
  const cleanEdits: Record<string, string> = {};

  for (const [lessonId, newTitle] of Object.entries(titleEdits)) {
    if (typeof newTitle === 'string' && newTitle.trim()) {
      cleanEdits[lessonId] = newTitle.trim();
    }
  }

  return Object.keys(cleanEdits).length > 0 ? cleanEdits : null;
}

export function validateTitle(title: string): string | null {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return 'Title cannot be empty';
  }

  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return `Title must be less than ${MAX_TITLE_LENGTH} characters`;
  }

  return null;
}
