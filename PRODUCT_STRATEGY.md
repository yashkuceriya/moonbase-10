# Moonbase 10 — winning product strategy

## Product thesis

**Moonbase 10 turns a meaningful mistake into a transferable learning move and a tutor-ready evidence trail.**

The market is already full of adaptive question sequencing, rewards, and generic AI chat. Moonbase should win on a more specific loop:

`meaningful distractor → misconception hypothesis → targeted representation → faded support → original goal → explainable human handoff`

That loop is the product, not a chatbot attached to a worksheet.

## What the research changed

### Nerdy fit

- The [hackathon brief](https://hackathon.nerdy.com/) asks for an intuitive, engaging K–5 math experience with innovative mechanics that reward mastery and steady progression.
- [Nerdy](https://nerdy.com/) positions its platform as Live + AI, with adaptive diagnostics and practice, AI Tutor, Tutor Copilot, and session summaries.
- Nerdy’s [AI-first operating principles](https://careers.nerdy.com/about) emphasize Human + AI, telemetry and feedback loops, fast iteration, privacy, and security.
- Nerdy’s [Live + AI product release](https://investors.nerdy.com/news/news-details/2025/Varsity-Tutors-Introduces-New-LiveAI-Tools-and-Capabilities-That-Teachers-and-School-Administrators-Can-Use-to-Support-Student-Learning/default.aspx) connects practice, predictive insight, transparent dashboards, and live-session follow-up.

Implication: the strongest entry should demonstrate both a compelling learner loop and a credible bridge to a human tutor.

### Competitive pattern

- [Prodigy Math](https://www.prodigygame.com/main-en/prodigy-math) embeds adaptive questions in quests and rewards.
- [DreamBox](https://www.dreambox.com/) emphasizes continuous formative assessment, interaction-level adaptation, conceptual representations, and educator dashboards.
- [Khanmigo](https://www.khanacademy.org/khan-labs) uses guided discovery instead of simply giving answers. Khan Academy’s [math reliability write-up](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/) also argues for vetted exercises, tools, benchmarks, and human review rather than trusting free-form model arithmetic.
- [Duolingo Math](https://blog.duolingo.com/duolingo-launches-math-app/) combines short lessons, content-specific manipulatives, streaks, and XP.

Implication: points, quests, and “adaptive” labels are table stakes. Moonbase differentiates when it explains *why* the route changed and produces evidence another adult can use.

### Learning-science constraint

The Institute of Education Sciences [elementary mathematics practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/26) supports systematic instruction, mathematical language, concrete and semi-concrete representations, number lines, deliberate word-problem instruction, and progress monitoring. Its [early-childhood guidance](https://ies.ed.gov/ncee/wwc/earlychildhoodinstruction2) emphasizes developmental progressions, monitoring knowledge, adjusting instruction, games, and open-ended questions.

Implication: adaptation should change the representation and size of the leap, then deliberately fade support. A score change alone is not meaningful adaptation.

## Product decisions

1. **Twelve authored item variants, not four repeated prompts.** Each skill now has Build, Connect, and Transfer missions.
2. **Independence controls progression.** Independent success advances the representation level. Scaffolded recovery records useful evidence but holds the level.
3. **Every primary distractor carries a hypothesis.** Automated core-content checks ensure no mission-level wrong option falls back to meaningless “try again” feedback.
4. **Math stays deterministic.** The runtime never delegates arithmetic to a language model. Optional Structured Outputs refine tutor-facing Socratic language, while a validator and local fallback keep the experience dependable.
5. **Human handoff is part of the loop.** The Tutor Copilot proposes a three-move plan, the tutor selects Build, Connect, or Transfer, and an explicit approval changes the learner route. A device-only evidence brief is also available.
6. **Claims remain honest.** Mastery estimates are explicitly BKT-inspired, hand-set, and uncalibrated. They are not grades or diagnoses.

## Judge story

1. Start with the hook: most games react to right and wrong; Moonbase reacts to the *meaning* of the answer.
2. Choose the plausible near miss `20` on `6 × 4`.
3. Show the misconception-specific detour, complete `3 × 4`, and retry `6 × 4`.
4. Show that scaffolded success is not mislabeled as independence.
5. Open the Learning Map and point to signal → decision → evidence.
6. Ask ORBIT Tutor Copilot for a Transfer plan, review its source and safety boundary, approve it, and launch the changed learner mission.

## Next evidence, not next feature

The next winner-level work should be evaluative:

- Run five learner usability sessions and measure whether children understand the mission without adult explanation.
- Compare generic retry feedback against misconception-specific bridges on original-problem recovery.
- Test one-week transfer with a structurally similar but visually different item.
- Review every item and distractor with an elementary-math educator.
- Calibrate or replace the prototype learner model only after consented, representative evidence exists.
