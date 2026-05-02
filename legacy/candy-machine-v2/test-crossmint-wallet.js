/**
 * Test Crossmint Wallet Creation
 * 
 * Quick test to verify your API key works and wallets can be created for emails.
 * 
 * Usage:
 *   node test-crossmint-wallet.js <email>
 * 
 * Example:
 *   node test-crossmint-wallet.js test@example.com
 */

const CROSSMINT_API_KEY = 'sk_staging_AAJ2cjQHFU28SbLrRaZ9eRMtrGmHD7bEphWpgW8QcEKnsinTFEqGzyMeNM86GMz1XnF5Yc873yyNuANqvoag7BrWEC6MeJDojVQWsQXaPTN8F6nTNGkmSuknVNAqHvWb5cxDp9c1G4XxrvoHr93hy49TC7iiaoWHrBKrSB6Gmr9eZyz5wuvo2V858KYDWakPbrLUFXudW8brsPpDyP1iitkM';
const CROSSMINT_BASE_URL = 'https://staging.crossmint.com/api/v1-alpha2';

async function testWalletCreation(email) {
  console.log('='.repeat(50));
  console.log('CROSSMINT WALLET CREATION TEST');
  console.log('='.repeat(50));
  console.log(`\nEnvironment: STAGING (devnet)`);
  console.log(`Email: ${email}\n`);

  try {
    console.log('📧 Creating/retrieving wallet for email...\n');

    const response = await fetch(`${CROSSMINT_BASE_URL}/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': CROSSMINT_API_KEY
      },
      body: JSON.stringify({
        type: 'solana-custodial-wallet',
        linkedUser: `email:${email}`
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.log('\n❌ API Error:');
      console.log(responseText);
      return;
    }

    const data = JSON.parse(responseText);
    
    console.log('\n✅ SUCCESS! Wallet created/retrieved:\n');
    console.log('Full Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.publicKey) {
      console.log('\n' + '='.repeat(50));
      console.log('WALLET DETAILS');
      console.log('='.repeat(50));
      console.log(`\n   Solana Address: ${data.publicKey}`);
      console.log(`   Linked Email: ${email}`);
      console.log(`\n   View on Explorer (devnet):`);
      console.log(`   https://explorer.solana.com/address/${data.publicKey}?cluster=devnet`);
    }

  } catch (error) {
    console.log('\n❌ Request failed:');
    console.log(error.message);
  }
}

// CLI
const email = process.argv[2];

if (!email) {
  console.log(`
Usage: node test-crossmint-wallet.js <email>

Example:
  node test-crossmint-wallet.js myemail@gmail.com
`);
  process.exit(1);
}

if (!email.includes('@')) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

testWalletCreation(email);
