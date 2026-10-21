# Architecture
- Store site appearance on each barbershop and scope its CSS tokens to the public page wrapper; this keeps tenant branding out of the shared administrative theme.
- Delete authentication accounts only through the Auth admin API after preserving administrative role holders; application data cleanup must not write managed auth tables.