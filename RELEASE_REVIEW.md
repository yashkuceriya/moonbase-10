# Product and challenger review

## September 14 quality pass

Implemented nine interactive array-distractor paths across Build, Connect, and Transfer. The initial answers 10, 20, and 28 now lead to counting equal groups, restoring a missing row, and removing an extra row respectively. Row tasks are reversible and bridge answers remain disabled until the representation is correct. Supported bridge actions do not earn independent mastery credit. Other skills still have authored per-mission visual bridges, not individually branched distractor paths.

Corrected a place-value bridge whose wording asked for a number of tens but expected their value. Removed an incorrect fraction-distractor explanation. Changed the current learning-signal language to avoid diagnosing a reasoning pattern from one answer.

Browser QA on the local preview verified:

- All three initial wrong-answer routes and return to the original mission.
- Answers locked before the row task, re-locked after undo, and unlocked after the valid representation; incorrect bridge feedback remains actionable.
- Space/Enter keyboard activation and focus moving to the new bridge, restored question, and fresh-check headings.
- Supported recovery remains separate from first-attempt new-number success and failure; check buttons lock after answering.
- Learning-map evidence updates; the authored Copilot creates a reviewable plan, explicit approval queues it, and launch opens the different Transfer mission.
- At a 390px viewport the tested learner, bridge, and map screens have no document-level horizontal overflow; bridge rows have 48px touch targets.
- No browser console errors appeared during the tested flow.

The final automated checks cover lint, TypeScript, production build, four artifact/render checks and 27 behavior/content/API tests (31 total). The September 14 dependency audit reports zero known vulnerabilities. These are engineering checks, not proof of learning efficacy, comprehensive accessibility conformance, or full device coverage.

Still open: hosted OpenAI configuration is empty, so the live external-model branch has not been validated; the Site remains owner-private; no video or contest entry has been submitted. The source label must be described accurately in the recording. The three-minute script now includes the interactive missing-row task.

## September 10 review (historical)

## Review basis

The [official brief](https://hackathon.nerdy.com/) asks for intuitive math, engaging progression, and rewards for mastery. The [official rules](https://hackathon.nerdy.com/terms), checked September 10, publish no fixed weighted rubric; judges may evaluate from the video alone. Submission closes September 18 at 11:59 PM CDT. The functioning demo video must be no longer than three minutes.

## Findings addressed

| Finding | User-visible correction | Evidence |
| --- | --- | --- |
| Remembered answers could look like fresh mastery | An exposure ledger limits each mission's success and first miss to one credited observation. Returning after a miss remains recovery. | Sequence tests cover replay, repeated clicks, and leaving an unfinished question. |
| No direct check beyond the practiced item | Every mission now includes an optional new-number question in another context. Its first attempt is recorded separately in the map and tutor brief. | All 12 checks have unique options, independently checked arithmetic, and a different answer from their paired mission. |
| Delayed tutor plans could outlive their evidence or selected level | New answers, level changes, mission changes, and reset cancel and invalidate older requests. | Deferred-response test covers a transport that ignores cancellation. |
| A connection failure stopped tutor planning | The client also provides the authored local plan, retaining explicit approval. | Server fallback cases and production Worker route are covered; browser network-failure interaction remains untested. |
| Request size was checked only after buffering | Incoming bytes are counted while streaming and oversized input is cancelled. | An unbounded stream is cancelled above the limit. |
| Tutor copy was very small | Regular coaching text is now 16px, common controls at least 14px, metadata at least 12px. | Styles reviewed; browser visual and keyboard QA remains outstanding. |
| A newly listed development dependency advisory affected the image toolchain | Updated the Cloudflare plugin and Wrangler together to compatible patched releases. | [Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c); the resulting dependency audit reports zero vulnerabilities. |

## Automated release results

The final source passed lint, strict TypeScript, a production build, four packaged-artifact checks, and 24 behavior/content/API tests. The client bundle contains no OpenAI secret identifier, authorization header, or upstream API endpoint. These checks cover code and artifacts; they do not substitute for browser interaction or learner evaluation.

## Remaining evidence and submission gates

- The hosted environment has no OpenAI key. The authored Copilot works; the optional external-model branch has mocked integration coverage, not live API validation.
- The Site is still private to its owner. Judge access requires an explicit audience change before submission.
- No demo video has been recorded or submitted by this task. The updated script includes the recovery → new-number check → human approval sequence.
- No browser interaction, mobile visual, or screen-reader testing was performed in this pass. Automated checks do not establish those results.
- There is no observed learner-outcome or retention study. Educator review and consented evaluation remain future work. Do not present synthetic tests as learner results.
- Submit only after the entrant has reviewed eligibility, rights, disclosures, and the final functioning video. This review does not submit or accept contest terms on the entrant's behalf.

The immediate-transfer feature is a product hypothesis made testable, not proof that the product improves learning. The strongest demo shows that distinction honestly.
