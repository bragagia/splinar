import { Message, ServerClient } from "postmark";

export function newPostmarkClient() {
  return new ServerClient(process.env.POSTMARK_API_TOKEN!);
}

export async function postmarkSendMail(mail: Message) {
  const postmarkClient = newPostmarkClient();

  const mailres = await postmarkClient.sendEmail(mail);

  if (mailres.ErrorCode) {
    console.error("Error sending email: " + mailres.Message);
    throw new Error("Error sending email: " + mailres.Message);
  }
}
