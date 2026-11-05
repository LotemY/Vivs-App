# MyStockApp

A household inventory tracker that learns how fast you use things and tells you when it's time to restock. Built for two people sharing one home, Android only.

## Why

Running out of something at home is only annoying when you find out too late. Most shopping lists only know what you wrote down. This app tracks what is actually in the cupboard and works out when each item will run out, so the list builds itself.

## What it does

- **Storage**: shows what you have at home. Counts are fixed in a quick "Adjust" mode, and the app learns each item's consumption rate from those corrections.
- **Running-low reminders**: one daily notification at 9:00 that lists everything about to run out.
- **Shared history**: a bell screen showing what was added, bought, archived or deleted, so both of us see the same thing.
- **Products catalog**: every item with its photo, company, category, price, pack size, and a star for essentials.
- **Archive**: take something out of Storage without losing it. Long-press any item to archive, restore or delete it.
- **Smart stacking**: out-of-stock items tuck behind an in-stock item of the same kind, like a stack of cards, so the list stays short. A hidden tag per product decides which items belong together (all milks stack together), and category is the fallback.

## Built with

React Native, TypeScript, Expo, and Supabase, with local notifications scheduled on each phone.
