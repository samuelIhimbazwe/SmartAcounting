FROM certbot/certbot:latest
COPY renew.sh /renew.sh
RUN chmod +x /renew.sh
ENTRYPOINT ["certbot"]
