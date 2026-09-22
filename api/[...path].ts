import app, { handler as serverHandler } from "../server.js";

export const handler = serverHandler || ((req: any, res: any) => app(req, res));
export { app };
export default handler;
