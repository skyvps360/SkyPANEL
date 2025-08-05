# VirtFusion Billing Mode Testing Guide

This guide helps you test the VirtFusion billing automation fix to ensure that hourly/monthly billing mode switching works correctly.

## Quick Test Steps

### 1. Access Admin Settings
1. Log in as an administrator
2. Go to Settings → VirtFusion API tab
3. Locate the billing automation section

### 2. Test Current Billing Mode
1. Click the **"Test Billing Mode"** button (next to "Test Connection")
2. This will show the current billing mode without making any changes
3. Note the result: should show either "HOURLY" or "MONTHLY"

### 3. Test Mode Switching

#### Switch to Hourly Billing
1. Enable **"Self Service Hourly Credit"** toggle
2. Ensure **"Enable VirtFusion Billing Automation"** is enabled
3. Click **"Save"** 
4. After save, you should see: "Billing mode is now: HOURLY"
5. Click **"Test Billing Mode"** again to verify

#### Switch to Monthly Billing  
1. Disable **"Self Service Hourly Credit"** toggle
2. Ensure **"Enable VirtFusion Billing Automation"** is enabled
3. Click **"Save"**
4. After save, you should see: "Billing mode is now: MONTHLY"
5. Click **"Test Billing Mode"** again to verify

## Detailed Verification

### Check Server Logs
Monitor the server logs for these messages when cron runs:

```bash
# For hourly billing mode
💰 Billing mode: HOURLY
🕐 Starting VirtFusion billing process...

# For monthly billing mode  
💰 Billing mode: MONTHLY
📅 Monthly billing mode detected - switching to monthly billing logic
🗓️ Starting VirtFusion monthly billing process...
```

### API Test Endpoint
You can also directly test the billing mode using the API:

```bash
curl -X GET "https://yourdomain.com/api/admin/cron/virtfusion-billing/test-mode" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "billingEnabled": true,
  "hourlyCreditEnabled": false,
  "billingMode": "MONTHLY",
  "cronSettings": {
    "enabled": true,
    "hourlyBillingEnabled": true,
    // ... other settings
  }
}
```

## Troubleshooting

### If Billing Mode Doesn't Switch

1. **Check Settings Storage**:
   - Verify that `virtfusion_self_service_hourly_credit` is saved correctly
   - Check database settings table for the updated value

2. **Check Cron Jobs**:
   - Ensure VirtFusion billing automation is enabled
   - Verify cron jobs restarted after settings change
   - Check PM2 logs: `pm2 logs skypanel`

3. **Manual Test**:
   - Use the "Test Billing Mode" button to see current detection
   - Check server console logs for billing mode detection

### Expected Behaviors

| Self Service Hourly Credit | Billing Mode | Description |
|---------------------------|--------------|-------------|
| ✅ Enabled (true) | HOURLY | Deducts credits every hour based on usage |
| ❌ Disabled (false) | MONTHLY | Charges full package price monthly |
| ❓ Not Set | MONTHLY | Defaults to monthly billing (safer) |

### Settings Validation

The system will show these indicators in the UI:

- **Self Service Hourly Credit Toggle**:
  - When ON: "🕐 Hourly billing: Deduct credits per hour based on server usage"
  - When OFF: "📅 Monthly billing: Charge full package price monthly"

- **Billing Automation Toggle**:
  - When ON: "✅ Billing automation is enabled - customers will be charged automatically"
  - When OFF: "❌ Billing automation is disabled - no automatic charges will occur"

## Testing with Real Servers

### For Hourly Billing Test
1. Create a test server in VirtFusion
2. Ensure hourly billing mode is enabled
3. Wait for next hour (or trigger manually)
4. Check that hourly charges appear in transactions

### For Monthly Billing Test  
1. Create a test server in VirtFusion
2. Ensure monthly billing mode is enabled
3. Trigger monthly billing manually or wait for monthly cycle
4. Check that monthly package charges appear in transactions

## Manual Trigger Commands

For immediate testing, you can manually trigger billing:

```bash
# Trigger hourly billing
curl -X POST "https://yourdomain.com/api/admin/cron/virtfusion-billing/trigger-hourly"

# Trigger monthly billing  
curl -X POST "https://yourdomain.com/api/admin/cron/virtfusion-billing/trigger-monthly"
```

## Common Issues and Solutions

### Issue: "Test Billing Mode" shows wrong mode
- **Solution**: Save settings again and wait a moment for cron jobs to restart

### Issue: No billing happening at all
- **Check**: Ensure "Enable VirtFusion Billing Automation" is enabled
- **Check**: Verify VirtFusion API connection is working
- **Check**: Confirm servers exist in VirtFusion billing table

### Issue: Monthly billing charges hourly rates
- **Solution**: This fix ensures monthly billing uses package pricing, not hourly rates
- **Verify**: Check transaction descriptions and amounts

## Success Criteria

✅ **Test Passed If**:
1. "Test Billing Mode" button shows correct mode after toggle changes
2. Settings save shows correct billing mode confirmation
3. Server logs show appropriate billing process starting
4. Actual billing behavior matches selected mode
5. UI descriptions accurately reflect current settings

❌ **Test Failed If**:
1. Billing mode doesn't change when toggle is switched
2. Wrong billing amounts are charged (hourly rates for monthly, etc.)
3. Billing stops working entirely
4. Settings don't persist after restart

---

## Next Steps After Testing

Once testing confirms the fix works:

1. **Monitor Production**: Watch for proper billing behavior over next billing cycles
2. **User Communication**: Inform users about any billing mode changes if applicable  
3. **Documentation**: Update any user-facing documentation about billing
4. **Backup**: Ensure regular backups include the fixed billing logic

If issues persist, check the server logs and use the test endpoint to diagnose the problem.