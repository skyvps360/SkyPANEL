import { cn } from "@/lib/utils";

interface ResourceMeterProps {
  label: string;
  value: number;
  max?: number;
  colorScheme?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function ResourceMeter({
  label,
  value,
  max = 100,
  colorScheme = "default",
  size = "md",
  showValue = true,
  className,
}: ResourceMeterProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
  
  // Define color scheme based on percentage or explicit colorScheme
  const getColorScheme = () => {
    if (colorScheme !== "default") return colorScheme;
    
    if (percentage < 50) return "success";
    if (percentage < 80) return "warning";
    return "danger";
  };
  
  const currentScheme = getColorScheme();
  
  // Define color classes based on the color scheme
  const getBarColor = () => {
    switch (currentScheme) {
      case "success":
        return "bg-accent";
      case "warning":
        return "bg-amber-500";
      case "danger":
        return "bg-alert";
      default:
        return "bg-primary";
    }
  };
  
  // Define height based on size
  const getHeight = () => {
    switch (size) {
      case "sm":
        return "h-1";
      case "lg":
        return "h-3";
      default:
        return "h-2";
    }
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        {showValue && (
          <span className="text-sm text-gray-500">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", getHeight())}>
        <div
          className={cn("rounded-full", getBarColor(), getHeight())}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

export default ResourceMeter;
