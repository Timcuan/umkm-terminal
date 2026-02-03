/**
 * Wallet Management Interactive Menu
 * Secure wallet storage with mnemonic support
 */

import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import {
  formatAddress,
  generateWalletWithMnemonic,
  mnemonicToPrivateKey,
  validateMnemonicPhrase,
  validatePrivateKey,
} from './crypto.js';
import {
  addWalletToStore,
  addWalletWithMnemonicToStore,
  createBackupFile,
  decryptWallet,
  decryptWalletMnemonic,
  getActiveWallet,
  getAllWallets,
  getBackupDir,
  getCurrentWallet,
  getWalletDir,
  importFromBackup,
  listBackupFiles,
  migrateEnvWalletToStore,
  migrateOldWalletStore,
  removeWalletFromStore,
  setActiveWallet,
  updateWalletName,
  walletHasMnemonic,
} from './storage.js';
import type { StoredWallet } from './types.js';

// ============================================================================
// Menu Display Helpers
// ============================================================================

function showHeader(title: string): void {
  console.log('');
  console.log(chalk.white.bold(`  ${title}`));
  console.log(chalk.gray('  ─────────────────────────────────────'));
}

function showSuccess(message: string): void {
  console.log(chalk.green(`  ✓ ${message}`));
}

function showError(message: string): void {
  console.log(chalk.red(`  ✗ ${message}`));
}

function showWarning(message: string): void {
  console.log(chalk.yellow(`  ⚠ ${message}`));
}

function showInfo(message: string): void {
  console.log(chalk.gray(`  ${message}`));
}

async function pressEnter(message = 'Press Enter...'): Promise<void> {
  await input({ message });
}

// ============================================================================
// Wallet List Display
// ============================================================================

function displayWalletList(wallets: StoredWallet[]): void {
  if (wallets.length === 0) {
    showInfo('No wallets stored.');
    return;
  }

  console.log('');
  for (const wallet of wallets) {
    const activeMarker = wallet.isActive ? chalk.green(' ●') : chalk.gray(' ○');
    const name = chalk.cyan(wallet.name.padEnd(15));
    const addr = chalk.gray(formatAddress(wallet.address));
    const hasMnemonic = wallet.encryptedMnemonic ? chalk.green(' [M]') : '';
    console.log(`  ${activeMarker} ${name} ${addr}${hasMnemonic}`);
  }
  console.log('');
}

// ============================================================================
// Main Menu
// ============================================================================

export async function showWalletMenu(): Promise<void> {
  // Run migration on first access
  migrateOldWalletStore();

  let running = true;

  while (running) {
    const wallets = getAllWallets();
    const activeWallet = getActiveWallet();
    const currentEnvWallet = getCurrentWallet();

    showHeader('WALLET MANAGEMENT');

    // Show storage location
    console.log(chalk.gray(`  Storage: ${getWalletDir()}`));

    // Show current status
    if (activeWallet) {
      console.log('');
      console.log(
        `  ${chalk.gray('Active:')} ${chalk.cyan(activeWallet.name)} ${chalk.gray(`(${formatAddress(activeWallet.address)})`)}`
      );
      if (activeWallet.encryptedMnemonic) {
        console.log(`  ${chalk.gray('Type:')} ${chalk.green('HD Wallet (has recovery phrase)')}`);
      }
    } else if (currentEnvWallet) {
      console.log('');
      console.log(
        `  ${chalk.gray('From .env:')} ${chalk.cyan(formatAddress(currentEnvWallet.address))}`
      );
      console.log(chalk.yellow('  (Not in wallet store - use "Add Current" to save)'));
    } else {
      console.log('');
      showWarning('No wallet configured');
    }

    console.log(`  ${chalk.gray('Stored:')} ${wallets.length} wallet(s)`);
    console.log(chalk.gray('  [M] = Has recovery phrase'));
    console.log('');

    const choices = [
      { name: `${chalk.cyan('[1]')} View All Wallets`, value: 'list' },
      { name: `${chalk.green('[2]')} Generate New Wallet`, value: 'generate' },
      { name: `${chalk.cyan('[3]')} Import Wallet`, value: 'import' },
      { name: `${chalk.cyan('[4]')} Switch Active Wallet`, value: 'switch' },
      { name: `${chalk.cyan('[5]')} Export / Backup`, value: 'export' },
      { name: `${chalk.gray('[6]')} Manage Wallets`, value: 'manage' },
    ];

    // Add migration option if .env wallet not in store
    const envWalletInStore = currentEnvWallet
      ? wallets.some((w) => w.address.toLowerCase() === currentEnvWallet.address.toLowerCase())
      : false;

    if (currentEnvWallet && !envWalletInStore) {
      choices.splice(2, 0, {
        name: `${chalk.yellow('[+]')} Add Current .env Wallet`,
        value: 'migrate',
      });
    }

    choices.push({ name: `${chalk.yellow('[<]')} Back`, value: 'back' });

    const action = await select({
      message: 'Select option:',
      choices,
    });

    switch (action) {
      case 'list':
        await showWalletList();
        break;
      case 'generate':
        await generateNewWallet();
        break;
      case 'import':
        await importWalletMenu();
        break;
      case 'switch':
        await switchActiveWallet();
        break;
      case 'export':
        await exportWalletMenu();
        break;
      case 'manage':
        await manageWalletsMenu();
        break;
      case 'migrate':
        await migrateCurrentWallet();
        break;
      case 'back':
        running = false;
        break;
    }
  }
}

