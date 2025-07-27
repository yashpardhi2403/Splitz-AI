// convex/contacts.js
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/* ──────────────────────────────────────────────────────────────────────────
   1. getAllContacts – 1‑to‑1 expense contacts + groups
   ──────────────────────────────────────────────────────────────────────── */
export const getAllContacts = query({
  handler: async (ctx) => {
    /* ── get current authenticated user ─────────────────────────────────── */
    /*
        Use the centralized getCurrentUser function to get the current user
        This handles authentication and returns the user object
        We need this to filter expenses and groups for the current user
    */
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    /* ── personal expenses where YOU are the payer ─────────────────────── */
    /*
        Goal: fetch all expenses paid by the current user in 1-to-1 scenarios
        We query the expenses table using the by_user_and_group index
        Filter by: paidByUserId = currentUser._id AND groupId = undefined
        groupId = undefined means it's a personal/1-to-1 expense, not a group expense
    */  
    const expensesYouPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", currentUser._id).eq("groupId", undefined)
      )
      .collect();

    /* ── personal expenses where YOU are **not** the payer ─────────────── */
    /*
        Goal: fetch all 1-to-1 expenses where someone else paid but you're involved
        First, get all expenses where groupId is undefined (1-to-1 expenses)
        Then filter to keep only expenses where:
        1. paidByUserId is NOT the current user (someone else paid)
        2. Current user is in the splits array (you owe money for this expense)
        This gives us expenses where others paid but we're part of the split
    */    
    const expensesNotPaidByYou = (
      await ctx.db
        .query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", undefined)) // only 1‑to‑1
        .collect()
    ).filter(
      (e) =>
        e.paidByUserId !== currentUser._id &&
        e.splits.some((s) => s.userId === currentUser._id)
    );

    /* ── combine all personal expenses ──────────────────────────────────── */
    /*
        Merge both arrays to get all personal expenses involving the current user
        This includes expenses you paid and expenses others paid where you're involved
    */
    const personalExpenses = [...expensesYouPaid, ...expensesNotPaidByYou];

    /* ── extract unique counterpart IDs ─────────────────────────────────── */
    /*
        Goal: find all unique user IDs that the current user has financial interactions with
        Loop through all personal expenses and collect user IDs from:
        1. paidByUserId (if it's not the current user) - who paid for expenses you're involved in
        2. splits array (excluding current user) - who you share expenses with
        Use Set to ensure uniqueness and avoid duplicate contacts
    */
    const contactIds = new Set();
    personalExpenses.forEach((exp) => {
      // If someone else paid this expense, add them as a contact
      if (exp.paidByUserId !== currentUser._id)
        contactIds.add(exp.paidByUserId);

      // Add all users from splits (except current user) as contacts
      exp.splits.forEach((s) => {
        if (s.userId !== currentUser._id) contactIds.add(s.userId);
      });
    });

    /* ── fetch user documents for contacts ─────────────────────────────── */
    /*
        Goal: get full user information for each contact ID
        For each unique contact ID, fetch the user document from database
        Transform the user data into a standardized contact format
        Filter out any null results (in case a user was deleted)
        This gives us name, email, imageUrl for each contact
    */
    const contactUsers = await Promise.all(
      [...contactIds].map(async (id) => {
        const u = await ctx.db.get(id);
        return u
          ? {
              id: u._id,
              name: u.name,
              email: u.email,
              imageUrl: u.imageUrl,
              type: "user", // distinguish from groups
            }
          : null;
      })
    );

    /* ── fetch groups where current user is a member ───────────────────── */
    /*
        Goal: get all groups that the current user belongs to
        1. Query all groups from the database
        2. Filter to keep only groups where current user is in the members array
        3. Transform group data into standardized contact format
        4. Include member count for display purposes
        5. Mark type as "group" to distinguish from individual users
    */
    const userGroups = (await ctx.db.query("groups").collect())
      .filter((g) => g.members.some((m) => m.userId === currentUser._id))
      .map((g) => ({
        id: g._id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        type: "group",
      }));

    /* ── sort results alphabetically ───────────────────────────────────── */
    /*
        Sort both users and groups alphabetically by name for better UX
        Users are sorted by name, groups are sorted by name
        This ensures consistent ordering in the UI
    */
    contactUsers.sort((a, b) => a?.name.localeCompare(b?.name));
    userGroups.sort((a, b) => a.name.localeCompare(b.name));

    /* ── return combined results ───────────────────────────────────────── */
    /*
        Return both individual user contacts and group contacts
        Filter out any null users (from deleted accounts)
        This gives the frontend everything needed to display contacts
    */
    return { users: contactUsers.filter(Boolean), groups: userGroups };
  },
});

/* ──────────────────────────────────────────────────────────────────────────
   2. createGroup – create a new group
   ──────────────────────────────────────────────────────────────────────── */
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    members: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    /* ── get current authenticated user ─────────────────────────────────── */
    /*
        Get the current user who is creating the group
        This user will automatically become the group creator and admin
    */
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    /* ── validate group name ───────────────────────────────────────────── */
    /*
        Ensure the group name is not empty or just whitespace
        Throw error if invalid to prevent creating groups with blank names
    */
    if (!args.name.trim()) throw new Error("Group name cannot be empty");

    /* ── prepare unique member list ─────────────────────────────────────── */
    /*
        Create a Set to ensure unique member IDs (no duplicates)
        Always add the current user as creator, even if not in the members array
        This ensures the creator is always part of the group they create
    */
    const uniqueMembers = new Set(args.members);
    uniqueMembers.add(currentUser._id); // ensure creator

    /* ── validate all members exist ────────────────────────────────────── */
    /*
        Check that each member ID corresponds to a real user in the database
        This prevents adding non-existent users to groups
        Throw error if any user ID is invalid
    */
    for (const id of uniqueMembers) {
      if (!(await ctx.db.get(id)))
        throw new Error(`User with ID ${id} not found`);
    }

    /* ── create and insert the group ───────────────────────────────────── */
    /*
        Insert the new group into the database with:
        - Trimmed name and description
        - Current user as creator
        - Members array with roles and join timestamps
        - Creator gets "admin" role, others get "member" role
        - All members get current timestamp as joinedAt
    */
    return await ctx.db.insert("groups", {
      name: args.name.trim(),
      description: args.description?.trim() ?? "",
      createdBy: currentUser._id,
      members: [...uniqueMembers].map((id) => ({
        userId: id,
        role: id === currentUser._id ? "admin" : "member",
        joinedAt: Date.now(),
      })),
    });
  },
});