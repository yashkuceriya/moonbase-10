# Moonbase 10

**Every mistake maps the next mission.**

Moonbase 10 is a K–5 adaptive math adventure built for the 2026 Nerdy AI Hackathon Challenge. A learner restores a lunar base by solving short math missions. The ORBIT guide uses the meaning of each answer—not only whether it was right—to classify a likely misconception, update a transparent learner estimate, and select a targeted bridge activity before returning to the original goal.

## Why this entry is different

- **A mistake changes the next 20 seconds.** Near misses trigger a specific, no-penalty detour rather than generic feedback.
- **The AI is explainable.** The Learning Map exposes the signal, decision, and next step to a parent, teacher, or tutor.
- **The pedagogy is visible.** Arrays, base-ten blocks, fraction sets, and number lines connect concrete representations to symbols.
- **The demo is dependable.** The complete adaptive loop works without an account, API key, network call, or real learner data.
- **The privacy posture is simple.** No login, advertising, analytics, biometric inference, or student-data collection.

## Adaptive model

ORBIT combines two lightweight techniques:

1. A misconception graph maps semantically meaningful distractors to likely reasoning patterns, such as dropping the final equal group or failing to carry a regrouped ten.
2. A BKT-inspired Bayesian update estimates skill mastery after each observation. Its hand-set prototype parameters are explicit and not yet calibrated on learner data. After a completed mission, a deterministic policy selects the lowest-estimated skill among the other available missions.

The current prototype includes four complete learning loops: equal groups, place-value regrouping, fractions of sets, and subtraction across ten.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server. Run `npm run verify` for lint, strict type checking, the production build, server-render checks, and adaptive-model unit tests.

## Demo path

1. On Mission 04, choose **20**. ORBIT recognizes that the final row was dropped.
2. Open the learning detour and choose **12** for `4 + 4 + 4`.
3. Return to the full mission and choose **24**.
4. Open **Learning map** to show the updated mastery estimate and adaptation trace.

Full submission copy and the timed video script are in [SUBMISSION.md](./SUBMISSION.md). Third-party and generative-AI disclosures are in [THIRD_PARTY.md](./THIRD_PARTY.md).

## Research grounding

The interaction design follows the U.S. Institute of Education Sciences practice guide on systematic instruction, mathematical language, concrete and semi-concrete representations, number lines, word problems, and progress monitoring: <https://ies.ed.gov/ncee/wwc/practiceguide/26>.

## Contest note

This project was created during the challenge entry period beginning August 27, 2026. The contest rules assign ownership of a submitted entry to Nerdy and require eligibility, originality, licensing, and AI-assistance disclosures. Review the official rules before submitting: <https://hackathon.nerdy.com/terms>.
