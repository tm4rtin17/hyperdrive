# Hyperdrive — Project Instructions

## Database / Docker volumes

**NEVER run `docker-compose down -v` or `docker volume rm hyperdrive_hyperdrive_db`.**

The `hyperdrive_hyperdrive_db` named volume holds all persistent application data (parts, operations, engineering masters, etc.). Wiping it destroys user data and cannot be undone.

Safe commands:
- `docker-compose down` — stops containers, keeps volume
- `docker-compose up --build` — rebuilds images, keeps volume
- `docker-compose restart` — restarts containers, keeps volume

Only wipe the volume if the user explicitly asks to reset all data and confirms they understand it is destructive.
