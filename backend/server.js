const app = require("./src/app");
const env = require("./src/config/env");
const seedAdmin = require("./src/startup/seedAdmin");

async function start() {
  await seedAdmin();

  app.listen(env.port, () => {
    console.log(
      `BikeStore API ejecutándose en http://localhost:${env.port}`,
    );
  });
}

start().catch((error) => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
});
