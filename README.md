# Meeting Library — consent page

Static page where the owner approves Claude's **read-only** access to their Meeting Library
(Supabase Auth OAuth 2.1 server → `oauth/consent`). No secrets: the Supabase publishable key
only identifies the project; data is protected by row-level security.

Published from the `consent/` folder of the private `meeting-library` repo (source of truth).
