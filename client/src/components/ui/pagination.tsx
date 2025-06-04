import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    separator?: React.ReactNode;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
  }
>(
  (
    {
      className,
      separator,
      currentPage = 1,
      totalPages = 1,
      onPageChange,
      ...props
    },
    ref
  ) => {
    const handlePageChange = (page: number) => {
      if (onPageChange && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    };

    const renderPageNumbers = () => {
      const pageNumbers = [];
      const maxPagesToShow = 5;

      // Always show first page
      pageNumbers.push(
        <PaginationItem key={1}>
          <PaginationLink
            isActive={currentPage === 1}
            onClick={() => handlePageChange(1)}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (totalPages <= 1) return pageNumbers;

      // Calculate range of pages to show
      let startPage = Math.max(
        2,
        currentPage - Math.floor(maxPagesToShow / 2)
      );
      let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 3);

      // Adjust if we're near the beginning
      if (startPage > 2) {
        pageNumbers.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={currentPage === i}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page if there's more than one page
      if (totalPages > 1) {
        pageNumbers.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              isActive={currentPage === totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }

      return pageNumbers;
    };

    return (
      <nav
        ref={ref}
        className={cn("mx-auto flex w-full justify-center", className)}
        {...props}
      >
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(currentPage - 1)}
              aria-disabled={currentPage === 1}
              className={
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }
              tabIndex={currentPage === 1 ? -1 : 0}
            />
          </PaginationItem>

          {renderPageNumbers()}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              aria-disabled={currentPage === totalPages}
              className={
                currentPage === totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }
              tabIndex={currentPage === totalPages ? -1 : 0}
            />
          </PaginationItem>
        </PaginationContent>
      </nav>
    );
  }
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      isActive && "pointer-events-none",
      size === "icon" && "h-9 w-9",
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = () => (
  <span className="flex h-9 w-9 items-center justify-center rounded-md opacity-70">
    <MoreHorizontal className="h-4 w-4" />
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
};