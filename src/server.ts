import app from './app';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un puerto válido');
}
app.listen(port, () => console.info(`Servidor disponible en puerto ${port}`));
