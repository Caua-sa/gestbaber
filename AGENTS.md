# Architecture
- Render the root and shop-specific public sites through the same landing page; route parameters select the shop so content and design stay consistent.
- Use shared multi-service selection and combo totals for quick and admin scheduling; guest booking prices are resolved from service IDs on the server so public inputs cannot set prices.
- Store site appearance on each barbershop and scope its CSS tokens to the public page wrapper; this keeps tenant branding out of the shared administrative theme.
- Scope quick-booking contrast tokens and mobile action-bar styles to `.booking-flow` so booking controls stay readable without changing other public or admin pages.
- Delete authentication accounts only through the Auth admin API after preserving administrative role holders; application data cleanup must not write managed auth tables.