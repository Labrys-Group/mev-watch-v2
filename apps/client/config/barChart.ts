import { ChartOptions } from "chart.js";

const axisProps = {
  stacked: true,
  beginAtZero: true,
  max: 1,
};

export const ofacBarChartOptions: ChartOptions<"bar"> = {
  indexAxis: "y",
  plugins: {
    legend: {
      onClick: () => null,
    },
    tooltip: {
      callbacks: {
        label: function (tooltipItem) {
          return `${tooltipItem.dataset.label} ${(
            (tooltipItem.raw as number) * 100
          ).toFixed(2)}%`;
        },
      },
    },
  },
  maintainAspectRatio: false,
  responsive: true,
  color: "white",
  scales: {
    x: {
      ...axisProps,
      ticks: {
        maxTicksLimit: 2,
        callback: function (val: string | number, index: number) {
          // Upscale the x-axis so that it correctly represents the percentage values, otherwise it will limit at 1%
          return val === 1 ? `${parseFloat(val.toString()) * 100}%` : "";
        },
        format: {
          style: "percent",
        },
      },
    },
    y: {
      ...axisProps,
      display: false,
    },
  },
};
