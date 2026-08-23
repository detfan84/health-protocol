// build.js — which version of the app this is.
//
// A person looking at a screen cannot tell whether they are looking at
// yesterday's code. Neither can anybody helping them. This constant is stamped
// at deploy time by scripts/stage-dist.mjs and shown on the Data screen, so
// "it looks the same" becomes a question with an answer.
//
// In the repo it says "dev" on purpose: the source is never the deployed thing.

export const BUILD = 'dev';
