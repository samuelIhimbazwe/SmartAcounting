FROM gradle:8.10.2-jdk21 AS build
WORKDIR /home/gradle/src
COPY . .
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r app && useradd -r -g app app
WORKDIR /app
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar
RUN chown -R app:app /app
USER app
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=8 \
  CMD sh -c 'curl -sf "http://localhost:${PORT:-8080}/actuator/health/liveness" || exit 1'
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
