"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  STARTING_MASTERY,
  chooseNextMissionIndex,
  getMissionProgress,
  traceMastery,
  type SkillKey,
} from "./learning-model";

type Phase = "question" | "adaptive" | "scaffold" | "retry" | "success";
type Mission = {
  id: string;
  eyebrow: string;
  title: string;
  story: string;
  prompt: string;
  equation: string;
  options: number[];
  answer: number;
  skill: SkillKey;
  skillLabel: string;
  visual: "array" | "base-ten" | "fraction" | "number-line";
  insightByAnswer: Record<number, string>;
  defaultInsight: string;
  learnerRead: string;
  whyThisChallenge: string;
  nudge: string;
  nextMove: string;
  nextMoveWhy: string;
  scaffold: {
    prompt: string;
    equation: string;
    options: number[];
    answer: number;
    coach: string;
    wrongFeedback: string;
  };
  celebration: string;
};

const MISSIONS: Mission[] = [
  {
    id: "solar-array",
    eyebrow: "Mission 04 · Solar Array",
    title: "Wake the west wing",
    story: "Six solar rows must power the habitat before lunar night.",
    prompt: "The array has 6 rows of 4 cells. How many cells are working?",
    equation: "6 × 4 = ?",
    options: [10, 20, 24, 28],
    answer: 24,
    skill: "arrays",
    skillLabel: "Equal groups",
    visual: "array",
    insightByAnswer: {
      10: "You added the two factors instead of making equal groups.",
      20: "You counted five rows and dropped the final group of four.",
      28: "You counted one extra group of four.",
    },
    defaultInsight: "The groups are visible, but the total is not stable yet.",
    learnerRead: "Nova recognizes equal groups when an array is visible and is learning to translate every row into multiplication.",
    whyThisChallenge: "A structured array connects Nova’s reliable skip-counting to multiplication.",
    nudge: "Let’s shrink the array, touch every row, then come right back.",
    nextMove: "Keep the array for one more challenge, then fade two rows and ask Nova to reconstruct the missing groups.",
    nextMoveWhy: "Strengthens equal-group structure",
    scaffold: {
      prompt: "Build 3 rows of 4 cells. How many cells altogether?",
      equation: "4 + 4 + 4 = ?",
      options: [7, 12, 16],
      answer: 12,
      coach: "Each row is one equal group. Count all three groups: 4, 8, 12.",
      wrongFeedback: "Touch each of the three rows once and add 4 + 4 + 4.",
    },
    celebration: "All six rows are online. You connected an array to repeated addition.",
  },
  {
    id: "cargo-bay",
    eyebrow: "Mission 05 · Cargo Bay",
    title: "Balance the supply lift",
    story: "Two cargo crews are combining oxygen canisters for the climb.",
    prompt: "One crew loaded 27 canisters and another loaded 36. How many total?",
    equation: "27 + 36 = ?",
    options: [53, 63, 73, 613],
    answer: 63,
    skill: "placeValue",
    skillLabel: "Place value",
    visual: "base-ten",
    insightByAnswer: {
      53: "You combined the ones, but the regrouped ten did not reach the tens column.",
      73: "An extra ten slipped into the total.",
      613: "You joined digits instead of combining their place values.",
    },
    defaultInsight: "The ones need to be regrouped before the tens are combined.",
    learnerRead: "Nova combines tens and ones reliably until a sum creates a new ten that must move columns.",
    whyThisChallenge: "Base-ten blocks make the regrouped ten visible before Nova returns to notation.",
    nudge: "Let’s pack 13 ones into one ten and three ones.",
    nextMove: "Build one more regrouping problem with base-ten blocks, then replace the blocks with a written tens-and-ones record.",
    nextMoveWhy: "Connects concrete regrouping to notation",
    scaffold: {
      prompt: "Seven ones plus six ones makes 13. How many tens do we regroup?",
      equation: "7 ones + 6 ones = 1 ten + 3 ones",
      options: [0, 1, 13],
      answer: 1,
      coach: "Ten of the ones snap together into one new ten. Three ones remain.",
      wrongFeedback: "Make a bundle of ten from the 13 ones. Count how many complete tens that creates.",
    },
    celebration: "Lift balanced. You regrouped across place values without losing a ten.",
  },
  {
    id: "water-vault",
    eyebrow: "Mission 06 · Water Vault",
    title: "Share the moonwater",
    story: "Three of the four greenhouse pods need an equal water ration.",
    prompt: "The tank holds 12 liters. What is 3/4 of the tank?",
    equation: "¾ of 12 = ?",
    options: [3, 4, 8, 9],
    answer: 9,
    skill: "fractions",
    skillLabel: "Fractions of sets",
    visual: "fraction",
    insightByAnswer: {
      3: "You found one fourth, but the mission needs three fourths.",
      4: "You used the denominator as the answer instead of making four equal groups.",
      8: "You filled two groups instead of three.",
    },
    defaultInsight: "The set must be split into four equal groups before taking three.",
    learnerRead: "Nova can find a unit fraction of a set and is learning to combine the requested number of equal groups.",
    whyThisChallenge: "Equal water groups connect the denominator, unit fraction, and requested numerator.",
    nudge: "First find one fourth. Then take that amount three times.",
    nextMove: "Partition a new set into four equal groups, then compare one fourth with three fourths before removing the visual dividers.",
    nextMoveWhy: "Separates the roles of numerator and denominator",
    scaffold: {
      prompt: "If 12 liters split into 4 equal groups, how many liters are in one group?",
      equation: "12 ÷ 4 = ?",
      options: [3, 4, 6],
      answer: 3,
      coach: "One fourth is 3 liters. Three fourths is three groups of 3.",
      wrongFeedback: "Share all 12 liters equally across four groups, then count the liters in just one group.",
    },
    celebration: "The greenhouse is hydrated. You found a fraction by making equal groups.",
  },
  {
    id: "return-route",
    eyebrow: "Mission 07 · Return Route",
    title: "Plot the rover home",
    story: "The rover is 52 marks out. Its return route covers 28 marks.",
    prompt: "Where will the rover be after traveling back 28 marks from 52?",
    equation: "52 − 28 = ?",
    options: [24, 26, 34, 80],
    answer: 24,
    skill: "subtraction",
    skillLabel: "Subtraction across ten",
    visual: "number-line",
    insightByAnswer: {
      26: "You subtracted the ones without crossing back through the ten.",
      34: "You took away 18 rather than 28.",
      80: "You combined the distances instead of finding what remains.",
    },
    defaultInsight: "Crossing the ten is easier when the jump is split into 20 and 8.",
    learnerRead: "Nova subtracts whole tens reliably and is learning to decompose a two-digit jump across a ten.",
    whyThisChallenge: "A number line exposes the intermediate landing point in a subtraction-across-ten strategy.",
    nudge: "Take one clean jump of 20 first. Then hop back 8.",
    nextMove: "Keep the intermediate landing point visible for one more problem, then hide it and ask Nova to name the two jumps.",
    nextMoveWhy: "Builds a reusable decomposition strategy",
    scaffold: {
      prompt: "Start at 52 and jump back 20. Where do you land?",
      equation: "52 − 20 = ?",
      options: [22, 32, 48],
      answer: 32,
      coach: "Subtracting two tens changes only the tens digit: 52 becomes 32.",
      wrongFeedback: "Jump back two whole tens from 52. The ones digit stays 2 while the tens digit changes.",
    },
    celebration: "Rover recovered. You decomposed a hard jump into two friendly jumps.",
  },
];

