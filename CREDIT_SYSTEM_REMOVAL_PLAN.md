# SkyPANEL Legacy Credit System Removal Plan

## Overview
This document outlines the comprehensive plan to remove the legacy credit system from SkyPANEL and migrate all functionality to use the VirtFusion token system exclusively.

## Phase 1: Database Schema Changes

### 1.1 Remove Credits Column from Users Table
- **File**: `shared/schema.ts`
- **Action**: Remove `credits: real("credits").notNull().default(0)` from users table
- **Action**: Update `insertUserSchema` to remove credits exclusion
- **Action**: Update User type definitions

### 1.2 Create Database Migration Script
- **File**: `scripts/remove-legacy-credits.ts`
- **Action**: Create migration script to:
  - Remove `credits` column from `users` table
  - Clean up legacy credit transactions
  - Preserve VirtFusion-related transactions

## Phase 2: Backend API Cleanup

### 2.1 Remove Legacy Credit API Endpoints
- **File**: `server/routes_new.ts`
- **Remove**: `/api/billing/add-credits` endpoint (lines 4449-4700)
- **Remove**: `/api/billing/capture-paypal-payment` endpoint (lines 4081-4268)
- **Remove**: `/api/billing/verify-paypal-payment` endpoint (lines 4271-4447)
- **Remove**: `/api/credits` admin endpoint (lines 6490-6550)
- **Remove**: `/api/credits/:id` delete endpoint (lines 6650-6690)

### 2.2 Update Balance API Endpoint
- **File**: `server/routes_new.ts`
- **Action**: Modify `/api/billing/balance` to only return VirtFusion data
- **Remove**: Local credits tracking and fallback logic

### 2.3 Remove Credit Deduction Logic
- **File**: `server/routes_new.ts`
- **Remove**: Credit deduction logic from server creation (lines 3086-3106)
- **Action**: Ensure VirtFusion handles all billing automatically

### 2.4 Update Storage Functions
- **File**: `server/storage.ts`
- **Remove**: `updateUserCredits` function (lines 556-563)
- **Update**: Remove credits from user update operations
- **Update**: Remove credits from user selection queries

### 2.5 Update API-Only Routes
- **File**: `server/routes/api-only-routes.ts`
- **Update**: Balance endpoint to only return VirtFusion data
- **Remove**: Legacy credits references

### 2.6 Update API V1 Routes
- **File**: `server/routes/api-v1-routes.ts`
- **Update**: Balance endpoint to use VirtFusion tokens only

## Phase 3: Frontend Component Removal

### 3.1 Remove PayPal Integration
- **File**: `client/src/components/billing/PayPalCheckout.tsx`
- **Action**: Delete entire component
- **Dependencies**: Remove PayPal SDK references

### 3.2 Update Billing Page
- **File**: `client/src/pages/billing-page.tsx`
- **Remove**: PayPal checkout integration
- **Remove**: Legacy credit balance displays
- **Update**: Focus on VirtFusion token management only

### 3.3 Update Dashboard Layout
- **File**: `client/src/components/layouts/DashboardLayout.tsx`
- **Update**: Credit balance display to show only VirtFusion tokens
- **Remove**: Fallback to local credits

### 3.4 Update Admin User Management
- **File**: `client/src/pages/admin/user-edit-page.tsx`
- **Remove**: Legacy credit management sections
- **Keep**: VirtFusion credit management only

### 3.5 Update Transaction Components
- **File**: `client/src/components/dashboard/BillingActivity.tsx`
- **Update**: Remove legacy credit transaction types
- **Focus**: VirtFusion transactions only

### 3.6 Update API Client
- **File**: `client/src/lib/api.ts`
- **Remove**: `addCredits` function
- **Remove**: `getCreditBalance` function (replace with VirtFusion equivalent)

## Phase 4: Configuration Cleanup

### 4.1 Remove PayPal Environment Variables
- **Documentation**: Update README.md to remove PayPal configuration
- **Scripts**: Update `scripts/verify-env.js` to remove PayPal checks

### 4.2 Update API Documentation
- **File**: `client/src/pages/api-docs/index.tsx`
- **Remove**: Legacy credit API endpoints
- **File**: `client/src/pages/admin/api-docs-page.tsx`
- **Update**: Remove credit-related endpoints

## Phase 5: Documentation Updates

### 5.1 Update README Files
- **File**: `readme.md`
- **Remove**: Credit system documentation
- **Update**: Focus on VirtFusion token system
- **File**: `readme-old.md`
- **Archive**: Move to historical documentation

### 5.2 Update Internal Documentation
- **Action**: Update any internal comments referencing credit system
- **Action**: Update API documentation to reflect VirtFusion-only billing

## Phase 6: Testing and Validation

### 6.1 Database Migration Testing
- **Action**: Test migration script on development database
- **Verify**: No data loss for VirtFusion transactions
- **Verify**: Users retain VirtFusion account links

### 6.2 API Endpoint Testing
- **Test**: All billing endpoints return VirtFusion data only
- **Test**: Server creation works with VirtFusion billing
- **Test**: Admin functions work without legacy credits

### 6.3 Frontend Testing
- **Test**: All UI components display VirtFusion data correctly
- **Test**: No broken links or references to removed components
- **Test**: Admin panels function without legacy credit management

## Phase 7: Deployment Strategy

### 7.1 Pre-Deployment
- **Backup**: Full database backup before migration
- **Notification**: Inform users of billing system changes
- **Documentation**: Prepare support documentation

### 7.2 Deployment Steps
1. Deploy backend changes (API endpoints)
2. Run database migration script
3. Deploy frontend changes
4. Update environment configuration
5. Verify all systems operational

### 7.3 Post-Deployment
- **Monitor**: VirtFusion API integration
- **Verify**: User billing continues to work
- **Support**: Handle any user questions about changes

## Backward Compatibility Considerations

### 7.1 Data Preservation
- **Maintain**: Historical transaction records for audit purposes
- **Preserve**: VirtFusion account links and configurations
- **Archive**: Legacy credit data rather than deleting

### 7.2 Graceful Degradation
- **Fallback**: Ensure VirtFusion API failures don't break core functionality
- **Error Handling**: Proper error messages for billing issues
- **Support**: Clear documentation for troubleshooting

## Risk Mitigation

### 8.1 Technical Risks
- **Database Migration**: Test thoroughly in staging environment
- **API Dependencies**: Ensure VirtFusion API is stable and reliable
- **User Experience**: Minimize disruption to existing workflows

### 8.2 Business Risks
- **User Communication**: Clear communication about changes
- **Support Preparation**: Train support team on new system
- **Rollback Plan**: Ability to revert changes if critical issues arise

## Success Criteria

1. **Complete Removal**: No legacy credit system code remains
2. **VirtFusion Integration**: All billing uses VirtFusion tokens exclusively
3. **Data Integrity**: No loss of important user or transaction data
4. **User Experience**: Seamless transition for existing users
5. **System Stability**: No degradation in system performance or reliability

## Timeline Estimate

- **Phase 1-2 (Backend)**: 2-3 days
- **Phase 3 (Frontend)**: 2-3 days  
- **Phase 4-5 (Config/Docs)**: 1 day
- **Phase 6 (Testing)**: 2-3 days
- **Phase 7 (Deployment)**: 1 day
- **Total**: 8-11 days

This plan ensures a systematic and safe removal of the legacy credit system while maintaining full functionality through the VirtFusion token system.
