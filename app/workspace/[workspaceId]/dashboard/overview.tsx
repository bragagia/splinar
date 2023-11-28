"use client";

import dayjs from "dayjs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function Overview({
  mergedContactsByMonths,
}: {
  mergedContactsByMonths:
    | {
        month: string;
        count: number;
      }[];
}) {
  const dataWithDate = mergedContactsByMonths.map((m) => ({
    date: dayjs(m.month).startOf("month"),
    count: m.count,
  }));

  const lastYearData = Array.from({ length: 12 }, (_, i) => {
    const month = dayjs()
      .startOf("month")
      .add(-(11 - i), "month");
    return {
      month: month.format("MMM"),
      count: dataWithDate.find((data) => data.date.isSame(month))?.count || 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={lastYearData}>
        <XAxis
          dataKey="month"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />

        <Bar dataKey="count" fill="#000000" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
