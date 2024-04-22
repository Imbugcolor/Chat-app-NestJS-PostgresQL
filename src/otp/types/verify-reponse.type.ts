type TwilioVerificationCheckResult = {
  sid: string;
  serviceSid: string;
  accountSid: string;
  to: string;
  channel: string;
  status: string;
  valid: boolean;
  amount: any | null;
  payee: any | null;
  dateCreated: Date;
  dateUpdated: Date;
};

export type VerificationCheckResponse = TwilioVerificationCheckResult;
