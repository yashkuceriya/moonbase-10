export type ExposureLedger = Record<string, { missed: boolean; solved: boolean }>;
export type Observation = "independent" | "recovery" | "miss" | "practice";

/** A practiced answer can support recovery, but cannot become fresh evidence. */
export function recordEvidence(
  ledger: ExposureLedger,
  itemId: string,
  correct: boolean,
  assisted = false,
): { ledger: ExposureLedger; observation: Observation; firstCompletion: boolean } {
  const previous = ledger[itemId] ?? { missed: false, solved: false };
  const observation: Observation = previous.solved
    ? "practice"
    : correct
      ? previous.missed || assisted ? "recovery" : "independent"
      : previous.missed ? "practice" : "miss";
  return {
    ledger: { ...ledger, [itemId]: { missed: previous.missed || !correct || assisted, solved: previous.solved || correct } },
    observation,
    firstCompletion: correct && !previous.solved,
  };
}

/** Invalidates pending responses when the learner evidence or tutor choice changes. */
export function createRequestGate() {
  let version = 0;
  let controller: AbortController | null = null;
  return {
    cancel() {
      version += 1;
      controller?.abort();
      controller = null;
    },
    begin() {
      controller?.abort();
      controller = new AbortController();
      const requestVersion = ++version;
      return { signal: controller.signal, isCurrent: () => requestVersion === version };
    },
  };
}
