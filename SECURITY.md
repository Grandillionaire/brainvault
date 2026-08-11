# security policy

## reporting vulnerabilities

if you discover a security vulnerability, please email the details to the repository owner instead of opening a public issue.

## what we protect

- your notes stay on your device
- no tracking or analytics
- no cloud sync (optional in future)

## the one exception: voice notes

voice notes use the browser's web speech api. in chrome and edge that api is
**not** on-device: the recorded audio is streamed to the browser vendor's speech
service to be transcribed. the app tells you this and requires you to accept it
before the microphone is ever opened, and the feature stays off until you do.
everything else in brainvault stays local. don't dictate anything confidential.

## what you should know

- all data is stored in local storage
- export your data anytime
- database files are local only
- the optional api server binds to `127.0.0.1` by default. set
  `AUTH_REQUIRED=true` (and a real `JWT_SECRET`) before binding it to anything
  else — without it, every notes, search, settings, ai and attachment endpoint
  is open to whoever can reach the port

## dependencies

we regularly update dependencies to patch security issues. run `npm audit` to check for known vulnerabilities in the dependency tree.

## best practices

- keep your system updated
- export backups regularly
- review code before building from source
- use the latest release
