FROM ghcr.io/muchobien/pocketbase:latest

EXPOSE 8090

CMD ["/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--hooksDir=/pb_hooks", "--migrationsDir=/pb_migrations"]
