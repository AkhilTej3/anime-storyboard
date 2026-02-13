## Packages
(none needed)

## Notes
Uses next-themes (already installed) for light/dark mode; toggles the `dark` class
Chat send endpoint returns SSE stream; client uses fetch + ReadableStream reader (NOT EventSource) because endpoint is POST
Render image renditions via `data:image/png;base64,${rendition.dataBase64}`
All fetches include `credentials: "include"`
