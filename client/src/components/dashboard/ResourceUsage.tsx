import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceMeter } from "@/components/ui/resource-meter";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Example data - in a real app, this would come from API
const weeklyData = [
  { name: "Mon", cpu: 40, memory: 30, storage: 60, network: 25 },
  { name: "Tue", cpu: 65, memory: 45, storage: 62, network: 35 },
  { name: "Wed", cpu: 55, memory: 40, storage: 65, network: 40 },
  { name: "Thu", cpu: 70, memory: 55, storage: 68, network: 45 },
  { name: "Fri", cpu: 60, memory: 48, storage: 70, network: 30 },
  { name: "Sat", cpu: 45, memory: 35, storage: 73, network: 20 },
  { name: "Sun", cpu: 35, memory: 25, storage: 75, network: 15 },
];

const monthlyData = [
  { name: "W1", cpu: 45, memory: 35, storage: 55, network: 30 },
  { name: "W2", cpu: 55, memory: 45, storage: 60, network: 35 },
  { name: "W3", cpu: 65, memory: 50, storage: 70, network: 40 },
  { name: "W4", cpu: 75, memory: 60, storage: 80, network: 45 },
];

interface ResourceUsageProps {
  currentUsage?: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
}

export function ResourceUsage({
  currentUsage = { cpu: 75, memory: 48, storage: 92, network: 36 },
}: ResourceUsageProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Resource Chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">
            Resource Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly">
            <div className="flex justify-end mb-4">
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="weekly" className="mt-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weeklyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#2563EB"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563EB"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorMemory"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorStorage"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#EF4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#EF4444"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorNetwork"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22C55E"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22C55E"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#2563EB"
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      name="Memory"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorMemory)"
                    />
                    <Area
                      type="monotone"
                      dataKey="storage"
                      name="Storage"
                      stroke="#EF4444"
                      fillOpacity={1}
                      fill="url(#colorStorage)"
                    />
                    <Area
                      type="monotone"
                      dataKey="network"
                      name="Network"
                      stroke="#22C55E"
                      fillOpacity={1}
                      fill="url(#colorNetwork)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="monthly" className="mt-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#2563EB"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563EB"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorMemory"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorStorage"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#EF4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#EF4444"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorNetwork"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22C55E"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22C55E"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#2563EB"
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      name="Memory"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorMemory)"
                    />
                    <Area
                      type="monotone"
                      dataKey="storage"
                      name="Storage"
                      stroke="#EF4444"
                      fillOpacity={1}
                      fill="url(#colorStorage)"
                    />
                    <Area
                      type="monotone"
                      dataKey="network"
                      name="Network"
                      stroke="#22C55E"
                      fillOpacity={1}
                      fill="url(#colorNetwork)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Usage Meters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Current Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ResourceMeter
            label="CPU"
            value={currentUsage.cpu}
            colorScheme="default"
          />
          <ResourceMeter
            label="Memory"
            value={currentUsage.memory}
            colorScheme="default"
          />
          <ResourceMeter
            label="Storage"
            value={currentUsage.storage}
            colorScheme="default"
          />
          <ResourceMeter
            label="Network"
            value={currentUsage.network}
            colorScheme="default"
          />
          <div className="text-center mt-8">
            <Button variant="outline">View Detailed Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ResourceUsage;
