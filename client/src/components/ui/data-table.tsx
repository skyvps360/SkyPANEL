import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, MoreHorizontal, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface DataTableColumn<T> {
  accessorKey?: keyof T;
  id?: string;
  header: string;
  cell?: (item: T) => React.ReactNode;
  enableSorting?: boolean;
  hidden?: boolean; // Optional flag to hide a column on mobile
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (item: T) => void;
  searchKey?: keyof T;
  searchFunction?: (item: T, query: string) => boolean;  // Custom search function
  actions?: (item: T) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  enableSearch?: boolean; // Enable search functionality
  searchPlaceholder?: string; // Custom search placeholder
  enablePagination?: boolean; // Enable pagination
  defaultPageSize?: number; // Default page size
  pageSizeOptions?: number[]; // Available page size options
  searchQuery?: string; // Controlled search value
  setSearchQuery?: (q: string) => void; // Controlled search setter
}

// Utility to highlight search matches
export function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part) ? <mark key={i} style={{ background: '#ffe066', padding: 0 }}>{part}</mark> : part
  );
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  searchKey,
  searchFunction,
  actions,
  isLoading = false,
  emptyMessage = "No data available",
  enableSearch = false,
  searchPlaceholder = "Search...",
  enablePagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  searchQuery: controlledSearchQuery,
  setSearchQuery: setControlledSearchQuery,
}: DataTableProps<T>) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearchQuery;
  const setSearchQuery = setControlledSearchQuery !== undefined ? setControlledSearchQuery : setInternalSearchQuery;
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [isMobile, setIsMobile] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical md breakpoint
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Reset to first page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Generate a unique key for columns
  const getColumnKey = (column: DataTableColumn<T>, index: number): string => {
    if (column.id) return column.id;
    if (column.accessorKey) return String(column.accessorKey);
    return `column-${index}-${column.header}`;
  };

  // Filter by search using debounced query
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery) return data;

    return data.filter((item) => {
      // If custom search function is provided, use it
      if (searchFunction) {
        return searchFunction(item, debouncedSearchQuery);
      }
      // Otherwise use the default search by key
      else if (searchKey) {
        const value = item[searchKey];
        if (typeof value === "string") {
          return value.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        }
        return false;
      }
      // If no search criteria provided, include all items
      return true;
    });
  }, [data, debouncedSearchQuery, searchFunction, searchKey]);

  // Sort data
  const sortedData = sortBy
    ? [...filteredData].sort((a, b) => {
        // Use type assertion to ensure type safety
        const aValue = sortBy in a ? a[sortBy] : undefined;
        const bValue = sortBy in b ? b[sortBy] : undefined;

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortOrder === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // Handle number comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        }

        // Handle date comparison
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === "asc"
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        return 0;
      })
    : filteredData;

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = enablePagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const handleSort = (columnKey: keyof T) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(columnKey);
      setSortOrder("asc");
    }
  };

  // Render table view for desktop
  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={getColumnKey(column, index)}>
                {column.enableSorting !== false && column.accessorKey ? (
                  <Button
                    variant="ghost"
                    onClick={() => column.accessorKey && handleSort(column.accessorKey)}
                    className="font-medium"
                  >
                    {column.header}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
            {actions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center"
              >
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                  <span className="ml-2">Loading...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : paginatedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((item, rowIndex) => (
              <TableRow
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={onRowClick ? "cursor-pointer hover:bg-muted" : ""}
              >
                {columns.map((column, colIndex) => (
                  <TableCell key={getColumnKey(column, colIndex)}>
                    {column.cell
                      ? column.cell(item)
                      : column.accessorKey
                        ? (searchKey && column.accessorKey === searchKey && typeof item[column.accessorKey] === 'string' && debouncedSearchQuery)
                          ? highlightMatch(String(item[column.accessorKey] || ''), debouncedSearchQuery)
                          : String(item[column.accessorKey] || "")
                        : ""}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions(item)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Render card view for mobile
  const renderCardView = () => (
    <div className="space-y-4">
      {paginatedData.length === 0 ? (
        <div className="text-center py-6">No results found.</div>
      ) : (
        paginatedData.map((item, index) => (
          <Card 
            key={index} 
            className={onRowClick ? "cursor-pointer hover:bg-muted transition-colors" : ""}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                {columns.map((column, colIndex) => (
                    // Skip columns marked as hidden on mobile
                    !column.hidden && (
                      <div key={getColumnKey(column, colIndex)} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-muted-foreground">{column.header}:</span>
                        <div className="text-sm text-right flex-1 ml-4">
                          {column.cell
                            ? column.cell(item)
                            : column.accessorKey
                              ? (searchKey && column.accessorKey === searchKey && typeof item[column.accessorKey] === 'string' && debouncedSearchQuery)
                                ? highlightMatch(String(item[column.accessorKey] || ''), debouncedSearchQuery)
                                : String(item[column.accessorKey] || "")
                              : ""}
                        </div>
                      </div>
                    )
                ))}
                {actions && (
                  <div className="flex justify-end mt-2 pt-2 border-t">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4 mr-1" />
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions(item)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {enableSearch && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {enablePagination && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      
      {/* Responsive view - table on desktop, cards on mobile */}
      <div className="hidden md:block">{renderTableView()}</div>
      <div className="md:hidden">{renderCardView()}</div>
      
      {enablePagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} {sortedData.length === 1 ? 'entry' : 'entries'}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium px-2">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((prev) => Math.min(prev + 1, totalPages));
              }}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