// ============================================================================
// View All Wallets
// ============================================================================

async function showWalletList(): Promise<void> {
  const wallets = getAllWallets();

  showHeader('STORED WALLETS');
  displayWalletList(wallets);

  if (wallets.length > 0) {
    console.log(chalk.gray('  ● = Active wallet'));
    console.log(chalk.gray('  [M] = Has recovery phrase (mnemonic)'));
  }

  await pressEnter();
}

// ============================================================================
// Generate New Wallet
// ============================================================================

async function generateNewWallet(): Promise<void> {
  showHeader('GENERATE NEW WALLET');
  console.log('');

  // Generate wallet with mnemonic
  const wallet = generateWalletWithMnemonic();

  showSuccess('New HD wallet generated!');
  console.log('');

  // Show mnemonic prominently
  console.log(chalk.red.bold('  ═══════════════════════════════════════════════════════'));
  console.log(chalk.red.bold('  ⚠ RECOVERY PHRASE - WRITE THIS DOWN AND KEEP IT SAFE! ⚠'));
  console.log(chalk.red.bold('  ═══════════════════════════════════════════════════════'));
  console.log('');

  const words = wallet.mnemonic.split(' ');
  for (let i = 0; i < words.length; i += 4) {
    const row = words
      .slice(i, i + 4)
      .map((w, j) => {
        const num = String(i + j + 1).padStart(2, ' ');
        return `${chalk.gray(`${num}.`)} ${chalk.yellow(w.padEnd(10))}`;
      })
      .join('  ');
    console.log(`  ${row}`);
  }

  console.log('');
  console.log(chalk.red('  This phrase can restore your wallet in MetaMask, Ledger, etc.'));
  console.log(chalk.red('  Anyone with this phrase can steal your funds!'));
  console.log('');

  console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(wallet.address)}`);
  console.log('');

  // Confirm user has saved the phrase
  const confirmed = await confirm({
    message: 'I have saved my recovery phrase securely',
    default: false,
  });

  if (!confirmed) {
    showWarning('Please save your recovery phrase before continuing.');
    await pressEnter();
    return;
  }

  // Get wallet name
  const name = await input({
    message: 'Wallet name:',
    default: `Wallet ${getAllWallets().length + 1}`,
    validate: (v) => v.trim().length > 0 || 'Name is required',
  });

  // Get password
  console.log('');
  showInfo('Create a password to encrypt this wallet.');
  showInfo("You'll need it to switch to or export this wallet.");
  console.log('');

  const password = await input({
    message: 'Password (min 8 chars):',
    validate: (v) => v.length >= 8 || 'Password must be at least 8 characters',
  });

  const confirmPwd = await input({
    message: 'Confirm password:',
    validate: (v) => v === password || 'Passwords do not match',
  });

  if (password !== confirmPwd) {
    showError('Passwords do not match.');
    await pressEnter();
    return;
  }

  // Set as active?
  const setActive = await confirm({
    message: 'Set as active wallet?',
    default: true,
  });

  // Save to store with mnemonic
  const result = addWalletWithMnemonicToStore(
    wallet.privateKey,
    wallet.mnemonic,
    name,
    password,
    0,
    setActive
  );

  console.log('');
  if (result.success) {
    showSuccess(`Wallet "${name}" saved securely!`);
    showInfo(`Location: ${getWalletDir()}`);
    if (setActive) {
      showInfo('This wallet is now active.');
    }
  } else {
    showError(result.error || 'Failed to save wallet');
  }

  await pressEnter();
}

// ============================================================================
// Import Wallet
// ============================================================================

async function importWalletMenu(): Promise<void> {
  showHeader('IMPORT WALLET');
  console.log('');

  const method = await select({
    message: 'Import method:',
    choices: [
      { name: `${chalk.green('[1]')} Recovery phrase (12/24 words)`, value: 'mnemonic' },
      { name: `${chalk.cyan('[2]')} Private key`, value: 'key' },
      { name: `${chalk.cyan('[3]')} From backup file`, value: 'file' },
      { name: `${chalk.yellow('[<]')} Cancel`, value: 'cancel' },
    ],
  });

  if (method === 'cancel') return;

  if (method === 'mnemonic') {
    await importFromMnemonic();
  } else if (method === 'key') {
    await importFromPrivateKey();
  } else {
    await importFromBackupFile();
  }
}

async function importFromMnemonic(): Promise<void> {
  console.log('');
  showInfo('Enter your 12 or 24 word recovery phrase.');
  showInfo('Words should be separated by spaces.');
  console.log('');

  const mnemonicInput = await input({
    message: 'Recovery phrase:',
    validate: (v) => {
      const words = v.trim().split(/\s+/);
      if (words.length !== 12 && words.length !== 24) {
        return 'Must be 12 or 24 words';
      }
      if (!validateMnemonicPhrase(v.trim())) {
        return 'Invalid recovery phrase';
      }
      return true;
    },
  });

  const mnemonic = mnemonicInput.trim().toLowerCase();
  const privateKey = mnemonicToPrivateKey(mnemonic, 0);

  if (!privateKey) {
    showError('Failed to derive wallet from phrase');
    await pressEnter();
    return;
  }

  const validation = validatePrivateKey(privateKey);
  if (!validation.success) {
    showError('Failed to derive address');
    await pressEnter();
    return;
  }

  console.log('');
  showSuccess('Valid recovery phrase!');
  console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(validation.data.address)}`);
  console.log('');

  // Get name and password
  const name = await input({
    message: 'Wallet name:',
    default: `Imported ${getAllWallets().length + 1}`,
  });

  const password = await input({
    message: 'Password (min 8 chars):',
    validate: (v) => v.length >= 8 || 'Min 8 characters',
  });

  const setActive = await confirm({
    message: 'Set as active wallet?',
    default: true,
  });

  const result = addWalletWithMnemonicToStore(privateKey, mnemonic, name, password, 0, setActive);

  console.log('');
  if (result.success) {
    showSuccess(`Wallet "${name}" imported with recovery phrase!`);
  } else {
    showError(result.error || 'Failed to import');
  }

  await pressEnter();
}

