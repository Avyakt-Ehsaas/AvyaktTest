import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Context, Participant, SessionResult } from "./types";

const LS_KEY = "arp:flowState:v1";
const PRACTICE_KEY = "arp:practiceDone:v1";

interface FlowState {
  participantId: string | null;
  participant: Participant | null;
  context: Context;
  preSession: SessionResult | null;
  postSession: SessionResult | null;
  preCheckin: number | null;
  postCheckin: number | null;
  guidedSessionId: string | null;

  selectedPlaylistId: string | null;
  selectedTrackId: string | null;

}

const empty: FlowState = {
  participantId: null,
  participant: null,
  context: "stall",
  preSession: null,
  postSession: null,
  preCheckin: null,
  postCheckin: null,
  guidedSessionId: null,

  selectedPlaylistId: null,
  selectedTrackId: null,
};

interface Ctx extends FlowState {
  setContext: (c: Context) => void;
  setParticipant: (p: Participant) => void;
  setPreSession: (s: SessionResult) => void;
  setPostSession: (s: SessionResult) => void;
  setPreCheckin: (v: number) => void;
  setPostCheckin: (v: number) => void;
  setGuidedSessionId: (id: string | null) => void;
  reset: () => void;
  clearParticipant: () => void;
  isPracticeDone: () => boolean;
  markPracticeDone: () => void;

  setSelectedPlaylistId: (id: string | null) => void;
  setSelectedTrackId: (id: string | null) => void;

}

const FlowContext = createContext<Ctx | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FlowState>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return { ...empty, ...JSON.parse(saved) };
    } catch {
      /* noop */
    }
    return empty;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state]);

  // Stable-identity setters — avoid re-render loops when used inside useEffect deps.
  const setContext = useCallback(
    (c: Context) =>
      setState((s) => (s.context === c ? s : { ...s, context: c })),
    []
  );
  const setParticipant = useCallback(
    (p: Participant) =>
      setState((s) => ({ ...s, participantId: p.id, participant: p })),
    []
  );
  const setPreSession = useCallback(
    (session: SessionResult) => setState((s) => ({ ...s, preSession: session })),
    []
  );
  const setPostSession = useCallback(
    (session: SessionResult) =>
      setState((s) => ({ ...s, postSession: session })),
    []
  );
  const setPreCheckin = useCallback(
    (v: number) => setState((s) => ({ ...s, preCheckin: v })),
    []
  );
  const setPostCheckin = useCallback(
    (v: number) => setState((s) => ({ ...s, postCheckin: v })),
    []
  );
  const setGuidedSessionId = useCallback(
    (id: string | null) => setState((s) => ({ ...s, guidedSessionId: id })),
    []
  );
  const reset = useCallback(() => {
    setState(empty);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* noop */
    }
  }, []);
  const clearParticipant = useCallback(
    () => setState((s) => ({ ...empty, context: s.context })),
    []
  );
  const isPracticeDone = useCallback(
    () => localStorage.getItem(PRACTICE_KEY) === "1",
    []
  );
  const markPracticeDone = useCallback(
    () => localStorage.setItem(PRACTICE_KEY, "1"),
    []
  );

const setSelectedPlaylistId = useCallback(
  (id: string | null) =>
    setState((s) => ({
      ...s,
      selectedPlaylistId: id,
      selectedTrackId: null,
    })),
  []
);
  const setSelectedTrackId = useCallback(
    (id: string | null) => setState((s) => ({ ...s, selectedTrackId: id })),
    []
  );


  const value: Ctx = useMemo(
    () => ({
      ...state,
      setContext,
      setParticipant,
      setPreSession,
      setPostSession,
      setPreCheckin,
      setPostCheckin,
      setGuidedSessionId,
      reset,
      clearParticipant,
      isPracticeDone,
      markPracticeDone,

      setSelectedPlaylistId,
      setSelectedTrackId,

    }),
    [
      state,
      setContext,
      setParticipant,
      setPreSession,
      setPostSession,
      setPreCheckin,
      setPostCheckin,
      setGuidedSessionId,
      reset,
      clearParticipant,
      isPracticeDone,
      markPracticeDone,

      setSelectedPlaylistId,
      setSelectedTrackId,
    ]
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): Ctx {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error("useFlow must be inside <FlowProvider>");
  return ctx;
}
