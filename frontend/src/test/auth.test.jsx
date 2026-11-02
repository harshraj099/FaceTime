import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { stream } from './streamMock';
import { mockApi, renderApp, signedInUser } from './utils';

const location = () => screen.getByTestId('location').textContent;

describe('authentication', () => {
  it('redirects a signed-out visitor from a protected page to sign-in', async () => {
    mockApi();
    renderApp('/upcoming', { signedIn: false });

    expect(await screen.findByText('Sign in to YOOM')).toBeInTheDocument();
    expect(location()).toBe('/sign-in');
  });

  it('redirects unknown URLs to home (and so to sign-in when signed out)', async () => {
    mockApi();
    renderApp('/does-not-exist', { signedIn: false });

    expect(await screen.findByText('Sign in to YOOM')).toBeInTheDocument();
  });

  it('signs up, stores the session and lands on home with a Stream client for the user', async () => {
    const user = userEvent.setup();
    const requests = mockApi({
      'POST /api/auth/sign-up': [201, { token: 'new-token', user: signedInUser }],
    });
    renderApp('/sign-up', { signedIn: false });

    await user.type(await screen.findByLabelText('Username'), 'harsh');
    await user.type(screen.getByLabelText('Email address'), 'harsh@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('New Meeting')).toBeInTheDocument();
    expect(location()).toBe('/');
    expect(localStorage.getItem('yoom_token')).toBe('new-token');
    expect(requests.find((r) => r.key === 'POST /api/auth/sign-up').body).toEqual({
      username: 'harsh',
      email: 'harsh@example.com',
      password: 'password123',
    });

    // Stream client is created for the signed-in user and fetches its token from the backend
    const client = stream.clients.at(-1);
    expect(client.options.apiKey).toBe('test-stream-key');
    expect(client.options.user).toEqual({ id: 'user-1', name: 'harsh', image: undefined });
    await expect(client.options.tokenProvider()).resolves.toBe('stream-token');
    const tokenRequest = requests.find((r) => r.key === 'GET /api/stream/token');
    expect(tokenRequest.headers.Authorization).toBe('Bearer new-token');
  });

  it('shows the backend error when sign-up is rejected', async () => {
    const user = userEvent.setup();
    mockApi({
      'POST /api/auth/sign-up': [409, { message: 'Username is already taken' }],
    });
    renderApp('/sign-up', { signedIn: false });

    await user.type(await screen.findByLabelText('Username'), 'harsh');
    await user.type(screen.getByLabelText('Email address'), 'harsh@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Username is already taken')).toBeInTheDocument();
    expect(location()).toBe('/sign-up');
    expect(localStorage.getItem('yoom_token')).toBeNull();
  });

  it('signs in with username or email', async () => {
    const user = userEvent.setup();
    const requests = mockApi({
      'POST /api/auth/sign-in': [200, { token: 'signin-token', user: signedInUser }],
    });
    renderApp('/sign-in', { signedIn: false });

    await user.type(await screen.findByLabelText('Username or email'), 'harsh@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('New Meeting')).toBeInTheDocument();
    expect(requests.find((r) => r.key === 'POST /api/auth/sign-in').body).toEqual({
      identifier: 'harsh@example.com',
      password: 'password123',
    });
  });

  it('shows an error for wrong credentials and stays on sign-in', async () => {
    const user = userEvent.setup();
    mockApi({
      'POST /api/auth/sign-in': [401, { message: 'Invalid username/email or password' }],
    });
    renderApp('/sign-in', { signedIn: false });

    await user.type(await screen.findByLabelText('Username or email'), 'harsh');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Invalid username/email or password')).toBeInTheDocument();
    expect(location()).toBe('/sign-in');
  });

  it('switches between sign-in and sign-up', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/sign-in', { signedIn: false });

    await user.click(await screen.findByRole('link', { name: 'Sign up' }));
    expect(await screen.findByText('Create your account')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Sign in' }));
    expect(await screen.findByText('Sign in to YOOM')).toBeInTheDocument();
  });

  it('restores an existing session from the stored token', async () => {
    const requests = mockApi();
    renderApp('/');

    expect(await screen.findByText('New Meeting')).toBeInTheDocument();
    const me = requests.find((r) => r.key === 'GET /api/auth/me');
    expect(me.headers.Authorization).toBe('Bearer valid-token');
  });

  it('drops an expired/invalid stored token and asks to sign in', async () => {
    mockApi({ 'GET /api/auth/me': [401, { message: 'User is not authenticated' }] });
    renderApp('/');

    expect(await screen.findByText('Sign in to YOOM')).toBeInTheDocument();
    expect(localStorage.getItem('yoom_token')).toBeNull();
  });

  it('sends a signed-in user away from the sign-in page', async () => {
    mockApi();
    renderApp('/sign-in');

    expect(await screen.findByText('New Meeting')).toBeInTheDocument();
    expect(location()).toBe('/');
  });

  it('signs out from the user menu', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/');

    await user.click(await screen.findByRole('button', { name: 'H' }));
    expect(await screen.findByText('harsh@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByText('Sign in to YOOM')).toBeInTheDocument();
    expect(localStorage.getItem('yoom_token')).toBeNull();
    await waitFor(() => expect(stream.clients.at(-1).disconnectUser).toHaveBeenCalled());
  });
});
