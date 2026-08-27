# Moonbase 10 — submission kit

## What did you build?

Moonbase 10 is an adaptive K–5 math adventure where every mistake maps the learner’s next mission. Instead of simply marking an answer wrong, ORBIT interprets the selected distractor, identifies a likely misconception, updates a Bayesian knowledge trace, and reroutes the learner into a 20-second visual bridge. The learner then returns to the same goal with just enough support to succeed.

The working prototype includes four missions covering equal groups, regrouping, fractions of sets, and subtraction across ten. A parent/teacher Learning Map makes every adaptation explainable as a signal → decision → next-step trace. The experience runs without an account or API key and collects no student data.

I built it with React and TypeScript as a responsive Cloudflare Worker application. The learning design is grounded in U.S. Institute of Education Sciences guidance on visual representations, systematic instruction, and progress monitoring. Next I would calibrate the knowledge model with consented pilot data, expand the curriculum graph, add tutor handoff, and test accessibility with learners and families.

**Required disclosure:** I used OpenAI Codex for product ideation, implementation assistance, copy refinement, and test generation, and OpenAI image generation for the original social-preview illustration and derived favicon. The runtime does not call a generative-AI service. Open-source software and licenses are listed in `THIRD_PARTY.md`; the primary components are React/React DOM, Vinext, Vite, Tailwind CSS, Cloudflare tooling, TypeScript, and ESLint under MIT and/or Apache-2.0 licenses. I used no real student data, personal information, biometric identification, or third-party copyrighted media.

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

> Support fades immediately, Nova retries the original problem, and ORBIT records mastery after scaffolded—not independent—success. Productive struggle earns progress instead of a penalty.

### 1:22–2:05 — Prove the AI is product, not decoration

Open **Learning map**.

> Under the hood, meaningful distractors feed a misconception graph, and a Bayesian knowledge-tracing model updates mastery by skill. A policy selects the next representation and difficulty. The family or tutor can see the exact signal, decision, and next move—no black box and no wall of scores.

Point to the updated insight, skill constellation, and adaptation trace.

### 2:05–2:34 — Establish rigor and fit

> The four working missions cover arrays, place-value regrouping, fractions of sets, and subtraction across ten. The design uses evidence-based visual representations and progress monitoring, and it mirrors Nerdy’s strength in adaptive practice, session intelligence, and expert handoff. It needs no login or API key and collects no student data.

### 2:34–2:45 — Close

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
