Place smartaccounting-cert.cer here for production SSL pinning.
Obtain the certificate from your API TLS provider (pin the leaf or SPKI hash per security policy).
Set SSL_PINNING_CERT_INSTALLED = true in src/config/pinning.ts after the file is present.

iOS FCM: replace ios/GoogleService-Info.plist placeholder with the real file from Firebase
before any iOS release or TestFlight build. Do not commit production API keys to public repos.
