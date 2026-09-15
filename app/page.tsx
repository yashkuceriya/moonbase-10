"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_EVIDENCE,
  STARTING_LEVELS,
  STARTING_MASTERY,
  buildTutorBrief,
  chooseNextMissionIndex,
  getMissionProgress,
  traceMastery,
  type SkillLevel,
  updateSkillLevel,
} from "./learning-model";
import { buildVerifiedTutorPlan, type TutorPlan } from "./copilot";
import { MISSIONS, type VisualData } from "./missions";
import { createRequestGate, recordEvidence, type ExposureLedger } from "./evidence-policy";
import { TRANSFER_CHECKS, checkAnswer } from "./transfer-checks";
import { bridgeIsReady, selectLearningBridge, toggleBridgeRow } from "./array-bridges";

type Phase = "question" | "adaptive" | "scaffold" | "retry" | "success";
type CopilotState = "idle" | "loading" | "ready" | "queued" | "error";
function ArrayVisual({ rows, columns, fadedRows = 0 }: Extract<VisualData, { kind: "array" }>) {
  const cells = Array.from({ length: rows * columns }, (_, index) => index);
  const fadeFrom = (rows - fadedRows) * columns;

  return (
    <div className="array-visual" style={{ gridTemplateColumns: `repeat(${columns}, minmax(24px, 54px))` }} role="img" aria-label={`${rows} rows of ${columns} solar cells${fadedRows ? `, with ${fadedRows} rows faded` : ""}`}>
      {cells.map((cell) => (
        <span key={cell} className={`solar-cell ${cell >= fadeFrom ? "solar-cell--faded" : ""}`} />
      ))}
    </div>
  );
}

function BlockGroup({ value }: { value: number }) {
  const tens = Math.floor(value / 10);
  const ones = value % 10;

  return (
    <div className="block-group">
      <span className="group-label">{value}</span>
      <div className="ten-rods">{Array.from({ length: tens }, (_, i) => <i key={i} />)}</div>
      <div className="ones">{Array.from({ length: ones }, (_, i) => <i key={i} />)}</div>
    </div>
  );
}

function BaseTenVisual({ left, right }: Extract<VisualData, { kind: "base-ten" }>) {
  return (
    <div className="base-ten-visual" role="img" aria-label={`Two groups of base-ten blocks showing ${left} and ${right}`}>
      <BlockGroup value={left} />
      <span className="visual-plus">+</span>
      <BlockGroup value={right} />
    </div>
  );
}

function FractionVisual({ total, denominator, numerator }: Extract<VisualData, { kind: "fraction" }>) {
  const groupSize = total / denominator;

  return (
    <div className="fraction-visual" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} role="img" aria-label={`${total} units divided into ${denominator} equal groups, with ${numerator} groups highlighted`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`water-cell ${i < groupSize * numerator ? "water-cell--selected" : ""}`}><i /></span>
      ))}
      {Array.from({ length: denominator }, (_, group) => (
        <div key={group} className="fraction-brace" style={{ width: `calc(${100 / denominator}% - 5px)`, left: `${(100 / denominator) * group}%` }}>1/{denominator}</div>
      ))}
    </div>
  );
}

function NumberLineVisual({ start, subtract }: Extract<VisualData, { kind: "number-line" }>) {
  const result = start - subtract;
  const min = Math.floor(result / 10) * 10;
  const max = Math.ceil(start / 10) * 10;
  const range = Math.max(10, max - min);
  const ticks = Array.from({ length: range / 10 + 1 }, (_, index) => min + index * 10);
  const startPosition = ((start - min) / range) * 100;
  const resultPosition = ((result - min) / range) * 100;

  return (
    <div className="number-line-visual" role="img" aria-label={`Number line from ${min} to ${max} with a rover at ${start} and a jump back ${subtract}`}>
      <div className="number-line-content">
        <div className="rover-marker" style={{ left: `${startPosition}%` }}><span>●</span><b>{start}</b></div>
        <div className="line-track">
          {ticks.map((number) => (
            <span key={number}><i />{number}</span>
          ))}
        </div>
        <div className="jump-label" style={{ left: `${resultPosition}%`, right: `${100 - startPosition}%` }}>← jump back {subtract}</div>
      </div>
    </div>
  );
}

function MissionVisual({ visual }: { visual: VisualData }) {
  if (visual.kind === "array") return <ArrayVisual {...visual} />;
  if (visual.kind === "base-ten") return <BaseTenVisual {...visual} />;
  if (visual.kind === "fraction") return <FractionVisual {...visual} />;
  return <NumberLineVisual {...visual} />;
}

function Rover() {
  return (
    <div className="rover" aria-hidden="true">
      <span className="antenna" />
      <div className="rover-body"><span className="rover-face">⌣</span></div>
      <i className="wheel wheel-left" />
      <i className="wheel wheel-right" />
    </div>
  );
}

