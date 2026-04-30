"use client";

import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export type ChartPoint = {
  day: string;
  value: number;
};

type Props = {
  chartType: "line" | "bar" | "pie";
  data: ChartPoint[];
};

export default function ProgressChart({ chartType, data }: Props) {
  const chartData = {
    labels: data.map(d => d.day),
    datasets: [
      {
        label: "Progress",
        data: data.map(d => d.value),
        backgroundColor:
          chartType === "pie"
            ? [
              "#6366f1",
              "#818cf8",
              "#a5b4fc",
              "#c7d2fe",
              "#e0e7ff",
            ]
            : "#6366f1",
        borderColor: "#4f46e5",
        borderWidth: 2,
        fill: chartType === "line",
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
  };

  if (chartType === "bar") return <Bar data={chartData} options={options} />;
  if (chartType === "pie") return <Pie data={chartData} options={options} />;
  return <Line data={chartData} options={options} />;
}
