import { query } from "./_generated/server";
import { internal } from "./_generated/api";

// Get user balances
export const getUserBalances = query({
  handler: async (ctx) => {
    // Get current user information
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    /* ───────────── 1‑to‑1 expenses (no groupId) ───────────── */
    // Filter expenses to only include 1-to-1 expenses where user is involved
    const expenses = (await ctx.db.query("expenses").collect()).filter(
      (e) =>
        !e.groupId && // 1‑to‑1 only
        (e.paidByUserId === user._id ||
          e.splits.some((s) => s.userId === user._id))
    );

    /* Initialize balance tracking variables and objects */
    let youOwe = 0;
    let youAreOwed = 0;
    const balanceByUser = {};

    // Process each expense to calculate balances
    for (const e of expenses) {
      const isPayer = e.paidByUserId === user._id;
      const mySplit = e.splits.find((s) => s.userId === user._id);

      // If user paid the expense, calculate how much others owe them
      if (isPayer) {
        for (const s of e.splits) {
          if (s.userId === user._id || s.paid) continue;
          youAreOwed += s.amount;
          (balanceByUser[s.userId] ??= { owed: 0, owing: 0 }).owed += s.amount;
        }
      } 
      // If user didn't pay but owes money for this expense
      else if (mySplit && !mySplit.paid) {
        youOwe += mySplit.amount;
        (balanceByUser[e.paidByUserId] ??= { owed: 0, owing: 0 }).owing +=
          mySplit.amount;
      }
    }

    /* ───────────── 1‑to‑1 settlements (no groupId) ───────────── */
    // Get settlements where user is involved (either paid or received)
    const settlements = (await ctx.db.query("settlements").collect()).filter(
      (s) =>
        !s.groupId &&
        (s.paidByUserId === user._id || s.receivedByUserId === user._id)
    );

    // Apply settlements to adjust balances
    for (const s of settlements) {
      // If user made the settlement payment
      if (s.paidByUserId === user._id) {
        youOwe -= s.amount;
        (balanceByUser[s.receivedByUserId] ??= { owed: 0, owing: 0 }).owing -=
          s.amount;
      } 
      // If user received the settlement payment
      else {
        youAreOwed -= s.amount;
        (balanceByUser[s.paidByUserId] ??= { owed: 0, owing: 0 }).owed -=
          s.amount;
      }
    }

    /* Build formatted lists for UI display */
    const youOweList = [];
    const youAreOwedByList = [];
    // Convert balance data into user-friendly format with names and images
    for (const [uid, { owed, owing }] of Object.entries(balanceByUser)) {
      const net = owed - owing;
      if (net === 0) continue; // Skip balanced relationships
      const counterpart = await ctx.db.get(uid);
      const base = {
        userId: uid,
        name: counterpart?.name ?? "Unknown",
        imageUrl: counterpart?.imageUrl,
        amount: Math.abs(net),
      };
      net > 0 ? youAreOwedByList.push(base) : youOweList.push(base);
    }

    // Sort lists by amount (highest first)
    youOweList.sort((a, b) => b.amount - a.amount);
    youAreOwedByList.sort((a, b) => b.amount - a.amount);

    // Return comprehensive balance summary
    return {
      youOwe,
      youAreOwed,
      totalBalance: youAreOwed - youOwe,
      oweDetails: { youOwe: youOweList, youAreOwedBy: youAreOwedByList },
    };
  },
});

// Get total spent in the current year
export const getTotalSpent = query({
  handler: async (ctx) => {
    // Get current user information
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // Calculate start of current year timestamp
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();

    // Fetch all expenses from the start of current year
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startOfYear))
      .collect();

    // Filter expenses to only include those where user is involved
    const userExpenses = expenses.filter(
      (expense) =>
        expense.paidByUserId === user._id ||
        expense.splits.some((split) => split.userId === user._id)
    );

    // Calculate user's total personal spending (only their share)
    let totalSpent = 0;
    userExpenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === user._id
      );
      if (userSplit) {
        totalSpent += userSplit.amount;
      }
    });

    return totalSpent;
  },
});

// Get monthly spending
export const getMonthlySpending = query({
  handler: async (ctx) => {
    // Get current user information
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // Set up current year date range
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();

    // Fetch all expenses for the current year
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startOfYear))
      .collect();

    // Filter for expenses where user is involved
    const userExpenses = allExpenses.filter(
      (expense) =>
        expense.paidByUserId === user._id ||
        expense.splits.some((split) => split.userId === user._id)
    );

    // Initialize monthly totals object
    const monthlyTotals = {};

    // Initialize all 12 months with zero spending
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, i, 1);
      monthlyTotals[monthDate.getTime()] = 0;
    }

    // Aggregate user's spending by month
    userExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ).getTime();

      // Add user's share to the appropriate month
      const userSplit = expense.splits.find(
        (split) => split.userId === user._id
      );
      if (userSplit) {
        monthlyTotals[monthStart] =
          (monthlyTotals[monthStart] || 0) + userSplit.amount;
      }
    });

    // Convert to array format for easier consumption
    const result = Object.entries(monthlyTotals).map(([month, total]) => ({
      month: parseInt(month),
      total,
    }));

    // Sort by month chronologically
    result.sort((a, b) => a.month - b.month);

    return result;
  },
});

// Get groups for the current user
export const getUserGroups = query({
  handler: async (ctx) => {
    // Get current user information
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // Fetch all groups from database
    const allGroups = await ctx.db.query("groups").collect();

    // Filter to only groups where user is a member
    const groups = allGroups.filter((group) =>
      group.members.some((member) => member.userId === user._id)
    );

    // Calculate balances for each group the user belongs to
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        // Get all expenses specific to this group
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        let balance = 0;

        // Calculate net balance from expenses
        expenses.forEach((expense) => {
          // If user paid the expense, others owe them
          if (expense.paidByUserId === user._id) {
            expense.splits.forEach((split) => {
              if (split.userId !== user._id && !split.paid) {
                balance += split.amount;
              }
            });
          } 
          // If someone else paid, user might owe them
          else {
            const userSplit = expense.splits.find(
              (split) => split.userId === user._id
            );
            if (userSplit && !userSplit.paid) {
              balance -= userSplit.amount;
            }
          }
        });

        // Apply settlements to adjust the balance
        const settlements = await ctx.db
          .query("settlements")
          .filter((q) =>
            q.and(
              q.eq(q.field("groupId"), group._id),
              q.or(
                q.eq(q.field("paidByUserId"), user._id),
                q.eq(q.field("receivedByUserId"), user._id)
              )
            )
          )
          .collect();

        // Process each settlement to update balance
        settlements.forEach((settlement) => {
          if (settlement.paidByUserId === user._id) {
            // User paid someone in the group
            balance += settlement.amount;
          } else {
            // Someone paid the user in the group
            balance -= settlement.amount;
          }
        });

        // Return group data with calculated balance
        return {
          ...group,
          id: group._id,
          balance,
        };
      })
    );

    return enhancedGroups;
  },
});