"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export function ExpenseSummary({ monthlySpending, totalSpent }) {
  // Format monthly data for chart
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const chartData =
    monthlySpending?.map((item) => {
      const date = new Date(item.month);
      return {
        name: monthNames[date.getMonth()],
        amount: item.total,
      };
    }) || [];

  // Get current year
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total this month</p>
            <h3 className="text-2xl font-bold mt-1">
              {formatCurrency(monthlySpending?.[currentMonth]?.total || 0)}
            </h3>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total this year</p>
            <h3 className="text-2xl font-bold mt-1">
              {formatCurrency(totalSpent || 0)}
            </h3>
          </div>
        </div>

        <div className="h-64 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => [formatCurrency(value), "Amount"]}
                labelFormatter={() => "Spending"}
              />
              <Bar dataKey="amount" fill="#36d7b7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Monthly spending for {currentYear}
        </p>
      </CardContent>
    </Card>
  );
}