# Enhanced Transaction Table System

## Overview

This document describes the enhanced transaction table system implemented across the SkyPANEL application, providing administrators and users with powerful tools to view, search, filter, and manage transaction data with persistent state management.

## Features

### Core Functionality
- **Advanced Search**: Multi-field search across transaction data
- **Pagination**: Configurable page sizes with navigation controls
- **Sorting**: Column-based sorting with visual indicators
- **Filtering**: Status-based filtering and custom filters
- **State Persistence**: URL-based state management for navigation persistence
- **Responsive Design**: Adaptive layouts for desktop and mobile devices

### Search Capabilities

#### Multi-Field Search
The enhanced search functionality searches across multiple transaction fields:

```javascript
const searchTransactions = (transaction, query) => {
  const searchTerm = query.toLowerCase();
  return (
    transaction.id.toString().includes(searchTerm) ||
    transaction.amount.toString().includes(searchTerm) ||
    (transaction.description && transaction.description.toLowerCase().includes(searchTerm)) ||
    (transaction.adminReason && transaction.adminReason.toLowerCase().includes(searchTerm)) ||
    (transaction.type && transaction.type.toLowerCase().includes(searchTerm)) ||
    format(new Date(transaction.createdAt), 'MMM d, yyyy').toLowerCase().includes(searchTerm)
  );
};
```

#### Search Fields
- **Transaction ID**: Exact and partial matches
- **Amount**: Numeric value searches
- **Description**: Full-text search in transaction descriptions
- **Admin Reason**: Search in administrative notes
- **Transaction Type**: Search by transaction type
- **Date**: Search by formatted date strings
- **User Information**: Username, email, and user ID (admin views)

### Pagination System

#### Configuration Options
```javascript
const paginationConfig = {
  defaultPageSize: 5,
  pageSizeOptions: [5, 10, 25, 50, 100],
  enablePagination: true,
  showPageInfo: true,
  showPageSizeSelector: true
};
```

#### Page Size Selector
- **Default**: 5 items per page (optimized for quick scanning)
- **Options**: 5, 10, 25, 50, 100 items per page
- **Responsive**: Dropdown selector with clear labeling
- **Auto-reset**: Returns to page 1 when page size changes

#### Navigation Controls
- **First/Last**: Jump to first or last page
- **Previous/Next**: Navigate one page at a time
- **Page Indicators**: Current page and total page count
- **Entry Counter**: "Showing X to Y of Z entries" display

### State Management

#### URL Persistence
```javascript
const handleTabChange = (newTab) => {
  setActiveTab(newTab);
  // Update URL without triggering navigation
  const url = new URL(window.location.href);
  url.searchParams.set('tab', newTab);
  window.history.replaceState({}, '', url.toString());
};
```

#### Persistent State Features
- **Tab State**: Active tab persists in URL query parameters
- **Search State**: Search queries maintained during navigation
- **Pagination State**: Current page and page size preserved
- **Filter State**: Applied filters persist across sessions
- **Sort State**: Column sorting preferences maintained

### Column Configuration

#### Standard Columns
```javascript
const transactionColumns = [
  {
    accessorKey: "id",
    header: "ID",
    cell: (transaction) => (
      <span className="font-medium text-muted-foreground">#{transaction.id}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: (transaction) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(new Date(transaction.createdAt), 'h:mm a')}
        </span>
      </div>
    ),
    enableSorting: true,
  },
  // Additional columns...
];
```

#### Dynamic Column Features
- **Conditional Rendering**: Columns adapt based on data availability
- **Custom Cell Renderers**: Rich formatting for different data types
- **Sorting Integration**: Click-to-sort with visual indicators
- **Responsive Behavior**: Columns stack or hide on mobile devices

### Implementation Locations

#### Admin User Edit Page (`/admin/users/:id`)
**File**: `client/src/pages/admin/user-edit-page.tsx`

**Features**:
- Enhanced transaction history for individual users
- Custom credits transaction filtering
- Admin-specific actions and controls
- Detailed transaction metadata display

**Configuration**:
```javascript
<DataTable<CreditTransaction>
  data={customCreditsData?.transactions || []}
  columns={transactionColumns}
  enableSearch={true}
  searchFunction={searchTransactions}
  searchPlaceholder="Search by ID, amount, description, or date..."
  enablePagination={true}
  defaultPageSize={5}
  pageSizeOptions={[5, 10, 25, 50, 100]}
  isLoading={isLoadingCustomCredits}
  emptyMessage={`No ${brandingData?.custom_credits_name?.toLowerCase() || 'custom credits'} transactions found.`}
/>
```

