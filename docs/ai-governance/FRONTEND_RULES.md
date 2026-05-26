# FRONTEND_RULES.md — SafeDrive AI Frontend Governance

---

## Tech Stack
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript
- **State**: Redux Toolkit (global) + React `useState` (local)
- **Styling**: Tailwind CSS + custom glassmorphism classes

## Architectural Rules

### 1. State Management (Redux)
Redux is the single source of truth for cross-component state.
- **Slices**: `auth`, `session`, `progress`, `ai`.
- **Rule**: Never manage simulation session state or AI observability data in local component state.
- **Hooks**: Always use the typed hooks `useAppDispatch` and `useAppSelector` from `src/store/index.ts`. Never use raw `useDispatch`.

### 2. API Communication
- All API calls must go through the dedicated modules in `src/api/` (e.g., `api/lessons.ts`, `api/ai.ts`).
- **Rule**: Never call `fetch()` or `axios.get()` directly inside a React component.
- The base `api/client.ts` automatically injects the JWT auth token.

### 3. Glassmorphism Design System
SafeDrive AI uses a premium, research-grade dark theme heavily reliant on glassmorphism.
- **Base Classes**: Use `bg-white/5`, `backdrop-blur-md`, `border`, `border-white/10` for standard cards.
- **Hover States**: Always include subtle hover transitions (e.g., `hover:bg-white/10 transition-colors`).
- **Rule**: Never use flat, opaque backgrounds in the main dashboard unless explicitly designed. The interface should feel immersive.

### 4. Component Structure
- **Pages**: Files in `src/pages/` should primarily handle data fetching (via `useEffect` and Redux thunks) and layout composition.
- **Components**: UI elements (buttons, cards, specific data visualizations) should be extracted.
- **Animations**: Use the custom `ScrollReveal` component for smooth fade-up entrances.

### 5. Type Safety
- Frontend interfaces MUST exactly match the Backend Pydantic models.
- Pay close attention to `snake_case` vs `camelCase`. The backend returns `snake_case`. Map it correctly.
- **Rule**: Never use `any`.

### 6. Simulation UI
The simulation UI (`pages/simulation/index.tsx`) is extremely state-sensitive.
- Unmounting the component MUST clean up all active timers/intervals.
- The transition between "Active" and "Feedback" states must be atomic to prevent race conditions where a user interacts twice.
