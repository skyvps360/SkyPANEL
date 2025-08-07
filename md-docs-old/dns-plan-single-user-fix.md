# DNS Plan Single-User System Fix

## Problem Description

The DNS plan system was designed to enforce a single-plan-per-user constraint, but had critical implementation flaws that allowed users to accumulate multiple active DNS plan subscriptions simultaneously.

### Root Causes Identified

1. **Incomplete Plan Change Logic**: The `/api/dns-plans/change` endpoint only retrieved the first active subscription (`.limit(1)`) instead of all active subscriptions
2. **Missing Constraint Enforcement**: No database-level constraints prevented multiple active subscriptions
3. **Inadequate Purchase Validation**: The purchase endpoint only checked for the same plan, not any active plan
4. **Partial Subscription Updates**: Plan changes updated only one subscription instead of cancelling all and creating a new one

### Specific Issues

- **Admin User Case**: Had 3 active subscriptions (Free, Basic, Pro) simultaneously
- **UI Confusion**: All plans showed "Current Plan" status
- **Billing Problems**: Prorated calculations failed due to multiple subscription confusion
- **Plan Change Failures**: Users couldn't downgrade because system couldn't determine which subscription to modify

## Solution Implementation

### 1. Fixed Plan Change Endpoint (`/api/dns-plans/change`)

**Before:**
```typescript
// Only got first active subscription
const [currentSubscription] = await db.select(...)
  .where(and(...))
  .limit(1);

// Only updated one subscription
await tx.update(dnsPlanSubscriptionsTable)
  .set({ planId: newPlan.id })
  .where(eq(dnsPlanSubscriptionsTable.id, currentSubscription.id));
```

**After:**
```typescript
// Get ALL active subscriptions
const activeSubscriptions = await db.select(...)
  .where(and(...));
  // No .limit(1) - get all!

// Cancel ALL existing subscriptions
const activeSubscriptionIds = activeSubscriptions.map(sub => sub.id);
await tx.update(dnsPlanSubscriptionsTable)
  .set({ status: 'cancelled', autoRenew: false })
  .where(inArray(dnsPlanSubscriptionsTable.id, activeSubscriptionIds));

// Create ONE new subscription
await tx.insert(dnsPlanSubscriptionsTable).values({
  userId: userId,
  planId: newPlan.id,
  status: 'active',
  // ... other fields
});
```

### 2. Enhanced Purchase Endpoint (`/api/dns-plans/purchase`)

**Before:**
```typescript
// Only checked for same plan
const existingSubscription = await db.select()
  .where(and(
    eq(dnsPlanSubscriptionsTable.userId, userId),
    eq(dnsPlanSubscriptionsTable.planId, planId), // Same plan only
    eq(dnsPlanSubscriptionsTable.status, 'active')
  ));
```

**After:**
```typescript
// Check for ANY active subscription
const existingActiveSubscriptions = await db.select()
  .where(and(
    eq(dnsPlanSubscriptionsTable.userId, userId),
    eq(dnsPlanSubscriptionsTable.status, 'active') // Any active plan
  ));

if (existingActiveSubscriptions.length > 0) {
  // Redirect to change endpoint instead of allowing new purchase
  return res.status(400).json({ 
    error: "You already have an active DNS plan. Use the plan change feature to upgrade or downgrade.",
    shouldUseChangeEndpoint: true
  });
}
```

### 3. Database Constraint Addition

Added a unique partial index to prevent multiple active subscriptions at the database level:

```sql
CREATE UNIQUE INDEX unique_active_subscription_per_user 
ON dns_plan_subscriptions (user_id) 
WHERE status = 'active'
```

This provides an additional safety layer beyond application logic.

### 4. Improved Error Handling

- **Clear Error Messages**: Users get specific guidance on using plan change vs purchase
- **Validation Logic**: Multiple checks prevent invalid states
- **Transaction Safety**: All operations wrapped in database transactions

## Testing and Verification

### Scripts Created

1. **`scripts/investigate-dns-subscriptions.ts`**: Identifies users with multiple subscriptions
2. **`scripts/fix-dns-subscriptions.ts`**: Cleans up existing violations
3. **`scripts/add-dns-subscription-constraint.ts`**: Adds database constraint
4. **`scripts/test-dns-plan-fixes.ts`**: Verifies fixes work correctly

### Test Results

```bash
# Before fixes
Users with multiple active plans: 1
Total subscription violations: 2

# After fixes  
Users with multiple active plans: 0
Total subscription violations: 0
✅ ALL TESTS PASSED!
```

## Implementation Steps Taken

1. **Investigation**: Identified admin user with 3 active subscriptions
2. **Root Cause Analysis**: Found flawed `.limit(1)` logic in plan change endpoint
3. **Code Fixes**: Updated both purchase and change endpoints
4. **Database Constraint**: Added unique index for additional safety
5. **Testing**: Created comprehensive test scripts
6. **Verification**: Confirmed single-plan-per-user enforcement

## Benefits Achieved

- ✅ **Single Plan Enforcement**: Users can only have one active DNS plan
- ✅ **Correct Billing**: Prorated calculations work properly
- ✅ **UI Consistency**: Only one plan shows as "Current Plan"
- ✅ **Plan Changes Work**: Upgrades and downgrades function correctly
- ✅ **Database Safety**: Constraint prevents future violations
- ✅ **Clear User Experience**: Proper error messages and guidance

## Future Considerations

1. **Migration Strategy**: For existing users with multiple plans, keep highest-tier plan
2. **Monitoring**: Regular checks for constraint violations
3. **User Communication**: Clear messaging about single-plan limitation
4. **Admin Tools**: Ability to manually resolve edge cases

## Related Files Modified

- `server/routes_new.ts`: Fixed plan change and purchase endpoints
- `shared/schema.ts`: No changes needed (constraint added via migration)
- `scripts/`: Multiple new scripts for investigation, fixing, and testing

## Deployment Notes

1. Run investigation script first to identify violations
2. Apply code fixes to prevent new violations
3. Run cleanup script to fix existing violations
4. Add database constraint for permanent protection
5. Run test script to verify everything works

This fix ensures the DNS plan system works as originally designed with proper single-plan-per-user enforcement.
