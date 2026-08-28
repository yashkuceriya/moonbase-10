# Third-party and AI disclosure

## Generative AI assistance

- **OpenAI Codex:** product ideation, implementation assistance, learning-flow copy, CSS, documentation, and test generation. The entrant directed the work and should review and be able to explain the submitted implementation.
- **OpenAI image generation:** original `public/og.jpg` social-preview illustration. `public/favicon.png` is a resized crop derived from the same generated image.
- **Runtime:** no generative-AI API, remote model, biometric identification, voiceprint, facial recognition, analytics SDK, or real student data is used by the prototype.

## Original and public material

- Product name, interface, code, learning scenarios, and copy were created for this entry during the challenge period.
- The app uses system fonts only. It includes no third-party photos, icons, audio, video, logos, datasets, or learner records.
- Learning-design reference: U.S. Institute of Education Sciences, *Assisting Students Struggling with Mathematics: Intervention in the Elementary Grades*, <https://ies.ed.gov/ncee/wwc/practiceguide/26>.

## Open-source software

Direct production components:

| Component | Version | License |
| --- | ---: | --- |
| React | 19.2.8 | MIT |
| React DOM | 19.2.8 | MIT |
| Vinext | 1.0.0-beta.8 | MIT |

Direct build and development components:

| Component family | License |
| --- | --- |
| Cloudflare Vite plugin and Wrangler | MIT and/or Apache-2.0 |
| Vite and React plugins | MIT |
| Rolldown universal WASM binding | MIT |
| TypeScript and Node type definitions | Apache-2.0 / MIT |
| ESLint and related React, hooks, JSX accessibility, and TypeScript tooling | MIT |

The deployed Cloudflare Worker bundle does not contain native optional image-processing binaries. Project installation is configured to omit optional packages, the build uses a direct MIT-licensed universal WASM bundler binding, and the application does not use runtime image optimization. The npm lockfile records platform metadata for omitted optional packages used by dev-only Cloudflare tooling; those packages are not installed by the project configuration or present in the deployed bundle.

No source code or runtime component in the entry is intentionally licensed under GPL, LGPL, AGPL, SSPL, or another reciprocal/copy-left license.