async function importFromPrivateKey(): Promise<void> {
  console.log('');
  showInfo('Enter your private key (64 hex chars, with or without 0x).');
  showWarning('Note: Wallets imported by private key cannot be recovered with a phrase.');
  console.log('');

  const keyInput = await input({
    message: 'Private Key:',
    validate: (v) => {
      if (!v.trim()) return 'Required';
      const result = validatePrivateKey(v);
      return result.success || result.error || 'Invalid key';
    },
  });

  const validation = validatePrivateKey(keyInput);
  if (!validation.success) {
    showError(validation.error || 'Invalid key');
    await pressEnter();
    return;
  }

  console.log('');
  showSuccess('Valid private key!');
  console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(validation.data.address)}`);
  console.log('');

  // Get name and password
  const name = await input({
    message: 'Wallet name:',
    default: `Imported ${getAllWallets().length + 1}`,
  });

  const password = await input({
    message: 'Password (min 8 chars):',
    validate: (v) => v.length >= 8 || 'Min 8 characters',
  });

  const setActive = await confirm({
    message: 'Set as active wallet?',
    default: true,
  });

  const result = addWalletToStore(validation.data.normalizedKey, name, password, setActive);

  console.log('');
  if (result.success) {
    showSuccess(`Wallet "${name}" imported!`);
    showWarning('This wallet has no recovery phrase.');
  } else {
    showError(result.error || 'Failed to import');
  }

  await pressEnter();
}

async function importFromBackupFile(): Promise<void> {
  const backups = listBackupFiles();

  if (backups.length === 0) {
    console.log('');
    showWarning('No backup files found.');
    showInfo(`Directory: ${getBackupDir()}`);
    await pressEnter();
    return;
  }

  console.log('');
  console.log(chalk.cyan('  AVAILABLE BACKUPS'));
  console.log(chalk.gray('  ─────────────────────────────────────'));

  const choices = backups.map((b, i) => ({
    name: `${chalk.cyan(`[${i + 1}]`)} ${formatAddress(b.address)} ${chalk.gray(`(${b.createdAt.slice(0, 10)})`)}`,
    value: b.filename || '',
  }));
  choices.push({ name: `${chalk.yellow('[<]')} Cancel`, value: 'cancel' });

  const selected = await select({
    message: 'Select backup:',
    choices,
  });

  if (selected === 'cancel') return;

  const password = await input({
    message: 'Backup password:',
    validate: (v) => v.length > 0 || 'Required',
  });

  const result = importFromBackup(selected, password);

  if (!result.success || !result.privateKey) {
    console.log('');
    showError(result.error || 'Failed to decrypt');
    await pressEnter();
    return;
  }

  console.log('');
  showSuccess('Backup decrypted!');
  console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(result.address)}`);
  if (result.mnemonic) {
    console.log(`  ${chalk.gray('Type:')} ${chalk.green('HD Wallet (has recovery phrase)')}`);
  }
  console.log('');

  // Save to store with new password
  showInfo('Create a new password for this wallet.');

  const newPassword = await input({
    message: 'New password (min 8 chars):',
    validate: (v) => v.length >= 8 || 'Min 8 characters',
  });

  const name = await input({
    message: 'Wallet name:',
    default: `Restored ${getAllWallets().length + 1}`,
  });

  const setActive = await confirm({
    message: 'Set as active wallet?',
    default: true,
  });

  const saveResult = result.mnemonic
    ? addWalletWithMnemonicToStore(
        result.privateKey,
        result.mnemonic,
        name,
        newPassword,
        0,
        setActive
      )
    : addWalletToStore(result.privateKey, name, newPassword, setActive);

  console.log('');
  if (saveResult.success) {
    showSuccess(`Wallet "${name}" restored!`);
  } else {
    showError(saveResult.error || 'Failed to save');
  }

  await pressEnter();
}

