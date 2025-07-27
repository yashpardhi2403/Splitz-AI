import { internal } from "./_generated/api";
import { query } from "./_generated/server";


export const getUserBalance = query ({
    handler: async (ctx) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser);


        const expenses = (await ctx.db.query("expense").collect()).filter(
            (e) => 
                !e.groupId &&
            (e.paidByUserId === user._id) || 
                e.splits.some((s) => s.userId === user._id)
        );

        const isPayer = e.paidByUserId === user._id;
        const mySplit = e.splits.find((s) => s.userId === user._id);

        if(isPayer){
            for(const s of e.splits){
                if(s.userId === user._id || s.paid) continue;

                youAreOwed += s.amount;
            }
        }
    },
});