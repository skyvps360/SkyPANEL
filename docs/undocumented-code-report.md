# Undocumented Code Report

Generated on: 2025-06-13, 10:05:17 p.m.

## Summary

| Category | Total | Undocumented | Coverage |
|----------|-------|--------------|----------|
| Files | 329 | 13 | 96% |
| Functions | 942 | 859 | 9% |
| Classes | 49 | 40 | 18% |
| Interfaces | 251 | 249 | 1% |
| Components/Hooks | 572 | 572 | 0% |

## Undocumented Items

### server/routes_new.ts (116 items)

| Type | Line | Name |
|------|------|------|
| Function | 63 | handleZodError |
| Function | 69 | isAuthenticated |
| Function | 77 | isAdmin |
| Function | 100 | registerRoutes |
| Hook | 327 | userId |
| Hook | 330 | user |
| Hook | 802 | userId |
| Hook | 814 | user |
| Function | 833 | startIndex |
| Hook | 1043 | userId |
| Hook | 1057 | user |
| Hook | 1113 | userId |
| Hook | 1127 | user |
| Hook | 1135 | userServers |
| Hook | 1214 | userId |
| Hook | 1234 | user |
| Hook | 1299 | userId |
| Hook | 1340 | userId |
| Hook | 1353 | user |
| Hook | 1360 | userServers |
| Hook | 1400 | userId |
| Hook | 1414 | user |
| Hook | 1420 | userServers |
| Hook | 1451 | userId |
| Hook | 1465 | user |
| Hook | 1471 | userServers |
| Hook | 1753 | userId |
| Hook | 1755 | user |
| Hook | 1828 | userId |
| Function | 1870 | formatTransactionDescriptionForPdf |
| Function | 1891 | formatPaymentMethodForPdf |
| Function | 1910 | formatSingleTransactionPdf |
| Function | 1972 | addField |
| Component | 1972 | addField |
| Function | 2047 | formatTransactionsPdf |
| Hook | 2231 | user |
| Hook | 2393 | userCheckResult |
| Hook | 2654 | userId |
| Hook | 2692 | userId |
| Hook | 2732 | user |
| Hook | 2842 | userId |
| Function | 2910 | proratedAmount |
| Hook | 2919 | user |
| Hook | 2976 | user |
| Hook | 3011 | userDomains |
| Hook | 3180 | user |
| Hook | 3221 | userDomains |
| Hook | 3273 | userId |
| Hook | 3318 | userId |
| Hook | 3361 | userDomains |
| Hook | 3422 | user |
| Hook | 3598 | userCheckResult |
| Function | 4011 | offset |
| Hook | 4060 | user |
| Hook | 4061 | userName |
| Hook | 4319 | userServers |
| Hook | 4387 | user |
| Hook | 4388 | userName |
| Hook | 4456 | user |
| Hook | 4510 | user |
| Hook | 4511 | userName |
| Hook | 4566 | userName |
| Hook | 4625 | userName |
| Hook | 4684 | user |
| Hook | 4818 | userName |
| Hook | 4857 | users |
| Hook | 4871 | userIds |
| Hook | 4874 | users |
| Hook | 4877 | userMap |
| Hook | 4884 | user |
| Hook | 5000 | userId |
| Hook | 5009 | user |
| Hook | 5037 | userId |
| Hook | 5043 | user |
| Function | 5103 | offset |
| Hook | 5115 | user |
| Hook | 5197 | userId |
| Hook | 5219 | userId |
| Hook | 5225 | user |
| Hook | 5309 | userId |
| Hook | 5316 | user |
| Hook | 5411 | userId |
| Hook | 5417 | user |
| Hook | 5509 | userId |
| Hook | 5515 | user |
| Hook | 5654 | userId |
| Hook | 5660 | user |
| Hook | 5813 | userId |
| Hook | 5819 | user |
| Hook | 5988 | userId |
| Hook | 5994 | user |
| Hook | 6066 | userId |
| Hook | 6072 | user |
| Hook | 6150 | user |
| Function | 7129 | testConnection |
| Component | 7129 | testConnection |
| Hook | 7172 | userId |
| Hook | 7225 | userId |
| Function | 7388 | handleWebSocketUpgrade |
| Component | 7388 | handleWebSocketUpgrade |
| Function | 8402 | syncStorageVolumesFromVirtFusion |
| Hook | 8410 | userServers |
| Function | 8431 | syncServerStorageFromVirtFusion |
| Hook | 8588 | userCheckResult |
| Hook | 8764 | user |
| Hook | 9327 | userId |
| Hook | 9361 | userId |
| Function | 10430 | mapBetterStackStatus |
| Hook | 10462 | user |
| Hook | 10735 | user |
| Hook | 10929 | user |
| Hook | 11015 | user |
| Hook | 11075 | user |
| Hook | 11237 | users |
| Hook | 11255 | userId |
| Hook | 11279 | user |

### client/src/lib/api.ts (41 items)

| Type | Line | Name |
|------|------|------|
| Function | 15 | getServers |
| Function | 16 | getServer |
| Function | 17 | createServer |
| Function | 18 | deleteServer |
| Function | 21 | startServer |
| Function | 22 | stopServer |
| Function | 23 | restartServer |
| Function | 26 | getIpAddresses |
| Function | 27 | allocateIp |
| Function | 29 | releaseIp |
| Function | 33 | getTransactions |
| Function | 34 | getVirtFusionBalance |
| Function | 35 | addVirtFusionTokens |
| Function | 39 | getDnsDomains |
| Function | 40 | addDnsDomain |
| Function | 42 | deleteDnsDomain |
| Function | 44 | getDnsRecords |
| Function | 46 | addDnsRecord |
| Function | 53 | updateDnsRecord |
| Function | 60 | deleteDnsRecord |
| Function | 64 | getDnsPlanLimits |
| Function | 67 | getTickets |
| Function | 68 | getTicket |
| Function | 69 | createTicket |
| Function | 70 | addTicketMessage |
| Function | 72 | closeTicket |
| Function | 75 | getUsers |
| Function | 76 | updateUserRole |
| Function | 78 | getAllServers |
| Function | 79 | getAllTickets |
| Function | 80 | syncHypervisors |
| Function | 83 | getCacheStatus |
| Function | 84 | clearAllCaches |
| Function | 85 | clearSpecificCache |
| Function | 89 | getHypervisors |
| Function | 92 | getOsTemplates |
| Function | 95 | getNotifications |
| Function | 96 | getUnreadNotificationCount |
| Function | 103 | markNotificationAsRead |
| Function | 104 | markAllNotificationsAsRead |
| Function | 105 | deleteNotification |

### client/src/pages/server-detail-page.tsx (39 items)

| Type | Line | Name |
|------|------|------|
| Function | 62 | UbuntuIcon |
| Function | 74 | DebianIcon |
| Function | 82 | CentOSIcon |
| Function | 92 | RockyLinuxIcon |
| Function | 101 | AlmaLinuxIcon |
| Function | 109 | FedoraIcon |
| Function | 117 | WindowsIcon |
| Function | 124 | ArchLinuxIcon |
| Function | 132 | FreeBSDIcon |
| Function | 140 | AlpineIcon |
| Function | 148 | UnknownOSIcon |
| Function | 155 | getOSIconAndColor |
| Function | 184 | formatBytes |
| Function | 197 | TrafficTab |
| Component | 197 | TrafficTab |
| Function | 212 | getChartData |
| Component | 212 | getChartData |
| Function | 228 | limitInBytes |
| Function | 242 | limitInBytes |
| Function | 415 | formatDate |
| Function | 449 | VNCTab |
| Component | 449 | VNCTab |
| Function | 488 | openVNCConsole |
| Component | 488 | openVNCConsole |
| Function | 702 | PowerStatusBadge |
| Component | 702 | PowerStatusBadge |
| Function | 813 | copyToClipboard |
| Component | 813 | copyToClipboard |
| Function | 967 | getOSInfo |
| Function | 1054 | extractOSTemplateId |
| Function | 1088 | getServerOSInfo |
| Function | 1131 | openVNCConsole |
| Component | 1131 | openVNCConsole |
| Function | 1161 | getServerRunningState |
| Component | 1161 | getServerRunningState |
| Function | 1186 | getDisplayStatus |
| Component | 1186 | getDisplayStatus |
| Function | 1207 | handlePowerAction |
| Component | 1207 | handlePowerAction |

### client/src/pages/admin/api-docs-page.tsx (36 items)

| Type | Line | Name |
|------|------|------|
| Interface | 39 | ApiDocsContextType |
| Function | 47 | useApiDocsContext |
| Hook | 47 | useApiDocsContext |
| Interface | 56 | ApiEndpoint |
| Interface | 73 | ApiCategoryProps |
| Function | 82 | EndpointCard |
| Component | 82 | EndpointCard |
| Function | 86 | copyEndpointUrl |
| Component | 86 | copyEndpointUrl |
| Function | 93 | getCurlCommand |
| Function | 130 | getMethodColor |
| Function | 237 | ApiCategory |
| Component | 237 | ApiCategory |
| Function | 271 | EndpointOverview |
| Component | 271 | EndpointOverview |
| Function | 1869 | ApiKeyManagement |
| Component | 1869 | ApiKeyManagement |
| Function | 1894 | fetchApiKeys |
| Function | 1916 | handleCreateApiKey |
| Function | 1977 | handleDeleteApiKey |
| Function | 2008 | copyToClipboard |
| Component | 2008 | copyToClipboard |
| Function | 2017 | formatDate |
| Component | 2017 | formatDate |
| Function | 2337 | getCompanyName |
| Function | 2342 | handleSearch |
| Component | 2342 | handleSearch |
| Function | 2349 | handleTagSelect |
| Component | 2349 | handleTagSelect |
| Function | 2358 | clearSearch |
| Component | 2358 | clearSearch |
| Function | 2366 | resetFilters |
| Component | 2366 | resetFilters |
| Function | 2372 | getFilteredEndpoints |
| Component | 2372 | getFilteredEndpoints |
| Function | 2383 | getAllTags |

### client/src/pages/api-docs/index.tsx (34 items)

