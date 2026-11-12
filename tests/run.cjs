'use strict';
const {spawnSync}=require('node:child_process');
for (const file of ['content.js','preview-guard.js','popup.js']) {
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if (result.status!==0) process.exit(result.status||1);
}
for (const file of ['test.cjs','hover-test.cjs','preload-test.cjs','static-cover-test.cjs','virtual-list-test.cjs']) {
  const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});
  if (result.status!==0) process.exit(result.status||1);
}
