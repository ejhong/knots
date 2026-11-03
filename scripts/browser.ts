/**
 * Where the scripts' Chromium comes from. Locally it is the installed Google Chrome, which updates itself, run with
 * its sandbox: Playwright's own Chromium trails Chrome's security fixes, and Playwright launches it without the
 * sandbox by default. A cloud session has no Chrome and sets SHOT_CHROMIUM to the container's Chromium, which runs
 * as root and cannot use the sandbox.
 */
import type { LaunchOptions } from 'playwright';

export function browserLaunch(): LaunchOptions {
  const own = process.env.SHOT_CHROMIUM;
  return own ? { executablePath: own } : { channel: 'chrome', chromiumSandbox: true };
}