| Type | Line | Name |
|------|------|------|
| Interface | 19 | ApiDocsContextType |
| Function | 26 | useApiDocsContext |
| Hook | 26 | useApiDocsContext |
| Interface | 35 | ApiEndpoint |
| Interface | 52 | ApiCategoryProps |
| Function | 61 | ApiKeyManagement |
| Component | 61 | ApiKeyManagement |
| Function | 93 | handleCreateApiKey |
| Function | 150 | handleDeleteApiKey |
| Function | 181 | copyToClipboard |
| Component | 181 | copyToClipboard |
| Function | 406 | EndpointCard |
| Component | 406 | EndpointCard |
| Function | 410 | copyEndpointUrl |
| Component | 410 | copyEndpointUrl |
| Function | 417 | getCurlCommand |
| Function | 454 | getMethodColor |
| Function | 590 | TagFilter |
| Function | 615 | ApiCategory |
| Component | 615 | ApiCategory |
| Function | 665 | EndpointOverview |
| Component | 665 | EndpointOverview |
| Function | 1846 | getCompanyName |
| Function | 1851 | handleSearch |
| Component | 1851 | handleSearch |
| Function | 1858 | handleTagSelect |
| Component | 1858 | handleTagSelect |
| Function | 1867 | clearSearch |
| Component | 1867 | clearSearch |
| Function | 1875 | resetFilters |
| Component | 1875 | resetFilters |
| Function | 1881 | getFilteredEndpoints |
| Component | 1881 | getFilteredEndpoints |
| Function | 1892 | getAllTags |

### client/src/pages/admin/settings-page.tsx (33 items)

| Type | Line | Name |
|------|------|------|
| Interface | 53 | Setting |
| Interface | 117 | TicketDepartment |
| Interface | 128 | ChatDepartment |
| Interface | 140 | SyncStatus |
| Interface | 147 | MigrationStatus |
| Interface | 155 | MigrationResult |
| Function | 344 | handleThemeChange |
| Component | 344 | handleThemeChange |
| Function | 511 | getSettingValue |
| Function | 534 | getBrandButtonStyle |
| Function | 618 | fetchMaintenanceToken |
| Function | 641 | handleRegenerateToken |
| Function | 653 | copyTokenToClipboard |
| Component | 653 | copyTokenToClipboard |
| Function | 663 | onMaintenanceSubmit |
| Function | 689 | onLoadingScreenSubmit |
| Function | 879 | onDepartmentSubmit |
| Function | 895 | handleEditDepartment |
| Component | 895 | handleEditDepartment |
| Function | 908 | handleDeleteDepartment |
| Function | 915 | cancelDepartmentEdit |
| Component | 915 | cancelDepartmentEdit |
| Function | 922 | handleMigrateDepartments |
| Function | 951 | handleSyncDepartments |
| Function | 1063 | onDesignSubmit |
| Function | 1166 | settings |
| Function | 1403 | onVirtFusionSubmit |
| Function | 1436 | onBillingSubmit |
| Function | 1463 | onEmailSubmit |
| Function | 1492 | onCloudPricingSubmit |
| Function | 1532 | onGeneralSubmit |
| Function | 1602 | onNotificationsSubmit |
| Function | 1638 | handleTestConnection |

### client/src/components/layouts/DashboardLayout.tsx (31 items)

| Type | Line | Name |
|------|------|------|
| Interface | 59 | DashboardLayoutProps |
| Interface | 64 | ServerType |
| Interface | 71 | UserType |
| Interface | 79 | TicketType |
| Interface | 87 | TransactionType |
| Interface | 101 | SearchResult |
| Function | 115 | DashboardLayoutComponent |
| Hook | 248 | users |
| Function | 415 | performSearch |
| Component | 415 | performSearch |
| Function | 488 | fullName |
| Function | 489 | email |
| Function | 490 | username |
| Hook | 490 | username |
| Function | 506 | description |
| Function | 507 | type |
| Function | 509 | paymentId |
| Function | 510 | invoiceNumber |
| Hook | 522 | userName |
| Function | 601 | description |
| Function | 602 | type |
| Function | 604 | paymentId |
| Function | 605 | invoiceNumber |
| Function | 699 | handleKeyDown |
| Component | 699 | handleKeyDown |
| Function | 763 | navigateToResult |
| Component | 763 | navigateToResult |
| Function | 770 | toggleNavItem |
| Component | 770 | toggleNavItem |
| Function | 785 | isNavItemActive |
| Function | 795 | handleLogout |

### client/src/pages/admin/blog-page.tsx (27 items)

| Type | Line | Name |
|------|------|------|
| Interface | 51 | BlogCategory |
| Interface | 62 | BlogPost |
| Function | 162 | fetchBrandColors |
| Function | 340 | handleEditPost |
| Component | 340 | handleEditPost |
| Function | 354 | handleDeleteClick |
| Component | 354 | handleDeleteClick |
| Function | 359 | onSubmit |
| Function | 370 | handleDeletePost |
| Component | 370 | handleDeletePost |
| Function | 376 | handleTogglePublished |
| Function | 383 | handleToggleCategoryActive |
| Function | 390 | generateSlug |
| Component | 390 | generateSlug |
| Function | 401 | resetForm |
| Component | 401 | resetForm |
| Function | 410 | handleEditCategory |
| Component | 410 | handleEditCategory |
| Function | 422 | handleDeleteCategoryClick |
| Component | 422 | handleDeleteCategoryClick |
| Function | 427 | onCategorySubmit |
| Function | 435 | handleDeleteCategory |
| Component | 435 | handleDeleteCategory |
| Function | 441 | generateCategorySlug |
| Component | 441 | generateCategorySlug |
| Function | 452 | resetCategoryForm |
| Component | 452 | resetCategoryForm |

### client/src/pages/admin/user-edit-page.tsx (27 items)

| Type | Line | Name |
|------|------|------|
| Hook | 47 | userSchema |
| Interface | 55 | User |
| Interface | 67 | CreditTransaction |
| Interface | 85 | UsageResource |
| Interface | 92 | UsageServer |
| Interface | 98 | UsagePeriod |
| Interface | 107 | VirtFusionUsageData |
| Hook | 140 | userId |
| Function | 247 | searchTransactions |
| Function | 479 | handleTabChange |
| Component | 479 | handleTabChange |
| Function | 488 | onSubmit |
| Component | 488 | onSubmit |
| Function | 493 | handleResetPassword |
| Component | 493 | handleResetPassword |
| Function | 500 | handleVirtFusionSync |
| Component | 500 | handleVirtFusionSync |
| Function | 505 | handleAddVirtFusionCredit |
| Component | 505 | handleAddVirtFusionCredit |
| Function | 522 | handleRemoveVirtFusionCredit |
| Component | 522 | handleRemoveVirtFusionCredit |
| Function | 540 | handleRemoveVirtFusionTokens |
| Component | 540 | handleRemoveVirtFusionTokens |
| Function | 561 | formatDate |
| Component | 561 | formatDate |
| Function | 618 | copyPasswordToClipboard |
| Component | 618 | copyPasswordToClipboard |

### client/src/pages/api-docs-page.tsx (27 items)

| Type | Line | Name |
|------|------|------|
| Interface | 35 | ApiDocsContextType |
| Function | 43 | useApiDocsContext |
| Hook | 43 | useApiDocsContext |
| Interface | 52 | ApiEndpoint |
| Interface | 69 | ApiCategoryProps |
| Function | 78 | EndpointCard |
| Component | 78 | EndpointCard |
| Function | 82 | copyEndpointUrl |
| Component | 82 | copyEndpointUrl |
| Function | 89 | getCurlCommand |
| Function | 130 | getMethodColor |
| Function | 237 | ApiCategory |
| Component | 237 | ApiCategory |
| Function | 271 | EndpointOverview |
| Component | 271 | EndpointOverview |
| Function | 1396 | getCompanyName |
| Function | 1401 | handleSearch |
| Component | 1401 | handleSearch |
| Function | 1408 | handleTagSelect |
| Component | 1408 | handleTagSelect |
| Function | 1417 | clearSearch |
| Component | 1417 | clearSearch |
| Function | 1425 | resetFilters |
| Component | 1425 | resetFilters |
| Function | 1431 | getFilteredEndpoints |
| Component | 1431 | getFilteredEndpoints |
| Function | 1449 | getAllTags |

### client/src/pages/ticket-detail-page.tsx (27 items)

| Type | Line | Name |
|------|------|------|
| Interface | 31 | VpsServer |
| Interface | 79 | Ticket |
| Interface | 91 | TicketMessage |
| Interface | 99 | Department |
| Interface | 109 | Balance |
| Interface | 115 | TicketDetailResponse |
| Function | 143 | fetchBrandingSettings |
| Function | 168 | getStatusBadgeStyle |
| Component | 168 | getStatusBadgeStyle |
| Function | 192 | getPriorityBadgeStyle |
| Component | 192 | getPriorityBadgeStyle |
| Function | 215 | getServerCardStyle |
| Component | 215 | getServerCardStyle |
| Function | 223 | getServerIconStyle |
| Component | 223 | getServerIconStyle |
| Function | 228 | getNetworkStatusStyle |
| Component | 228 | getNetworkStatusStyle |
| Function | 342 | handleSendMessage |
| Component | 342 | handleSendMessage |
| Function | 348 | getStatusBadge |
| Component | 348 | getStatusBadge |
| Function | 403 | hexToRgba |
| Component | 403 | hexToRgba |
| Function | 411 | getContainerStyle |
| Component | 411 | getContainerStyle |
| Function | 419 | getPriorityBadge |
| Component | 419 | getPriorityBadge |

### client/src/pages/admin/ticket-detail-page.tsx (26 items)

| Type | Line | Name |
|------|------|------|
| Interface | 35 | VirtFusionUsageData |
| Interface | 66 | VpsServer |
| Interface | 76 | Ticket |
| Interface | 93 | TicketMessage |
| Interface | 106 | Department |
| Interface | 116 | Balance |
| Interface | 122 | TicketDetailResponse |
| Function | 147 | fetchBrandingSettings |
| Function | 154 | color |
| Interface | 183 | CurrentUser |
| Function | 298 | handleApplySuggestion |
| Component | 298 | handleApplySuggestion |
| Function | 304 | handleClearSuggestion |
| Component | 304 | handleClearSuggestion |
| Function | 309 | handleGenerateAISuggestion |
| Component | 309 | handleGenerateAISuggestion |
| Function | 404 | handleSendMessage |
| Component | 404 | handleSendMessage |
| Function | 410 | getContainerStyle |
| Component | 410 | getContainerStyle |
| Function | 418 | getBadgeStyle |
| Component | 418 | getBadgeStyle |
| Function | 426 | getStatusBadge |
| Component | 426 | getStatusBadge |
| Function | 456 | getPriorityBadge |
| Component | 456 | getPriorityBadge |

