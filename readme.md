# Local Development Guide for Firebase Functions

This guide outlines how to run and test Firebase Functions locally for the project.

## Setup

1. Install the Firebase CLI

   ```
   npm install -g firebase-tools
   ```

2. Install the project dependencies:

   ```
   npm install
   ```

3. Log in to Firebase using the Firebase CLI:
   ```
   firebase login
   ```

## Running Functions Locally

To run your Firebase Functions locally:

1. Use the Firebase Emulator Suite by running:

   ```
   npm dev
   ```

2. The Firebase Emulator Suite will start up, emulating your project's functions.

## Testing the Function

With the emulator running, you can test the `helloWorld` function by accessing the following URL in your web browser or using a tool like `curl`:

```
http://127.0.0.1:8888/stgeorges-attendance-metrics/us-central1/helloWorld
```
