my application is called "SkyPANEL" and its a web based application, The following below explains more.
SkyVPS360 Client Portal provides a seamless interface for managing virtual private servers through VirtFusion API integration. This full-stack application enables comprehensive user account management, advanced billing with credit-based purchasing, PDF transaction generation, and complete transaction tracking.
if you need more information about the application, please check this file here `readme.md` in the root directory of the project.
The application is built using the following technologies:
- **Frontend**: React, Redux, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **API Integration**: VirtFusion API
- **PDF Generation**: pdf-lib
We use shadcn/ui for the UI components and we have a custom theme for the application, this can be in `brand-theme.md` file in the root directory of the project.

Admin Panel:
the admin panel is located inside of `/admin` and it allows the admin to manage the users, transactions, and other settings of the application. The admin panel is built using the same technologies as the main application, but it has a different layout and design to suit the needs of the admin users.
The admin panel has the following features:
- User Management: Admin can view, edit, and delete users. Admin can also reset user passwords and manage user roles.
- Transaction Management: Admin can view, edit, and delete transactions. Admin can also generate reports based on transactions.
- Settings Management: Admin can manage application settings, such as API keys, billing settings, and other configurations.
- Role-Based Access Control: Admin can manage user roles and permissions to restrict access to certain features of the application.
- Email Logs: Admin can view email logs to track email notifications sent to users.
- Has a way to be a means of a saas where admins can customize the application for their own use, including branding, settings, and user management.

Client Portal:
the client portal is defined mostly by `/dashboard` and it allows currently users to manage their transactions as well as login with sso into VirtFusion and also pay and download pdf invoices.
The client portal is built using the same technologies as the main application, but it has a different layout and design to suit the needs of the end users.
The client portal has the following features:
- User Dashboard: Users can view their account information, transaction history, and other relevant data.
- PDF Invoices: Users can download PDF invoices for their transactions.
- Transaction History: Users can view their transaction history and details.
- SSO Login: Users can log in to VirtFusion using Single Sign-On (SSO) integration.
- Billing Management: Users can manage their billing information and payment methods.

Make sure to follow the best practices for coding, including:
- Writing clean and maintainable code
- Using meaningful variable and function names
- Adding comments and documentation where necessary
- Following the project's coding style and conventions
- Asking for clarification if you're unsure about something before implementing it
- Dont ever assume anything, always ask for clarification