### client/src/pages/admin/package-pricing.tsx (25 items)

| Type | Line | Name |
|------|------|------|
| Interface | 57 | VirtFusionPackage |
| Interface | 72 | PackageCategory |
| Interface | 82 | PricingRecord |
| Function | 299 | formatMemory |
| Component | 299 | formatMemory |
| Function | 304 | formatStorage |
| Component | 304 | formatStorage |
| Function | 309 | formatNetworkSpeed |
| Component | 309 | formatNetworkSpeed |
| Function | 324 | handleEditPackage |
| Component | 324 | handleEditPackage |
| Function | 350 | onSubmit |
| Component | 350 | onSubmit |
| Function | 355 | handleDeletePricing |
| Component | 355 | handleDeletePricing |
| Function | 362 | handleCreateCategory |
| Component | 362 | handleCreateCategory |
| Function | 374 | handleEditCategory |
| Component | 374 | handleEditCategory |
| Function | 386 | handleDeleteCategory |
| Component | 386 | handleDeleteCategory |
| Function | 392 | onCategorySubmit |
| Component | 392 | onCategorySubmit |
| Function | 425 | errorResponse |
| Function | 517 | token |

### client/src/pages/blog/index.tsx (23 items)

| Type | Line | Name |
|------|------|------|
| Interface | 50 | BlogCategory |
| Interface | 61 | BlogPost |
| Interface | 88 | BrandingSettings |
| Interface | 96 | PublicSettings |
| Function | 184 | getReadingTime |
| Function | 191 | handlePageChange |
| Component | 191 | handlePageChange |
| Function | 199 | handleSearch |
| Component | 199 | handleSearch |
| Function | 205 | clearSearch |
| Component | 205 | clearSearch |
| Function | 210 | handleCategorySelect |
| Component | 210 | handleCategorySelect |
| Function | 216 | formatTags |
| Component | 216 | formatTags |
| Function | 227 | formatDate |
| Component | 227 | formatDate |
| Function | 232 | renderContent |
| Component | 232 | renderContent |
| Function | 1207 | ShareButton |
| Function | 1224 | handleClickOutside |
| Function | 1251 | copyToClipboard |
| Component | 1251 | copyToClipboard |

### client/src/pages/vnc-console/index.tsx (22 items)

| Type | Line | Name |
|------|------|------|
| Component | 13 | VNCConsole |
| Function | 79 | loadNoVNCAndInitialize |
| Function | 91 | handleNoVNCReady |
| Component | 91 | handleNoVNCReady |
| Function | 98 | handleNoVNCError |
| Component | 98 | handleNoVNCError |
| Function | 128 | waitForCanvasAndInitialize |
| Component | 128 | waitForCanvasAndInitialize |
| Function | 133 | checkCanvas |
| Component | 133 | checkCanvas |
| Function | 153 | initializeVNC |
| Component | 153 | initializeVNC |
| Function | 230 | handleConnect |
| Component | 230 | handleConnect |
| Function | 242 | handleDisconnect |
| Component | 242 | handleDisconnect |
| Function | 262 | handleCredentialsRequired |
| Component | 262 | handleCredentialsRequired |
| Function | 268 | handleSecurityFailure |
| Component | 268 | handleSecurityFailure |
| Function | 274 | reconnect |
| Component | 274 | reconnect |

### client/src/pages/admin/users-page.tsx (20 items)

| Type | Line | Name |
|------|------|------|
| Function | 42 | generateCSV |
| Function | 61 | downloadCSV |
| Interface | 75 | User |
| Function | 218 | handleRoleChange |
| Component | 218 | handleRoleChange |
| Function | 228 | openRoleDialog |
| Component | 228 | openRoleDialog |
| Function | 235 | openStatusDialog |
| Component | 235 | openStatusDialog |
| Function | 245 | openDeleteDialog |
| Component | 245 | openDeleteDialog |
| Function | 251 | handleStatusChange |
| Component | 251 | handleStatusChange |
| Function | 261 | handleDeleteUser |
| Component | 261 | handleDeleteUser |
| Function | 268 | formatDate |
| Component | 268 | formatDate |
| Function | 277 | getRoleBadge |
| Component | 277 | getRoleBadge |
| Function | 344 | renderActions |

### client/src/pages/billing-page.tsx (20 items)

| Type | Line | Name |
|------|------|------|
| Interface | 21 | Transaction |
| Function | 68 | handleTabChange |
| Component | 68 | handleTabChange |
| Function | 90 | searchInCreditId |
| Function | 145 | handleExportTransactions |
| Function | 184 | formatTransactionDescription |
| Component | 184 | formatTransactionDescription |
| Function | 226 | isCredit |
| Component | 226 | isCredit |
| Function | 233 | isDebit |
| Component | 233 | isDebit |
| Function | 327 | getStatusBadge |
| Component | 327 | getStatusBadge |
| Function | 365 | handlePredefinedAmountSelect |
| Component | 365 | handlePredefinedAmountSelect |
| Function | 373 | handleCustomAmountChange |
| Component | 373 | handleCustomAmountChange |
| Function | 378 | decimalCount |
| Function | 405 | getFinalAmount |
| Component | 405 | getFinalAmount |

### client/src/components/admin/DepartmentManagement.tsx (19 items)

| Type | Line | Name |
|------|------|------|
| Interface | 50 | ChatDepartment |
| Interface | 63 | DepartmentAdmin |
| Interface | 76 | User |
| Function | 287 | resetForm |
| Component | 287 | resetForm |
| Function | 298 | handleCreateDepartment |
| Component | 298 | handleCreateDepartment |
| Function | 302 | handleEditDepartment |
| Component | 302 | handleEditDepartment |
| Function | 315 | handleUpdateDepartment |
| Component | 315 | handleUpdateDepartment |
| Function | 323 | handleDeleteDepartment |
| Component | 323 | handleDeleteDepartment |
| Function | 327 | handleAssignAdmin |
| Component | 327 | handleAssignAdmin |
| Function | 336 | handleRemoveAdmin |
| Component | 336 | handleRemoveAdmin |
| Function | 340 | getIconComponent |
| Component | 340 | getIconComponent |

### client/src/components/admin/unified-department-manager.tsx (19 items)

| Type | Line | Name |
|------|------|------|
| Interface | 32 | SupportDepartment |
| Interface | 46 | DepartmentFormData |
| Function | 75 | UnifiedDepartmentManager |
| Function | 190 | handleCreateDepartment |
| Component | 190 | handleCreateDepartment |
| Function | 194 | handleUpdateDepartment |
| Component | 194 | handleUpdateDepartment |
| Function | 198 | handleDeleteDepartment |
| Component | 198 | handleDeleteDepartment |
| Function | 204 | handleSyncDepartments |
| Component | 204 | handleSyncDepartments |
| Function | 214 | getIconComponent |
| Component | 214 | getIconComponent |
| Interface | 455 | DepartmentFormProps |
| Function | 462 | DepartmentForm |
| Function | 474 | handleSubmit |
| Component | 474 | handleSubmit |
| Function | 479 | getIconComponent |
| Component | 479 | getIconComponent |

### client/src/components/dashboard/DashboardBlogSection.tsx (19 items)

| Type | Line | Name |
|------|------|------|
| Interface | 34 | BlogCategory |
| Interface | 45 | BlogPost |
| Interface | 64 | BrandingSettings |
| Interface | 72 | DashboardBlogSectionProps |
| Function | 150 | getReadingTime |
| Function | 157 | handlePageChange |
| Component | 157 | handlePageChange |
| Function | 164 | handleSearch |
| Component | 164 | handleSearch |
| Function | 170 | handleCategorySelect |
| Component | 170 | handleCategorySelect |
| Function | 176 | formatTags |
| Component | 176 | formatTags |
| Function | 187 | formatDate |
| Component | 187 | formatDate |
| Function | 192 | handlePostSelect |
| Component | 192 | handlePostSelect |
| Function | 197 | handleBackToBlogList |
| Component | 197 | handleBackToBlogList |

### client/src/pages/admin/docs-page.tsx (19 items)

| Type | Line | Name |
|------|------|------|
| Interface | 54 | DocCategory |
| Interface | 67 | Doc |
| Function | 180 | generateCategorySlug |
| Component | 180 | generateCategorySlug |
| Function | 351 | handleCreateDoc |
| Component | 351 | handleCreateDoc |
| Function | 357 | handleEditDoc |
| Component | 357 | handleEditDoc |
| Function | 363 | onSubmit |
| Function | 389 | handleDeleteDoc |
| Function | 396 | handleTogglePublished |
| Function | 404 | generateSlug |
| Component | 404 | generateSlug |
| Function | 508 | handleCreateCategory |
| Component | 508 | handleCreateCategory |
| Function | 513 | handleEditCategory |
| Component | 513 | handleEditCategory |
| Function | 518 | onCategorySubmit |
| Function | 526 | handleDeleteCategory |

### client/src/pages/status/index.tsx (19 items)

| Type | Line | Name |
|------|------|------|
| Interface | 38 | PlatformStats |
| Interface | 56 | ServiceStatus |
| Interface | 65 | MaintenanceStatus |
| Interface | 72 | Incident |
| Function | 139 | getServiceIcon |
| Component | 139 | getServiceIcon |
| Function | 161 | getServiceStatuses |
| Function | 270 | getStatusFromUptime |
| Function | 277 | formatUptimePercentage |
| Function | 282 | getStatusColor |
| Function | 318 | paginateIncidents |
| Function | 321 | startIndex |
| Function | 327 | getTotalPages |
| Function | 333 | goToPage |
| Component | 333 | goToPage |
| Function | 337 | getStatusIcon |
| Function | 357 | getOverallStatus |
| Function | 378 | getStatusMessage |
| Function | 396 | getProgressColor |

### client/src/components/tickets/TicketList.tsx (18 items)

| Type | Line | Name |
|------|------|------|
| Interface | 11 | User |
| Interface | 17 | Ticket |
| Interface | 28 | TicketListProps |
| Function | 39 | TicketList |
| Function | 50 | checkIfMobile |
| Component | 50 | checkIfMobile |
| Function | 74 | highlightText |
| Component | 74 | highlightText |
| Function | 96 | getStatusIcon |
| Component | 96 | getStatusIcon |
| Function | 110 | getStatusBadge |
| Component | 110 | getStatusBadge |
| Function | 157 | getPriorityBadge |
| Component | 157 | getPriorityBadge |
| Function | 198 | handleTicketClick |
| Component | 198 | handleTicketClick |
| Function | 209 | renderTableView |
| Function | 265 | renderCardView |