#### Client Billing Page (`/billing`)
**File**: `client/src/pages/billing-page.tsx`

**Features**:
- User transaction history
- Payment method filtering
- Transaction status filtering
- Export functionality

#### Admin Billing Dashboard (`/admin/billing`)
**File**: `client/src/pages/admin/billing-page.tsx`

**Features**:
- System-wide transaction overview
- User-based filtering
- Revenue analytics integration
- Bulk operations support

### Mobile Responsiveness

#### Adaptive Layouts
```javascript
// Desktop: Table view
<table className="min-w-full">
  <thead>...</thead>
  <tbody>...</tbody>
</table>

// Mobile: Card view
<div className="space-y-4">
  {data.map(item => (
    <Card key={item.id}>
      <CardContent>...</CardContent>
    </Card>
  ))}
</div>
```

#### Mobile Features
- **Card Layout**: Transactions display as cards on mobile
- **Touch-Friendly**: Large touch targets for mobile interaction
- **Swipe Navigation**: Gesture-based pagination
- **Responsive Search**: Mobile-optimized search interface

### Performance Optimizations

#### Efficient Rendering
- **Virtual Scrolling**: Large datasets rendered efficiently
- **Debounced Search**: 300ms delay prevents excessive API calls
- **Memoized Components**: React.memo for expensive renders
- **Lazy Loading**: Data loaded on demand

#### Caching Strategy
```javascript
const { data: transactions, isLoading } = useQuery({
  queryKey: [`/api/admin/users/${userId}/custom-credits`],
  enabled: !isNaN(userId) && userId > 0,
  retry: 1,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### Error Handling

#### Graceful Degradation
```javascript
{customCreditsError ? (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      Failed to load {brandingData?.custom_credits_name?.toLowerCase() || 'custom credits'} data: {customCreditsError.message}
    </AlertDescription>
  </Alert>
) : (
  <DataTable {...props} />
)}
```

#### Error States
- **Network Errors**: Clear error messages with retry options
- **Data Validation**: Client-side validation with user feedback
- **Loading States**: Skeleton loaders and progress indicators
- **Empty States**: Helpful messages when no data is available

### Accessibility Features

#### ARIA Support
- **Screen Reader**: Proper ARIA labels and descriptions
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Logical tab order and focus indicators
- **High Contrast**: Support for high contrast themes

#### Semantic HTML
```html
<table role="table" aria-label="Transaction History">
  <thead>
    <tr role="row">
      <th role="columnheader" aria-sort="ascending">Date</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row">
      <td role="cell">...</td>
    </tr>
  </tbody>
</table>
```

### Customization Options

#### Theme Integration
- **Brand Colors**: Dynamic color scheme support
- **Custom Styling**: CSS custom properties for theming
- **Dark Mode**: Full dark mode compatibility
- **Responsive Breakpoints**: Configurable responsive behavior

#### Configuration API
```javascript
interface DataTableConfig {
  enableSearch: boolean;
  enablePagination: boolean;
  enableSorting: boolean;
  defaultPageSize: number;
  pageSizeOptions: number[];
  searchPlaceholder: string;
  emptyMessage: string;
  loadingMessage: string;
}
```

## Usage Examples

### Basic Implementation
```javascript
import { DataTable } from "@/components/ui/data-table";

<DataTable
  data={transactions}
  columns={columns}
  enableSearch={true}
  enablePagination={true}
  defaultPageSize={10}
/>
```

### Advanced Implementation
```javascript
<DataTable
  data={transactions}
  columns={columns}
  enableSearch={true}
  searchFunction={customSearchFunction}
  searchPlaceholder="Search transactions..."
  enablePagination={true}
  defaultPageSize={5}
  pageSizeOptions={[5, 10, 25, 50]}
  isLoading={isLoading}
  emptyMessage="No transactions found"
  onRowClick={handleRowClick}
  className="custom-table-styles"
/>
```

## Best Practices

### Performance
1. **Limit Initial Load**: Use reasonable default page sizes
2. **Debounce Search**: Prevent excessive API calls
3. **Memoize Expensive Operations**: Use React.memo and useMemo
4. **Optimize Re-renders**: Minimize unnecessary component updates

### User Experience
1. **Clear Loading States**: Show progress during data fetching
2. **Meaningful Empty States**: Provide helpful messages and actions
3. **Consistent Navigation**: Maintain state across page transitions
4. **Responsive Design**: Ensure usability across all devices

### Accessibility
1. **Semantic HTML**: Use proper table markup
2. **ARIA Labels**: Provide screen reader support
3. **Keyboard Navigation**: Support full keyboard interaction
4. **Focus Management**: Maintain logical focus order