function ArrayVisual({ small = false }: { small?: boolean }) {
  const rows = small ? 3 : 6;
  const cells = Array.from({ length: rows * 4 }, (_, index) => index);

  return (
    <div className={`array-visual ${small ? "array-visual--small" : ""}`} role="img" aria-label={`${rows} rows of 4 solar cells`}>
      {cells.map((cell) => (
        <span key={cell} className="solar-cell" />
      ))}
    </div>
  );
}

function BaseTenVisual() {
  return (
    <div className="base-ten-visual" role="img" aria-label="Two groups of base ten blocks showing 27 and 36">
      <div className="block-group">
        <span className="group-label">27</span>
        <div className="ten-rods"><i /><i /></div>
        <div className="ones">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>
      </div>
      <span className="visual-plus">+</span>
      <div className="block-group">
        <span className="group-label">36</span>
        <div className="ten-rods"><i /><i /><i /></div>
        <div className="ones">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>
      </div>
    </div>
  );
}

function FractionVisual() {
  return (
    <div className="fraction-visual" role="img" aria-label="Twelve water units divided into four equal groups">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="water-cell"><i /></span>
      ))}
      <div className="fraction-brace brace-1">¼</div>
      <div className="fraction-brace brace-2">¼</div>
      <div className="fraction-brace brace-3">¼</div>
      <div className="fraction-brace brace-4">¼</div>
    </div>
  );
}

