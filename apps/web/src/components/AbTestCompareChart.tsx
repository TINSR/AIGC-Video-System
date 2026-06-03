import ReactECharts from "echarts-for-react";

type AbTestItem = {
  name: string;
  versionA: number;
  versionB: number;
};

type Props = {
  data: AbTestItem[];
};

export function AbTestCompareChart({ data }: Props) {
  return (
    <ReactECharts
      className="chart"
      option={{
        backgroundColor: "transparent",
        tooltip: {},
        legend: { textStyle: { color: "#c7c8d8" } },
        grid: { left: 40, right: 24, top: 48, bottom: 48 },
        xAxis: {
          type: "category",
          data: data.map((item) => item.name),
          axisLabel: { color: "#c7c8d8", interval: 0, rotate: 18 }
        },
        yAxis: { type: "value", axisLabel: { color: "#c7c8d8" }, splitLine: { lineStyle: { color: "#26283a" } } },
        series: [
          { name: "Version A", type: "bar", data: data.map((item) => item.versionA), itemStyle: { color: "#37d5ff" } },
          { name: "Version B", type: "bar", data: data.map((item) => item.versionB), itemStyle: { color: "#7c5cff" } }
        ]
      }}
    />
  );
}
