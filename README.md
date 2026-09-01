# My Wallet Home

1. Layout & Core UI:

Dashboard: Display total balance in USD ($), a weekly spending chart, quick action buttons (Send, Receive, Pay Bills), recent transactions list, and active virtual debit cards.

Send & Receive Screen: Include input fields for US Bank ACH transfer details, email/phone transfers, and a button for PayPal payout integration.

Card Management Screen: Display virtual debit cards with controls to reveal card details and freeze/unfreeze cards.

2. Database & Security Setup:

Connect Supabase for user authentication (Sign Up / Log In).

Set up database tables for accounts, balances, and transactions.

Apply Row-Level Security (RLS) to all tables so users can strictly only view and manage their own financial data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fbcf925e-b9ef-4d4a-8980-34c08c7955f7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