// ============================================================================
// Switch Active Wallet
// ============================================================================

async function switchActiveWallet(): Promise<void> {
  const wallets = getAllWallets();

  if (wallets.length === 0) {
    showHeader('SWITCH WALLET');
    console.log('');
    showWarning('No wallets stored. Generate or import a wallet first.');
    await pressEnter();
    return;
  }

  if (wallets.length === 1) {
    showHeader('SWITCH WALLET');
    console.log('');
    showInfo('Only one wallet available.');
    await pressEnter();
    return;
  }

  showHeader('SWITCH ACTIVE WALLET');
  displayWalletList(wallets);

  const choices = wallets
    .filter((w) => !w.isActive)
    .map((w, i) => ({
      name: `${chalk.cyan(`[${i + 1}]`)} ${w.name} ${chalk.gray(`(${formatAddress(w.address)})`)}`,
      value: w.address,
    }));
  choices.push({ name: `${chalk.yellow('[<]')} Cancel`, value: 'cancel' });

  const selected = await select({
    message: 'Switch to:',
    choices,
  });

  if (selected === 'cancel') return;

  const wallet = wallets.find((w) => w.address === selected);
  if (!wallet) return;

  console.log('');
  const password = await input({
    message: `Password for "${wallet.name}":`,
    validate: (v) => v.length > 0 || 'Required',
  });

  const result = setActiveWallet(selected, password);

  console.log('');
  if (result.success) {
    showSuccess(`Switched to "${wallet.name}"!`);
    showInfo('The .env file has been updated.');
  } else {
    showError(result.error || 'Failed to switch');
  }

  await pressEnter();
}

// ============================================================================
// Export / Backup
// ============================================================================