### client/src/pages/serverless/ai.tsx (17 items)

| Type | Line | Name |
|------|------|------|
| Interface | 33 | BrandingSettings |
| Interface | 40 | Message |
| Component | 97 | ServerlessAiPage |
| Function | 214 | sendMessage |
| Function | 235 | puter |
| Function | 342 | copyMessage |
| Function | 360 | clearChat |
| Component | 360 | clearChat |
| Function | 364 | checkAuthStatus |
| Function | 370 | puter |
| Hook | 378 | user |
| Function | 390 | loginToPuter |
| Function | 396 | puter |
| Function | 420 | signOutPuter |
| Function | 426 | puter |
| Function | 450 | handleKeyPress |
| Component | 450 | handleKeyPress |

### client/src/components/layout/SharedNavbar.tsx (16 items)

| Type | Line | Name |
|------|------|------|
| Interface | 8 | BrandingSettings |
| Function | 16 | SharedNavbar |
| Function | 53 | toggleMenu |
| Component | 53 | toggleMenu |
| Function | 58 | handleHashClick |
| Function | 82 | isActive |
| Component | 82 | isActive |
| Function | 117 | handleMouseOver |
| Component | 117 | handleMouseOver |
| Function | 126 | handleMouseOut |
| Component | 126 | handleMouseOut |
| Function | 162 | MobileNavItem |
| Function | 176 | handleMouseOver |
| Component | 176 | handleMouseOver |
| Function | 183 | handleMouseOut |
| Component | 183 | handleMouseOut |

### client/src/pages/admin/datacenter-locations.tsx (16 items)

| Type | Line | Name |
|------|------|------|
| Function | 308 | onSubmitAdd |
| Component | 308 | onSubmitAdd |
| Function | 312 | onSubmitEdit |
| Component | 312 | onSubmitEdit |
| Function | 317 | onDelete |
| Component | 317 | onDelete |
| Function | 323 | handleEdit |
| Component | 323 | handleEdit |
| Function | 365 | handleDeleteClick |
| Component | 365 | handleDeleteClick |
| Function | 371 | handleFeaturesInput |
| Component | 371 | handleFeaturesInput |
| Function | 377 | getUniqueRegions |
| Component | 377 | getUniqueRegions |
| Function | 403 | getStatusBadgeStyles |
| Component | 403 | getStatusBadgeStyles |

### client/src/pages/admin/server-detail-page.tsx (16 items)

| Type | Line | Name |
|------|------|------|
| Function | 58 | formatBytes |
| Function | 71 | TrafficTab |
| Component | 71 | TrafficTab |
| Function | 86 | getChartData |
| Component | 86 | getChartData |
| Function | 102 | limitInBytes |
| Function | 116 | limitInBytes |
| Function | 289 | formatDate |
| Function | 328 | VNCTab |
| Component | 328 | VNCTab |
| Function | 353 | openVNCConsole |
| Component | 353 | openVNCConsole |
| Function | 559 | PowerStatusBadge |
| Component | 559 | PowerStatusBadge |
| Function | 621 | copyToClipboard |
| Component | 621 | copyToClipboard |

### client/src/pages/admin/AdminChatManagement.tsx (14 items)

| Type | Line | Name |
|------|------|------|
| Interface | 41 | ChatSession |
| Interface | 63 | ChatTab |
| Interface | 72 | TabState |
| Interface | 81 | ChatMessage |
| Interface | 93 | AdminChatStats |
| Function | 701 | handleKeyDown |
| Component | 701 | handleKeyDown |
| Function | 727 | handleUpdateStatus |
| Function | 759 | handleKeyDown |
| Component | 759 | handleKeyDown |
| Function | 775 | getStatusColor |
| Component | 775 | getStatusColor |
| Function | 784 | getStatusBadgeVariant |
| Component | 784 | getStatusBadgeVariant |

### client/src/pages/admin/dns-page.tsx (14 items)

| Type | Line | Name |
|------|------|------|
| Interface | 34 | DnsPlan |
| Interface | 51 | BrandingData |
| Function | 184 | resetForm |
| Component | 184 | resetForm |
| Function | 198 | handleAdd |
| Component | 198 | handleAdd |
| Function | 203 | handleEdit |
| Component | 203 | handleEdit |
| Function | 218 | handleDelete |
| Component | 218 | handleDelete |
| Function | 223 | handleSubmit |
| Component | 223 | handleSubmit |
| Function | 231 | handleToggleActive |
| Component | 231 | handleToggleActive |

### client/src/pages/dns-plans-page.tsx (14 items)

| Type | Line | Name |
|------|------|------|
| Interface | 15 | BrandingSettings |
| Interface | 23 | DnsPlan |
| Interface | 35 | DnsPlanSubscription |
| Function | 202 | handleChangePlan |
| Function | 244 | handleCancelSubscription |
| Component | 244 | handleCancelSubscription |
| Function | 250 | handleDomainSelectionConfirm |
| Component | 250 | handleDomainSelectionConfirm |
| Function | 261 | handleDomainSelectionCancel |
| Component | 261 | handleDomainSelectionCancel |
| Function | 266 | hasActiveSubscription |
| Component | 266 | hasActiveSubscription |
| Function | 271 | getActiveSubscription |
| Component | 271 | getActiveSubscription |

### client/src/pages/LiveChat.tsx (14 items)

| Type | Line | Name |
|------|------|------|
| Interface | 21 | ChatMessage |
| Interface | 33 | ChatSession |
| Interface | 47 | ChatDepartment |
| Interface | 57 | ChatHistorySession |
| Function | 300 | fetchAdminStatus |
| Function | 324 | handleStartChat |
| Function | 364 | handleSendMessage |
| Function | 412 | handleEndChat |
| Function | 433 | handleKeyPress |
| Component | 433 | handleKeyPress |
| Function | 440 | handleInputChange |
| Component | 440 | handleInputChange |
| Function | 463 | handleViewHistorySession |
| Function | 503 | handleRefreshHistory |

### client/src/components/SearchBar.tsx (13 items)

| Type | Line | Name |
|------|------|------|
| Interface | 6 | UserType |
| Interface | 13 | TicketType |
| Interface | 19 | TransactionType |
| Interface | 28 | SearchResult |
| Component | 37 | SearchBar |
| Function | 63 | performSearch |
| Component | 63 | performSearch |
| Function | 141 | handleResultClick |
| Component | 141 | handleResultClick |
| Function | 147 | handleInputFocus |
| Component | 147 | handleInputFocus |
| Function | 151 | handleInputBlur |
| Component | 151 | handleInputBlur |

### client/src/lib/novnc/vendor/pako/lib/zlib/deflate.js (13 items)

| Type | Line | Name |
|------|------|------|
| Function | 104 | err |
| Function | 109 | rank |
| Function | 113 | zero |
| Function | 144 | flush_block_only |
| Function | 151 | put_byte |
| Function | 1071 | DeflateState |
| Function | 1260 | deflateResetKeep |
| Function | 1289 | deflateReset |
| Function | 1298 | deflateSetHeader |
| Function | 1306 | deflateInit2 |
| Function | 1384 | deflateInit |
| Function | 1389 | deflate |
| Function | 1723 | deflateEnd |

### client/src/pages/tickets-page.tsx (13 items)

| Type | Line | Name |
|------|------|------|
| Interface | 19 | Ticket |
| Interface | 29 | PaginatedResponse |
| Function | 48 | handleStatusFilterChange |
| Component | 48 | handleStatusFilterChange |
| Function | 123 | handleCreateTicket |
| Component | 123 | handleCreateTicket |
| Function | 128 | handleCloseTicket |
| Component | 128 | handleCloseTicket |
| Function | 133 | getStatusBadge |
| Component | 133 | getStatusBadge |
| Function | 147 | getPriorityBadge |
| Component | 147 | getPriorityBadge |
| Function | 207 | renderActions |

### server/routes/user-routes.ts (13 items)

| Type | Line | Name |
|------|------|------|
| Hook | 17 | userId |
| Hook | 18 | user |
| Hook | 41 | userId |
| Hook | 96 | userId |
| Hook | 114 | user |
| Hook | 155 | user |
| Hook | 193 | userId |
| Hook | 250 | user |
| Hook | 292 | userId |
| Hook | 317 | userId |
| Hook | 318 | user |
| Hook | 348 | userId |
| Hook | 365 | userId |

### client/src/components/admin/EnhancedChatInterface.tsx (12 items)

| Type | Line | Name |
|------|------|------|
| Interface | 33 | ChatSession |
| Interface | 51 | ChatMessage |
| Interface | 65 | ChatDepartment |
| Interface | 75 | EnhancedChatInterfaceProps |
| Function | 133 | handleSendMessage |
| Component | 133 | handleSendMessage |
| Function | 140 | getStatusColor |
| Component | 140 | getStatusColor |
| Function | 149 | getPriorityColor |
| Component | 149 | getPriorityColor |
| Function | 158 | getTimeAgo |
| Component | 158 | getTimeAgo |

### client/src/components/dashboard/BillingActivity.tsx (12 items)

| Type | Line | Name |
|------|------|------|
| Interface | 11 | Transaction |
| Function | 24 | isCredit |
| Component | 24 | isCredit |
| Function | 33 | isDebit |
| Component | 33 | isDebit |
| Function | 43 | BillingActivity |
| Function | 54 | formatDescription |
| Component | 54 | formatDescription |
| Function | 60 | formatPaymentMethod |
| Component | 60 | formatPaymentMethod |
| Function | 126 | getStatusBadge |
| Component | 126 | getStatusBadge |

### client/src/lib/novnc/vendor/pako/lib/zlib/inflate.js (12 items)

| Type | Line | Name |
|------|------|------|
| Function | 92 | zswap32 |
| Function | 100 | InflateState |
| Function | 158 | inflateResetKeep |
| Function | 185 | inflateReset |
| Function | 197 | inflateReset2 |
| Function | 231 | inflateInit2 |
| Function | 251 | inflateInit |
| Function | 270 | fixedtables |
| Function | 360 | inflate |
| Function | 1452 | inflateEnd |
| Function | 1466 | inflateGetHeader |
| Function | 1480 | inflateSetDictionary |

### client/src/pages/speed-test/index.tsx (12 items)

