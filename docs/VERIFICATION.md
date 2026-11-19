# Candidate verification

Static inventory: 253 lessons; 4350 site files; 907 content files. 528 JavaScript syntax units checked. No missing static HTML references and no content-JSON parse failures were found in that scan.

Current browser record: 253/253 lessons without captured page/scene errors; 3503 evaluated scenes; 26/26 passing sampled control checks. Earlier attempts are retained privately. Final reports must distinguish transient network/load failures from repeatable defects.

Audio inventory: 3503 required MP3 clips; 3467 unique runtime payloads. All required clips decoded and matched timing durations within 0.15 seconds in this audit; no silent runtime clips or mismatched indexed pointers were found. The cache for ch204/finish needs provenance review. Thirteen temporary hidden MP3s were excluded from the candidate. The final private audio audit contains per-file OIDs and cache findings. These checks do not establish that every spoken word is correct.

An independent local clone was verified file by file, with 3,503 MP3 payloads hydrated from objects freshly downloaded from GitHub. Lessons 001, 127 and 253 and the existing player end-to-end test passed from that clone. All 253 lessons and 3,503 scene states passed the full browser sweep after the isolated draw-helper correction. A GitHub media URL returned 206 Partial Content and played/seeks successfully in Chromium for one existing clip. This is not proof of a deployed GitHub Pages website. A fresh clone of the final published branch is verified separately in the final delivery. No WCAG, clinical or complete educational acceptance is asserted.
