# Moonbase 10

**Every mistake maps the next mission.**

Moonbase 10 is an adaptive elementary math adventure built for the 2026 Nerdy AI Hackathon Challenge. A learner restores a lunar base by solving short math missions. ORBIT treats a selected answer as a provisional clue, updates a transparent learner estimate, and selects a visual bridge before returning to the original goal. This is a focused foundational-skills prototype, not a complete K–5 curriculum.

## Why this entry is different

- **A mistake changes the next 20 seconds.** Near misses trigger a specific, no-penalty detour rather than generic feedback.
- **The AI is explainable.** The Learning Map exposes the signal, decision, and next step to a parent, teacher, or tutor.
- **Progress means less support, not only more points.** Each skill moves through authored Build, Connect, and Transfer representations only after independent evidence.
- **Recovery is followed by a different problem.** Twelve additional checks use new numbers and contexts without a worked example. Their first-attempt results appear separately in the Learning Map and tutor brief; replay never earns fresh mastery or rewards.
- **Human + AI is a working loop.** ORBIT proposes a Socratic co-plan, a tutor chooses the representation level, and the learner route changes only after explicit approval.
- **Generated language cannot control the math.** Optional OpenAI Structured Outputs shape tutor-facing language; authored, tested missions remain the only learner-facing mathematics, with a verified fallback on any failure.
- **The pedagogy is visible.** Arrays, base-ten blocks, fraction sets, and number lines connect concrete representations to symbols.
- **The demo is dependable.** The complete adaptive and human-handoff loops work without an account, API key, network call, or real learner data.
- **The privacy posture is explicit.** No login, advertising, analytics, biometric inference, or student-data collection. When the optional OpenAI enhancement is configured, only bounded skill evidence is sent server-side with `store: false`; learner names and answer choices are omitted.

## Adaptive model

ORBIT combines three techniques:

1. An authored routing policy treats distractors as provisional reasoning clues. All nine array distractors route to interactive counting, missing-row, or extra-row bridges. Learners must complete a reversible row task to unlock the bridge answers. The other nine missions retain their skill-specific authored visual bridges; these are not yet individually branched by distractor.
2. A BKT-inspired Bayesian update estimates skill mastery after each observation. Its hand-set prototype parameters are explicit and not yet calibrated on learner data. After a completed mission, a deterministic policy selects the lowest-estimated skill among the other available skills at the learner’s current representation level.
3. A supervised Tutor Copilot converts the same evidence into a three-move Socratic plan. When `OPENAI_API_KEY` is configured, server-side OpenAI Structured Outputs may refine the tutoring language. Runtime validation rejects numbers and known diagnostic terms; it does not guarantee that all unsafe language is detected. Human review is still required. The authored local plan takes over on refusal, timeout, malformed output, or missing configuration.

The current prototype includes 12 authored and automatically validated mission variants plus 12 separate new-number checks. Build, Connect, and Transfer missions cover equal groups, place-value regrouping, fractions of sets, and subtraction across ten. Independent success advances the representation level; scaffolded success records recovery while holding the level until independent evidence appears. Immediate transfer is recorded separately from recovery and is not evidence of long-term retention. Starting estimates and base progress belong to the explicitly labeled fictional demo profile.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and add an OpenAI API key only if you want the optional language enhancement; the complete product works without it. Then open the local URL printed by the development server. Run `npm run verify` for lint, strict type checking, the production build, server-render checks, adaptive-model tests, and Copilot safety/API tests.

## Demo path

1. On Mission 04, choose **20**. ORBIT observes that this matches five rows of four and proposes a missing-row bridge.
2. Open the learning detour, switch on **row 6**, and choose **4** for the cells restored.
3. Return to the full mission and choose **24**.
4. Try the new-number check: five trays of seven seedlings. Choose **35**, then open **Learning map** to show recovery and immediate transfer as separate evidence.
5. In **ORBIT Tutor Copilot**, choose **Transfer**, create the co-plan, and review the three Socratic moves.
6. Approve the plan, then launch the tutor-approved transfer mission for Nova.
7. **Copy evidence brief** remains available for a device-only handoff.

Full submission copy and the timed video script are in [SUBMISSION.md](./SUBMISSION.md). Third-party and generative-AI disclosures are in [THIRD_PARTY.md](./THIRD_PARTY.md).

## Research grounding

The interaction design follows the U.S. Institute of Education Sciences practice guide on systematic instruction, mathematical language, concrete and semi-concrete representations, number lines, word problems, and progress monitoring: <https://ies.ed.gov/ncee/wwc/practiceguide/26>.

The optional tutor-language integration follows OpenAI’s guidance for schema-constrained [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). The application applies additional domain validation and never accepts model-authored arithmetic.

## Contest note

This project was created during the challenge entry period beginning August 27, 2026. The contest rules assign ownership of a submitted entry to Nerdy and require eligibility, originality, licensing, and AI-assistance disclosures. Review the official rules before submitting: <https://hackathon.nerdy.com/terms>.
