import { ChartOptions } from "chart.js";

const axisProps = {
  stacked: true,
  beginAtZero: true,
};

export const ofacLineChartOptions = (hoverCallback: (arg: any) => void) => {
  return {
    responsive: true,
    plugins: {
      legend: {
        onClick: () => null,
        position: "top" as const,
      },
      title: {
        display: false,
      },
      filler: {
        drawTime: "beforeDatasetDraw",
        propagate: true,
      },
    },
    elements: {
      point: { radius: 0 },
    },
    color: "white",
    maintainAspectRatio: true,
    scales: {
      x: {
        ...axisProps,
        display: false,
      },
      y: {
        ...axisProps,
        ticks: {
          callback: function (val: string | number, index: number) {
            // Upscale the x-axis so that it correctly represents the percentage values, otherwise it will limit at 1%
            return `${parseFloat(val.toString()) * 100}%`;
          },
          format: {
            style: "percent",
          },
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    onHover(event, elements, chart) {
      hoverCallback(elements);
    },
  } as ChartOptions<"line">;
};