| Type | Line | Name |
|------|------|------|
| Interface | 26 | BrandingData |
| Interface | 35 | TestServer |
| Interface | 45 | TestResult |
| Function | 97 | startTest |
| Component | 97 | startTest |
| Function | 115 | simulateTest |
| Component | 115 | simulateTest |
| Function | 169 | formatSpeed |
| Function | 177 | getConnectionQuality |
| Function | 187 | getQualityColorClass |
| Function | 198 | startIperfTest |
| Component | 198 | startIperfTest |

### server/auth.ts (12 items)

| Type | Line | Name |
|------|------|------|
| Interface | 17 | User |
| Function | 23 | hashPassword |
| Function | 25 | buf |
| Function | 29 | comparePasswords |
| Function | 32 | suppliedBuf |
| Function | 37 | assignFreeDnsPlanToUser |
| Function | 103 | setupAuth |
| Hook | 124 | user |
| Hook | 152 | user |
| Hook | 189 | user |
| Hook | 330 | user |
| Hook | 409 | user |

### server/routes/dns.ts (12 items)

| Type | Line | Name |
|------|------|------|
| Function | 34 | replaceNameservers |
| Function | 105 | requireAuth |
| Component | 105 | requireAuth |
| Function | 113 | requireInterServerConfig |
| Component | 113 | requireInterServerConfig |
| Hook | 133 | userId |
| Hook | 202 | userId |
| Hook | 342 | userId |
| Hook | 414 | userId |
| Hook | 463 | userId |
| Hook | 619 | userId |
| Hook | 713 | userId |

### server/routes/transaction-routes.ts (12 items)

| Type | Line | Name |
|------|------|------|
| Function | 10 | formatTransactionDescriptionForPdf |
| Function | 18 | formatPaymentMethodForPdf |
| Function | 26 | formatSingleTransactionPdf |
| Function | 55 | addField |
| Function | 106 | formatTransactionsPdf |
| Hook | 217 | userId |
| Hook | 224 | user |
| Hook | 257 | userId |
| Hook | 274 | userId |
| Hook | 305 | userId |
| Hook | 355 | userId |
| Hook | 395 | userId |

### server/services/auth/auth.ts (12 items)

| Type | Line | Name |
|------|------|------|
| Interface | 17 | User |
| Function | 23 | hashPassword |
| Function | 25 | buf |
| Function | 29 | comparePasswords |
| Function | 32 | suppliedBuf |
| Function | 37 | assignFreeDnsPlanToUser |
| Function | 103 | setupAuth |
| Hook | 124 | user |
| Hook | 152 | user |
| Hook | 189 | user |
| Hook | 330 | user |
| Hook | 409 | user |

### client/src/components/admin/TeamManagement.tsx (11 items)

| Type | Line | Name |
|------|------|------|
| Interface | 43 | TeamMember |
| Interface | 57 | DiscordUser |
| Interface | 80 | TeamManagementProps |
| Function | 189 | handleSelectDiscordUser |
| Component | 189 | handleSelectDiscordUser |
| Function | 197 | handleSubmit |
| Component | 197 | handleSubmit |
| Function | 205 | startEdit |
| Component | 205 | startEdit |
| Function | 219 | cancelEdit |
| Component | 219 | cancelEdit |

### client/src/hooks/use-toast.ts (11 items)

| Type | Line | Name |
|------|------|------|
| Function | 27 | genId |
| Interface | 52 | State |
| Function | 58 | addToRemoveQueue |
| Component | 58 | addToRemoveQueue |
| Function | 74 | reducer |
| Function | 133 | dispatch |
| Function | 142 | toast |
| Function | 145 | update |
| Function | 150 | dismiss |
| Function | 171 | useToast |
| Hook | 171 | useToast |

### client/src/pages/admin/tickets-page.tsx (11 items)

| Type | Line | Name |
|------|------|------|
| Interface | 21 | User |
| Interface | 27 | Ticket |
| Interface | 40 | PaginatedResponse |
| Function | 67 | fetchBrandingSettings |
| Function | 115 | handleRefresh |
| Function | 155 | handlePageChange |
| Component | 155 | handlePageChange |
| Function | 160 | handleTabChange |
| Component | 160 | handleTabChange |
| Function | 166 | toggleAutoRefresh |
| Component | 166 | toggleAutoRefresh |

### client/src/pages/docs/index.tsx (11 items)

| Type | Line | Name |
|------|------|------|
| Interface | 32 | DocCategory |
| Interface | 43 | Doc |
| Function | 124 | startIndex |
| Function | 144 | handlePageChange |
| Component | 144 | handlePageChange |
| Function | 152 | handleSearch |
| Component | 152 | handleSearch |
| Function | 165 | renderDocsList |
| Component | 165 | renderDocsList |
| Function | 454 | renderSingleDoc |
| Component | 454 | renderSingleDoc |

### client/src/pages/serverless/index.tsx (11 items)

| Type | Line | Name |
|------|------|------|
| Interface | 28 | Window |
| Interface | 40 | BrandingSettings |
| Component | 47 | ServerlessOverviewPage |
| Function | 54 | checkPuterLoginStatus |
| Component | 54 | checkPuterLoginStatus |
| Function | 72 | handleLogin |
| Function | 73 | handleLogout |
| Function | 98 | handlePuterLogin |
| Component | 98 | handlePuterLogin |
| Function | 121 | handlePuterLogout |
| Component | 121 | handlePuterLogout |

### client/src/components/api-key-dialog.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 8 | ApiKeyDialogProps |
| Function | 13 | ApiKeyDialog |
| Component | 13 | ApiKeyDialog |
| Function | 39 | handleScopeToggle |
| Component | 39 | handleScopeToggle |
| Function | 47 | handleCreateKey |
| Function | 104 | handleDone |
| Component | 104 | handleDone |
| Function | 111 | handleCopy |
| Component | 111 | handleCopy |

### client/src/components/datacenter/DatacenterLeafletMap.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 53 | DatacenterLocation |
| Function | 79 | createCustomIcon |
| Function | 113 | DatacenterLeafletMap |
| Function | 146 | getLocationStatus |
| Function | 198 | handleLocationClick |
| Component | 198 | handleLocationClick |
| Function | 202 | handleLocationHover |
| Component | 202 | handleLocationHover |
| Function | 849 | SimpleDatacenterLeafletMap |
| Function | 890 | getLocationStatus |

### client/src/components/layout/AdminLayout.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 58 | AdminLayoutProps |
| Interface | 63 | SearchResult |
| Interface | 73 | UserType |
| Interface | 82 | TicketType |
| Interface | 91 | TransactionType |
| Interface | 102 | ServerType |
| Function | 179 | handleLogout |
| Component | 179 | handleLogout |
| Function | 424 | handleKeyDown |
| Component | 424 | handleKeyDown |

### client/src/components/loading/PageLoadingProvider.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 6 | PageLoadingContextType |
| Interface | 19 | LoadingScreenSettings |
| Function | 43 | usePageLoading |
| Hook | 43 | usePageLoading |
| Interface | 45 | PageLoadingProviderProps |
| Function | 54 | PageLoadingProvider |
| Function | 84 | fetchBrandingSettings |
| Function | 159 | handleAnimationComplete |
| Component | 159 | handleAnimationComplete |
| Function | 166 | getAnimationDuration |

### client/src/components/server/ServerLogsModal.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 44 | ServerLog |
| Interface | 66 | ServerLogsResponse |
| Interface | 72 | ServerLogsModalProps |
| Function | 109 | ServerLogsModal |
| Function | 153 | handleClearFilters |
| Component | 153 | handleClearFilters |
| Function | 160 | handleLoadMore |
| Component | 160 | handleLoadMore |
| Function | 164 | formatActionName |
| Component | 164 | formatActionName |

### client/src/components/tickets/TicketForm.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 41 | TicketDepartment |
| Interface | 52 | VpsServer |
| Interface | 109 | TicketFormProps |
| Function | 115 | TicketForm |
| Function | 216 | goToNextStep |
| Component | 216 | goToNextStep |
| Function | 254 | goToPreviousStep |
| Component | 254 | goToPreviousStep |
| Function | 302 | updateCharCount |
| Component | 302 | updateCharCount |

### client/src/components/ui/data-table.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 28 | DataTableColumn |
| Interface | 37 | DataTableProps |
| Function | 53 | DataTable |
| Function | 88 | checkIfMobile |
| Component | 88 | checkIfMobile |
| Function | 108 | getColumnKey |
| Function | 171 | handleSort |
| Component | 171 | handleSort |
| Function | 181 | renderTableView |
| Function | 266 | renderCardView |

### client/src/lib/novnc/vendor/promise.js (10 items)

| Type | Line | Name |
|------|------|------|
| Function | 29 | noop |
| Function | 32 | bind |
| Function | 38 | Promise |
| Function | 49 | handle |
| Function | 75 | resolve |
| Function | 99 | reject |
| Function | 105 | finale |
| Function | 120 | Handler |
| Function | 169 | res |
| Function | 221 | Anonymous |

### client/src/pages/admin/email-logs-page.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 55 | EmailLog |
| Interface | 69 | PaginatedEmailLogs |
| Function | 115 | handleSearch |
| Component | 115 | handleSearch |
| Function | 120 | clearFilters |
| Component | 120 | clearFilters |
| Function | 126 | getStatusBadge |
| Component | 126 | getStatusBadge |
| Function | 139 | formatMetadata |
| Component | 139 | formatMetadata |

### client/src/pages/admin/plan-features.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Function | 168 | handleSubmit |
| Component | 168 | handleSubmit |
| Function | 176 | handleEdit |
| Component | 176 | handleEdit |
| Function | 189 | handleDelete |
| Component | 189 | handleDelete |
| Function | 195 | handleAdd |
| Component | 195 | handleAdd |
| Function | 306 | IconComponent |
| Function | 478 | IconComponent |

### client/src/pages/auth-page.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Function | 186 | triggerConfettiCelebration |
| Component | 186 | triggerConfettiCelebration |
| Function | 191 | randomInRange |
| Function | 270 | onRegisterSubmit |
| Function | 301 | handleVerificationSubmit |
| Function | 363 | handleResendVerification |
| Function | 427 | onLoginSubmitWithVerification |
| Function | 442 | onVerifyAccountSubmit |
| Function | 486 | renderContent |
| Component | 486 | renderContent |

### client/src/pages/dns-records-page.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 16 | DnsRecord |
| Interface | 28 | DnsDomain |
| Interface | 34 | DnsRecordsResponse |
| Function | 43 | isDefaultInterServerRecord |
| Function | 138 | handleDeleteRecord |
| Component | 138 | handleDeleteRecord |
| Function | 144 | handleEditRecord |
| Component | 144 | handleEditRecord |
| Function | 148 | handleBackToDomains |
| Component | 148 | handleBackToDomains |