async function exportWalletMenu(): Promise<void> {
  const wallets = getAllWallets();

  if (wallets.length === 0) {
    showHeader('EXPORT WALLET');
    console.log('');
    showWarning('No wallets to export.');
    await pressEnter();
    return;
  }

  showHeader('EXPORT / BACKUP');
  displayWalletList(wallets);

  // Select wallet to export
  const choices = wallets.map((w, i) => ({
    name: `${chalk.cyan(`[${i + 1}]`)} ${w.name} ${chalk.gray(`(${formatAddress(w.address)})`)}`,
    value: w.address,
  }));
  choices.push({ name: `${chalk.yellow('[<]')} Cancel`, value: 'cancel' });

  const selected = await select({
    message: 'Export wallet:',
    choices,
  });

  if (selected === 'cancel') return;

  const wallet = wallets.find((w) => w.address === selected);
  if (!wallet) return;

  // Get password to decrypt
  console.log('');
  const password = await input({
    message: `Password for "${wallet.name}":`,
    validate: (v) => v.length > 0 || 'Required',
  });

  const privateKey = decryptWallet(selected, password);
  if (!privateKey) {
    console.log('');
    showError('Invalid password');
    await pressEnter();
    return;
  }

  // Check if wallet has mnemonic
  const mnemonic = decryptWalletMnemonic(selected, password);
  const hasMnemonic = walletHasMnemonic(selected);

  // Export options
  console.log('');
  const exportChoices = [
    { name: `${chalk.cyan('[1]')} Save to backup file`, value: 'file' },
    { name: `${chalk.cyan('[2]')} Display private key`, value: 'key' },
  ];

  if (hasMnemonic) {
    exportChoices.push({
      name: `${chalk.green('[3]')} Display recovery phrase`,
      value: 'mnemonic',
    });
  }

  exportChoices.push({ name: `${chalk.yellow('[<]')} Cancel`, value: 'cancel' });

  const exportMethod = await select({
    message: 'Export method:',
    choices: exportChoices,
  });

  if (exportMethod === 'cancel') return;

  if (exportMethod === 'file') {
    // Save to file
    console.log('');
    showInfo('Create a password for the backup file.');
    showInfo('This can be different from your wallet password.');

    const backupPassword = await input({
      message: 'Backup password (min 8 chars):',
      validate: (v) => v.length >= 8 || 'Min 8 characters',
    });

    const result = createBackupFile(privateKey, backupPassword, wallet.name, mnemonic || undefined);

    console.log('');
    if (result.success) {
      showSuccess('Backup created!');
      console.log(`  ${chalk.gray('File:')} ${chalk.cyan(result.filePath)}`);
      console.log('');
      showWarning('Keep this file and password safe!');
      if (mnemonic) {
        showInfo('Recovery phrase is included in backup.');
      }
    } else {
      showError(result.error || 'Failed to create backup');
    }
  } else if (exportMethod === 'key') {
    // Display private key
    console.log('');
    console.log(chalk.red.bold('  ⚠ SECURITY WARNING'));
    console.log(chalk.yellow('  Your private key gives FULL access to your wallet.'));
    console.log(chalk.yellow('  Never share it with anyone.'));
    console.log('');

    const confirmShow = await confirm({
      message: 'Display private key?',
      default: false,
    });

    if (confirmShow) {
      console.log('');
      console.log(`  ${chalk.gray('Address:')}     ${chalk.cyan(wallet.address)}`);
      console.log(`  ${chalk.gray('Private Key:')} ${chalk.yellow(privateKey)}`);
      console.log('');
      showWarning('Clear your terminal after copying!');
    }
  } else if (exportMethod === 'mnemonic' && mnemonic) {
    // Display mnemonic
    console.log('');
    console.log(chalk.red.bold('  ⚠ SECURITY WARNING'));
    console.log(chalk.yellow('  Your recovery phrase gives FULL access to your wallet.'));
    console.log(chalk.yellow('  Anyone with this phrase can steal your funds!'));
    console.log('');

    const confirmShow = await confirm({
      message: 'Display recovery phrase?',
      default: false,
    });

    if (confirmShow) {
      console.log('');
      console.log(chalk.red.bold('  ═══════════════════════════════════════════════════════'));
      console.log(chalk.red.bold('  ⚠ RECOVERY PHRASE ⚠'));
      console.log(chalk.red.bold('  ═══════════════════════════════════════════════════════'));
      console.log('');

      const words = mnemonic.split(' ');
      for (let i = 0; i < words.length; i += 4) {
        const row = words
          .slice(i, i + 4)
          .map((w, j) => {
            const num = String(i + j + 1).padStart(2, ' ');
            return `${chalk.gray(`${num}.`)} ${chalk.yellow(w.padEnd(10))}`;
          })
          .join('  ');
        console.log(`  ${row}`);
      }

      console.log('');
      console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(wallet.address)}`);
      console.log('');
      showInfo('Compatible with: MetaMask, Ledger, Trezor, etc.');
      showWarning('Clear your terminal after copying!');
    }
  }

  await pressEnter();
}

// ============================================================================
// Manage Wallets (Rename, Delete)
// ============================================================================

async function manageWalletsMenu(): Promise<void> {
  const wallets = getAllWallets();

  if (wallets.length === 0) {
    showHeader('MANAGE WALLETS');
    console.log('');
    showWarning('No wallets to manage.');
    await pressEnter();
    return;
  }

  showHeader('MANAGE WALLETS');
  displayWalletList(wallets);

  const action = await select({
    message: 'Action:',
    choices: [
      { name: `${chalk.cyan('[1]')} Rename wallet`, value: 'rename' },
      { name: `${chalk.red('[2]')} Delete wallet`, value: 'delete' },
      { name: `${chalk.yellow('[<]')} Back`, value: 'back' },
    ],
  });

  if (action === 'back') return;

  // Select wallet
  const choices = wallets.map((w, i) => ({
    name: `${chalk.cyan(`[${i + 1}]`)} ${w.name} ${chalk.gray(`(${formatAddress(w.address)})`)}`,
    value: w.address,
  }));
  choices.push({ name: `${chalk.yellow('[<]')} Cancel`, value: 'cancel' });

  const selected = await select({
    message: action === 'rename' ? 'Rename wallet:' : 'Delete wallet:',
    choices,
  });

  if (selected === 'cancel') return;

  const wallet = wallets.find((w) => w.address === selected);
  if (!wallet) return;

  if (action === 'rename') {
    const newName = await input({
      message: 'New name:',
      default: wallet.name,
      validate: (v) => v.trim().length > 0 || 'Required',
    });

    const result = updateWalletName(selected, newName);

    console.log('');
    if (result.success) {
      showSuccess(`Renamed to "${newName}"`);
    } else {
      showError(result.error || 'Failed to rename');
    }
  } else {
    // Delete
    console.log('');
    console.log(chalk.red.bold('  ⚠ WARNING'));
    console.log(chalk.yellow(`  You are about to delete "${wallet.name}"`));
    console.log(chalk.yellow(`  Address: ${wallet.address}`));
    if (wallet.isActive) {
      console.log(chalk.red('  This is your ACTIVE wallet!'));
    }
    if (wallet.encryptedMnemonic) {
      console.log(chalk.red('  This wallet has a recovery phrase - make sure you have a backup!'));
    }
    console.log('');

    const confirmDelete = await confirm({
      message: 'Delete this wallet?',
      default: false,
    });

    if (confirmDelete) {
      const wasActive = wallet.isActive;
      const result = removeWalletFromStore(selected);

      console.log('');
      if (result.success) {
        showSuccess('Wallet deleted');
        if (wasActive && result.address) {
          showWarning(`New active wallet: ${formatAddress(result.address)}`);
          showWarning('Switch wallet to update .env file.');
        }
      } else {
        showError(result.error || 'Failed to delete');
      }
    } else {
      showInfo('Cancelled');
    }
  }

  await pressEnter();
}

// ============================================================================
// Migrate Current .env Wallet
// ============================================================================

async function migrateCurrentWallet(): Promise<void> {
  const currentWallet = getCurrentWallet();

  if (!currentWallet) {
    showHeader('ADD CURRENT WALLET');
    console.log('');
    showWarning('No wallet in .env');
    await pressEnter();
    return;
  }

  showHeader('ADD CURRENT WALLET');
  console.log('');
  showInfo('Add your current .env wallet to the secure wallet store.');
  console.log(`  ${chalk.gray('Address:')} ${chalk.cyan(currentWallet.address)}`);
  showWarning('Note: This wallet will not have a recovery phrase.');
  console.log('');

  const name = await input({
    message: 'Wallet name:',
    default: 'Main Wallet',
  });

  console.log('');
  showInfo('Create a password to encrypt this wallet.');

  const password = await input({
    message: 'Password (min 8 chars):',
    validate: (v) => v.length >= 8 || 'Min 8 characters',
  });

  const result = migrateEnvWalletToStore(password, name);

  console.log('');
  if (result.success) {
    showSuccess(`Wallet "${name}" added to secure store!`);
    showInfo(`Location: ${getWalletDir()}`);
  } else {
    showError(result.error || 'Failed to add wallet');
  }

  await pressEnter();
}

// ============================================================================
// Export for CLI
// ============================================================================

export { showWalletMenu as handleWalletManagement };
