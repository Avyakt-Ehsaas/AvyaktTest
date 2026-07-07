// Core PVT timing engine (PDF §4).
//
// Correctness invariants we hold:
//   1. All timing math uses performance.now() (monotonic, not clock-drift affected).
//   2. Stimulus onset timestamp is captured *inside* the requestAnimationFrame
//      callback where we actually flip the DOM to visible.
//   3. Response timestamp comes from pointerdown / touchstart (not click / touchend).
//      We prefer event.timeStamp when available (closer to true input moment).
//   4. rt < 100  → false start; rt ≥ 355 → lapse; else valid trial.
//
// The hook returns a stimulusVisible flag + a ref-callback for the stage element
// to which the screen attaches its pointerdown handler. It's decoupled from
// styling so the same engine drives both the 3-trial practice and the real run.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FALSE_START_MS,
  LAPSE_MS,
  PVT_ISI_MAX,
  PVT_ISI_MIN,
  type Trial,
} from "../types";

type Handlers = {
  /** Called after each trial completes (whether valid, lapse, or false start). */
  onTrial: (trial: Trial) => void;
  /** Called once total duration elapses. */
  onFinish: () => void;
};

interface Options {
  durationMs: number | null; // when non-null, run until this elapses
  maxTrials: number | null;  // when non-null, run until this many trials complete
  handlers: Handlers;
  /** When true, briefly flash the "OK" state on tap so the person sees registration. */
  showTapAck?: boolean;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function usePvt(opts: Options) {
  const { durationMs, maxTrials, handlers, showTapAck = true } = opts;
  const [stimulusVisible, setStimulusVisible] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Refs — the stable identity survives re-renders so the request/timeout
  // handlers don't observe stale state.
  const testStartRef = useRef<number | null>(null);
  const stimulusOnsetRef = useRef<number | null>(null);
  const waitingForResponseRef = useRef(false);
  const currentIsiRef = useRef<number>(0);
  const trialIndexRef = useRef(0);
  const timeoutIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const tickRafRef = useRef<number | null>(null);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const stop = useCallback(() => {
    finishedRef.current = true;
    setRunning(false);
    setStimulusVisible(false);
    waitingForResponseRef.current = false;
    if (timeoutIdRef.current != null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (tickRafRef.current != null) {
      cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = null;
    }
  }, []);

  const shouldStop = useCallback(() => {
    if (finishedRef.current) return true;
    if (durationMs != null && testStartRef.current != null) {
      if (performance.now() - testStartRef.current >= durationMs) return true;
    }
    if (maxTrials != null && trialIndexRef.current >= maxTrials) return true;
    return false;
  }, [durationMs, maxTrials]);

  const scheduleNextStimulus = useCallback(() => {
    if (shouldStop()) {
      stop();
      handlersRef.current.onFinish();
      return;
    }
    const isi = randomBetween(PVT_ISI_MIN, PVT_ISI_MAX);
    currentIsiRef.current = Math.round(isi);
    timeoutIdRef.current = window.setTimeout(() => {
      if (finishedRef.current) return;
      // Show stimulus inside the raf callback so onset timestamp matches the
      // frame in which the DOM is actually flipped (PDF §4.2 rule 3).
      rafIdRef.current = requestAnimationFrame(() => {
        if (finishedRef.current) return;
        setStimulusVisible(true);
        stimulusOnsetRef.current = performance.now();
        waitingForResponseRef.current = true;
      });
    }, isi);
  }, [shouldStop, stop]);

  // Response handler — attached by the consumer via handlePointerDown.
  const handlePointerDown = useCallback(
    (event: React.PointerEvent | PointerEvent) => {
      if (!running) return;
      // Prefer event.timeStamp when it's a performance-timeline value.
      const eventTs =
        typeof event.timeStamp === "number" && event.timeStamp > 0
          ? event.timeStamp
          : performance.now();
      const now = performance.now();
      // If the browser gives event.timeStamp on the performance timeline it
      // will be < now; otherwise fall back to now.
      const responseTime = eventTs < now && eventTs > 0 ? eventTs : now;

      const testStart = testStartRef.current ?? now;
      const relativeResponse = responseTime - testStart;

      if (!waitingForResponseRef.current) {
        // Response with no stimulus present → false start (PDF §1.3).
        const t: Trial = {
          trialIndex: trialIndexRef.current++,
          isiMs: currentIsiRef.current,
          stimulusOnsetMs: null,
          responseMs: relativeResponse,
          reactionTimeMs: null,
          isFalseStart: true,
          isLapse: false,
          isValid: false,
        };
        handlersRef.current.onTrial(t);
        return;
      }

      const rt = responseTime - (stimulusOnsetRef.current ?? responseTime);
      const isFalseStart = rt < FALSE_START_MS;
      const isLapse = rt >= LAPSE_MS;
      const trial: Trial = {
        trialIndex: trialIndexRef.current++,
        isiMs: currentIsiRef.current,
        stimulusOnsetMs:
          stimulusOnsetRef.current != null
            ? stimulusOnsetRef.current - testStart
            : null,
        responseMs: relativeResponse,
        reactionTimeMs: rt,
        isFalseStart,
        isLapse,
        isValid: !isFalseStart && !isLapse,
      };
      waitingForResponseRef.current = false;

      // Brief visual ack (150 ms) so the person knows the tap registered
      // (PDF §3 Screen 5/9), but no RT number shown during the real run.
      if (showTapAck) {
        setStimulusVisible(true);
        setTimeout(() => setStimulusVisible(false), 150);
      } else {
        setStimulusVisible(false);
      }

      handlersRef.current.onTrial(trial);
      scheduleNextStimulus();
    },
    [running, scheduleNextStimulus, showTapAck]
  );

  const start = useCallback(() => {
    finishedRef.current = false;
    trialIndexRef.current = 0;
    setElapsedMs(0);
    testStartRef.current = performance.now();
    setRunning(true);
    scheduleNextStimulus();

    // Tick loop for progress-timer display in a corner.
    const tick = () => {
      if (finishedRef.current || testStartRef.current == null) return;
      setElapsedMs(performance.now() - testStartRef.current);
      tickRafRef.current = requestAnimationFrame(tick);
    };
    tickRafRef.current = requestAnimationFrame(tick);
  }, [scheduleNextStimulus]);

  // Cleanup on unmount.
  useEffect(() => stop, [stop]);

  return {
    start,
    stop,
    running,
    stimulusVisible,
    elapsedMs,
    handlePointerDown,
  };
}
