# Interactive Therapeutic Exercise — Visual Learning Platform

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![SVG](https://img.shields.io/badge/SVG-FFB13B?logo=svg&logoColor=black)
![Python Tooling](https://img.shields.io/badge/Python-Tooling-3776AB?logo=python&logoColor=white)
![Playwright Testing](https://img.shields.io/badge/Playwright-Testing-2EAD33)
![Git LFS](https://img.shields.io/badge/Git-LFS-F05032?logo=git&logoColor=white)

## Overview

A university learning project that turns therapeutic exercise concepts into short Russian-language lessons with animated SVG scenes, interactive questions, captions and local progress tracking. The full local candidate preserves 253 existing lesson directories across 26 thematic units.

**Status: release candidate under technical and content review. Publication readiness is not established.** A lesson count measures the inventory, not medical, editorial or accessibility approval. This source package contains the interactive application only.

## Problem Statement

Dense educational prose can be difficult to follow during long reading sessions. The project explores how movement, progressive explanation and immediate knowledge checks can make complex material easier to navigate.

## Solution

Each lesson combines a timed visual explanation, short information cards and questions. Learners can revisit individual steps, change playback speed, enable captions and resume from the contents page.

## Key Features

- 253 authored lesson pages using shared JavaScript and CSS.
- Procedurally drawn SVG figures and anatomy visualizations.
- Step navigation, playback controls and keyboard shortcuts.
- Multiple question types with answer feedback.
- MP3 resources and word-mark timing metadata; see audio limitations below.
- Exercise atlas, joint sandbox, review cards and a web glossary.
- Progress stored in the current browser's `localStorage`.

## Learning Experience

Open the contents, choose a lesson, start playback and answer the questions as they appear. Use the step bar to revisit a scene. Completion and the last visited lesson are stored locally; there is no account, server database or cross-device synchronization.

## Architecture

The browser loads `index.html`, a shared player, domain drawing helpers and the lesson's `timings.js`. Each lesson declares `CHAPTER` and `BEATS`. `HTMLMediaElement.currentTime` drives the SVG timeline while audio is available; a wall-clock fallback supports missing audio. Quizzes render in a DOM overlay. Built atlas/review/glossary data are JavaScript files under `site/`; their JSON source data are used by authoring tools.

See [architecture](docs/ARCHITECTURE.md) for data flow, boundaries and maintenance commands.

## Technology Stack

HTML5, CSS3, JavaScript, SVG, browser media APIs and LocalStorage. Python provides the Range-capable local server and selected authoring tools. Playwright supplies browser checks. Git LFS stores MP3 payloads. No framework, AI inference service or translation runtime is required to run the website.

## Project Structure

```text
site/therapeutic-exercise/   # Existing website, lessons, shared engine, media and built data
content/therapeutic-exercise/ # Web lesson JSON and authoring data
authoring/therapeutic-exercise/ # Lesson map and scripts, copied from the web authoring sources
tools/serve.py             # Local HTTP server with single-range support
tools/open_lesson.py       # Optional local launcher
tools/therapeutic-exercise/ # Selected web-only authoring/testing tools
tests/                    # Standalone web verification
docs/                     # Architecture, verification and presentation drafts
LICENSES/                 # Applicable third-party software notices
```

## Installation

Requirements: Python 3.10 or later, Git, Git LFS and a modern browser.

```powershell
git clone --branch codex/interactive-portfolio https://github.com/indexdeny/-Therapeutic-Exercise.git
cd -Therapeutic-Exercise
git lfs install --local
git lfs pull
```

The candidate branch must exist before the clone command can work. Check the submission link supplied with this candidate; the original default branch may still contain a separate project. A ZIP containing approximately 130-byte MP3 pointer files is not an audio installation.

## Quick Start

```powershell
python tools/serve.py 8765
```

Open `http://127.0.0.1:8765/therapeutic-exercise/`. The server binds to loopback and serves only `site/`. It handles byte-range requests required for seeking within clips. Avoid using `file://` as the installation test.

To open a lesson with the optional launcher:

```powershell
python tools/open_lesson.py 1 --port 8765
```

## User Controls

| Control | Action |
|---|---|
| Space | Start, pause or resume |
| Left / Right | Previous or next step, outside question-specific key handling |
| Shift + Left / Right | Reach player navigation during a question |
| Step bar | Jump to a step or a position inside a non-question step |
| X | Cycle playback speed: 1, 1.25, 1.5 and 2× |
| C | Toggle captions |
| F | Toggle fullscreen |
| Home | Restart the lesson |
| ? | Show keyboard help |
| Enter / number keys | Context-dependent question actions |

## Interactive Examples

- First lesson: `/therapeutic-exercise/ch001/`.
- Middle lesson: `/therapeutic-exercise/ch127/`.
- Last lesson: `/therapeutic-exercise/ch253/`.
- Anatomy/position example: `/therapeutic-exercise/ch214/?beat=2&t=8`.
- Atlas, sandbox, review and glossary: corresponding folders under `/therapeutic-exercise/`.

Real screenshots, when cleared for sharing, are documented in [the portfolio manifest](docs/portfolio/SCREENSHOT_MANIFEST.json). They come from the actual application, not generated interface mockups.

## Verification

Install browser checks in an environment independent of any other Python project:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-qa.txt
.venv\Scripts\python -m playwright install chromium
.venv\Scripts\python tests/web_smoke.py --url http://127.0.0.1:8765/therapeutic-exercise/
.venv\Scripts\python tools/therapeutic-exercise/e2e_player.py --url http://127.0.0.1:8765/therapeutic-exercise/ch001/
```

The candidate audit parsed 4350 site files, checked 528 script blocks/files for JavaScript syntax, and loaded all content JSON. Browser results currently record 253/253 lessons without captured load/scene errors, 3503 evaluated scenes and 26/26 passing sampled control checks. These figures are mechanical checks, not full visual or medical acceptance. See [verification](docs/VERIFICATION.md) for the final scope, defects and clean-clone evidence.

## Known Limitations

- Audio is stored using Git LFS. Synthesis depends on an external Edge TTS authoring implementation that is intentionally not shipped here. Re-synthesis is not reproducible from this repository alone.
- Matching a TTS cache or decoding an MP3 does not establish spoken-content accuracy. Placeholder candidates, timing differences and audio provenance require separate review.
- GitHub Pages does not directly serve Git LFS audio. A deployment must hydrate permitted audio into a static artifact, or use a media host supporting byte ranges. Hosted playback has not been verified.
- Narrow portrait screens fit the stage but make lesson text small. Overflow checks do not establish mobile readability.
- Reduced-motion CSS covers selected interface effects; timeline-driven SVG movement remains active. No WCAG compliance is claimed.
- Progress is local to one browser/origin and can be lost when browser data are cleared.
- This university project has not received clinical or comprehensive medical/editorial validation.
- The isolated candidate initializes missing stroke-animation state in the shared draw helper; the source lesson content is unchanged. The regression and full-sweep results accompany this candidate.

## My Contribution

The project owner defined the product concept and requirements, interaction design, learning structure, content organization and accessibility-oriented decisions, coordinated AI-assisted development, and validated the interface. The work includes authored lesson logic and visualizations, together with adapted Papermorph player components. It is not represented as entirely handwritten code. The upstream MIT notice is retained in `LICENSES/Papermorph-MIT.txt`.

## Project Status

Standalone interactive candidate prepared for review. The original local workspace and its branches are outside this package. A clean source snapshot does not remove files from older GitHub branches or history. Default-branch migration and old-ref cleanup require a separately approved publication plan.

## Content Rights & Disclaimer

Educational university project. Literature is a study reference; this is not an official publisher edition or a clinically certified treatment guide. The owner declares authorship of the project-specific implementation and learning design. No written publisher permission is asserted. Copyright in third-party literature and assets remains with the respective owners; unresolved material must be withheld from a general public release pending review. No blanket open-source license is granted over the educational corpus by these software notices.

Reference: Kisner, C., Colby, L. A., & Borstad, J. *Therapeutic Exercise: Foundations and Techniques*, 7th edition. F. A. Davis. [Publisher](https://www.fadavis.com/).

The material does not replace an individual assessment by a physician or physiotherapist. Exercise selection requires consideration of contraindications and individual circumstances. No individual treatment advice is provided.

[Git LFS and GitHub Pages limitations](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage) · [Publisher permissions information](https://fadsupport.happyfox.com/kb/article/32-permissions-faq/).
