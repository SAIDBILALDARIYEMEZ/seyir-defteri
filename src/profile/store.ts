// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Profile storage in localStorage. Every access is wrapped: blocked storage just means a
// profile that lives for this page only.

import { emptyProfile, parseProfile } from './profile.ts';
import type { Profile } from './profile.ts';

const KEY = 'seyir-defteri.profile';

export function loadProfile(): Profile {
  try {
    const text = localStorage.getItem(KEY);
    return text ? parseProfile(JSON.parse(text)) : emptyProfile();
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage full or blocked: progress stays in memory for this session.
  }
}

export function resetProfile(): Profile {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored to remove.
  }
  return emptyProfile();
}
