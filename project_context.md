

## Platform Requirements

### Target Platforms
1. **Mobile** (Primary)
   - iOS (via React Native)
   - Android (via React Native)

2. **Web** (Future)
   - Desktop browsers
   - Mobile browsers

### Platform Independence Principle
> **CRITICAL:** Each UI platform (mobile, web) must be completely independent from others. Different teams should be able to work on each platform without conflicts.

---

## Architecture Principles

### 1. Code Reusability
- **Shared Components:** Create reusable TSX components that work across platforms
- **No Code Duplication:** Extract common logic into shared modules
- **Platform-Specific Overrides:** Allow platform-specific implementations when needed

### 2. Independence
- **Frontend Projects:** Separate projects for mobile and web
- **Backend:** Single unified backend serving all platforms via REST API/WebSocket
- **No Cross-Dependencies:** Platforms should not depend on each other

### 3. Component Structure
```
shared/
  ├── components/     # Reusable UI components
  ├── hooks/          # Reusable React hooks
  ├── utils/          # Utility functions
  ├── types/          # TypeScript types
  └── api/            # API client logic

mobile/
  ├── screens/        # Mobile-specific screens
  ├── navigation/     # Mobile navigation
  └── App.tsx         # Mobile entry point

web/
  ├── pages/          # Web-specific pages
  ├── routing/        # Web routing
  └── App.tsx         # Web entry point
```

---

## Coding Standards & Best Practices

### Modularity
- **One Responsibility:** Each file should have a single, clear purpose
- **File Length:** Keep files under 300 lines; refactor if longer
- **Function Size:** Functions should be small (ideally < 50 lines)
- **Component Complexity:** Break complex components into smaller sub-components

### Clean Code Principles
1. **DRY (Don't Repeat Yourself)**
   - Extract repeated code into reusable functions/components
   - Use shared utilities and hooks
   - Avoid copy-paste programming

2. **Descriptive Naming**
   - Use clear, self-documenting names
   - Functions: `getUserProfile()`, not `getData()`
   - Variables: `isAuthenticated`, not `flag`
   - Components: `TutoringSessionCard`, not `Card1`

3. **Small Functions**
   - Each function does one thing well
   - Easy to test and understand
   - Maximum 3-4 parameters

4. **Separation of Concerns**
   - Business logic in hooks/services
   - UI logic in components
   - API calls in adapters
   - State management in stores

5. **Avoid Prop Drilling**
   - Use Zustand stores for global state
   - Use React Context for shared data
   - Pass props maximum 2-3 levels deep
   - If drilling more than 3 levels, refactor to use state management
   - Example:
     ```typescript
     // ❌ BAD: Prop drilling
     <Parent user={user}>
       <Child user={user}>
         <GrandChild user={user}>
           <GreatGrandChild user={user} />
         </GrandChild>
       </Child>
     </Parent>

     // ✅ GOOD: Use Zustand store
     const user = useUserStore(state => state.user);
     ```

### Code Organization
```typescript
// ✅ GOOD: Small, focused file
// components/Button.tsx (50 lines)
export const Button = ({ onClick, children }) => {
  return <button onClick={onClick}>{children}</button>;
};

// ✅ GOOD: Extracted logic
// hooks/useTutorSession.ts (80 lines)
export const useTutorSession = (sessionId: string) => {
  // Session logic here
};

// ❌ BAD: Everything in one file (500+ lines)
// TutoringSession.tsx - contains UI, logic, API calls, state
```

### File Structure Guidelines
- **Components:** 50-150 lines max
- **Hooks:** 50-200 lines max
- **Services:** 100-300 lines max
- **Utilities:** 50-100 lines per function file

### Testing Requirements
- Unit tests for all shared components
- Unit tests for all hooks
- Integration tests for critical flows
- E2E tests for main user journeys

### Security-First Design
- Never commit API keys or secrets
- Validate all user inputs
- Sanitize data before rendering
- Use environment variables for config
- Implement proper authentication/authorization

### Version Control
- Meaningful commit messages
- Small, focused commits
- Feature branches for new work
- Code review before merging

### Documentation
- JSDoc comments for public APIs
- README in each major directory
- Inline comments for complex logic only
- Keep documentation up-to-date

---

