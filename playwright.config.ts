import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,timeout:60000,expect:{timeout:10000},
 reporter:[['list'],['html',{open:'never'}]],outputDir:'test-results',
 use:{baseURL:'http://127.0.0.1:3100',serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{command:'node scripts/qa-server.cjs',url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:240000},
});
