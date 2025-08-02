"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, Area, AreaChart } from "recharts"
import { DownloadCloud, UploadCloud, Activity } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Helper function to format data size to human readable format
const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const chartConfig = {
  traffic: {
    label: "Network Traffic",
  },
  rx: {
    label: "Download",
    color: "hsl(var(--chart-1))",
  },
  tx: {
    label: "Upload", 
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

interface NetworkingChartProps {
  chartData: Array<{
    month: string;
    rx: number;
    tx: number;
    total: number;
    limit: number;
  }>;
  currentMonthData: {
    rx: number;
    tx: number;
    total: number;
    limit: number;
  } | null;
  usagePercent: number;
}

export function NetworkingChart({ chartData, currentMonthData, usagePercent }: NetworkingChartProps) {
  const [activeChart, setActiveChart] = React.useState<keyof typeof chartConfig>("rx")

  const total = React.useMemo(
    () => ({
      rx: chartData.reduce((acc, curr) => acc + curr.rx, 0),
      tx: chartData.reduce((acc, curr) => acc + curr.tx, 0),
    }),
    [chartData]
  )

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Activity className="h-16 w-16 mb-4 opacity-50" />
        <p>No traffic data available for this server.</p>
        <p className="text-sm mt-1">Traffic statistics will appear here once generated.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Traffic Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
          <DownloadCloud className="h-12 w-12 text-primary mb-2" />
          <h3 className="font-semibold text-lg">Download</h3>
          <p className="text-2xl font-bold">
            {currentMonthData ? formatBytes(currentMonthData.rx) : 'N/A'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
          <UploadCloud className="h-12 w-12 text-primary mb-2" />
          <h3 className="font-semibold text-lg">Upload</h3>
          <p className="text-2xl font-bold">
            {currentMonthData ? formatBytes(currentMonthData.tx) : 'N/A'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
          <Activity className="h-12 w-12 text-primary mb-2" />
          <h3 className="font-semibold text-lg">Total Usage</h3>
          <div className="flex flex-col items-center">
            <p className="text-2xl font-bold mb-1">
              {currentMonthData ? formatBytes(currentMonthData.total) : 'N/A'}
            </p>
            {currentMonthData && (
              <>
                <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                  <div
                    className={`h-2.5 rounded-full ${
                      usagePercent > 90 ? 'bg-destructive' :
                      usagePercent > 70 ? 'bg-warning' :
                      'bg-primary'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {`${Math.round(usagePercent)}% of ${formatBytes(currentMonthData.limit)}`}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Traffic Chart */}
      <Card className="py-0">
        <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
            <CardTitle>Monthly Traffic Breakdown</CardTitle>
            <CardDescription>
              Interactive view of network traffic data
            </CardDescription>
          </div>
          <div className="flex">
            {(["rx", "tx"] as const).map((key) => {
              const chart = key as keyof typeof chartConfig
              return (
                <button
                  key={chart}
                  data-active={activeChart === chart}
                  className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                  onClick={() => setActiveChart(chart)}
                >
                  <span className="text-muted-foreground text-xs">
                    {chartConfig[chart].label}
                  </span>
                  <span className="text-lg leading-none font-bold sm:text-3xl">
                    {formatBytes(total[key])}
                  </span>
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  // Handle different date formats
                  if (value.includes('/')) {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  return value
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[180px]"
                    nameKey="traffic"
                    labelFormatter={(value) => {
                      return `Month: ${value}`
                    }}
                    formatter={(value) => [formatBytes(value as number), '']}
                  />
                }
              />
              <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
} 