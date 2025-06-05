// Test file to manually test negative balance deductions

console.log('Starting test for negative balance deductions...');

// Mock user data
const testUser = {
  id: 1, // Use a test user ID
  virtFusionId: 1, // VirtFusion ID
};

console.log('='.repeat(60));
console.log('SCENARIO 1: PayPal Payment with Negative Balance');
console.log('='.repeat(60));

// Mock payment data
const paymentData = {
  amount: 5.00, // $5.00 payment
  paymentId: 'test-payment-' + Date.now(),
  verificationData: {
    verified: true,
    amount: 5.00,
    currency: 'USD',
    orderId: 'test-order-' + Date.now(),
  }
};

// Simulate the PayPal payment process
console.log('Simulating PayPal payment with negative balance...');
  
// 1. Mock getting initial balance (negative)
const initialBalance = -3.50; // -$3.50
console.log(`Initial balance: $${initialBalance}`);

// 2. Create transaction record for credit
const creditTransaction = {
  userId: testUser.id,
  amount: paymentData.amount,
  type: 'virtfusion_credit',
  description: 'Test VirtFusion token purchase via PayPal',
  status: 'completed',
  paymentMethod: 'paypal',
  paymentId: paymentData.paymentId,
};
console.log('Created credit transaction:', creditTransaction);

// 3. Mock VirtFusion API credit addition
console.log(`Adding ${paymentData.amount * 100} tokens to VirtFusion...`);

// 4. Mock what VirtFusion would actually do
// In reality, VirtFusion would automatically deduct the negative balance from the payment
// This means the user would receive less than they paid for
// When a user has -$3.50 and adds $5.00, VirtFusion would use $3.50 to clear the negative balance
// and only add the remaining $1.50 to the user's balance
const actualTokensAdded = (paymentData.amount + initialBalance) * 100; // Only the remainder gets added as tokens
console.log(`VirtFusion actually adds: ${actualTokensAdded} tokens (after covering negative balance)`);

// 5. Mock getting updated balance from VirtFusion
// This should be what's left after VirtFusion deducts the negative balance
const updatedBalance = actualTokensAdded / 100; // The actual balance that VirtFusion would report
console.log(`Updated balance reported by VirtFusion: $${updatedBalance}`);

// 6. Calculate the expected balance if the negative balance deduction didn't happen
const expectedBalance = initialBalance + paymentData.amount; // -3.50 + 5.00 = 1.50
console.log(`Expected balance if no deduction happened: $${expectedBalance.toFixed(2)}`);

// 7. Check if there was a negative balance deduction (our logic in the real code)
if (initialBalance < 0) {
  // Calculate the deduction amount as the absolute value of the negative balance
  // This ensures we always show the actual amount that was deducted
  const deductionAmount = Math.abs(initialBalance);
  console.log(`✅ DETECTED negative balance deduction: $${deductionAmount.toFixed(2)}`);
  
  // 8. Create a second transaction to record the automatic deduction
  const deductionTransaction = {
    userId: testUser.id,
    amount: -deductionAmount, // Store as negative amount
    type: 'virtfusion_deduction',
    description: `Automatic deduction to cover negative balance (linked to transaction #${creditTransaction.userId})`,
    status: 'completed',
    paymentMethod: 'paypal',
    paymentId: paymentData.paymentId,
  };
  console.log('✅ Created deduction transaction:', deductionTransaction);
} else {
  console.log("❌ No negative balance deduction detected or deduction not needed");
}

console.log('\n' + '='.repeat(60));
console.log('SCENARIO 2: Admin Credit Addition with Negative Balance');
console.log('='.repeat(60));

// Mock admin credit addition
const adminCreditData = {
  amount: 500, // 500 tokens = $5.00
  reference: 'Admin added credits via dashboard',
};

console.log('Simulating admin credit addition with negative balance...');

// 1. Same initial balance (negative)
const adminInitialBalance = -2.25; // -$2.25
console.log(`Initial balance: $${adminInitialBalance}`);

// 2. Create transaction record for admin credit
const adminCreditTransaction = {
  userId: testUser.id,
  amount: adminCreditData.amount / 100, // Convert tokens to dollars for display
  type: 'credit',
  description: `Added ${adminCreditData.amount} tokens to VirtFusion (Credit ID: 12345)`,
  status: 'completed',
  reference: adminCreditData.reference,
};
console.log('Created admin credit transaction:', adminCreditTransaction);

// 3. Mock VirtFusion API credit addition
console.log(`Adding ${adminCreditData.amount} tokens to VirtFusion...`);

// 4. Mock what VirtFusion would actually do for admin credits
// Same behavior - VirtFusion automatically deducts negative balance
const adminActualTokensAdded = ((adminCreditData.amount / 100) + adminInitialBalance) * 100;
console.log(`VirtFusion actually adds: ${adminActualTokensAdded} tokens (after covering negative balance)`);

// 5. Mock getting updated balance from VirtFusion
const adminUpdatedBalance = adminActualTokensAdded / 100;
console.log(`Updated balance reported by VirtFusion: $${adminUpdatedBalance}`);

// 6. Calculate the expected balance if no deduction happened
const adminExpectedBalance = adminInitialBalance + (adminCreditData.amount / 100); // -2.25 + 5.00 = 2.75
console.log(`Expected balance if no deduction happened: $${adminExpectedBalance.toFixed(2)}`);

// 7. Check if there was a negative balance deduction
if (adminInitialBalance < 0) {
  // Calculate the deduction amount as the absolute value of the negative balance
  const adminDeductionAmount = Math.abs(adminInitialBalance);
  console.log(`✅ DETECTED negative balance deduction: $${adminDeductionAmount.toFixed(2)}`);
  
  // 8. Create a second transaction to record the automatic deduction
  const adminDeductionTransaction = {
    userId: testUser.id,
    amount: -adminDeductionAmount, // Store as negative amount
    type: 'virtfusion_deduction',
    description: `Automatic deduction to cover negative balance (linked to transaction #${adminCreditTransaction.userId})`,
    status: 'completed',
    paymentMethod: null, // No payment method for admin credits
    paymentId: null, // No payment ID for admin credits
  };
  console.log('✅ Created admin deduction transaction:', adminDeductionTransaction);
} else {
  console.log("❌ No negative balance deduction detected or deduction not needed");
}

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log('Both PayPal payments and admin credit additions should now');
console.log('properly detect and track negative balance deductions as');
console.log('separate "virtfusion_deduction" transaction records.');
console.log('This ensures users can see exactly what happened to their');
console.log('added credits when they had a negative balance.');
console.log('='.repeat(60));

console.log('Test complete!');
