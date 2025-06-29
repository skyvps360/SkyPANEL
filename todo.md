# TODO: Fix Linter and Code Errors

Below are the issues detected by Codacy MCP. Each must be fixed and checked off.

## client/src/components/layout/AdminLayout.tsx

- [x] Line 33: 'ScrollArea' is defined but never used.
- [x] Line 131: 'toast' is assigned a value but never used.
- [x] Line 211: 'applyToShadcnTheme' is defined but never used.
- [x] Line 211: Promises must be awaited or handled.
- [x] Line 289: Unnecessary optional chain on a non-nullish value.
- [x] Line 345: Prefer using an optional chain expression.
- [x] Line 453: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 805: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 840: 'index' is defined but never used.
- [x] Line 846: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 131: 'toast' is assigned a value but never used.
- [x] Line 51: Promises must be awaited or handled.

## client/src/components/layout/SharedFooter.tsx

- [x] Line 9: 'Globe' is defined but never used.
- [x] Line 26: 'FooterSettings' is defined but never used.
- [x] Line 79: Type string trivially inferred from a string literal.

## client/src/components/layouts/DashboardLayout.tsx

- [x] Line 10: 'Network' is defined but never used.
- [x] Line 26: 'Receipt' is defined but never used.
- [x] Line 198: Unnecessary optional chain on a non-nullish value.
- [x] Line 204: 'queryClient' is assigned a value but never used.
- [x] Line 705: Unnecessary conditional, value is always truthy.

## client/src/components/ui/data-table.tsx

- [x] Line 15: 'DropdownMenuItem' is defined but never used.
- [x] Line 154: Variable Assigned to Object Injection Sink (security warning).
- [x] Line 419: Returning a void expression from an arrow function shorthand is forbidden.

## client/src/components/ui/enhanced-color-selector.tsx

- [x] Line 391: Unnecessary optional chain on a non-nullish value.
- [x] Line 567: 'categories' is assigned a value but never used.

## client/src/components/ui/label.tsx

- [x] Line 14: 'any' overrides all other types in this intersection type.

## client/src/components/ui/theme-toggle.tsx

- [x] Line 23: 'cancelReload' is assigned a value but never used.
- [x] Line 24: Cannot find namespace 'NodeJS'.

## client/src/pages/admin/AdminChatManagement.tsx

- [x] Line 280: Promises must be awaited or handled.
- [x] Line 592: Unnecessary optional chain on a non-nullish value.
- [ ] Line 703: Generic Object Injection Sink (security warning).
- [x] Line 711: Promises must be awaited or handled.
- [x] Line 763: Prefer using nullish coalescing operator.

## client/src/pages/admin/legal-editor.tsx

- [x] Line 18: 'SelectContent' is defined but never used.
- [x] Line 19: 'SelectItem' is defined but never used.
- [x] Line 96: 'isLoading' is assigned a value but never used.
- [x] Line 218: Unexpected any. Specify a different type.
- [x] Line 447: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 480: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 516: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 8: 'SelectContent' is defined but never used.

## client/src/pages/admin/package-pricing.tsx

- [x] Line 48: 'Separator' is defined but never used.
- [x] Line 201: Async method 'mutationFn' has no 'await' expression.
- [x] Line 290: 'any' overrides all other types in this intersection type.
- [x] Line 364: 'any' overrides all other types in this intersection type.
- [x] Line 964: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 1029: Unnecessary optional chain on a non-nullish value.
- [x] Line 1472: Returning a void expression from an arrow function shorthand is forbidden.

## client/src/pages/admin/users-page.tsx

- [x] Line 51: Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined.
- [x] Line 52: Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined.
- [x] Line 123: Unexpected any. Specify a different type.
- [x] Line 543: Returning a void expression from an arrow function shorthand is forbidden.

## client/src/pages/plans/index.tsx

- [x] Line 4: 'Check' is defined but never used.
- [x] Line 225: Unexpected any. Specify a different type.
- [x] Line 541: Prefer using nullish coalescing operator.
- [x] Line 539: Prefer using nullish coalescing operator.
- [x] Line 808: Unexpected any. Specify a different type.
- [x] Line 810: Unnecessary conditional, value is always falsy.
- [x] Line 834: Unexpected any. Specify a different type.
- [x] Fix misplaced import statement inside component render in client/src/pages/plans/index.tsx (syntax error)

## client/src/pages/sla-plans-page.tsx

- [x] Line 60: Prefer using nullish coalescing operator.
- [x] Line 118: Prefer using nullish coalescing operator.

## client/src/pages/tickets-page.tsx

- [x] Line 5: 'CardFooter' is defined but never used.
- [x] Line 15: 'AlertCircle' is defined but never used.
- [x] Line 58: 'refetch' is assigned a value but never used.
- [x] Line 280: Returning a void expression from an arrow function shorthand is forbidden.
- [x] Line 369: Returning a void expression from an arrow function shorthand is forbidden.

## server/gemini-service.ts

- [ ] Line 6: 'sql' is defined but never used.
- [ ] Line 16: 'any' overrides all other types in this union type.
- [ ] Line 27: Unnecessary conditional, value is always falsy.
- [ ] Line 39: Prefer using nullish coalescing operator.
- [ ] Line 237: Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
- [ ] Line 277: Array type using 'Array<T>' is forbidden. Use 'T[]' instead.
- [ ] Line 347: Prefer using nullish coalescing operator.
- [ ] Line 387: 'question' is defined but never used.
- [ ] Line 389: 'req' is defined but never used.
- [ ] Line 808: 'any' overrides all other types in this intersection type.

## server/index.ts

- [ ] Line 8: 'emailQueueManager' is defined but never used.
- [ ] Line 19: 'getMaintenanceStatus' is defined but never used.
- [ ] Line 173: Promise returned in function argument where a void return was expected.

## server/virtfusion-api.ts

- [ ] Line 85: Unexpected any. Specify a different type.
- [ ] Line 117: 'maskedToken' is assigned a value but never used.
- [ ] Line 443: Unexpected any. Specify a different type.
- [ ] Line 570: Prefer using an optional chain expression.
- [ ] Line 689: Unexpected any. Specify a different type.
- [ ] Line 876: Type boolean trivially inferred from a boolean literal.

## server/test-models.ts

- [ ] Line 87: Unexpected any. Specify a different type.

---

(And more. This list is based on the first 100 issues reported by Codacy MCP. Continue to next page if needed. which needs to be made once ALL tasks are done
inside of this current todo.md file)
