import { useState, useEffect } from "react";
// We're using our own progress implementation to avoid component interface issues
import { cn } from "@/lib/utils";
import { getBrandColors } from "@/lib/brand-theme";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // Reset if no password
    if (!password) {
      setStrength(0);
      setFeedback("");
      return;
    }

    // Calculate password strength
    let calculatedStrength = 0;
    let tips: string[] = [];

    // Check password length
    if (password.length >= 8) {
      calculatedStrength += 20;
    } else {
      tips.push("Add more characters (minimum 8)");
    }

    // Check for uppercase letters
    if (/[A-Z]/.test(password)) {
      calculatedStrength += 20;
    } else {
      tips.push("Add uppercase letters");
    }

    // Check for lowercase letters
    if (/[a-z]/.test(password)) {
      calculatedStrength += 20;
    } else {
      tips.push("Add lowercase letters");
    }

    // Check for numbers
    if (/[0-9]/.test(password)) {
      calculatedStrength += 20;
    } else {
      tips.push("Add numbers");
    }

    // Check for special characters
    if (/[^A-Za-z0-9]/.test(password)) {
      calculatedStrength += 20;
    } else {
      tips.push("Add special characters");
    }

    // Set strength and feedback
    setStrength(calculatedStrength);

    // Determine the feedback message
    if (calculatedStrength < 40) {
      setFeedback("Weak password");
    } else if (calculatedStrength < 70) {
      setFeedback("Moderate password");
    } else {
      setFeedback("Strong password");
    }
  }, [password]);

  // Get the company color from document CSS variables or use default
  const getCompanyColor = () => {
    // Try to get from CSS variable if in browser
    if (typeof document !== 'undefined') {
      const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim();
      if (brandColor) {
        return brandColor;
      }
    }
    // Default company color if CSS variable isn't available
    return '#ff0000'; // Default to red as fallback
  };

  // Determine the color based on strength
  const getColorClass = () => {
    if (strength < 40) return "bg-destructive/90";
    if (strength < 70) return "bg-orange-500";
    return ""; // Empty string to use custom style
  };

  function getTextColorClass() {
    if (strength < 40) return "text-destructive";
    if (strength < 70) return "text-orange-500";
    return ""; // Empty string to use custom style
  }

  if (!password) return null;

  return (
    <div className="w-full space-y-1 mt-1">
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", getColorClass())}
          style={{ 
            width: `${strength}%`,
            ...(strength >= 70 ? { backgroundColor: getCompanyColor() } : {})
          }}
        />
      </div>
      <p className={cn("text-xs", getTextColorClass())}
         style={strength >= 70 ? { color: getCompanyColor() } : undefined}>
        {feedback}
      </p>
    </div>
  );
}