function NumberLineVisual({ small = false }: { small?: boolean }) {
  const jump = small ? 20 : 28;
  return (
    <div className="number-line-visual" role="img" aria-label={`Number line from 20 to 55 with a rover at 52 and a jump back ${jump}`}>
      <div className="rover-marker"><span>●</span><b>52</b></div>
      <div className="line-track">
        {[20, 25, 30, 35, 40, 45, 50, 55].map((number) => (
          <span key={number}><i />{number}</span>
        ))}
      </div>
      <div className="jump-label">← jump back {jump}</div>
    </div>
  );
}

function MissionVisual({ mission, small = false }: { mission: Mission; small?: boolean }) {
  if (mission.visual === "array") return <ArrayVisual small={small} />;
  if (mission.visual === "base-ten") return <BaseTenVisual />;
  if (mission.visual === "fraction") return <FractionVisual />;
  return <NumberLineVisual small={small} />;
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

function SkillMeter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="skill-meter">
      <div className="skill-meter__label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="meter-track"><i className={tone} style={{ width: `${value}%` }} /></div>
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
  const [lastMasteryDelta, setLastMasteryDelta] = useState(0);
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
      const updated = traceMastery(prior, true, phase === "retry");
      setPhase("success");
      setStreak((current) => current + 1);
      setMastery((current) => ({ ...current, [mission.skill]: updated }));
      setLastMasteryDelta(updated - prior);
      recordEvent(
        `Nova solved ${mission.skillLabel.toLowerCase()} ${phase === "retry" ? "after one scaffold" : "independently"}. ORBIT will target the lowest remaining skill estimate next.`,
        `${updated - prior >= 0 ? "+" : ""}${updated - prior} evidence points · ${phase === "retry" ? "scaffolded" : "independent"} success`,
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
    const nextIndex = chooseNextMissionIndex(MISSIONS, missionIndex, mastery);
    const next = MISSIONS[nextIndex];
    setCompleted((current) => current + 1);
    setMissionIndex(nextIndex);
    setPhase("question");
    setSelected(null);
    setMisconception("");
    setScaffoldMessage("");
    recordEvent(
      `ORBIT selected ${next.skillLabel.toLowerCase()} because it has the lowest current estimate among the other mission skills.`,
      `Next mission · ${next.title}`,
    );
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
    setLastMasteryDelta(0);
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
                <span className="skill-chip">{mission.skillLabel}</span>
              </div>

              <div className="problem-stage">
                <MissionVisual mission={mission} small={phase === "scaffold"} />
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
                    <small>Inside Nova’s productive zone</small>
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
              <SkillMeter label="Equal groups & arrays" value={mastery.arrays} tone="lime" />
              <SkillMeter label="Place value & regrouping" value={mastery.placeValue} tone="purple" />
              <SkillMeter label="Fractions of sets" value={mastery.fractions} tone="orange" />
              <SkillMeter label="Subtracting across ten" value={mastery.subtraction} tone="blue" />
              <p className="meter-note"><i /> BKT-inspired prototype estimate with hand-set, uncalibrated parameters. The next mission targets the lowest current skill estimate.</p>
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
