"use client";

import { useMemo, useState } from "react";

type Phase = "question" | "adaptive" | "scaffold" | "retry" | "success";
type SkillKey = "arrays" | "placeValue" | "fractions" | "subtraction";

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
  nudge: string;
  scaffold: {
    prompt: string;
    equation: string;
    options: number[];
    answer: number;
    coach: string;
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
    nudge: "Let’s shrink the array, touch every row, then come right back.",
    scaffold: {
      prompt: "Build 3 rows of 4 cells. How many cells altogether?",
      equation: "4 + 4 + 4 = ?",
      options: [7, 12, 16],
      answer: 12,
      coach: "Each row is one equal group. Count all three groups: 4, 8, 12.",
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
    nudge: "Let’s pack 13 ones into one ten and three ones.",
    scaffold: {
      prompt: "Seven ones plus six ones makes 13. How many tens do we regroup?",
      equation: "7 ones + 6 ones = 1 ten + 3 ones",
      options: [0, 1, 13],
      answer: 1,
      coach: "Ten of the ones snap together into one new ten. Three ones remain.",
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
    nudge: "First find one fourth. Then take that amount three times.",
    scaffold: {
      prompt: "If 12 liters split into 4 equal groups, how many liters are in one group?",
      equation: "12 ÷ 4 = ?",
      options: [3, 4, 6],
      answer: 3,
      coach: "One fourth is 3 liters. Three fourths is three groups of 3.",
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
    nudge: "Take one clean jump of 20 first. Then hop back 8.",
    scaffold: {
      prompt: "Start at 52 and jump back 20. Where do you land?",
      equation: "52 − 20 = ?",
      options: [22, 32, 48],
      answer: 32,
      coach: "Subtracting two tens changes only the tens digit: 52 becomes 32.",
    },
    celebration: "Rover recovered. You decomposed a hard jump into two friendly jumps.",
  },
];

const STARTING_MASTERY: Record<SkillKey, number> = {
  arrays: 68,
  placeValue: 81,
  fractions: 62,
  subtraction: 54,
};

// A compact Bayesian Knowledge Tracing update. ORBIT combines this estimate
// with misconception-specific answer semantics to choose the next activity.
function traceMastery(priorPercent: number, correct: boolean, scaffolded = false) {
  const prior = priorPercent / 100;
  const slip = 0.1;
  const guess = 0.2;
  const learn = scaffolded ? 0.08 : 0.13;
  const observed = correct
    ? (prior * (1 - slip)) / (prior * (1 - slip) + (1 - prior) * guess)
    : (prior * slip) / (prior * slip + (1 - prior) * (1 - guess));
  const stabilized = (observed + prior * 2) / 3;
  const learned = stabilized + (1 - stabilized) * learn;
  return Math.max(12, Math.min(98, Math.round(learned * 100)));
}

function ArrayVisual({ small = false }: { small?: boolean }) {
  const rows = small ? 3 : 6;
  const cells = Array.from({ length: rows * 4 }, (_, index) => index);

  return (
    <div className={`array-visual ${small ? "array-visual--small" : ""}`} aria-label={`${rows} rows of 4 solar cells`}>
      {cells.map((cell) => (
        <span key={cell} className="solar-cell" />
      ))}
    </div>
  );
}

function BaseTenVisual() {
  return (
    <div className="base-ten-visual" aria-label="Two groups of base ten blocks showing 27 and 36">
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
    <div className="fraction-visual" aria-label="Twelve water units divided into four equal groups">
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

function NumberLineVisual() {
  return (
    <div className="number-line-visual" aria-label="Number line from 20 to 55 with a rover at 52">
      <div className="rover-marker"><span>●</span><b>52</b></div>
      <div className="line-track">
        {[20, 25, 30, 35, 40, 45, 50, 55].map((number) => (
          <span key={number}><i />{number}</span>
        ))}
      </div>
      <div className="jump-label">← jump back 28</div>
    </div>
  );
}

function MissionVisual({ mission, small = false }: { mission: Mission; small?: boolean }) {
  if (mission.visual === "array") return <ArrayVisual small={small} />;
  if (mission.visual === "base-ten") return <BaseTenVisual />;
  if (mission.visual === "fraction") return <FractionVisual />;
  return <NumberLineVisual />;
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
  const [mastery, setMastery] = useState(STARTING_MASTERY);
  const [liveEvent, setLiveEvent] = useState("ORBIT selected an array because Nova learns fastest when quantities are visible.");

  const mission = MISSIONS[missionIndex];
  const progress = Math.min(7, 3 + completed);
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

  function answer(value: number) {
    setSelected(value);

    if (phase === "scaffold") {
      if (value === mission.scaffold.answer) {
        setScaffoldMessage(mission.scaffold.coach);
        setPhase("retry");
        setSelected(null);
        setLiveEvent(`Nova completed a smaller ${mission.skillLabel.toLowerCase()} step. ORBIT restored the original challenge with one visual bridge.`);
      } else {
        setScaffoldMessage("Not yet. Count each equal group once, then check the total.");
      }
      return;
    }

    if (value === mission.answer) {
      setPhase("success");
      setStreak((current) => current + 1);
      setMastery((current) => ({
        ...current,
        [mission.skill]: traceMastery(current[mission.skill], true, phase === "retry"),
      }));
      setLiveEvent(`Nova solved ${mission.skillLabel.toLowerCase()} ${phase === "retry" ? "after one scaffold" : "independently"}. Next item difficulty will rise by one step.`);
      return;
    }

    const insight = mission.insightByAnswer[value] ?? mission.defaultInsight;
    setMisconception(insight);
    setPhase("adaptive");
    setStreak(0);
    setDetours((current) => current + 1);
    setMastery((current) => ({ ...current, [mission.skill]: traceMastery(current[mission.skill], false) }));
    setLiveEvent(`Near-miss classified: ${insight} ORBIT paused difficulty and selected a prerequisite micro-step.`);
  }

  function openDetour() {
    setPhase("scaffold");
    setSelected(null);
    setScaffoldMessage("");
  }

  function nextMission() {
    setCompleted((current) => current + 1);
    setMissionIndex((current) => (current + 1) % MISSIONS.length);
    setPhase("question");
    setSelected(null);
    setMisconception("");
    setScaffoldMessage("");
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
    setMastery(STARTING_MASTERY);
    setLiveEvent("ORBIT selected an array because Nova learns fastest when quantities are visible.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={resetDemo} aria-label="Reset Moonbase 10 demo">
          <span className="brand-mark">10</span>
          <span><strong>MOONBASE 10</strong><small>adaptive math adventure</small></span>
        </button>
        <nav className="view-switcher" aria-label="Choose view">
          <button className={view === "mission" ? "active" : ""} onClick={() => setView("mission")}>Learner mission</button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><span className="live-dot" />Learning map</button>
        </nav>
        <div className="topbar-stats">
          <span><b>{streak}</b><small>streak</small></span>
          <span><b>{1280 + completed * 140 + detours * 60}</b><small>moon dust</small></span>
          <button className="avatar" aria-label="Learner profile for Nova">N</button>
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
              <div><span>BASE POWER</span><strong>{42 + completed * 8}%</strong></div>
              <div className="power-track"><i style={{ width: `${42 + completed * 8}%` }} /></div>
              <small>{progress} of 8 systems restored</small>
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
                  <button className="primary-action" onClick={openDetour}>Open the learning detour <span>→</span></button>
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
                  <div className="evidence-score"><strong>+{phase === "success" ? 7 : 4}</strong><span>skill evidence</span></div>
                  <p>{liveEvent}</p>
                  <button className="secondary-action" onClick={() => setView("map")}>See the learning map <span>↗</span></button>
                </div>
              ) : (
                <>
                  <div className="orbit-observation">
                    <span className="signal-tag">WHY THIS CHALLENGE</span>
                    <p>Nova is ready to move from skip-counting to structured equal groups.</p>
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
              <span><strong>{7 + completed}</strong><small>challenges</small></span>
              <span><strong>{detours || 1}</strong><small>smart detour</small></span>
              <span><strong>{84 + completed * 2}%</strong><small>productive time</small></span>
            </div>
          </div>

          <div className="map-grid">
            <article className="insight-card main-insight">
              <div className="card-title"><div><span>ORBIT’S READ</span><h2>One useful insight, not a wall of data</h2></div><span className="fresh-badge">Updated now</span></div>
              <blockquote>“{misconception || "Nova recognizes equal groups quickly when an array is visible, but sometimes drops the final group when translating a story into multiplication."}”</blockquote>
              <div className="next-move">
                <span>NEXT BEST MOVE</span>
                <p>Keep the array for one more challenge, then fade two rows and ask Nova to reconstruct the missing groups.</p>
                <div className="move-meta"><span>Why: strengthens structure</span><span>When: next mission</span><span>Confidence: high</span></div>
              </div>
            </article>

            <article className="insight-card mastery-card">
              <div className="card-title"><div><span>SKILL CONSTELLATION</span><h2>Mastery is multidimensional</h2></div><span className="trend-up">↗ 6%</span></div>
              <SkillMeter label="Equal groups & arrays" value={mastery.arrays} tone="lime" />
              <SkillMeter label="Place value & regrouping" value={mastery.placeValue} tone="purple" />
              <SkillMeter label="Fractions of sets" value={mastery.fractions} tone="orange" />
              <SkillMeter label="Subtracting across ten" value={mastery.subtraction} tone="blue" />
              <p className="meter-note"><i /> Knowledge estimate uses Bayesian evidence; difficulty rises after two independent demonstrations.</p>
            </article>

            <article className="insight-card evidence-timeline">
              <div className="card-title"><div><span>ADAPTATION TRACE</span><h2>Every decision is explainable</h2></div></div>
              <div className="trace-item live"><i /><div><span>Just now · live mission</span><p>{liveEvent}</p><small>Signal → decision → next step</small></div></div>
              <div className="trace-item"><i /><div><span>4 minutes ago</span><p>Switched from symbols to base-ten blocks after a regrouping near miss.</p><small>Representation changed, learning goal stayed fixed</small></div></div>
              <div className="trace-item"><i /><div><span>Yesterday</span><p>Raised array difficulty after two independent, fluent solutions.</p><small>Evidence threshold met</small></div></div>
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
