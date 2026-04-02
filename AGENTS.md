# CRM — instructions for the AI agent

This workspace uses **Superpowers-style workflow skills** stored under `.cursor/skills/`. They guide structured work: brainstorming → plans → execution → verification → finishing.

## Always do this first

1. Read **using-superpowers** so you know how to discover and apply skills.
2. If a skill might apply (even slightly), **Read** that skill’s `SKILL.md` before acting.
3. **User messages override** everything below.

## Included by reference

@.cursor/skills/using-superpowers/SKILL.md

@.cursor/skills/references/cursor-tools.md

## Where things live

| What | Path |
|------|------|
| Skills | `.cursor/skills/<skill-name>/SKILL.md` |
| Tool name cheat sheet | `.cursor/skills/references/cursor-tools.md` |
| Specs (when you create them) | e.g. `docs/specs/` — create as needed |
| Plans (when you create them) | e.g. `docs/plans/` — create as needed |

## Quick map

- **New feature / behavior change** → `brainstorming` → `writing-plans` → `executing-plans` (+ `test-driven-development`, `verification-before-completion`, `code-review`, `finishing-work` as needed)
- **Bug / failure** → `systematic-debugging`
- **Claiming done** → `verification-before-completion`
- **Authoring new skills** → `writing-skills`
