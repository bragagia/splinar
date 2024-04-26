import { postmarkSendMail } from "@/lib/postmark";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "send-mail",
    retries: 8,
  },
  { event: "send-mail.start" },
  async ({ event, step, logger }) => {
    logger.info("# SendMail");

    await postmarkSendMail(event.data);

    logger.info("# SendMail - END");
  }
);