function SkillMeter({ label, value, tone, level, evidence }: { label: string; value: number; tone: string; level: string; evidence: string }) {
  return (
    <div className="skill-meter">
      <div className="skill-meter__label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="meter-track"><i className={tone} style={{ width: `${value}%` }} /></div>
      <div className="skill-meter__evidence"><span>{level}</span><small>{evidence}</small></div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<"mission" | "map">("mission");
  const [missionIndex, setMissionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [selected, setSelected] = useState<number | null>(null);
  const [misconception, setMisconception] = useState("");
  const [bridgeAnswer, setBridgeAnswer] = useState<number | null>(null);
  const [bridgeRows, setBridgeRows] = useState<number[]>([]);
  const [scaffoldMessage, setScaffoldMessage] = useState("");
  const [completed, setCompleted] = useState(0);
  const [streak, setStreak] = useState(2);
  const [detours, setDetours] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [mastery, setMastery] = useState(STARTING_MASTERY);
  const [levels, setLevels] = useState(STARTING_LEVELS);
  const [evidence, setEvidence] = useState(EMPTY_EVIDENCE);
  const [lastMasteryDelta, setLastMasteryDelta] = useState(0);
  const [briefStatus, setBriefStatus] = useState("");
  const [copilotLevel, setCopilotLevel] = useState<SkillLevel>(3);
  const [copilotPlan, setCopilotPlan] = useState<TutorPlan | null>(null);
  const [copilotState, setCopilotState] = useState<CopilotState>("idle");
  const [copilotMessage, setCopilotMessage] = useState("");
  const [queuedMissionIndex, setQueuedMissionIndex] = useState<number | null>(null);
  const [transferResults, setTransferResults] = useState<Record<string, { selected: number; correct: boolean }>>({});
  const exposures = useRef<ExposureLedger>({});
  const answeredChecks = useRef(new Set<string>());
  const requestGate = useRef(createRequestGate());
  const [traceEvents, setTraceEvents] = useState([
    {
      message: "ORBIT opened with an array to connect Nova’s skip-counting to equal groups.",
      detail: "Session start · structured visual",
    },
  ]);
  const detourButtonRef = useRef<HTMLButtonElement>(null);
  const challengeHeadingRef = useRef<HTMLHeadingElement>(null);
  const transferHeadingRef = useRef<HTMLHeadingElement>(null);

  const mission = MISSIONS[missionIndex];
  const bridge = selectLearningBridge(mission, bridgeAnswer);
  const activityReady = !bridge.activity || bridgeIsReady(bridge.activity, bridgeRows);
  const transferCheck = TRANSFER_CHECKS[mission.id];
  const transferResult = transferResults[mission.id];
  const transferWins = Object.values(evidence).reduce((sum, skill) => sum + skill.transferWins, 0);
  const transferAttempts = transferWins + Object.values(evidence).reduce((sum, skill) => sum + skill.transferNeedsSupport, 0);
  const nextTeachingMove = transferResult
    ? transferResult.correct
      ? "Ask Nova to explain the strategy, then revisit it in a later session to check retention."
      : "Rebuild this strategy with a representation before trying another unfamiliar problem."
    : mission.nextMove;
  const progress = getMissionProgress(completed);
  const liveEvent = traceEvents[0].message;
  const activePrompt = phase === "scaffold" ? bridge.prompt : mission.prompt;
  const activeEquation = phase === "scaffold" ? bridge.equation : mission.equation;
  const activeOptions = phase === "scaffold" ? bridge.options : mission.options;
  const activeVisual = phase === "scaffold" ? bridge.visual : mission.visual;
  const copilotMission = copilotPlan ? MISSIONS.find((candidate) => candidate.id === copilotPlan.recommendedMissionId) : null;
  const levelName = (level: number) => ["", "Build", "Connect", "Transfer"][level];

  const orbitHeadline = useMemo(() => {
    if (phase === "adaptive") return "Pattern spotted — rerouting";
    if (phase === "scaffold") return "20-second learning detour";
    if (phase === "retry") return "Bridge built — try the mission again";
    if (phase === "success") return "Ready to try new numbers?";
    return "Watching the strategy, not just the score";
  }, [phase]);

  useEffect(() => {
    if (phase === "adaptive") detourButtonRef.current?.focus();
    else if (view === "mission" && (phase === "scaffold" || phase === "retry")) challengeHeadingRef.current?.focus();
    else if (view === "mission" && phase === "success") transferHeadingRef.current?.focus();
  }, [phase, view]);

  useEffect(() => {
    const gate = requestGate.current;
    return () => gate.cancel();
  }, []);

  function recordEvent(message: string, detail: string) {
    setTraceEvents((current) => [{ message, detail }, ...current].slice(0, 4));
  }

  function invalidateCopilot() {
    requestGate.current.cancel();
    setCopilotPlan(null);
    setCopilotState("idle");
    setCopilotMessage("");
    setQueuedMissionIndex(null);
  }

  function answer(value: number) {
    if (phase === "adaptive" || phase === "success") return;
    if (phase === "scaffold" && !activityReady) return;
    if (!activeOptions.includes(value)) return;
    invalidateCopilot();
    setAttempts((current) => current + 1);
    setSelected(value);

    if (phase === "scaffold") {
      if (value === bridge.answer) {
        setScaffoldMessage(bridge.coach);
        setPhase("retry");
        setSelected(null);
        recordEvent(
          `Nova completed “${bridge.title}”. ORBIT restored the original challenge. This supported step is not independent mastery evidence.`,
          "Bridge completed · original goal restored",
        );
      } else {
        setScaffoldMessage(bridge.wrongFeedback);
      }
      return;
    }

    const credit = recordEvidence(exposures.current, mission.id, value === mission.answer, phase === "retry");
    exposures.current = credit.ledger;

    if (value === mission.answer) {
      if (!credit.firstCompletion) {
        setPhase("success");
        setLastMasteryDelta(0);
        recordEvent("Nova revisited a completed mission. This practice did not add mastery or rewards.", "Practice · previously solved item");
        return;
      }
      const prior = mastery[mission.skill];
      const scaffolded = credit.observation === "recovery";
      const updated = traceMastery(prior, true, scaffolded);
      const currentLevel = levels[mission.skill];
      const nextLevel = updateSkillLevel(currentLevel, true, scaffolded, mission.level);
      setPhase("success");
      setStreak((current) => current + 1);
      setCompleted((current) => current + 1);
      setMastery((current) => ({ ...current, [mission.skill]: updated }));
      setLevels((current) => ({ ...current, [mission.skill]: nextLevel }));
      setEvidence((current) => ({
        ...current,
        [mission.skill]: {
          ...current[mission.skill],
          [scaffolded ? "scaffoldedWins" : "independentWins"]:
            current[mission.skill][scaffolded ? "scaffoldedWins" : "independentWins"] + 1,
        },
      }));
      setLastMasteryDelta(updated - prior);
      recordEvent(
        `Nova solved ${mission.skillLabel.toLowerCase()} ${scaffolded ? "after support or an earlier attempt" : "independently"}. ${scaffolded ? "Support stays at the same level until independent evidence appears." : nextLevel > currentLevel ? `ORBIT advanced this skill to ${levelName(nextLevel)}.` : `ORBIT confirmed the current ${levelName(currentLevel)} level without inflating it.`}`,
        `${updated - prior >= 0 ? "+" : ""}${updated - prior} evidence points · ${scaffolded ? "scaffolded" : "independent"} success`,
      );
      return;
    }

    const selectedBridge = selectLearningBridge(mission, value);
    const insight = `An answer of ${value} is a clue, not a diagnosis. ${selectedBridge.reason}`;
    setMisconception(insight);
    setBridgeAnswer(value);
    setBridgeRows(selectedBridge.activity?.initialRows ?? []);
    setPhase("adaptive");
    setStreak(0);
    const firstMiss = credit.observation === "miss";
    if (firstMiss) setDetours((current) => current + 1);
    const prior = mastery[mission.skill];
    const updated = firstMiss ? traceMastery(prior, false) : prior;
    setMastery((current) => ({ ...current, [mission.skill]: updated }));
    setEvidence((current) => ({
      ...current,
      [mission.skill]: {
        ...current[mission.skill],
        nearMisses: current[mission.skill].nearMisses + (firstMiss ? 1 : 0),
      },
    }));
    setLastMasteryDelta(updated - prior);
    recordEvent(
      `${insight} Selected bridge: ${selectedBridge.title}. ${firstMiss ? "" : "Repeated attempts do not add another estimate change or reward."}`,
      `${updated - prior} evidence points · bridge recommended`,
    );
  }

  function openDetour() {
    setPhase("scaffold");
    setSelected(null);
    setScaffoldMessage("");
  }

  function nextMission() {
    invalidateCopilot();
    const nextIndex = chooseNextMissionIndex(MISSIONS, missionIndex, mastery, levels);
    const next = MISSIONS[nextIndex];
    setMissionIndex(nextIndex);
    setBridgeAnswer(null);
    setBridgeRows([]);
    setPhase("question");
    setSelected(null);
    setMisconception("");
    setScaffoldMessage("");
    setBriefStatus("");
    setCopilotLevel(Math.min(3, next.level + 1) as SkillLevel);
    setCopilotPlan(null);
    setCopilotState("idle");
    setCopilotMessage("");
    setQueuedMissionIndex(null);
    recordEvent(
      `ORBIT selected ${next.skillLabel.toLowerCase()} at ${next.levelLabel.toLowerCase()} level because it has the lowest current estimate among the other skills.`,
      `Next mission · ${next.title} · ${next.levelLabel} representation`,
    );
  }

  async function createCopilotPlan() {
    const request = requestGate.current.begin();
    setCopilotState("loading");
    setCopilotMessage("ORBIT is turning the evidence into a tutor-reviewable plan…");
    setCopilotPlan(null);
    setQueuedMissionIndex(null);
    const skillEvidence = evidence[mission.skill];
    const input = {
      missionId: mission.id,
      targetLevel: copilotLevel,
      mastery: mastery[mission.skill],
      latestSignal: misconception || mission.learnerRead,
      independentWins: skillEvidence.independentWins + skillEvidence.transferWins,
      scaffoldedWins: skillEvidence.scaffoldedWins,
      nearMisses: skillEvidence.nearMisses + skillEvidence.transferNeedsSupport,
    };

    try {
      const response = await fetch("/api/orbit-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
      });
      if (!response.ok) throw new Error("Copilot request failed");

      const plan = await response.json() as TutorPlan;
      if (!request.isCurrent()) return;
      const recommendedIndex = MISSIONS.findIndex((candidate) => candidate.id === plan.recommendedMissionId);
      if (
        recommendedIndex < 0
        || MISSIONS[recommendedIndex].skill !== mission.skill
        || MISSIONS[recommendedIndex].level !== copilotLevel
        || plan.safety?.mathSource !== "authored-and-tested"
        || plan.safety?.answerWithheld !== true
        || plan.safety?.storedByMoonbase !== false
      ) {
        throw new Error("Copilot returned an invalid mission");
      }

      setCopilotPlan(plan);
      setCopilotState("ready");
      setCopilotMessage(
        plan.source === "openai"
          ? "OpenAI shaped the tutoring language; Moonbase kept the math authored and tested."
          : "ORBIT’s verified engine created this plan without requiring an external model or learner-data storage.",
      );
    } catch {
      if (!request.isCurrent()) return;
      setCopilotPlan(buildVerifiedTutorPlan(input));
      setCopilotState("ready");
      setCopilotMessage("The connection was unavailable. ORBIT prepared its local coaching plan for you to review.");
    }
  }

  function approveCopilotPlan() {
    if (!copilotPlan) return;
    const approvedIndex = MISSIONS.findIndex((candidate) => candidate.id === copilotPlan.recommendedMissionId);
    if (approvedIndex < 0) return;

    const approved = MISSIONS[approvedIndex];
    setQueuedMissionIndex(approvedIndex);
    setCopilotState("queued");
    setCopilotMessage(`Tutor approved “${approved.title}” for Nova. The learner route will change only when launched.`);
    recordEvent(
      `Human review approved ${approved.skillLabel.toLowerCase()} at ${approved.levelLabel.toLowerCase()} level. ORBIT queued the plan without changing the learner route yet.`,
      `Tutor-approved handoff · ${approved.title}`,
    );
  }

  function continueFromMap() {
    if (queuedMissionIndex !== null) {
      requestGate.current.cancel();
      const approved = MISSIONS[queuedMissionIndex];
      setMissionIndex(queuedMissionIndex);
      setBridgeAnswer(null);
      setBridgeRows([]);
      setPhase("question");
      setSelected(null);
      setMisconception("");
      setScaffoldMessage("");
      setView("mission");
      recordEvent(
        `Nova’s route changed to the tutor-approved ${approved.levelLabel.toLowerCase()} mission.`,
        `Human + AI handoff launched · ${approved.title}`,
      );
      setQueuedMissionIndex(null);
      setCopilotPlan(null);
      setCopilotState("idle");
      setCopilotMessage("");
      return;
    }

    if (phase === "success") nextMission();
    setView("mission");
  }

  function answerTransfer(value: number) {
    if (phase !== "success" || !transferCheck?.options.includes(value) || answeredChecks.current.has(mission.id)) return;
    answeredChecks.current.add(mission.id);
    invalidateCopilot();
    const correct = value === checkAnswer(transferCheck);
    const updated = traceMastery(mastery[mission.skill], correct);
    setTransferResults((current) => ({ ...current, [mission.id]: { selected: value, correct } }));
    setAttempts((current) => current + 1);
    setLastMasteryDelta(updated - mastery[mission.skill]);
    setMastery((current) => ({ ...current, [mission.skill]: updated }));
    setLevels((current) => ({ ...current, [mission.skill]: updateSkillLevel(current[mission.skill], correct, false, mission.level) }));
    setEvidence((current) => ({ ...current, [mission.skill]: {
      ...current[mission.skill],
      transferWins: current[mission.skill].transferWins + (correct ? 1 : 0),
      transferNeedsSupport: current[mission.skill].transferNeedsSupport + (correct ? 0 : 1),
    } }));
    setMisconception(correct
      ? "Nova applied the strategy to a different problem without a worked example. This is immediate transfer evidence; retention still needs a later check."
      : "Nova solved the original problem, but the strategy needs more support with different numbers.");
    recordEvent(correct
      ? "Nova solved a new-number check on the first attempt without a worked example."
      : "The new-number check needs support. ORBIT kept the result separate from the recovered mission.",
    `${mission.skillLabel} · immediate transfer ${correct ? "passed" : "needs support"}`);
  }

  async function copyTutorBrief() {
    setCopilotMessage("");
    const brief = buildTutorBrief({
      mastery,
      levels,
      evidence,
      attempts,
      completed,
      detours,
      latestSignal: misconception || mission.learnerRead,
      nextMove: nextTeachingMove,
    });

    try {
      await navigator.clipboard.writeText(brief);
      setBriefStatus("Tutor brief copied. Nothing was uploaded.");
    } catch {
      setBriefStatus("Clipboard access is unavailable in this browser.");
    }
  }

  function resetDemo() {
    invalidateCopilot();
    exposures.current = {};
    answeredChecks.current.clear();
    setTransferResults({});
    setView("mission");
    setMissionIndex(0);
    setBridgeAnswer(null);
    setBridgeRows([]);
    setPhase("question");
    setSelected(null);
    setMisconception("");
    setScaffoldMessage("");
    setCompleted(0);
    setStreak(2);
    setDetours(0);
    setAttempts(0);
    setMastery(STARTING_MASTERY);
    setLevels(STARTING_LEVELS);
    setEvidence(EMPTY_EVIDENCE);
    setLastMasteryDelta(0);
    setBriefStatus("");
    setCopilotLevel(3);
    setCopilotPlan(null);
    setCopilotState("idle");
    setCopilotMessage("");
    setQueuedMissionIndex(null);
    setTraceEvents([
      {
        message: "ORBIT opened with an array to connect Nova’s skip-counting to equal groups.",
        detail: "Session start · structured visual",
      },
    ]);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={resetDemo} aria-label="Reset Moonbase 10 demo">
          <span className="brand-mark">10</span>
          <span><strong>MOONBASE 10</strong><small>adaptive math adventure</small></span>
        </button>
        <nav className="view-switcher" aria-label="Choose view">
          <button aria-pressed={view === "mission"} className={view === "mission" ? "active" : ""} onClick={() => setView("mission")}>Learner mission</button>
          <button aria-pressed={view === "map"} className={view === "map" ? "active" : ""} onClick={() => setView("map")}><span className="live-dot" />Learning map</button>
        </nav>
        <div className="topbar-stats">
          <span><b>{streak}</b><small>streak</small></span>
          <span><b>{1280 + completed * 140 + detours * 60}</b><small>moon dust</small></span>
          <span className="avatar" aria-label="Learner profile: Nova">N</span>
        </div>
      </header>

      {view === "mission" ? (
        <>
          <section className="mission-hero">
            <div className="hero-copy">
              <span className="mission-pill"><i /> {mission.eyebrow}</span>
              <h1>{mission.title}</h1>
              <p>{mission.story}</p>
            </div>
            <div className="lunar-scene" aria-hidden="true">
              <span className="star star-a">✦</span><span className="star star-b">✧</span><span className="star star-c">✦</span>
              <div className="planet-ring" />
              <Rover />
              <div className="habitat"><i /><i /><span /></div>
            </div>
            <div className="mission-progress">
              <div><span>BASE POWER</span><strong>{progress.basePower}%</strong></div>
              <div className="power-track"><i style={{ width: `${progress.basePower}%` }} /></div>
              <small>{progress.systemsRestored} of 8 systems restored</small>
            </div>
          </section>

          <section className="game-layout">
            <article className={`challenge-card phase-${phase}`}>
              <div className="challenge-heading">
                <div><span className="step-kicker">YOUR NEXT MOVE</span><h2 ref={challengeHeadingRef} tabIndex={-1}>{activePrompt}</h2></div>
                <div className="challenge-tags"><span className="level-chip">{mission.levelLabel} {mission.level}/3</span><span className="skill-chip">{mission.skillLabel}</span></div>
              </div>

              <div className="problem-stage">
                {phase === "scaffold" && bridge.activity ? (
                  <div className="bridge-workbench">
                    <p id="bridge-instruction">{bridge.activity.instruction}</p>
                    <div className="bridge-rows" role="group" aria-label="Interactive equal groups" aria-describedby="bridge-instruction">
                      {Array.from({ length: bridge.activity.rows }, (_, row) => (
                        <button key={row} type="button" aria-pressed={bridgeRows.includes(row)}
                          aria-label={`${bridge.activity?.mode === "count" ? "Count" : "Toggle"} row ${row + 1}`}
                          onClick={() => {
                            const activity = bridge.activity;
                            if (activity) setBridgeRows((current) => toggleBridgeRow(activity, current, row));
                            setSelected(null);
                            setScaffoldMessage("");
                          }}>
                          <span className="bridge-row-label">Row {row + 1}</span>
                          <span className="bridge-row-cells" aria-hidden="true">{Array.from({ length: bridge.activity?.columns ?? 0 }, (_, cell) => <i key={cell} />)}</span>
                          <span className="bridge-row-state">{bridgeRows.includes(row) ? (bridge.activity?.mode === "count" ? "Counted ✓" : "On ✓") : (bridge.activity?.mode === "count" ? "Count" : "Off")}</span>
                        </button>
                      ))}
                    </div>
                    <p className="bridge-status" role="status">{activityReady ? "Rows checked. Now choose the number of cells below." : `${bridgeRows.length} ${bridge.activity.mode === "count" ? "rows marked" : "rows on"} · complete the row task to unlock the answers.`}</p>
                  </div>
                ) : <MissionVisual visual={activeVisual} />}
                <div className="equation-card">
                  <small>{phase === "scaffold" ? "BRIDGE STEP" : "MISSION MATH"}</small>
                  <strong>{activeEquation}</strong>
                  {phase === "retry" && <span className="bridge-note">Bridge unlocked: {bridge.equation}</span>}
                </div>
              </div>

              <div className="answer-grid" aria-label="Answer choices">
                {activeOptions.map((option) => {
                  const isSelected = selected === option;
                  const isCorrect = (phase === "success" && option === mission.answer) || (phase === "scaffold" && isSelected && option === bridge.answer);
                  const isWrong = isSelected && !isCorrect;
                  return (
                    <button
                      key={option}
                      onClick={() => answer(option)}
                      disabled={phase === "adaptive" || phase === "success" || (phase === "scaffold" && !activityReady)}
                      className={`${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
                      aria-label={`Answer ${option}`}
                    >
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="feedback-zone" aria-live="polite">
                {phase === "question" && <p className="gentle-prompt">Take your time. ORBIT learns from the strategy you choose.</p>}
                {phase === "adaptive" && <p className="sr-only">{misconception} Open the learning detour to continue.</p>}
                {phase === "scaffold" && scaffoldMessage && <p className="scaffold-message">{scaffoldMessage}</p>}
                {phase === "retry" && <p className="scaffold-message">Nice bridge. Now use that same structure on the full mission.</p>}
                {phase === "success" && (
                  <div className="success-banner">
                    <span className="success-icon">✓</span>
                    <div><strong>{progress.basePower === 100 ? "Moonbase is online!" : "Mission complete!"}</strong><p>{mission.celebration}</p></div>
                    <button onClick={nextMission}>Next mission <span>→</span></button>
                  </div>
                )}
              </div>

              {phase === "success" && transferCheck && (
                <section className="transfer-check" aria-labelledby="transfer-title">
                  <div className="transfer-heading"><span>TRY YOUR STRATEGY</span><small>{transferResult ? "First attempt recorded" : "New numbers · optional challenge"}</small></div>
                  <h3 id="transfer-title" ref={transferHeadingRef} tabIndex={-1}>Can you use the same idea here?</h3>
                  <p>{transferCheck.prompt}</p>
                  <div className="transfer-options" role="group" aria-label="New-number check answers">
                    {transferCheck.options.map((option) => (
                      <button key={option} onClick={() => answerTransfer(option)} disabled={Boolean(transferResult)}
                        className={transferResult && option === checkAnswer(transferCheck) ? "check-correct" : transferResult?.selected === option ? "check-retry" : ""}
                        aria-label={`Check answer ${option}`}>
                        {option}{transferResult && option === checkAnswer(transferCheck) && <span aria-label="correct answer"> ✓</span>}
                      </button>
                    ))}
                  </div>
                  <div className="transfer-feedback" aria-live="polite">
                    {transferResult ? <><strong>{transferResult.correct ? "Your strategy traveled!" : "Let’s build this idea a little more."}</strong><p>{transferCheck.explanation}</p><small>{transferResult.correct ? "First-try success with different numbers is recorded in your learning map." : "This check stays separate from the mission you completed. A tutor can help with the next step."}</small></>
                      : <small>Try it without the worked example. You can also continue to your next mission.</small>}
                  </div>
                </section>
              )}
            </article>

            <aside className={`orbit-panel orbit-panel--${phase}`}>
              <div className="orbit-header">
                <div className="orbit-orb"><span>O</span></div>
                <div><span>ORBIT · ADAPTIVE GUIDE</span><h2>{orbitHeadline}</h2></div>
              </div>

              {phase === "adaptive" ? (
                <div className="adaptation-card">
                  <span className="signal-tag">LEARNING SIGNAL</span>
                  <p>{misconception}</p>
                  <div className="route-change"><span>Route changed</span><strong>{bridge.title}</strong></div>
                  <p className="nudge-copy">{bridge.activity?.instruction ?? mission.nudge}</p>
                  <button ref={detourButtonRef} className="primary-action" onClick={openDetour}>Open the learning detour <span>→</span></button>
                  <small>No points lost. Your first detour on each mission earns 60 moon dust.</small>
                </div>
              ) : phase === "scaffold" || phase === "retry" ? (
                <div className="coach-card">
                  <span className="signal-tag">WHY THIS STEP</span>
                  <p>{bridge.coach}</p>
                  <div className="thinking-path"><span className="done">Notice</span><i /><span className={phase === "retry" ? "done" : "active"}>Build</span><i /><span className={phase === "retry" ? "active" : ""}>Connect</span></div>
                  <small>This is supported practice. A separate new-number check will test the strategy without this bridge.</small>
                </div>
              ) : phase === "success" ? (
                <div className="evidence-card">
                  <span className="signal-tag">MASTERY UPDATE</span>
                  <div className="evidence-score"><strong>{lastMasteryDelta >= 0 ? "+" : ""}{lastMasteryDelta}</strong><span>{mission.skillLabel.toLowerCase()} estimate</span></div>
                  <p>{liveEvent}</p>
                  <button className="secondary-action" onClick={() => setView("map")}>See the learning map <span>↗</span></button>
                </div>
              ) : (
                <>
                  <div className="orbit-observation">
                    <span className="signal-tag">WHY THIS CHALLENGE</span>
                    <p>{mission.whyThisChallenge}</p>
                  </div>
                  <div className="mini-map">
                    <div className="mini-map__labels"><span>Support</span><span>Challenge</span></div>
                    <div className="zone-bar"><i /><b style={{ left: `${mastery[mission.skill]}%` }} /></div>
                    <small>{mission.levelLabel} representation · level {mission.level} of 3</small>
                  </div>
                  <div className="orbit-footer-note"><span>✦</span><p><strong>Mistakes are data.</strong><br />A near miss changes the very next step.</p></div>
                </>
              )}
            </aside>
          </section>
        </>
      ) : (
        <section className="learning-map">
          <div className="map-hero">
            <div>
              <span className="map-kicker"><i /> LIVE LEARNING MODEL</span>
              <h1>Nova’s learning map</h1>
              <p>See which strategies Nova can use with new numbers and where another representation may help.</p>
              <p className="demo-context">Fictional demo learner. Starting estimates and base progress are sample values; evidence below comes from this session.</p>
            </div>
            <div className="session-summary">
              <span><strong>{attempts}</strong><small>attempts</small></span>
              <span><strong>{detours}</strong><small>smart detours</small></span>
              <span><strong>{completed}</strong><small>missions done</small></span>
            </div>
          </div>

          <div className="map-grid">
            <article className="insight-card main-insight">
              <div className="card-title"><div><span>ORBIT’S READ</span><h2>One useful insight, not a wall of data</h2></div><span className="fresh-badge">Updated now</span></div>
              <blockquote>“{misconception || mission.learnerRead}”</blockquote>
              <div className="next-move">
                <span>NEXT BEST MOVE</span>
                <p>{nextTeachingMove}</p>
                <div className="move-meta"><span>Why: {mission.nextMoveWhy}</span><span>When: next mission</span><span>Policy: prototype</span></div>
              </div>
            </article>


            <article className="insight-card mastery-card">
              <div className="card-title"><div><span>SKILL CONSTELLATION</span><h2>Evidence by skill</h2></div><span className={lastMasteryDelta < 0 ? "trend-down" : "trend-up"}>{lastMasteryDelta === 0 ? "No new evidence" : `${lastMasteryDelta > 0 ? "+" : ""}${lastMasteryDelta}`}</span></div>
              <SkillMeter label="Equal groups & arrays" value={mastery.arrays} tone="lime" level={`${levelName(levels.arrays)} ${levels.arrays}/3`} evidence={`${evidence.arrays.independentWins} independent · ${evidence.arrays.scaffoldedWins} scaffolded`} />
              <SkillMeter label="Place value & regrouping" value={mastery.placeValue} tone="purple" level={`${levelName(levels.placeValue)} ${levels.placeValue}/3`} evidence={`${evidence.placeValue.independentWins} independent · ${evidence.placeValue.scaffoldedWins} scaffolded`} />
              <SkillMeter label="Fractions of sets" value={mastery.fractions} tone="orange" level={`${levelName(levels.fractions)} ${levels.fractions}/3`} evidence={`${evidence.fractions.independentWins} independent · ${evidence.fractions.scaffoldedWins} scaffolded`} />
              <SkillMeter label="Subtracting across ten" value={mastery.subtraction} tone="blue" level={`${levelName(levels.subtraction)} ${levels.subtraction}/3`} evidence={`${evidence.subtraction.independentWins} independent · ${evidence.subtraction.scaffoldedWins} scaffolded`} />
              <p className="meter-note"><i /> BKT-inspired prototype estimate with hand-set, uncalibrated parameters. Independent success advances Build → Connect → Transfer; scaffolded success holds the level.</p>
            </article>

            <article className="insight-card transfer-evidence">
              <div className="card-title"><div><span>BEYOND THE PRACTICED ANSWER</span><h2>Did the strategy travel?</h2></div><strong className="transfer-total">{transferWins}/{transferAttempts}</strong></div>
              <p>{transferAttempts ? `${transferWins} of ${transferAttempts} new-number checks were solved on the first try without a worked example.` : "Complete a mission, then try its new-number check. Results appear here after the first attempt."}</p>
              {Object.entries(transferResults).map(([id, result]) => <div className="transfer-evidence-row" key={id}><span>{MISSIONS.find((item) => item.id === id)?.title}</span><strong>{result.correct ? "Strategy applied" : "Needs support"}</strong></div>)}
              <small>Immediate transfer is a useful signal. It does not establish long-term retention. Repeated questions do not add fresh mastery credit.</small>
            </article>

            <article className="insight-card evidence-timeline">
              <div className="card-title"><div><span>ADAPTATION TRACE</span><h2>Every decision is explainable</h2></div></div>
              {traceEvents.map((event, index) => (
                <div className={`trace-item ${index === 0 ? "live" : ""}`} key={`${event.detail}-${index}`}>
                  <i /><div><span>{index === 0 ? "Just now · live mission" : "Earlier this session"}</span><p>{event.message}</p><small>{event.detail}</small></div>
                </div>
              ))}
            </article>

            <article className="insight-card family-card">
              <div className="family-visual"><Rover /><span className="orbit-loop" /></div>
              <div><span>TRY THIS TOGETHER</span><h2>Turn dinner into an array hunt.</h2><p>Find something arranged in equal rows—an ice tray, egg carton, or window grid. Ask: “How many without counting one by one?”</p></div>
            </article>

            <article className="insight-card tutor-card">
              <div className="card-title"><div><span>ORBIT TUTOR COPILOT</span><h2>AI proposes. A human decides what Nova sees.</h2></div><span className="privacy-badge">Human approval required</span></div>
              <p>ORBIT turns the latest learning signal into a short Socratic plan. A tutor chooses the support level, reviews the language, and explicitly approves a tested mission before the learner route changes.</p>

              <fieldset className="level-picker">
                <legend>Choose the next representation</legend>
                {([1, 2, 3] as SkillLevel[]).map((level) => (
                  <button key={level} type="button" aria-pressed={copilotLevel === level} onClick={() => { invalidateCopilot(); setCopilotLevel(level); }}>
                    <strong>{levelName(level)}</strong><small>{level === 1 ? "More structure" : level === 2 ? "Connect models" : "Test transfer"}</small>
                  </button>
                ))}
              </fieldset>

              <div className="copilot-actions">
                <button className="handoff-button" onClick={createCopilotPlan} disabled={copilotState === "loading"}>{copilotState === "loading" ? "Building verified plan…" : "Create tutor co-plan"}<span>✦</span></button>
                <button className="brief-button" onClick={copyTutorBrief}>Copy evidence brief</button>
              </div>

              {copilotPlan && (
                <div className="copilot-plan">
                  <div className="plan-source"><span>{copilotPlan.source === "openai" ? "OPENAI · STRUCTURED OUTPUT" : "ORBIT · VERIFIED PLAN"}</span><small>Math remains authored + tested</small></div>
                  <h3>{copilotPlan.headline}</h3>
                  <p>{copilotPlan.rationale}</p>
                  <ol className="talk-moves">
                    <li><span>1</span><div><strong>Notice</strong><p>{copilotPlan.noticePrompt}</p></div></li>
                    <li><span>2</span><div><strong>Represent</strong><p>{copilotPlan.representPrompt}</p></div></li>
                    <li><span>3</span><div><strong>Fade</strong><p>{copilotPlan.fadePrompt}</p></div></li>
                  </ol>
                  <div className="look-for"><span>TUTOR LOOK-FOR</span><p>{copilotPlan.tutorLookFor}</p></div>
                  {copilotMission && <div className="approved-mission-preview"><span>TESTED LEARNER MISSION</span><strong>{copilotMission.title}</strong><p>{copilotMission.prompt}</p><small>{copilotMission.equation} · {copilotMission.levelLabel} {copilotMission.level}/3</small></div>}
                  <div className="safety-row"><span>✓ Answer withheld</span><span>✓ Tested math</span><span>✓ Not stored by Moonbase</span></div>
                  <button className="approve-plan" onClick={approveCopilotPlan} disabled={copilotState === "queued"}>{copilotState === "queued" ? "Approved and queued ✓" : "Approve this plan for Nova"}<span>→</span></button>
                </div>
              )}

              <small className={`copy-status ${copilotState === "error" ? "copy-status--error" : ""}`} aria-live="polite">{copilotMessage || briefStatus || "Only skill evidence—not a learner name or account—is sent when the optional AI enhancement is configured."}</small>
            </article>
          </div>

          <div className="map-actions">
            <button className="primary-action" onClick={continueFromMap}>{queuedMissionIndex !== null ? "Launch tutor-approved mission" : "Continue Nova’s mission"} <span>→</span></button>
            <button className="reset-button" onClick={resetDemo}>Reset demo</button>
          </div>
        </section>
      )}

      <footer className="product-footer">
        <div><span className="footer-mark">10</span><p><strong>MOONBASE 10</strong><br />Every mistake maps the next mission.</p></div>
        <p>Research-informed by <a href="https://ies.ed.gov/ncee/wwc/practiceguide/26" target="_blank" rel="noreferrer">IES guidance on visual representations and progress monitoring</a>. No account, ads, or student data collection.</p>
      </footer>
    </main>
  );
}
