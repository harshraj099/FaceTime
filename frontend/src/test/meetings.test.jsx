import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { seedCall, stream } from './streamMock';
import { mockApi, renderApp } from './utils';

const location = () => screen.getByTestId('location').textContent;
const lastClient = () => stream.clients.at(-1);
const DAY = 24 * 60 * 60 * 1000;

describe('home: meeting actions', () => {
  it('starts an instant meeting and opens it', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/');

    await user.click(await screen.findByText('New Meeting'));
    expect(await screen.findByText('Start an Instant Meeting')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start Meeting/ }));

    await waitFor(() => expect(location()).toMatch(/^\/meeting\/[0-9a-f-]{36}$/));
    const [type, id] = lastClient().call.mock.calls[0];
    expect(type).toBe('default');
    expect(location()).toBe(`/meeting/${id}`);

    const call = stream.calls.get(id);
    const { data } = call.getOrCreate.mock.calls[0][0];
    expect(data.custom).toEqual({ description: 'Instant Meeting' });
    expect(new Date(data.starts_at).toString()).not.toBe('Invalid Date');

    expect(await screen.findByText('Meeting Created')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Setup' })).toBeInTheDocument();
  });

  it('schedules a meeting with a description and copies its link', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/');

    await user.click(await screen.findByText('Schedule Meeting'));
    expect(await screen.findByText('Create Meeting')).toBeInTheDocument();
    await user.type(document.querySelector('textarea'), 'Sprint planning');
    await user.click(screen.getByRole('button', { name: /Schedule Meeting/ }));

    expect(await screen.findByRole('heading', { name: 'Meeting Created' })).toBeInTheDocument();
    expect(location()).toBe('/'); // scheduled meetings do not auto-open

    const [, id] = lastClient().call.mock.calls[0];
    const { data } = stream.calls.get(id).getOrCreate.mock.calls[0][0];
    expect(data.custom).toEqual({ description: 'Sprint planning' });

    await user.click(screen.getByRole('button', { name: /Copy Meeting Link/ }));
    await expect(navigator.clipboard.readText()).resolves.toBe(
      `http://localhost:3000/meeting/${id}`,
    );
    expect(await screen.findByText('Link Copied')).toBeInTheDocument();
  });

  it('shows a toast when creating the meeting fails', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/');
    await screen.findByText('New Meeting');

    lastClient().call.mockImplementation((type, id) => ({
      id,
      getOrCreate: () => Promise.reject(new Error('Stream down')),
    }));
    await user.click(screen.getByText('New Meeting'));
    await user.click(await screen.findByRole('button', { name: /Start Meeting/ }));

    expect(await screen.findByText('Failed to create Meeting')).toBeInTheDocument();
    expect(location()).toBe('/');
  });

  it('joins a meeting from a pasted invitation link', async () => {
    const user = userEvent.setup();
    seedCall({ id: 'abc', startsAt: new Date(Date.now() - 1000) });
    mockApi();
    renderApp('/');

    await user.click(await screen.findByText('Join Meeting'));
    await user.type(await screen.findByPlaceholderText('Meeting link'), 'http://localhost:3000/meeting/abc');
    await user.click(screen.getByRole('button', { name: /Join Meeting/ }));

    expect(location()).toBe('/meeting/abc');
    expect(await screen.findByRole('heading', { name: 'Setup' })).toBeInTheDocument();
  });

  it('opens recordings from the View Recordings card', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/');

    await user.click(await screen.findByText('View Recordings'));
    expect(location()).toBe('/recordings');
  });
});

describe('call lists', () => {
  const seedMeetings = () => {
    seedCall({ id: 'future', startsAt: new Date(Date.now() + DAY), custom: { description: 'Future sync' } });
    seedCall({
      id: 'past',
      startsAt: new Date(Date.now() - DAY),
      custom: { description: 'Retro' },
      recordings: [
        {
          filename: 'retro-recording.mp4',
          url: 'https://cdn.example.com/retro.mp4',
          start_time: '2026-01-01T10:00:00Z',
        },
      ],
    });
    seedCall({ id: 'ended', endedAt: new Date(), custom: {} });
  };

  it('upcoming shows only future meetings, with Start and Copy Link', async () => {
    const user = userEvent.setup();
    seedMeetings();
    mockApi();
    renderApp('/upcoming');

    expect(await screen.findByText('Future sync')).toBeInTheDocument();
    expect(screen.queryByText('Retro')).not.toBeInTheDocument();

    // queries only the user's calls that have a start time, newest first
    const query = lastClient().queryCalls.mock.calls[0][0];
    expect(query.sort).toEqual([{ field: 'starts_at', direction: -1 }]);
    expect(query.filter_conditions.$or).toEqual([
      { created_by_user_id: 'user-1' },
      { members: { $in: ['user-1'] } },
    ]);

    await user.click(screen.getByRole('button', { name: /Copy Link/ }));
    await expect(navigator.clipboard.readText()).resolves.toBe('http://localhost:3000/meeting/future');

    await user.click(screen.getByRole('button', { name: /Start/ }));
    expect(location()).toBe('/meeting/future');
  });

  it('previous shows past and ended meetings without action buttons', async () => {
    seedMeetings();
    mockApi();
    renderApp('/previous');

    expect(await screen.findByText('Retro')).toBeInTheDocument();
    expect(screen.getByText('No Description')).toBeInTheDocument();
    expect(screen.queryByText('Future sync')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start|Copy Link/ })).not.toBeInTheDocument();
  });

  it('recordings lists recordings of the user\'s calls with a Play button', async () => {
    seedMeetings();
    mockApi();
    renderApp('/recordings');

    expect(await screen.findByText('retro-recording.mp4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play/ })).toBeInTheDocument();
    expect(screen.getAllByText(/Play|retro-recording/)).toHaveLength(2);
  });

  it.each([
    ['/upcoming', 'No Upcoming Calls'],
    ['/previous', 'No Previous Calls'],
    ['/recordings', 'No Recordings'],
  ])('%s shows an empty state', async (path, message) => {
    mockApi();
    renderApp(path);

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});

describe('personal room', () => {
  it('shows room details and copies the invitation', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/personal-room');

    expect(await screen.findByText("harsh's Meeting Room")).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    const link = 'http://localhost:3000/meeting/user-1?personal=true';
    expect(screen.getByText(link)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy Invitation' }));
    await expect(navigator.clipboard.readText()).resolves.toBe(link);
  });

  it('creates the room on first start and opens it', async () => {
    const user = userEvent.setup();
    mockApi();
    renderApp('/personal-room');

    await user.click(await screen.findByRole('button', { name: 'Start Meeting' }));

    await waitFor(() => expect(location()).toBe('/meeting/user-1?personal=true'));
    expect(lastClient().call).toHaveBeenCalledWith('default', 'user-1');
    expect(stream.calls.get('user-1').getOrCreate).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing room without recreating it', async () => {
    const user = userEvent.setup();
    const room = seedCall({ id: 'user-1', startsAt: new Date(Date.now() - DAY) });
    mockApi();
    renderApp('/personal-room');

    // wait until the existing room has been looked up
    await waitFor(() => expect(lastClient().queryCalls).toHaveBeenCalled());
    await user.click(await screen.findByRole('button', { name: 'Start Meeting' }));

    await waitFor(() => expect(location()).toBe('/meeting/user-1?personal=true'));
    expect(room.getOrCreate).not.toHaveBeenCalled();
  });
});
