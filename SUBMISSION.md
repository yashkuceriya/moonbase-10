# Moonbase 10 — submission kit

## What did you build?

Moonbase 10 is an adaptive K–5 math adventure where every mistake maps the learner’s next mission. Instead of simply marking an answer wrong, ORBIT interprets the selected distractor, identifies a likely misconception, applies a BKT-inspired evidence update, and reroutes the learner into a short visual bridge. The learner then returns to the same goal with just enough support to succeed.

The working prototype includes 12 authored mission variants: Build, Connect, and Transfer levels for equal groups, regrouping, fractions of sets, and subtraction across ten. Independent evidence fades support; scaffolded recovery is recorded without pretending it was independent. A parent/teacher Learning Map makes every adaptation explainable as a signal → decision → next-step trace. ORBIT Tutor Copilot then proposes a three-move Socratic plan, lets a human choose the support level, and changes the learner route only after explicit approval.

I built it with React and TypeScript as a responsive Cloudflare Worker application. The learner model is transparent: the current prototype uses explicit, hand-set parameters rather than claiming calibration it does not have. Automated core-content checks verify that each mission answer matches its mathematical representation and every primary distractor has a misconception hypothesis. The optional OpenAI layer uses Structured Outputs only for tutor-facing language; validation blocks numerical answer leakage and diagnostic claims, and an authored fallback keeps the entire demo operational without an API key. The learning design is grounded in U.S. Institute of Education Sciences guidance on visual representations, systematic instruction, and progress monitoring. Next I would calibrate the model with consented pilot data, expand the curriculum graph, and test accessibility and learning transfer with learners, tutors, and families.

**Required disclosure:** I used OpenAI Codex for product ideation, implementation assistance, copy refinement, and test generation, and OpenAI image generation for the original social-preview illustration and derived favicon. When configured, the Tutor Copilot calls the OpenAI Responses API to refine tutor-facing Socratic language; the API never authors or scores learner-facing arithmetic, requests `store: false`, and has a verified local fallback. Open-source software and licenses are listed in `THIRD_PARTY.md`; the primary components are React/React DOM, Vinext, Vite, Cloudflare tooling, TypeScript, and ESLint under MIT and/or Apache-2.0 licenses. I used no real student data, personal information, biometric identification, or third-party copyrighted media.

## Demo-video script (2:45 target)

### 0:00–0:18 — Hook

> Most math apps learn only when a child is right. Moonbase 10 learns from the mistake. It is an adaptive K–5 math adventure where every answer changes what happens next.

Show the Mission 04 screen. Keep the array and ORBIT panel visible.

### 0:18–0:48 — Create a meaningful near miss

> Nova needs to power the lunar habitat with six rows of four solar cells. I’m going to choose 20—a plausible answer that counts only five rows.

Choose **20**.

> ORBIT does not say “try again.” It classifies the reasoning pattern: the final equal group was dropped. It holds the learning goal steady and changes the size of the leap.

### 0:48–1:22 — Show the adaptation loop

Open the learning detour.

> The next twenty seconds become a smaller, visual bridge: three rows of four, connected to repeated addition.

Choose **12**, then choose **24** on the restored full mission.

> Support fades immediately, Nova retries the original problem, and ORBIT labels the success as scaffolded rather than independent. Productive struggle earns progress instead of a penalty.

### 1:22–2:15 — Show Human + AI supervision

Open **Learning map**.

> Under the hood, meaningful distractors feed a misconception map, and a BKT-inspired update changes the estimate for that skill. The parameters are visible and uncalibrated. Now the tutor chooses Transfer and asks ORBIT Copilot for a Socratic co-plan.

Choose **Transfer**, then **Create tutor co-plan**.

> OpenAI can refine the tutoring language through a strict schema, but it never controls the math. Every mission is authored and tested, unsafe output falls back locally, and nothing reaches Nova until a tutor approves it.

Approve the plan and launch the tutor-approved mission.

### 2:15–2:42 — Establish rigor and fit

> Twelve working mission variants cover four foundational skills. The AI layer sends no learner name, cannot leak an answer into the mission, and the full experience works without an API key. This is Live plus AI as a product loop: evidence, recommendation, human judgment, then action.

### 2:42–2:55 — Close

> Next, I would calibrate the model with consented pilot data and let a live tutor pick up exactly where ORBIT found friction. Moonbase 10: every mistake maps the next mission.

End on the Learning Map or return to the hero.

## Recording checklist

- Reset the demo before recording.
- Record at 1440 × 900 or 1920 × 1080 with browser zoom at 90–100%.
- Keep the pointer slow and deliberate; do not show private tabs, notifications, or personal data.
- Use the deterministic path: **20 → detour → 12 → 24 → Learning map**.
- Keep the final cut under three minutes; judges are not required to watch beyond that.
- Add captions and verify the live URL in a private window before submission.
- Submit early enough to replace the entry if a link or video needs correction.

## Submission fields

- **Prompt:** K–5 Math Game
- **Demo video:** add the final Loom, YouTube, Drive, or Vimeo link
- **Code repo:** add the public or judge-accessible repository URL
- **Live demo:** add the deployed Sites URL
- **Description:** use the “What did you build?” text above, including the disclosure paragraph
