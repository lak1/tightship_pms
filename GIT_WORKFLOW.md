# Git Workflow & Branch Strategy

## Current Setup ✅

### Branching Model
We're using **Feature Branch Workflow** - each major feature gets its own branch for review before merging to main.

```
main (production-ready)
  ├── feature/menu-designer-enhancement (✅ COMPLETE - Ready for review)
  └── feature/loyverse-phase-2-3-data-sync (🔄 IN PROGRESS - Current work)
```

---

## Branch Status

### ✅ Completed & Ready for Review

#### `feature/menu-designer-enhancement`
**Status:** Pushed to GitHub, ready for testing/review
**Commits:** 1 commit, 15,291 insertions, 53 files
**Pull Request:** https://github.com/lak1/tightship_pms/pull/new/feature/menu-designer-enhancement

**What's in it:**
- All 5 phases of menu designer enhancement
- 50+ professional templates
- Advanced design tools (layers, alignment, drawing, shapes)
- Color palette manager with harmonies
- Image editor with filters
- Performance optimizations
- Version history & comments
- Database schema changes (7 tables)

**To Review:**
```bash
# View the changes
git checkout feature/menu-designer-enhancement
git log main..HEAD --oneline

# Test the application
npm run dev
# Navigate to /design-editor

# If approved, merge to main:
git checkout main
git merge feature/menu-designer-enhancement
git push origin main
```

---

### 🔄 In Progress

#### `feature/loyverse-phase-2-3-data-sync`
**Status:** Active development
**Branch:** Current working branch

**Planned work:**
- Product import from Loyverse
- Category sync
- Price sync
- Two-way sync capability
- Sync UI dashboard

**Will commit when complete and push for review**

---

## Workflow Process

### For Each New Feature:

1. **Start from main**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/descriptive-name
   ```

3. **Work and commit regularly**
   ```bash
   # Make changes...
   git add .
   git commit -m "feat: description"
   ```

4. **Push for review when done**
   ```bash
   git push -u origin feature/descriptive-name
   ```

5. **Review & test**
   - Test the branch locally
   - Review code changes
   - Check functionality

6. **Merge when approved**
   ```bash
   git checkout main
   git merge feature/descriptive-name
   git push origin main

   # Optional: Delete merged branch
   git branch -d feature/descriptive-name
   git push origin --delete feature/descriptive-name
   ```

---

## Upcoming Branches

### Planned feature branches in order:

1. ✅ `feature/menu-designer-enhancement` (COMPLETE)
2. 🔄 `feature/loyverse-phase-2-3-data-sync` (IN PROGRESS)
3. ⏳ `feature/deliveroo-integration` (Week 2)
4. ⏳ `feature/ubereats-integration` (Week 3)
5. ⏳ `feature/infrastructure-queue-email` (Week 4)
6. ⏳ `feature/homepage-polish` (Week 5)
7. ⏳ `feature/team-management` (Week 5)
8. ⏳ `feature/justeat-integration` (Week 6 - optional)

---

## Commit Message Convention

We're using **Conventional Commits** for clear history:

### Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Build/tooling changes

### Examples:
```bash
feat(loyverse): Add product import from API
fix(auth): Correct OAuth token refresh logic
docs(readme): Update setup instructions
refactor(sync): Extract sync logic to service
```

---

## Current State

### Main Branch
- **Status:** Clean, all changes committed
- **Latest:** Initial app setup
- **Production-ready:** No (needs features merged)

### Active Work
- **Branch:** `feature/loyverse-phase-2-3-data-sync`
- **Focus:** Complete Loyverse integration (Phase 2-3)
- **ETA:** Week 1 complete

---

## Review Process

### Before Merging to Main:

**Checklist:**
- [ ] All code committed with clear messages
- [ ] Branch pushed to GitHub
- [ ] Feature tested locally
- [ ] No console errors
- [ ] Database migrations run successfully
- [ ] Code reviewed (self-review or peer review)
- [ ] Documentation updated if needed

### How to Review a Branch:

```bash
# Fetch all branches
git fetch origin

# Switch to the branch
git checkout feature/branch-name

# Run the app
npm run dev

# Test the feature thoroughly

# If issues found:
# - Note them down
# - Request fixes
# - Wait for updates

# If approved:
git checkout main
git merge feature/branch-name
git push origin main
```

---

## Emergency Fixes

For critical production bugs that need immediate fixing:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug-description

# Fix the bug
# ... make changes ...

# Commit and push
git add .
git commit -m "fix: critical bug description"
git push origin hotfix/critical-bug-description

# Merge immediately
git checkout main
git merge hotfix/critical-bug-description
git push origin main
```

---

## Branch Protection (Future)

When ready for production, consider:

1. **Protect main branch**
   - Require pull request reviews
   - Require status checks to pass
   - Enforce linear history

2. **Set up CI/CD**
   - Run tests on every PR
   - Deploy previews for feature branches
   - Auto-deploy main to production

3. **Code reviews**
   - At least 1 approval required
   - Address all comments before merging

---

## Quick Reference

### Common Commands

```bash
# See current branch
git branch

# See all branches (including remote)
git branch -a

# Switch branch
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# Pull latest changes
git pull origin main

# Push current branch
git push origin current-branch-name

# See what changed
git status
git diff

# See commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git restore .
```

---

## Integration with Claude Code

Claude will:
1. Create feature branches for each major piece of work
2. Commit regularly with clear messages
3. Push branches when features are complete
4. Wait for your review/approval before merging
5. Keep you informed of branch status

You can:
- Review branches on GitHub
- Test branches locally
- Request changes
- Approve and merge when ready

---

## Next Steps

### Current Priority:
1. Complete Loyverse Phase 2-3 on `feature/loyverse-phase-2-3-data-sync`
2. Push for review when done
3. Test with your fish & chips customer
4. Merge to main if approved
5. Move to Deliveroo integration

### Menu Designer Branch:
- Ready for your review whenever you want to test it
- Can merge independently of Loyverse work
- No conflicts expected

---

## Questions?

**Q: Can I work on main while Claude works on feature branches?**
A: Yes! As long as you don't modify the same files, there won't be conflicts.

**Q: What if I need to make a quick fix while Claude is working?**
A: Make your fix on main, commit, push. Claude will pull the changes when switching branches.

**Q: How do I see what's different in a branch?**
A: `git diff main..feature/branch-name`

**Q: Can I test multiple feature branches?**
A: Yes! Just switch between them: `git checkout feature/branch-1`, test, then `git checkout feature/branch-2`, test.

**Q: What if I want Claude to stop working on a feature?**
A: Just say so! Claude can commit current work, push the branch, and switch to something else.

---

Ready to continue with Loyverse integration! 🚀
