import functions from 'firebase-admin';
import admin from 'firebase-admin';

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
admin.initializeApp();

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send('Hello from Firebase!');
});
