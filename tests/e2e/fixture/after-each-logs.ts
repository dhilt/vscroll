import type { Page, TestInfo } from '@playwright/test';

/**
 * afterEachLogs handler that retrieves and prints vscroll debug logs when tests fail.
 *
 * With immediateLog: false, logs are stored in workflow.scroller.logger
 * and can be retrieved from the browser context.
 *
 * Usage:
 * ```typescript
 * import { afterEachLogs } from '../fixture/after-each-logs.js';
 *
 * test.afterEach(afterEachLogs);
 * ```
 */
export async function afterEachLogs(
  { page }: { page: Page },
  testInfo: TestInfo
): Promise<void> {
  // Only process if test failed
  if (testInfo.status !== testInfo.expectedStatus) {
    // Get logs from vscroll logger
    const logs = await page
      .evaluate(() => {
        const vscroll = window.__vscroll__;
        if (!vscroll?.workflow?.scroller?.logger) {
          return [];
        }

        const logger = vscroll.workflow.scroller.logger;
        // Access private logs array (stored when immediateLog: false)
        const logArray = logger.getLogs() || [];

        // Format logs similar to console output
        return logArray.map(args => {
          return args
            .map(arg => {
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg);
              }
              return String(arg);
            })
            .join(' ');
        });
      })
      .catch(() => [] as string[]);

    if (logs.length > 0) {
      const testName = testInfo.titlePath.join(' › ');
      console.log('\n' + '='.repeat(80));
      console.log(`VSCROLL DEBUG LOGS (test failed): ${testName}`);
      console.log('='.repeat(80));
      logs.forEach(log => console.log(log));
      console.log('='.repeat(80) + '\n');

      await testInfo.attach('vscroll-debug-logs', {
        body: logs.join('\n'),
        contentType: 'text/plain'
      });
    }
  }
}
