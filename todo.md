# Fix Ticket Sorting by ID Issue

## Problem
The `/admin/tickets` page does not properly sort tickets by ID for both open and closed tickets. Currently, tickets are being sorted by `createdAt` timestamp instead of by ID.

## Root Cause Analysis
1. **Backend Issue**: The `getAllTicketsPaginated` function in `storage.ts` sorts tickets by `desc(tickets.createdAt)` (newest first)
2. **Frontend Issue**: The `tickets-page.tsx` component sorts tickets again by `createdAt` in ascending order (oldest first)
3. **Expected Behavior**: Tickets should be sorted by ID for proper ordering

## Tasks to Complete

### Backend Changes
- [X] Update `getAllTicketsPaginated` function in `storage.ts` to sort by ticket ID instead of `createdAt`
- [X] Change from `orderBy(desc(tickets.createdAt))` to `orderBy(desc(tickets.id))` for newest tickets first by ID
- [X] Verify other ticket-related functions maintain consistent ID-based sorting
  - [X] Updated `getUserTickets` to sort by ID
  - [X] Updated `getAllTickets` to sort by ID
  - [X] Updated `getUserTicketsPaginated` to sort by ID
  - [X] Updated `getTicketsByStatus` to sort by ID

### Frontend Changes
- [X] Update `tickets-page.tsx` to sort by ticket ID instead of `createdAt`
- [X] Change the sorting logic from `new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()` to `b.id - a.id` for descending ID order
- [X] Ensure the sorting is consistent with backend ordering

### Testing
- [X] Test open tickets sorting by ID
- [X] Test closed tickets sorting by ID
- [X] Verify pagination works correctly with ID-based sorting
- [X] Confirm search functionality still works with new sorting
- [X] Development server restarted successfully
- [X] Admin tickets page accessible at http://localhost:3000/admin/tickets

## Files to Modify
1. `c:\Users\Administrator\Documents\SkyPANEL\server\storage.ts` (line 989)
2. `c:\Users\Administrator\Documents\SkyPANEL\client\src\pages\admin\tickets-page.tsx` (lines 134-137)

## Expected Outcome
Tickets will be properly sorted by ID in descending order (highest ID first) on the `/admin/tickets` page for both open and closed ticket tabs.