import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(pushRouter);

export default router;
