const app = require("./src/app");
const env = require("./src/config/env");
const seedAdmin = require("./src/startup/seedAdmin");

async function start() {
  await seedAdmin();

  app.listen(env.port, () => {
    console.log(
      `Laboratorio API CRUD ejecutándose en http://localhost:${env.port}`,
    );
  });
}

start();
