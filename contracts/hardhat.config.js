require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    "base-sepolia": {
      url: process.env.BASE_RPC_URL || "https://sepolia.base.org",
      accounts: [process.env.BOT_WALLET_PRIVATE_KEY],
    },
    "base-mainnet": {
      url: "https://mainnet.base.org",
      accounts: [process.env.BOT_WALLET_PRIVATE_KEY],
    },
  },
};
