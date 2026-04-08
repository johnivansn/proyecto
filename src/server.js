const app = require('./app');

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(port, () => {
  console.warn(`API listening on port ${port}`);
});