### client/src/pages/transaction-detail-page.tsx (10 items)

| Type | Line | Name |
|------|------|------|
| Interface | 10 | Transaction |
| Function | 23 | formatTransactionDescription |
| Component | 23 | formatTransactionDescription |
| Function | 63 | isCredit |
| Component | 63 | isCredit |
| Function | 71 | isDebit |
| Component | 71 | isDebit |
| Function | 82 | formatTransactionType |
| Component | 82 | formatTransactionType |
| Function | 124 | handleDownloadTransaction |

### server/discord/discord-moderation-service.ts (10 items)

| Type | Line | Name |
|------|------|------|
| Class | 14 | DiscordModerationService |
| Hook | 116 | user |
| Hook | 171 | user |
| Hook | 213 | userId |
| Hook | 246 | user |
| Hook | 307 | user |
| Hook | 369 | user |
| Hook | 451 | user |
| Hook | 501 | user |
| Hook | 520 | userInfo |

### server/routes/chat.ts (10 items)

| Type | Line | Name |
|------|------|------|
| Hook | 16 | userId |
| Hook | 37 | userId |
| Hook | 86 | userId |
| Hook | 104 | userId |
| Hook | 122 | userId |
| Hook | 137 | userId |
| Hook | 205 | user |
| Hook | 411 | user |
| Hook | 430 | user |
| Hook | 431 | userName |

### server/betterstack-service.ts (9 items)

| Type | Line | Name |
|------|------|------|
| Interface | 6 | BetterStackMonitor |
| Interface | 20 | BetterStackIncident |
| Interface | 39 | BetterStackMonitorResponse |
| Interface | 56 | BetterStackMonitorsResponse |
| Interface | 79 | BetterStackAvailabilityResponse |
| Interface | 96 | BetterStackIncidentsResponse |
| Interface | 179 | BetterStackApiResponse |
| Class | 186 | BetterStackService |
| Function | 572 | downPercentage |

### client/src/components/dashboard/ServersList.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 19 | Server |
| Function | 31 | ServersList |
| Function | 45 | getOsIcon |
| Component | 45 | getOsIcon |
| Function | 62 | getStatusBadge |
| Component | 62 | getStatusBadge |
| Function | 100 | handlePowerAction |
| Function | 174 | renderActions |

### client/src/components/dns/DomainSelectionModal.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 18 | DnsDomain |
| Interface | 31 | DnsDomainsResponse |
| Interface | 36 | DomainSelectionModalProps |
| Function | 47 | DomainSelectionModal |
| Function | 77 | handleDomainToggle |
| Component | 77 | handleDomainToggle |
| Function | 88 | handleSelectAll |
| Component | 88 | handleSelectAll |

### client/src/components/servers/ServerDetails.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 7 | Server |
| Interface | 28 | ServerDetailsProps |
| Function | 32 | ServerDetails |
| Function | 33 | formatDate |
| Component | 33 | formatDate |
| Function | 219 | getStatusBadge |
| Function | 236 | getOsIcon |
| Function | 252 | formatKeyName |

### client/src/components/ui/pagination.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Function | 26 | handlePageChange |
| Component | 26 | handlePageChange |
| Function | 32 | renderPageNumbers |
| Component | 32 | renderPageNumbers |
| Function | 172 | PaginationLink |
| Function | 194 | PaginationPrevious |
| Function | 210 | PaginationNext |
| Function | 226 | PaginationEllipsis |

### client/src/components/ui/resource-meter.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 3 | ResourceMeterProps |
| Function | 13 | ResourceMeter |
| Function | 25 | getColorScheme |
| Component | 25 | getColorScheme |
| Function | 36 | getBarColor |
| Component | 36 | getBarColor |
| Function | 50 | getHeight |
| Component | 50 | getHeight |

### client/src/hooks/useChatWebSocket.ts (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | ChatMessage |
| Interface | 12 | ChatWebSocketOptions |
| Interface | 18 | StartSessionData |
| Interface | 24 | SendMessageData |
| Interface | 29 | TypingData |
| Interface | 34 | EndSessionData |
| Function | 38 | useChatWebSocket |
| Hook | 38 | useChatWebSocket |

### client/src/lib/novnc/lib/util/browser.js (8 items)

| Type | Line | Name |
|------|------|------|
| Function | 55 | isMac |
| Function | 59 | isWindows |
| Function | 63 | isIOS |
| Function | 70 | isAndroid |
| Function | 74 | isSafari |
| Function | 79 | isIE |
| Function | 83 | isEdge |
| Function | 87 | isFirefox |

### client/src/pages/admin/faq-management.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Function | 143 | handleSubmit |
| Component | 143 | handleSubmit |
| Function | 161 | handleEdit |
| Component | 161 | handleEdit |
| Function | 173 | handleDelete |
| Component | 173 | handleDelete |
| Function | 179 | handleAdd |
| Component | 179 | handleAdd |

### client/src/pages/maintenance-page.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | MaintenanceStatus |
| Interface | 11 | BrandingSettings |
| Interface | 19 | VirtFusionSettings |
| Function | 45 | fetchSettings |
| Function | 94 | getSettingValue |
| Function | 104 | getPublicSettingValue |
| Function | 113 | handleSubmit |
| Function | 159 | buttonStyle |

### client/src/pages/packages-page.tsx (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 16 | PackageCategory |
| Interface | 25 | Package |
| Function | 131 | formatBytes |
| Component | 131 | formatBytes |
| Function | 141 | formatNetworkSpeed |
| Component | 141 | formatNetworkSpeed |
| Function | 156 | formatBandwidth |
| Function | 169 | getPackagePrice |

### server/services/infrastructure/betterstack-service.ts (8 items)

| Type | Line | Name |
|------|------|------|
| Interface | 6 | BetterStackMonitor |
| Interface | 20 | BetterStackIncident |
| Interface | 39 | BetterStackMonitorResponse |
| Interface | 56 | BetterStackMonitorsResponse |
| Interface | 79 | BetterStackAvailabilityResponse |
| Interface | 96 | BetterStackIncidentsResponse |
| Interface | 136 | BetterStackApiResponse |
| Class | 144 | BetterStackService |

### client/src/components/admin/ServerCreateModal.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 36 | ServerCreateModalProps |
| Function | 162 | onSubmit |
| Component | 162 | onSubmit |
| Function | 166 | handleClose |
| Component | 166 | handleClose |
| Hook | 249 | userId |
| Hook | 251 | user |

### client/src/components/dns/EditRecordDialog.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 104 | DnsRecord |
| Interface | 114 | EditRecordDialogProps |
| Function | 123 | EditRecordDialog |
| Function | 183 | onSubmit |
| Component | 183 | onSubmit |
| Function | 187 | handleClose |
| Component | 187 | handleClose |

### client/src/components/password-strength-meter.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 6 | PasswordStrengthMeterProps |
| Function | 10 | PasswordStrengthMeter |
| Function | 75 | getCompanyColor |
| Component | 75 | getCompanyColor |
| Function | 88 | getColorClass |
| Component | 88 | getColorClass |
| Function | 94 | getTextColorClass |

### client/src/components/servers/CreateServerForm.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 32 | Hypervisor |
| Interface | 40 | OsTemplate |
| Interface | 45 | CreateServerFormProps |
| Function | 53 | CreateServerForm |
| Function | 108 | memoryCost |
| Function | 115 | handleSubmit |
| Component | 115 | handleSubmit |

### client/src/components/tickets/MessageList.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 9 | TicketMessage |
| Interface | 22 | MessageListProps |
| Function | 27 | MessageList |
| Function | 46 | fetchBrandingSettings |
| Function | 53 | color |
| Function | 85 | formatMarkdown |
| Component | 85 | formatMarkdown |

### client/src/components/ui/cache-clear-button.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 15 | CacheStatus |
| Component | 29 | CacheClearButton |
| Function | 35 | clearAllCaches |
| Function | 73 | clearSpecificCache |
| Function | 100 | clearReactQueryCache |
| Component | 100 | clearReactQueryCache |
| Function | 108 | getCacheStatus |

### client/src/components/ui/theme-toggle.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | getStoredAdminTheme |
| Component | 5 | getStoredAdminTheme |
| Function | 10 | setStoredAdminTheme |
| Component | 10 | setStoredAdminTheme |
| Component | 14 | ThemeToggle |
| Function | 103 | toggleTheme |
| Component | 103 | toggleTheme |

### client/src/lib/brand-theme.ts (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 11 | BrandColorsOptions |
| Interface | 29 | ColorVariation |
| Interface | 43 | BrandColorsResult |
| Function | 138 | darkenHexColor |
| Function | 241 | getCardStyles |
| Function | 268 | getPatternBackgrounds |
| Function | 361 | cleanHex |

### client/src/pages/dns-domains-page.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 14 | DnsDomain |
| Interface | 29 | DnsDomainsResponse |
| Interface | 34 | DnsPlanLimits |
| Function | 116 | handleDeleteDomain |
| Component | 116 | handleDeleteDomain |
| Function | 122 | handleManageRecords |
| Component | 122 | handleManageRecords |

### client/src/pages/storage-page.tsx (7 items)

| Type | Line | Name |
|------|------|------|
| Interface | 15 | Server |
| Interface | 22 | StorageVolume |
| Function | 62 | fetchStorageVolumes |
| Function | 89 | refreshStorageData |
| Hook | 128 | usedStorage |
| Function | 129 | usedPercentage |
| Hook | 129 | usedPercentage |

### client/src/components/app/MaintenanceGuard.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | MaintenanceGuard |
| Function | 78 | isPathAllowed |
| Component | 78 | isPathAllowed |
| Function | 113 | checkUser |
| Hook | 117 | user |
| Function | 132 | checkMaintenanceStatus |

### client/src/components/dns/AddDomainDialog.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Interface | 49 | AddDomainDialogProps |
| Function | 55 | AddDomainDialog |
| Function | 85 | onSubmit |
| Component | 85 | onSubmit |
| Function | 89 | handleClose |
| Component | 89 | handleClose |

### client/src/components/dns/AddRecordDialog.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Interface | 70 | AddRecordDialogProps |
| Function | 78 | AddRecordDialog |
| Function | 125 | onSubmit |
| Component | 125 | onSubmit |
| Function | 129 | handleClose |
| Component | 129 | handleClose |

