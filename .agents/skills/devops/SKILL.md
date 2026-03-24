---
name: devops-preferences
description: Guidelines and preferences for writing DevOps scripts, CI/CD, and infrastructure config for this workspace.
---

# DevOps & Infrastructure Guidelines

When working on DevOps, CI/CD, scripting, or infrastructure tasks for this project, adhere strictly to the following principles based on the workspace's established engineering profile.

## 1. Keep It DRY & Simple

- **Minimal Boilerplate**: Avoid over-engineering. Re-use existing automation inside the `package.json` scripts or `bin/` directory rather than creating new, disconnected tools.

- **Environment Variables**: Rely on simple `.env.local` and `.env.production` files for environment separation. Ensure any new environment variables required by scripts or the application are documented or safely stubbed.

- **Strict Configuration & Infrastructure as Code**: Avoid side-effects to the platform that are not managed via code (e.g., do not make manual changes via platform dashboards or ad-hoc CLI commands). If any platform or infrastructure setting needs to change, it **must go through source control**. This ensures full version history, clear audit trails, and allows other developers to review and understand the changes. For example, use Supabase migration files as the strict single source of truth for schema state rather than modifying tables in the Supabase UI.

## 2. Local Developer Experience (DX)

- **Tight Feedback Loops**: Write tools that provide immediate, actionable feedback to the developer.

- **Deep System Integration**: Where appropriate, integrate with native OS features (such as macOS `osascript` notifications) to alert the user of long-running job completions (e.g., CI/CD runs, heavy data migrations).

- **CLI Native**: Utilize the GitHub CLI (`gh`) for querying and watching pipeline statuses locally instead of forcing context-switches to the browser.

## 3. Style & Tone for Shell Scripts

- **Playful Output**: Add personality to terminal output! Utilize appropriate emojis and kaomojis (e.g., `(っ＾▿＾)💨`, `(╯°□°)╯︵ ┻━┻`) for success and error states. Terminal output shouldn't be sterile.

- **Clear Stepped Logging**: Always provide clear, step-by-step console logs with iconography (like ⏳, 🚀, ✅, ❌) so the developer knows exactly which phase a script is in.

- **Fail Fast**: Scripts must exit immediately on errors (using `set -e` or explicitly checking exit codes) and should output clear, actionable error messages before dying.

## 4. Scripting Environment
- Prefer `#!/usr/bin/env bash` for standalone local scripts.
- Ensure scripts are made executable (`chmod +x`).
- Do not write overly complex bash when a short Node script would be safer or strictly typed.

## Example Good Implementation:
```bash
#!/usr/bin/env bash
set -e

echo "⏳ Starting deployment check..."

# Fetch workflow status...
if ! gh run watch "$RUN_ID"; then
  echo "❌ CI/CD Pipeline Failed! (╯°□°)╯︵ ┻━┻"
  osascript -e 'display notification "Pipeline failed!" with title "System Alert ⚠️"'
  exit 1
fi

echo "✅ CI/CD Pipeline Deployed Successfully! (っ＾▿＾)💨"
osascript -e 'display notification "Deployed to Production! ✅" with title "Success 🚀"'
```
