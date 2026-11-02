import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

import { resetStream } from './streamMock';

// the real Stream SDK needs WebRTC; tests use an in-memory fake instead
vi.mock('@stream-io/video-react-sdk', () => import('./streamMock'));

// browser APIs that jsdom lacks but Radix menus/dialogs call
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

beforeEach(() => {
  localStorage.clear();
  resetStream();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
