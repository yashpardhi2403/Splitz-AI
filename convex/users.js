import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    // Note: If you don't want to define an index right away, you can use
    // ctx.db.query("users")
    //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    //  .unique();
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name });
      }
      return user._id;
    }
    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      tokenIdentifier: identity.tokenIdentifier,
      email : identity.email,
      imageUrl : identity.pictureUrl,
    });
  },
});

export const getCurrentUser=query({
  handler:async(ctx)=>{
    const identity = await ctx.auth.getUserIdentity();
    if(!identity){
      throw new Error("Not authenticated")
    }

    const user = await ctx.db
    .query("users")
    .withIndex("by_token",(q)=>{
      return q.eq("tokenIdentifier",identity.tokenIdentifier)
    }).
    first();
    if(!user){
      throw new Error("User not found")
    }

    return user;
  }
}); 

export const searchUsers = query({
  args:{ query: v.string()},
  handler: async (ctx, args) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
    

    //dont search if qurey is too short
    if(args.query.length < 2){
      return [];
    }

    //search by name using the search index
    const nameResults = await ctx.db
    .query("users")
    .withSearchIndex("search_name",(q) => q.search("name",args.query))
    .collect();

    //search by email using the search index
    const emailResults = await ctx.db
    .query("users")
    .withSearchIndex("search_email",(q) => q.search("email",args.query))
    .collect();
    

    //combine results and remove duplicates
    const users = [
      ...nameResults,
      ...emailResults.filter(
        (email) => !nameResults.some((name) => name.email === email.email)
      ),
    ];

    return users
      .filter((user) => user._id !== currentUser._id)
      .map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
      }));
  },
});