require("dotenv").config();
const { ethers } = require("ethers");

const wallet = ethers.Wallet.createRandom();

console.log("New wallet generated:");
console.log("Address:     ", wallet.address);
console.log("Private Key: ", wallet.privateKey);
console.log("Mnemonic:    ", wallet.mnemonic.phrase);
console.log("");
console.log("Add to your .env:");
console.log(`BOT_WALLET_ADDRESS=${wallet.address}`);
console.log(`BOT_WALLET_PRIVATE_KEY=${wallet.privateKey}`);
console.log("");
console.log("IMPORTANT: Save the mnemonic somewhere safe. Never commit the private key.");
