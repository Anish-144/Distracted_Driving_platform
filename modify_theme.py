import re

with open("frontend/src/styles/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

tokens = """
/* ─── Semantic Theme Tokens ────────────────────────────────────────────────── */
:root {
  /* Light Mode (Base) */
  --bg-primary: #f9fafb;     /* gray-50 */
  --bg-secondary: #ffffff;   /* white */
  --bg-tertiary: #f3f4f6;    /* gray-100 */
  --bg-app-shell: #f3f4f6;   /* gray-100 */

  --text-primary: #111827;   /* gray-900 */
  --text-secondary: #4b5563; /* gray-600 */
  --text-muted: #9ca3af;     /* gray-400 */

  --border-subtle: rgba(0, 0, 0, 0.05);
  --border-strong: rgba(0, 0, 0, 0.1);

  --card-bg: rgba(255, 255, 255, 0.95);
  --card-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02);
  --card-shadow-hover: 0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
  --card-border: rgba(0,0,0,0.08);

  --input-bg: rgba(0, 0, 0, 0.03);
  --input-border: rgba(0, 0, 0, 0.1);
  --input-text: #111827;
  --input-placeholder: #9ca3af;

  --overlay-light: rgba(255,255,255,0.7);
  --overlay-heavy: rgba(255,255,255,0.9);
}

.dark {
  /* Cinematic Dark Mode */
  --bg-primary: #0d1527;     /* surface-800 */
  --bg-secondary: #080e1c;   /* surface-900 */
  --bg-tertiary: #040812;    /* surface-950 */
  --bg-app-shell: #040812;

  --text-primary: #ffffff;   
  --text-secondary: #d1d5db; /* gray-300 */
  --text-muted: #9ca3af;     /* gray-400 */

  --border-subtle: rgba(255, 255, 255, 0.05);
  --border-strong: rgba(255, 255, 255, 0.15);

  --card-bg: rgba(12, 12, 22, 0.7);
  --card-shadow: 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
  --card-shadow-hover: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
  --card-border: rgba(255,255,255,0.1);

  --input-bg: rgba(255, 255, 255, 0.05);
  --input-border: rgba(255, 255, 255, 0.2);
  --input-text: #ffffff;
  --input-placeholder: rgba(255,255,255,0.4);

  --overlay-light: rgba(12, 12, 22, 0.7);
  --overlay-heavy: rgba(12, 12, 22, 0.95);
}
"""

css = re.sub(r"(@tailwind utilities;)", r"\1\n\n" + tokens, css)

# Replace base styles
css = re.sub(r"@apply bg-gray-50 text-gray-900 font-sans;", r"@apply bg-primary text-primary font-sans transition-colors duration-500;", css)
css = re.sub(r"@apply font-semibold text-gray-900 leading-tight;", r"@apply font-semibold text-primary leading-tight;", css)

# Fix forms
css = re.sub(r"@apply bg-transparent border border-white/20 text-white", r"@apply bg-input border border-input text-input", css)
css = re.sub(r"placeholder-gray-500", r"placeholder-input", css)

# Fix cards
css = re.sub(r"background: rgba\(12, 12, 22, 0\.7\);", r"background: var(--card-bg);", css)
css = re.sub(r"box-shadow: 0 4px 16px rgba\(0,0,0,0\.2\), inset 0 1px 0 rgba\(255,255,255,0\.05\);", r"box-shadow: var(--card-shadow);", css)
css = re.sub(r"@apply rounded-2xl border border-white/10 p-6;", r"@apply rounded-2xl border border-card p-6;", css)

css = re.sub(r"box-shadow: 0 8px 32px rgba\(0,0,0,0\.4\), inset 0 1px 0 rgba\(255,255,255,0\.08\);", r"box-shadow: var(--card-shadow-hover);", css)
css = re.sub(r"@apply border-white/20;", r"@apply border-strong;", css)

# Fix Inputs
css = re.sub(r"@apply w-full border border-white/20 text-white rounded-xl px-4 py-3\s*placeholder-white/40 backdrop-blur-sm;", r"@apply w-full border border-input text-input rounded-xl px-4 py-3 placeholder-input backdrop-blur-sm;", css)
css = re.sub(r"background: rgba\(255, 255, 255, 0\.05\);", r"background: var(--input-bg);", css)

css = re.sub(r"@apply w-full border border-white/20 text-white rounded-lg px-3 py-2 text-sm\s*placeholder-white/40 backdrop-blur-sm;", r"@apply w-full border border-input text-input rounded-lg px-3 py-2 text-sm placeholder-input backdrop-blur-sm;", css)

# Fix Page container
css = re.sub(r"@apply min-h-screen flex flex-col bg-gray-50 text-gray-900;", r"@apply min-h-screen flex flex-col bg-primary text-primary transition-colors duration-500;", css)
css = re.sub(r"@apply text-xs font-bold uppercase tracking-\[0\.15em\] text-gray-400;", r"@apply text-xs font-bold uppercase tracking-[0.15em] text-muted;", css)

# Fix Stat Card
css = re.sub(r"@apply rounded-2xl border border-white/5 p-6;", r"@apply rounded-2xl border border-subtle p-6;", css)
css = re.sub(r"background: rgba\(255, 255, 255, 0\.02\);", r"background: var(--card-bg);", css)

with open("frontend/src/styles/globals.css", "w", encoding="utf-8") as f:
    f.write(css)

print("globals.css modified")

with open("frontend/tailwind.config.js", "r", encoding="utf-8") as f:
    tw = f.read()

tw = tw.replace("extend: {", """extend: {
      backgroundColor: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        tertiary: 'var(--bg-tertiary)',
        'app-shell': 'var(--bg-app-shell)',
        overlay: 'var(--overlay-light)',
        'overlay-heavy': 'var(--overlay-heavy)',
        input: 'var(--input-bg)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        input: 'var(--input-text)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
        card: 'var(--card-border)',
        input: 'var(--input-border)',
      },
      placeholderColor: {
        input: 'var(--input-placeholder)',
      },""")

if "darkMode:" not in tw:
    tw = tw.replace("theme: {", "darkMode: 'class',\n  theme: {")

with open("frontend/tailwind.config.js", "w", encoding="utf-8") as f:
    f.write(tw)

print("tailwind.config.js modified")
