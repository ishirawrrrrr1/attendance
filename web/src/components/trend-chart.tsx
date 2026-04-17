"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

type TrendChartProps = {
  labels: string[];
  present: number[];
  late: number[];
};

export function WeeklyBarChart({ labels, present, late }: TrendChartProps) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "On Time",
            data: present,
            backgroundColor: "#355f3b",
            borderRadius: 12
          },
          {
            label: "Late",
            data: late,
            backgroundColor: "#d8a330",
            borderRadius: 12
          }
        ]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }}
    />
  );
}

export function RangeLineChart({ labels, present, late }: TrendChartProps) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "On Time",
            data: present,
            borderColor: "#355f3b",
            backgroundColor: "rgba(53, 95, 59, 0.18)",
            fill: true,
            tension: 0.35
          },
          {
            label: "Late",
            data: late,
            borderColor: "#d8a330",
            backgroundColor: "rgba(216, 163, 48, 0.2)",
            fill: true,
            tension: 0.35
          }
        ]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }}
    />
  );
}

export function StatusDoughnutChart({ present, late, absent }: { present: number; late: number; absent: number }) {
  return (
    <Doughnut
      data={{
        labels: ["On Time", "Late", "Absent"],
        datasets: [
          {
            data: [present, late, absent],
            backgroundColor: ["#355f3b", "#d8a330", "#b64a3d"],
            borderWidth: 0
          }
        ]
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }}
    />
  );
}
