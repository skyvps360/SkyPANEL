import React from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItemProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

interface BreadcrumbProps {
  children: React.ReactNode;
  className?: string;
}

const BreadcrumbItem = ({ href, children, className }: BreadcrumbItemProps) => {
  if (href) {
    return (
      <Link href={href}>
        <span className={cn("text-muted-foreground hover:text-foreground transition-colors", className)}>
          {children}
        </span>
      </Link>
    );
  } else {
    return (
      <span className={cn("text-foreground font-medium", className)}>
        {children}
      </span>
    );
  }
};

export function Breadcrumb({ children, className }: BreadcrumbProps) {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <nav className={cn("flex items-center text-sm", className)}>
      <ol className="flex items-center space-x-2">
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            <li>{child}</li>
            {index < childrenArray.length - 1 && (
              <li className="text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

Breadcrumb.Item = BreadcrumbItem;