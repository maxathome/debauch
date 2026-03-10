module.exports = {
  apps: [
    {
      name: "debauch-slack",
      cwd: "./slack",
      script: "src/index.js",
      watch: false,
      env: { NODE_ENV: "production" },
      out_file: "../logs/slack.log",
      error_file: "../logs/slack.error.log",
      time: true,
    },
    {
      name: "debauch-bot",
      cwd: "./bot",
      script: "src/index.js",
      watch: false,
      env: { NODE_ENV: "production" },
      out_file: "../logs/bot.log",
      error_file: "../logs/bot.error.log",
      time: true,
    },
  ],
};
