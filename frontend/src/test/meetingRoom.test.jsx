import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { seedCall } from './streamMock';
import { mockApi, renderApp } from './utils';

const location = () => screen.getByTestId('location').textContent;
const DAY = 24 * 60 * 60 * 1000;

const joinMeeting = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Join meeting' }));
};

describe('meeting page', () => {
  it('shows Call Not Found for an unknown id', async () => {
    mockApi();
    renderApp('/meeting/missing');

    expect(await screen.findByText('Call Not Found')).toBeInTheDocument();
  });

  it('blocks users who are not members of an invite-only call', async () => {
    seedCall({ id: 'vip', type: 'invited', members: [{ user: { id: 'someone-else' } }] });
    mockApi();
    renderApp('/meeting/vip');

    expect(await screen.findByText('You are not allowed to join this meeting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  });

  it('lets members into an invite-only call', async () => {
    seedCall({ id: 'vip', type: 'invited', members: [{ user: { id: 'user-1' } }] });
    mockApi();
    renderApp('/meeting/vip');

    expect(await screen.findByRole('heading', { name: 'Setup' })).toBeInTheDocument();
  });

  it('tells you when a scheduled meeting has not started yet', async () => {
    seedCall({ id: 'later', startsAt: new Date(Date.now() + DAY) });
    mockApi();
    renderApp('/meeting/later');

    expect(await screen.findByText(/Your Meeting has not started yet/)).toBeInTheDocument();
  });

  it('tells you when the host has ended the call', async () => {
    seedCall({ id: 'done', endedAt: new Date() });
    mockApi();
    renderApp('/meeting/done');

    expect(await screen.findByText('The call has been ended by the host')).toBeInTheDocument();
  });

  it('setup: turns mic and camera on by default and off when the box is ticked', async () => {
    const user = userEvent.setup();
    const call = seedCall({ id: 'abc' });
    mockApi();
    renderApp('/meeting/abc');

    await screen.findByRole('heading', { name: 'Setup' });
    expect(call.camera.enable).toHaveBeenCalled();
    expect(call.microphone.enable).toHaveBeenCalled();

    await user.click(screen.getByLabelText('Join with mic and camera off'));
    expect(call.camera.disable).toHaveBeenCalled();
    expect(call.microphone.disable).toHaveBeenCalled();
  });

  it('host can end the call for everyone', async () => {
    const user = userEvent.setup();
    const call = seedCall({ id: 'abc', createdBy: { id: 'user-1' } });
    mockApi();
    renderApp('/meeting/abc');

    await joinMeeting(user);
    expect(call.join).toHaveBeenCalled();
    expect(await screen.findByTestId('layout')).toHaveTextContent('speaker, bar on right');

    await user.click(screen.getByRole('button', { name: 'End call for everyone' }));
    expect(call.endCall).toHaveBeenCalled();
    await waitFor(() => expect(location()).toBe('/'));
  });

  it('guests do not get the end-for-everyone button', async () => {
    const user = userEvent.setup();
    seedCall({ id: 'abc', createdBy: { id: 'host-7' } });
    mockApi();
    renderApp('/meeting/abc');

    await joinMeeting(user);
    await screen.findByTestId('layout');
    expect(screen.queryByRole('button', { name: 'End call for everyone' })).not.toBeInTheDocument();
  });

  it('personal rooms never show the end-for-everyone button', async () => {
    const user = userEvent.setup();
    seedCall({ id: 'user-1', createdBy: { id: 'user-1' } });
    mockApi();
    renderApp('/meeting/user-1?personal=true');

    await joinMeeting(user);
    await screen.findByTestId('layout');
    expect(screen.queryByRole('button', { name: 'End call for everyone' })).not.toBeInTheDocument();
  });

  it('leaving the call goes back home', async () => {
    const user = userEvent.setup();
    seedCall({ id: 'abc' });
    mockApi();
    renderApp('/meeting/abc');

    await joinMeeting(user);
    await user.click(await screen.findByRole('button', { name: 'Leave call' }));
    expect(location()).toBe('/');
  });

  it('switches layouts and toggles the participants panel', async () => {
    const user = userEvent.setup();
    seedCall({ id: 'abc' });
    mockApi();
    const { container } = renderApp('/meeting/abc');

    await joinMeeting(user);
    const layout = await screen.findByTestId('layout');
    expect(layout).toHaveTextContent('speaker, bar on right');

    const layoutButton = container.querySelector('[aria-haspopup="menu"]');
    const participantsButton = [...container.querySelectorAll('.fixed button')].find(
      (b) => !b.textContent && !b.hasAttribute('aria-haspopup'),
    );

    await user.click(layoutButton);
    await user.click(await screen.findByRole('menuitem', { name: 'Grid' }));
    expect(screen.getByTestId('layout')).toHaveTextContent('grid');

    await user.click(layoutButton);
    await user.click(await screen.findByRole('menuitem', { name: 'Speaker-Right' }));
    expect(screen.getByTestId('layout')).toHaveTextContent('speaker, bar on left');

    const panel = screen.getByText('Participants list').parentElement;
    expect(panel).not.toHaveClass('show-block');
    await user.click(participantsButton);
    expect(panel).toHaveClass('show-block');
  });
});
