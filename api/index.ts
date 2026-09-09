import app, { handler as serverHandler } from "../server.ts";

export const handler = serverHandler || ((req: any, res: any) => app(req, res));
export { app };
export default handler;
