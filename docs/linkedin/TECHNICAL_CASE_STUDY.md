# Technical case study — draft

## Problem

Long passages of dense educational text can be difficult to sustain. The project investigates visual, step-based learning for therapeutic-exercise concepts.

## Solution and architecture

Existing static lesson pages declare metadata and timed beats. A shared JavaScript engine draws SVG scenes, presents question cards and synchronizes captions to browser media playback. Built supplemental pages provide an atlas, sandbox, review cards and a web glossary. Progress uses LocalStorage. Python serves byte ranges and supports authoring; no server-side learner account is required.

## Contribution

The owner defined requirements, product concept, learning architecture and interaction design, organized content, coordinated AI-assisted development and validated interface behavior. Papermorph-derived components retain their MIT notice; all code is not represented as manually written by the owner.

## Verification and limits

The full candidate contains 253 lesson directories. Static syntax checks cover 528 JavaScript blocks/files. Browser and media checks report their actual coverage separately in the delivery. File counts do not prove educational correctness. Mobile text scaling, selected reduced-motion behavior, synthetic narration provenance and hosted LFS playback require explicit consideration. The project has no clinical certification or complete accessibility-conformance claim.

## Release discipline

Interactive source is isolated from the separate local publishing workflow. Public materials need a provenance map, retained third-party notices and permitted screenshots. A clean candidate history does not erase other branches in an existing repository.
