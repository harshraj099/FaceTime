import { createContext, useContext } from 'react';
import { vi } from 'vitest';

// In-memory stand-in for @stream-io/video-react-sdk. Tests seed `stream.calls`
// and inspect `stream.clients` / call spies to verify what the app asked Stream to do.
export const stream = { clients: [], calls: new Map() };

export const resetStream = () => {
  stream.clients = [];
  stream.calls = new Map();
};

export const makeCall = ({
  id,
  type = 'default',
  startsAt,
  endedAt,
  custom = {},
  members = [],
  createdBy,
  recordings = [],
} = {}) => {
  const call = {
    id,
    type,
    state: { startsAt, endedAt, custom, members, createdBy, callingState: 'idle' },
    getOrCreate: vi.fn(async ({ data } = {}) => {
      if (data?.starts_at) call.state.startsAt = new Date(data.starts_at);
      if (data?.custom) call.state.custom = data.custom;
      stream.calls.set(id, call);
    }),
    join: vi.fn(async () => {
      call.state.callingState = 'joined';
    }),
    endCall: vi.fn(async () => {
      call.state.endedAt = new Date();
    }),
    camera: { enable: vi.fn(), disable: vi.fn() },
    microphone: { enable: vi.fn(), disable: vi.fn() },
    queryRecordings: vi.fn(async () => ({ recordings })),
  };
  return call;
};

export const seedCall = (options) => {
  const call = makeCall(options);
  stream.calls.set(call.id, call);
  return call;
};

export class StreamVideoClient {
  constructor(options) {
    this.options = options;
    this.disconnectUser = vi.fn();
    this.call = vi.fn((type, id) => stream.calls.get(id) ?? makeCall({ id, type }));
    this.queryCalls = vi.fn(async ({ filter_conditions: filter = {} } = {}) => {
      const all = [...stream.calls.values()];
      return { calls: filter.id ? all.filter((c) => c.id === filter.id) : all };
    });
    stream.clients.push(this);
  }
}

const ClientContext = createContext(undefined);
const CallContext = createContext(undefined);

export const StreamVideo = ({ client, children }) => (
  <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
);
export const useStreamVideoClient = () => useContext(ClientContext);

export const StreamCall = ({ call, children }) => (
  <CallContext.Provider value={call}>{children}</CallContext.Provider>
);
export const StreamTheme = ({ children }) => children;
export const useCall = () => useContext(CallContext);

export const useCallStateHooks = () => ({
  useCallStartsAt: () => useContext(CallContext).state.startsAt,
  useCallEndedAt: () => useContext(CallContext).state.endedAt,
  useCallCallingState: () => useContext(CallContext).state.callingState,
  useLocalParticipant: () => ({
    userId: useContext(ClientContext).options.user.id,
  }),
});

export const CallingState = { JOINED: 'joined' };

export const CallControls = ({ onLeave }) => (
  <button onClick={onLeave}>Leave call</button>
);
export const CallParticipantsList = () => <div>Participants list</div>;
export const CallStatsButton = () => <button>Call stats</button>;
export const PaginatedGridLayout = () => <div data-testid="layout">grid</div>;
export const SpeakerLayout = ({ participantsBarPosition }) => (
  <div data-testid="layout">speaker, bar on {participantsBarPosition}</div>
);
export const VideoPreview = () => <div>Video preview</div>;
export const DeviceSettings = () => <button>Device settings</button>;
