const app = require('./app');

const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(`Backend đang chạy tại http://localhost:${port}`);
});
