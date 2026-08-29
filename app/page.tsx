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
  updateSkillLevel,
} from "./learning-model";
import { MISSIONS, type VisualData } from "./missions";

type Phase = "question" | "adaptive" | "scaffold" | "retry" | "success";
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
  const [traceEvents, setTraceEvents] = useState([
    {
      message: "ORBIT opened with an array to connect Nova’s skip-counting to equal groups.",
      detail: "Session start · structured visual",
    },
  ]);
  const detourButtonRef = useRef<HTMLButtonElement>(null);

  const mission = MISSIONS[missionIndex];
  const progress = getMissionProgress(completed);
  const liveEvent = traceEvents[0].message;
  const activePrompt = phase === "scaffold" ? mission.scaffold.prompt : mission.prompt;
  const activeEquation = phase === "scaffold" ? mission.scaffold.equation : mission.equation;
  const activeOptions = phase === "scaffold" ? mission.scaffold.options : mission.options;
  const activeVisual = phase === "scaffold" ? mission.scaffold.visual : mission.visual;
  const levelName = (level: number) => ["", "Build", "Connect", "Transfer"][level];

  const orbitHeadline = useMemo(() => {
    if (phase === "adaptive") return "Pattern spotted — rerouting";
    if (phase === "scaffold") return "20-second learning detour";
    if (phase === "retry") return "Bridge built — try the mission again";
    if (phase === "success") return "Evidence of mastery captured";
    return "Watching the strategy, not just the score";
  }, [phase]);

  useEffect(() => {
    if (phase === "adaptive") detourButtonRef.current?.focus();
  }, [phase]);

  function recordEvent(message: string, detail: string) {
    setTraceEvents((current) => [{ message, detail }, ...current].slice(0, 4));
  }

  function answer(value: number) {
    if (phase === "adaptive" || phase === "success") return;
    setAttempts((current) => current + 1);
    setSelected(value);

    if (phase === "scaffold") {
      if (value === mission.scaffold.answer) {
        setScaffoldMessage(mission.scaffold.coach);
        setPhase("retry");
        setSelected(null);
        recordEvent(
          `Nova completed a smaller ${mission.skillLabel.toLowerCase()} step. ORBIT restored the original challenge with one visual bridge.`,
          "Bridge completed · original goal restored",
        );
      } else {
        setScaffoldMessage(mission.scaffold.wrongFeedback);
      }
      return;
    }

    if (value === mission.answer) {
      const prior = mastery[mission.skill];
      const scaffolded = phase === "retry";
      const updated = traceMastery(prior, true, scaffolded);
      const nextLevel = updateSkillLevel(levels[mission.skill], true, scaffolded);
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
        `Nova solved ${mission.skillLabel.toLowerCase()} ${scaffolded ? "after one scaffold" : "independently"}. ${scaffolded ? "Support stays at the same level until independent evidence appears." : `ORBIT advanced this skill to ${levelName(nextLevel)}.`}`,
        `${updated - prior >= 0 ? "+" : ""}${updated - prior} evidence points · ${scaffolded ? "scaffolded" : "independent"} success`,
      );
      return;
    }

    const insight = mission.insightByAnswer[value] ?? mission.defaultInsight;
    setMisconception(insight);
    setPhase("adaptive");
    setStreak(0);
    setDetours((current) => current + 1);
    const prior = mastery[mission.skill];
    const updated = traceMastery(prior, false);
    setMastery((current) => ({ ...current, [mission.skill]: updated }));
    setEvidence((current) => ({
      ...current,
      [mission.skill]: {
        ...current[mission.skill],
        nearMisses: current[mission.skill].nearMisses + 1,
      },
    }));
    setLastMasteryDelta(updated - prior);
    recordEvent(
      `Near-miss classified: ${insight} ORBIT paused difficulty and selected a prerequisite micro-step.`,
      `${updated - prior} evidence points · bridge recommended`,
    );
  }

  function openDetour() {
    setPhase("scaffold");
    setSelected(null);
    setScaffoldMessage("");
  }

  function nextMission() {
    const nextIndex = chooseNextMissionIndex(MISSIONS, missionIndex, mastery, levels);
    const next = MISSIONS[nextIndex];
    setMissionIndex(nextIndex);
    setPhase("question");
    setSelected(null);
    setMisconception("");
    setScaffoldMessage("");
    setBriefStatus("");
    recordEvent(
      `ORBIT selected ${next.skillLabel.toLowerCase()} at ${next.levelLabel.toLowerCase()} level because it has the lowest current estimate among the other skills.`,
      `Next mission · ${next.title} · ${next.levelLabel} representation`,
    );
  }

  async function copyTutorBrief() {
    const brief = buildTutorBrief({
      mastery,
      levels,
      evidence,
      attempts,
      completed,
      detours,
      latestSignal: misconception || mission.learnerRead,
      nextMove: mission.nextMove,
    });

    try {
      await navigator.clipboard.writeText(brief);
      setBriefStatus("Tutor brief copied. Nothing was uploaded.");
    } catch {
      setBriefStatus("Clipboard access is unavailable in this browser.");
    }
  }

  function resetDemo() {
    setView("mission");
    setMissionIndex(0);
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
                <div><span className="step-kicker">YOUR NEXT MOVE</span><h2>{activePrompt}</h2></div>
                <div className="challenge-tags"><span className="level-chip">{mission.levelLabel} {mission.level}/3</span><span className="skill-chip">{mission.skillLabel}</span></div>
              </div>

              <div className="problem-stage">
                <MissionVisual visual={activeVisual} />
                <div className="equation-card">
                  <small>{phase === "scaffold" ? "BRIDGE STEP" : "MISSION MATH"}</small>
                  <strong>{activeEquation}</strong>
                  {phase === "retry" && <span className="bridge-note">Bridge unlocked: {mission.scaffold.equation}</span>}
                </div>
              </div>

              <div className="answer-grid" aria-label="Answer choices">
                {activeOptions.map((option) => {
                  const isSelected = selected === option;
                  const isCorrect = (phase === "success" && option === mission.answer) || (phase === "scaffold" && isSelected && option === mission.scaffold.answer);
                  const isWrong = isSelected && !isCorrect;
                  return (
                    <button
                      key={option}
                      onClick={() => answer(option)}
                      disabled={phase === "adaptive" || phase === "success"}
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
                    <div><strong>System restored!</strong><p>{mission.celebration}</p></div>
                    <button onClick={nextMission}>Next mission <span>→</span></button>
                  </div>
                )}
              </div>
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
                  <div className="route-change"><span>Route changed</span><strong>Same goal, smaller leap</strong></div>
                  <p className="nudge-copy">{mission.nudge}</p>
                  <button ref={detourButtonRef} className="primary-action" onClick={openDetour}>Open the learning detour <span>→</span></button>
                  <small>No penalty. Productive struggle earns 60 moon dust.</small>
                </div>
              ) : phase === "scaffold" || phase === "retry" ? (
                <div className="coach-card">
                  <span className="signal-tag">WHY THIS STEP</span>
                  <p>{mission.scaffold.coach}</p>
                  <div className="thinking-path"><span className="done">Notice</span><i /><span className={phase === "retry" ? "done" : "active"}>Build</span><i /><span className={phase === "retry" ? "active" : ""}>Connect</span></div>
                  <small>ORBIT will fade this support as soon as the pattern is stable.</small>
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
              <p>Not a report card. A living picture of what Nova understands, where a representation helps, and what should happen next.</p>
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
                <p>{mission.nextMove}</p>
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
              <div className="card-title"><div><span>HUMAN HANDOFF</span><h2>Give a tutor the useful five-minute version</h2></div><span className="privacy-badge">Device only</span></div>
              <p>Copy the latest signal, support history, skill levels, and recommended next move. The brief is generated in this browser and is never sent by Moonbase 10.</p>
              <div className="handoff-flow" aria-label="Handoff flow"><span>Mistake</span><i>→</i><span>Bridge</span><i>→</i><span>Evidence</span><i>→</i><span>Tutor</span></div>
              <button className="handoff-button" onClick={copyTutorBrief}>Copy tutor brief <span>↗</span></button>
              <small className="copy-status" aria-live="polite">{briefStatus || "No account or student-data upload required."}</small>
            </article>
          </div>

          <div className="map-actions">
            <button className="primary-action" onClick={() => setView("mission")}>Continue Nova’s mission <span>→</span></button>
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
