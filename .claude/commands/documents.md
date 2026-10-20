---
description: "Render health monitoring reports, employer recall lists, lead removal notices and tax invoices as branded HTML from the records."
---

# documents

Run `npm run docs`, or `npm run docs -- invoice` for one kind (`health-monitoring-report`, `recall-list`, `lead-removal-notice`, `invoice`), or `npm run docs -- health-monitoring-report <id-prefix>` for one record. Files land in `docs-out/`. Change the business name, colours and logo in `brand.json`. Health monitoring reports are confidential: they go to the worker, the employer that commissioned them, and the regulator when the law says so. Check each one before it goes out; nothing is sent.
