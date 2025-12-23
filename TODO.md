# Task: Implement match start flow with create or join option and umpire control

## Completed steps:

- Created LandingPage component to ask user "Create Match" or "Join Match".
- Updated routing in App.tsx to use LandingPage at "/" route.
- Kept "/create-match" route pointing to Index.tsx for create match + dashboard flow.
- Verified Index.tsx conditional rendering between MatchCreation and MatchDashboard.
- JoinMatchPage and LivePage routes remain unchanged.

## Pending steps:

- Thoroughly test the following flows locally:
  1. LandingPage opens at "/".
  2. "Create Match" redirects to "/create-match" showing create match form.
  3. Match creation completes, redirects to umpire control (dashboard).
  4. Umpire authentication and scoring updates work correctly.
  5. "Join Match" redirects to "/join-match" and allows joining existing match.
  6. Joining match redirects to live view page with match details.
  7. Navigation back to landing or create new match works properly.

- Confirm UI/UX for LandingPage buttons and navigation is intuitive.
- Check persistent state in localStorage for match session.
- Validate that all routing paths are functioning as expected.
- Fix any issues or edge cases uncovered during testing.

## Notes:

- No changes made to umpire authentication and scoring logic (MatchDashboard).
- No changes to JoinMatchPage and LivePage.

---

After validation, this task can be marked complete.
