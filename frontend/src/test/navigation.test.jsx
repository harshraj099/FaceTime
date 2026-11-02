import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { navigateToLink } from '@/lib/navigation';
import { mockApi, renderApp } from './utils';

describe('sidebar navigation', () => {
  it.each([
    ['Upcoming', '/upcoming', 'Upcoming Meeting'],
    ['Previous', '/previous', 'Previous Calls'],
    ['Recordings', '/recordings', 'Recordings'],
    ['Personal Room', '/personal-room', 'Personal Meeting Room'],
  ])('opens %s', async (label, path, heading) => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/');

    const sidebarLink = () => screen.getByRole('link', { name: `${label} ${label}` });
    await screen.findByText('New Meeting');
    await user.click(sidebarLink());

    expect(screen.getByTestId('location').textContent).toBe(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(sidebarLink()).toHaveClass('bg-blue-1');
  });

  it('highlights Home on the home page and shows the clock', async () => {
    mockApi();
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Home Home' })).toHaveClass('bg-blue-1');
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('YOOM')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }),
    ).toBeInTheDocument();
  });
});

describe('navigateToLink (join via pasted link)', () => {
  it('opens a full link to this site inside the app', () => {
    const navigate = vi.fn();
    navigateToLink(navigate, 'http://localhost:3000/meeting/abc?personal=true');
    expect(navigate).toHaveBeenCalledWith('/meeting/abc?personal=true');
  });

  it('accepts a bare path', () => {
    const navigate = vi.fn();
    navigateToLink(navigate, '/meeting/abc');
    expect(navigate).toHaveBeenCalledWith('/meeting/abc');
  });

  it('does not route links to other sites through the app router', () => {
    const navigate = vi.fn();
    // jsdom cannot actually leave the page; we only check the app router is not used
    try {
      navigateToLink(navigate, 'https://example.com/meeting/abc');
    } catch {
      /* jsdom: navigation not implemented */
    }
    expect(navigate).not.toHaveBeenCalled();
  });
});
