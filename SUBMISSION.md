# Moonbase 10 — submission kit

## What did you build?

Moonbase 10 is an adaptive K–5 math adventure where every mistake maps the learner’s next mission. Instead of simply marking an answer wrong, ORBIT interprets the selected distractor, identifies a likely misconception, applies a BKT-inspired evidence update, and reroutes the learner into a short visual bridge. The learner then returns to the same goal with just enough support to succeed.

The working prototype includes 12 authored missions and 12 separate new-number checks for equal groups, regrouping, fractions of sets, and subtraction across ten. The learner recovers the original problem, then can test the same strategy in a different context. First-attempt transfer and scaffolded recovery are recorded separately; replay cannot earn fresh mastery or rewards. A Learning Map explains each decision. ORBIT Tutor Copilot proposes a Socratic plan and lets a human choose and approve the next mission.

I built it with React and TypeScript as a Cloudflare Worker application. The BKT-inspired model uses explicit, hand-set parameters and is not calibrated on learner data. Automated tests verify arithmetic, evidence handling, and the server API. Optional OpenAI Structured Outputs refine tutor-facing language; additional checks reject numbers and known diagnostic terms, while authored coaching handles missing configuration, refusal, timeout, or connection failure. Human review remains necessary. The learning design draws on U.S. Institute of Education Sciences guidance. Next I would seek educator review, evaluate usability with appropriate consent, and measure delayed retention before making any learning-outcome claim.

**Required disclosure:** I used OpenAI Codex for product ideation, implementation assistance, copy refinement, and test generation, and OpenAI image generation for the original social-preview illustration and derived favicon. When configured, the Tutor Copilot calls the OpenAI Responses API to refine tutor-facing Socratic language; the API never authors or scores learner-facing arithmetic, requests `store: false`, and has a verified local fallback. Open-source software and licenses are listed in `THIRD_PARTY.md`; the primary components are React/React DOM, Vinext, Vite, Cloudflare tooling, TypeScript, and ESLint under MIT and/or Apache-2.0 licenses. I used no real student data, personal information, biometric identification, or third-party copyrighted media.

## Demo-video script (2:45 target)

### 0:00–0:18 — Hook

> Can a learner use a strategy after the hint is gone? Moonbase 10 turns a mistake into a visual bridge, then checks the strategy with different numbers.

Show the Mission 04 screen. Keep the array and ORBIT panel visible.

### 0:18–0:48 — Create a meaningful near miss

> Nova needs to power the lunar habitat with six rows of four solar cells. I’m going to choose 20—a plausible answer that counts only five rows.

Choose **20**.

> ORBIT treats this as a possible missing-group pattern and chooses a smaller visual step. That is a hypothesis for the tutor to check.

### 0:48–1:15 — Show the adaptation loop

Open the learning detour.

> The next twenty seconds become a smaller, visual bridge: three rows of four, connected to repeated addition.

Choose **12**, then choose **24** on the restored full mission.

> Support fades immediately, Nova retries the original problem, and ORBIT labels the success as scaffolded rather than independent. Productive struggle earns progress instead of a penalty.

### 1:15–1:45 — Check the strategy

Choose **35** on the new-number challenge: five trays of seven seedlings.

> Recovering six times four could mean remembering the answer. Here, Nova applies the strategy to a different problem. The map records this first attempt separately. Repeating either question cannot add fresh mastery or rewards. This is immediate transfer evidence, not a claim of lasting learning.

### 1:45–2:25 — Show Human + AI supervision

Open **Learning map**.

> Under the hood, meaningful distractors feed a misconception map, and a BKT-inspired update changes the estimate for that skill. The parameters are visible and uncalibrated. Now the tutor chooses Transfer and asks ORBIT Copilot for a Socratic co-plan.

Choose **Transfer**, then **Create tutor co-plan**.

> The source label tells us how this plan was made. The verified engine works now; an optional OpenAI integration can refine the tutor language when configured. The learner questions stay authored and tested. A human approves the changed route.

Approve the plan and launch the tutor-approved mission.

### 2:25–2:42 — Establish rigor and fit

> Twelve missions and twelve new-number checks cover four foundational skills. The prototype makes its assumptions visible and uses fictional demo data. Tutor decisions connect directly to the learner's next activity.

### 2:42–2:55 — Close

> Next, I would calibrate the model with consented pilot data and let a live tutor pick up exactly where ORBIT found friction. Moonbase 10: every mistake maps the next mission.

End on the Learning Map or return to the hero.

## Recording checklist

- Reset the demo before recording.
- Record at 1440 × 900 or 1920 × 1080 with browser zoom at 90–100%.
- Keep the pointer slow and deliberate; do not show private tabs, notifications, or personal data.
- Use the deterministic path: **20 → detour → 12 → 24 → 35 on the new-number check → Learning map**.
- Describe the actual source label on screen. Do not claim a live OpenAI response when the plan says ORBIT verified plan.
- Keep the final cut under three minutes; judges are not required to watch beyond that.
- Add captions and verify the live URL in a private window before submission.
- Submit early enough to replace the entry if a link or video needs correction.

## Submission fields

- **Prompt:** K–5 Math Game
- **Demo video:** add the final Loom, YouTube, Drive, or Vimeo link
- **Code repo:** add the public or judge-accessible repository URL
- **Live demo:** add the deployed Sites URL
- **Description:** use the “What did you build?” text above, including the disclosure paragraph
