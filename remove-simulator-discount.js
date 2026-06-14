/**
 * シミュレーターキャンペーン終了スクリプト
 * GitHub Actions (8/1 0:00 JST) から自動実行
 */
import fs from 'fs';

const BLOCK = `
    // シミュレーター経由ディスカウント適用
    const inputReturn = document.createElement('input');
    inputReturn.type = 'hidden';
    inputReturn.name = 'return_to';
    inputReturn.value = '/discount/SIMULATOR10?redirect=/cart';
    form.appendChild(inputReturn);
`;

const COURIER_BLOCK = `
  // シミュレーター経由ディスカウント適用
  const inputReturn = document.createElement('input');
  inputReturn.type = 'hidden';
  inputReturn.name = 'return_to';
  inputReturn.value = '/discount/SIMULATOR10?redirect=/cart';
  form.appendChild(inputReturn);
`;

let changed = false;

['simulator.js', 'courier-simulator.js'].forEach(file => {
  const block = file === 'simulator.js' ? BLOCK : COURIER_BLOCK;
  const src = fs.readFileSync(file, 'utf-8');
  if (src.includes('SIMULATOR10')) {
    fs.writeFileSync(file, src.replace(block, '\n'), 'utf-8');
    console.log(`✅ ${file}: ディスカウント適用コードを削除`);
    changed = true;
  } else {
    console.log(`ℹ️  ${file}: 対象コードなし（スキップ）`);
  }
});

if (!changed) console.log('\n変更なし。すでに削除済みです。');