### client/src/components/ui/menubar.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Function | 9 | MenubarMenu |
| Function | 15 | MenubarGroup |
| Function | 21 | MenubarPortal |
| Function | 27 | MenubarRadioGroup |
| Function | 33 | MenubarSub |
| Function | 223 | MenubarShortcut |

### client/src/components/VirtFusionSsoButton.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Interface | 9 | BrandingData |
| Interface | 17 | VirtFusionSsoButtonProps |
| Function | 67 | testListener |
| Component | 67 | testListener |
| Function | 83 | handleVirtFusionRedirect |
| Component | 83 | handleVirtFusionRedirect |

### client/src/pages/admin/legal-editor.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Interface | 48 | LegalContent |
| Function | 61 | LegalEditorPage |
| Function | 123 | handleContentChange |
| Component | 123 | handleContentChange |
| Function | 155 | onSubmit |
| Component | 155 | onSubmit |

### client/src/pages/admin/transaction-detail-page.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Interface | 10 | Transaction |
| Function | 27 | isCredit |
| Component | 27 | isCredit |
| Function | 33 | isDebit |
| Component | 33 | isDebit |
| Function | 56 | handleDownloadTransaction |

### client/src/pages/auth/verify-page.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Function | 106 | triggerConfettiCelebration |
| Component | 106 | triggerConfettiCelebration |
| Function | 111 | randomInRange |
| Function | 142 | handleVerificationSubmit |
| Function | 203 | handleResendVerification |
| Function | 264 | handleBackToLogin |

### client/src/pages/plans/index.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Interface | 20 | PackageCategory |
| Interface | 28 | Package |
| Function | 161 | formatBandwidth |
| Function | 176 | formatNetworkSpeed |
| Function | 191 | getPackagePrice |
| Function | 693 | IconComponent |

### client/src/pages/profile-page.tsx (6 items)

| Type | Line | Name |
|------|------|------|
| Function | 69 | copyToClipboard |
| Component | 69 | copyToClipboard |
| Function | 161 | onProfileSubmit |
| Component | 161 | onProfileSubmit |
| Function | 166 | onPasswordReset |
| Component | 166 | onPasswordReset |

### server/auth-service.ts (6 items)

| Type | Line | Name |
|------|------|------|
| Class | 22 | AuthService |
| Hook | 31 | user |
| Hook | 87 | user |
| Hook | 159 | user |
| Hook | 257 | user |
| Hook | 304 | user |

### server/discord/discord-status-service.ts (6 items)

| Type | Line | Name |
|------|------|------|
| Class | 19 | DiscordStatusService |
| Function | 105 | getStatusEmoji |
| Function | 160 | createServicesEmbed |
| Function | 277 | getStatusEmoji |
| Function | 324 | createServicesEmbed |
| Function | 398 | refreshStatusEmbed |

### server/middleware/auth.ts (6 items)

| Type | Line | Name |
|------|------|------|
| Function | 6 | requireAuth |
| Function | 16 | requireAdmin |
| Function | 26 | optionalAuth |
| Function | 34 | requireRole |
| Function | 46 | requireVerified |
| Function | 56 | requireActive |

### server/services/auth/auth-service.ts (6 items)

| Type | Line | Name |
|------|------|------|
| Class | 22 | AuthService |
| Hook | 31 | user |
| Hook | 87 | user |
| Hook | 159 | user |
| Hook | 257 | user |
| Hook | 304 | user |

### shared/dns-record-types.ts (6 items)

| Type | Line | Name |
|------|------|------|
| Function | 439 | getDnsRecordType |
| Function | 443 | validateDnsRecordContent |
| Function | 451 | getContentPlaceholder |
| Function | 456 | getContentDescription |
| Function | 461 | requiresPriority |
| Function | 505 | validateSubdomainPart |

### client/src/components/billing/PayPalCheckout.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 8 | PayPalCheckoutProps |
| Function | 12 | PayPalCheckout |
| Function | 62 | handlePayPalSuccess |
| Function | 95 | handlePayPalError |
| Component | 95 | handlePayPalError |

### client/src/components/layout/SharedFooter.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 18 | BrandingSettings |
| Interface | 26 | FooterSettings |
| Function | 55 | SharedFooter |
| Function | 79 | getSettingValue |
| Function | 118 | FooterLink |

### client/src/components/loading/VpsLoadingAnimation.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 4 | VpsLoadingAnimationProps |
| Function | 13 | VpsLoadingAnimation |
| Function | 130 | dataAnimate |
| Component | 130 | dataAnimate |
| Function | 131 | offset |

### client/src/components/ui/breadcrumb.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 6 | BreadcrumbItemProps |
| Interface | 12 | BreadcrumbProps |
| Function | 17 | BreadcrumbItem |
| Component | 17 | BreadcrumbItem |
| Function | 35 | Breadcrumb |

### client/src/components/ui/chart.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Function | 27 | useChart |
| Hook | 27 | useChart |
| Function | 70 | ChartStyle |
| Component | 70 | ChartStyle |
| Function | 320 | getPayloadConfigFromPayload |

### client/src/components/ui/sidebar.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Function | 45 | useSidebar |
| Hook | 45 | useSidebar |
| Function | 105 | handleKeyDown |
| Component | 105 | handleKeyDown |
| Function | 567 | button |

### client/src/lib/chat-websocket-manager.ts (5 items)

| Type | Line | Name |
|------|------|------|
| Class | 2 | ChatWebSocketManager |
| Function | 299 | onOpen |
| Component | 299 | onOpen |
| Function | 311 | onError |
| Component | 311 | onError |

### client/src/lib/novnc/lib/rfb.js (5 items)

| Type | Line | Name |
|------|------|------|
| Function | 841 | includes |
| Function | 1156 | totalMessagesLength |
| Function | 1748 | getRFBkeycode |
| Function | 1749 | upperByte |
| Function | 1750 | lowerByte |

### client/src/lib/novnc/lib/util/events.js (5 items)

| Type | Line | Name |
|------|------|------|
| Function | 17 | stopEvent |
| Function | 25 | _captureProxy |
| Function | 51 | _captureElemChanged |
| Function | 60 | setCapture |
| Function | 111 | releaseCapture |

### client/src/pages/auth/reset-password-page.tsx (5 items)

| Type | Line | Name |
|------|------|------|
| Function | 251 | onRequestSubmit |
| Function | 259 | onVerifySubmit |
| Function | 270 | resetPassword |
| Function | 291 | copyPasswordToClipboard |
| Component | 291 | copyPasswordToClipboard |

### server/discord-service.ts (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 4 | WebhookPayload |
| Interface | 11 | WebhookEmbed |
| Interface | 28 | WebhookField |
| Class | 37 | DiscordService |
| Function | 184 | roleMention |

### server/gemini-rate-limiter.ts (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 12 | UserUsage |
| Class | 19 | GeminiRateLimiter |
| Hook | 60 | userId |
| Hook | 161 | userId |
| Hook | 294 | userId |

### server/interserver-api.ts (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 4 | DnsListItem |
| Interface | 10 | DnsNewDomain |
| Interface | 16 | DnsRecord |
| Interface | 29 | DnsUpdateRecord |
| Interface | 40 | InterServerApiError |

### server/services/communication/discord-service.ts (5 items)

| Type | Line | Name |
|------|------|------|
| Interface | 4 | WebhookPayload |
| Interface | 11 | WebhookEmbed |
| Interface | 28 | WebhookField |
| Class | 37 | DiscordService |
| Function | 184 | roleMention |

### client/src/components/VirtFusionSsoHandler.tsx (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 128 | handleSsoEvent |
| Component | 128 | handleSsoEvent |
| Function | 152 | handleTestEvent |
| Component | 152 | handleTestEvent |

### client/src/hooks/use-auth.tsx (4 items)

| Type | Line | Name |
|------|------|------|
| Interface | 12 | ExtendedUser |
| Function | 29 | AuthProvider |
| Function | 177 | useAuth |
| Hook | 177 | useAuth |

### client/src/hooks/use-mobile.tsx (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | useIsMobile |
| Hook | 5 | useIsMobile |
| Function | 10 | onChange |
| Component | 10 | onChange |

### client/src/lib/novnc/lib/decoders/hextile.js (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 119 | sx |
| Function | 120 | sy |
| Function | 124 | sw |
| Function | 125 | sh |

### client/src/lib/novnc/vendor/pako/lib/zlib/trees.js (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 22 | zero |
| Function | 163 | TreeDesc |
| Function | 171 | d_code |
| Function | 205 | send_code |

### client/src/pages/admin/servers-page.tsx (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 51 | getStatusBadgeVariant |
| Function | 177 | handleRefresh |
| Function | 226 | toggleSort |
| Component | 226 | toggleSort |

### client/src/pages/notifications-page.tsx (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 120 | getNotificationIcon |
| Component | 120 | getNotificationIcon |
| Function | 136 | getNotificationBg |
| Component | 136 | getNotificationBg |

### client/src/pages/servers-page.tsx (4 items)

| Type | Line | Name |
|------|------|------|
| Function | 15 | getStatusBadgeVariant |
| Function | 33 | getServerStatus |
| Function | 121 | startIndex |
| Function | 131 | handleRefresh |

### server/chat-service.ts (4 items)

| Type | Line | Name |
|------|------|------|
| Interface | 16 | WebSocketWithUser |
| Interface | 22 | ChatEvent |
| Hook | 159 | user |
| Hook | 371 | user |

### server/routes/api-keys.ts (4 items)

| Type | Line | Name |
|------|------|------|
| Hook | 13 | userId |
| Hook | 36 | userId |
| Hook | 74 | userId |
| Hook | 95 | userId |

### server/routes/api-v1-routes.ts (4 items)

| Type | Line | Name |
|------|------|------|
| Hook | 20 | userId |
| Hook | 58 | userId |
| Hook | 65 | userServers |
| Hook | 84 | userId |

### server/storage.ts (4 items)

| Type | Line | Name |
|------|------|------|
| Interface | 113 | IStorage |
| Class | 428 | DatabaseStorage |
| Hook | 694 | userTickets |
| Function | 1330 | offset |

### client/src/components/dashboard/StatCard.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 8 | BrandingData |
| Interface | 16 | StatCardProps |
| Function | 29 | StatCard |

### client/src/components/layout/PublicLayout.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 7 | PublicLayoutProps |
| Interface | 11 | BrandingSettings |
| Function | 19 | PublicLayout |

### client/src/components/layouts/AuthLayout.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | AuthLayoutProps |
| Interface | 11 | BrandingSettings |
| Function | 20 | AuthLayout |

