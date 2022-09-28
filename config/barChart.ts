import { ChartOptions } from "chart.js";

const axisProps = {
  stacked: true,
  beginAtZero: true,
  max: 100,
  grid: {
    // color: "#fff",
  },
};

export const ofacBarChartOptions: ChartOptions<"bar"> = {
  indexAxis: "y",
  plugins: {
    legend: {
      onClick: () => null,
    },
  },
  maintainAspectRatio: false,
  responsive: true,
  color: "#fff",
  scales: {
    x: axisProps,
    y: {
      ...axisProps,
      display: false,
    },
  },
};
