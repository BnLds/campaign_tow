import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://664a7de2790704de171af7b18b9fb389@o4511188817870848.ingest.de.sentry.io/4511188820033616",
  environment: process.env.NODE_ENV ?? 'development',
  
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  
  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,
});