### client/src/components/servers/ServerConsole.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 9 | ServerConsoleProps |
| Function | 14 | ServerConsole |
| Function | 22 | fetchConsoleUrl |

### client/src/components/ui/command.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 24 | CommandDialog |
| Component | 24 | CommandDialog |
| Function | 125 | CommandShortcut |

### client/src/components/ui/drawer.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 8 | Drawer |
| Function | 58 | DrawerHeader |
| Function | 69 | DrawerFooter |

### client/src/components/ui/error-boundary.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 3 | ErrorBoundaryState |
| Interface | 8 | ErrorBoundaryProps |
| Class | 13 | ErrorBoundary |

### client/src/components/ui/sheet.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 52 | SheetContentProps |
| Function | 77 | SheetHeader |
| Function | 91 | SheetFooter |

### client/src/hooks/use-media-query.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 3 | useMediaQuery |
| Hook | 3 | useMediaQuery |
| Function | 13 | listener |

### client/src/lib/novnc/lib/base64.js (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 18 | lengthpad |
| Function | 64 | result_length |
| Function | 73 | padding |

### client/src/lib/novnc/lib/input/domkeytable.js (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 18 | addStandard |
| Function | 24 | addLeftRight |
| Function | 31 | addNumpad |

### client/src/lib/novnc/lib/input/util.js (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 8 | getKeycode |
| Function | 68 | getKey |
| Function | 128 | getKeysym |

### client/src/lib/novnc/vendor/pako/lib/utils/common.js (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 2 | shrinkBuf |
| Function | 10 | arraySet |
| Function | 22 | flattenChunks |

### client/src/pages/admin/billing-page.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 15 | Transaction |
| Function | 174 | getStatusBadge |
| Component | 174 | getStatusBadge |

### client/src/pages/home-page.tsx (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 24 | generateServerDescription |
| Interface | 60 | BrandingData |
| Interface | 70 | BalanceData |

### server/cache-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 7 | CacheService |
| Function | 149 | betterStackCache |
| Function | 150 | betterStackLastFetch |

### server/discord/discord-command-handler.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 13 | DiscordCommandHandler |
| Hook | 168 | user |
| Hook | 196 | userId |

### server/discord/discord-utils.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 12 | DiscordUtils |
| Hook | 52 | username |
| Hook | 195 | user |

### server/email-verification-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 11 | EmailVerificationService |
| Hook | 112 | user |
| Hook | 182 | user |

### server/server-logging-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | ServerLogData |
| Class | 17 | ServerLoggingService |
| Hook | 36 | userAgent |

### server/services/auth/email-verification-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 11 | EmailVerificationService |
| Hook | 112 | user |
| Hook | 182 | user |

### server/services/communication/chat-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 16 | WebSocketWithUser |
| Class | 22 | ChatEvent |
| Class | 34 | ChatService |

### server/services/department-migration.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 16 | MigrationResult |
| Interface | 35 | SyncStatus |
| Class | 42 | DepartmentMigrationService |

### server/services/infrastructure/cache-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 7 | CacheService |
| Function | 149 | betterStackCache |
| Function | 150 | betterStackLastFetch |

### server/services/infrastructure/server-logging-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | ServerLogData |
| Class | 17 | ServerLoggingService |
| Hook | 36 | userAgent |

### server/virtfusion-user-service.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Class | 8 | VirtFusionUserService |
| Hook | 46 | user |
| Hook | 124 | userData |

### server/vite.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 11 | log |
| Function | 22 | setupVite |
| Function | 67 | serveStatic |

### shared/dns-record-utils.ts (3 items)

| Type | Line | Name |
|------|------|------|
| Function | 100 | countUserCreatedRecords |
| Function | 107 | getDnsRecordUsageStats |
| Hook | 109 | userCreatedRecords |

### client/src/components/admin/PayPalApiTest.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 8 | PayPalApiTest |
| Function | 15 | testPayPalApi |

### client/src/components/auth-layout.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | AuthLayoutProps |
| Function | 9 | AuthLayout |

### client/src/components/dashboard/ResourceUsage.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 34 | ResourceUsageProps |
| Function | 43 | ResourceUsage |

### client/src/components/DocumentTitle.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 4 | DocumentTitleProps |
| Function | 19 | DocumentTitle |

### client/src/components/maintenance-banner.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 5 | MaintenanceBannerProps |
| Function | 10 | MaintenanceBanner |

### client/src/components/ui/alert-dialog.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 46 | AlertDialogHeader |
| Function | 60 | AlertDialogFooter |

### client/src/components/ui/badge.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 32 | BadgeProps |
| Function | 36 | Badge |

### client/src/components/ui/carousel.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 33 | useCarousel |
| Hook | 33 | useCarousel |

### client/src/components/ui/dialog.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 56 | DialogHeader |
| Function | 70 | DialogFooter |

### client/src/components/ui/form.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 44 | useFormField |
| Hook | 44 | useFormField |

### client/src/components/ui/resizable.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 8 | ResizablePanelGroup |
| Function | 23 | ResizableHandle |

### client/src/components/ui/spinner.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 3 | SpinnerProps |
| Function | 8 | Spinner |

### client/src/hooks/use-settings.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 4 | useSettings |
| Hook | 4 | useSettings |

### client/src/hooks/use-theme.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 3 | useTheme |
| Hook | 3 | useTheme |

### client/src/hooks/useThemeManager.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | useThemeManager |
| Hook | 5 | useThemeManager |

### client/src/lib/novnc/lib/util/logging.js (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 20 | init_logging |
| Function | 49 | get_logging |

### client/src/lib/novnc/vendor/browser-es-module-loader/src/browser-es-module-loader.js (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 75 | BrowserESModuleLoader |
| Function | 104 | xhrFetch |

### client/src/lib/protected-route-new.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | ProtectedRoute |
| Function | 79 | AdminProtectedRoute |

### client/src/lib/protected-route.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | ProtectedRoute |
| Function | 48 | AdminProtectedRoute |

### client/src/lib/queryClient.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 3 | throwIfResNotOk |
| Function | 75 | apiRequest |

### client/src/pages/admin/index.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 36 | AdminSectionRow |
| Function | 67 | AdminSectionCard |

### client/src/pages/dashboard-blog-page.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Function | 9 | handleNavigateBack |
| Component | 9 | handleNavigateBack |

### client/src/pages/settings.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 26 | SettingItem |
| Function | 51 | handleSubmit |

### client/src/pages/teams-page.tsx (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 9 | TeamMember |
| Interface | 23 | BrandingSettings |

### server/api-key-service.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Class | 9 | ApiKeyService |
| Hook | 29 | userExists |

### server/discord/discord-todo-service.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Hook | 105 | user |
| Function | 436 | startIndex |

### server/routes/api-only-routes.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Hook | 17 | user |
| Hook | 76 | user |

### server/services/auth/api-key-service.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Class | 9 | ApiKeyService |
| Hook | 29 | userExists |

### server/services/auth/verification-rate-limiter.ts (2 items)

| Type | Line | Name |
|------|------|------|
| Interface | 12 | RateLimitResult |
| Class | 19 | VerificationRateLimiter |

### client/src/App.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 14 | App |

### client/src/components/app/AppRouter.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 73 | AppRouter |

### client/src/components/app/BrandThemeProvider.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 4 | BrandThemeProvider |

### client/src/components/ui/button.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Interface | 36 | ButtonProps |

### client/src/components/ui/calendar.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 10 | Calendar |

### client/src/components/ui/context-menu.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 166 | ContextMenuShortcut |

### client/src/components/ui/dropdown-menu.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 169 | DropdownMenuShortcut |

### client/src/components/ui/scroll-area.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 7 | ScrollAreaErrorBoundary |

### client/src/components/ui/skeleton.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 3 | Skeleton |

### client/src/components/ui/toaster.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 11 | Toaster |

### client/src/lib/color-overrides.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 8 | applyBrandColorOverrides |

### client/src/lib/novnc/lib/decoders/tight.js (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 195 | bpp |

### client/src/lib/novnc/lib/display.js (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 422 | p |

### client/src/lib/novnc/lib/encodings.js (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 31 | encodingName |

### client/src/lib/novnc/lib/util/cursor.js (1 items)

| Type | Line | Name |
|------|------|------|
| Hook | 9 | useFallback |

### client/src/lib/novnc/lib/util/polyfill.js (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 42 | CustomEvent |

### client/src/lib/novnc/vendor/pako/lib/zlib/crc32.js (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 25 | crc32 |

### client/src/lib/utils.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 4 | cn |

### client/src/pages/auth/forgot-username-page.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 137 | onSubmit |

### client/src/pages/landing-page.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 61 | fetchMaintenanceStatus |

### client/src/pages/privacy-page.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 6 | PrivacyPolicyPage |

### client/src/pages/tos-page.tsx (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 6 | TermsOfServicePage |

### server/add-chat-conversion-columns.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 4 | addChatConversionColumns |

### server/check-schema.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 4 | checkSchema |

### server/discord/discord-ai-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 14 | DiscordAIService |

### server/discord/discord-help-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 17 | DiscordHelpService |

### server/discord/discord-ticket-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 17 | DiscordTicketService |

### server/discord-bot-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 16 | DiscordBotService |

### server/email-queue.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Hook | 91 | user |

### server/email.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 8 | EmailService |

### server/middleware/auth-middleware.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 68 | apiKeyUser |

### server/middleware.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Interface | 12 | Session |

### server/routes/admin-settings.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 10 | isAdmin |

### server/routes/monitoring-routes.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 60 | mapBetterStackStatus |

### server/run-migration.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Function | 5 | runMigration |

### server/services/communication/email.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 8 | EmailService |

### server/services/cron-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 5 | CronService |

### server/services/dns-billing-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 7 | DnsBillingService |

### server/settings-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 8 | SettingsService |

### server/virtfusion-api.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 6 | VirtFusionApi |

### server/virtfusion-service.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Class | 8 | VirtFusionService |

### shared/schemas/user-schema.ts (1 items)

| Type | Line | Name |
|------|------|------|
| Hook | 4 | users |

## Recommendations

1. **Start with high-impact files**: Focus on files with the most undocumented items first.
2. **Prioritize public APIs**: Ensure all public APIs and interfaces are well-documented.
3. **Document complex logic**: Prioritize documentation for complex functions and algorithms.
4. **Use documentation templates**: Follow the templates in the code documentation guidelines.
5. **Automate where possible**: Consider using tools to generate documentation stubs.
