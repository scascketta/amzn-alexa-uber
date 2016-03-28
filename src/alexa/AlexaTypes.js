// @flow

export type Event = {
  version: string;
  session: Session;
  request: LaunchRequest | IntentRequest | SessionEndedRequest;
}

export type Session = {
  new: bool;
  sessionId: string;
  attributes: {[key:string]: Object};
  application: Object;
  user: User;
}

type User = {
  userId: string;
  accessToken: string;
}

type RequestType =
  "LaunchRequest"
  | "IntentRequest"
  | "SessionEndedRequest"
  | "SessionStartedRequest";

export type Request = {
  type: RequestType;
  requestId: string;
  timestamp: string;
}

export type LaunchRequest = { } & Request;

export type IntentRequest = {
  intent: Intent;
} & Request;

export type Intent = {
  name: string;
  slots: {[name:string]: Slot};
};

export type Slot = {
  name: string;
  value: string;
};

export type SessionEndedRequest = {
  reason: string;
} & Request;

export type SessionStartedRequest = { } & Request;

export type OutputSpeech = {
  type: OutputSpeechType;
  text?: string;
  ssml?: string;
};

export type OutputSpeechType = "PlainText" | "SSML";

export type Card = {
  type: CardType;
  title: string;
  content: string;
};

type CardType = "Simple" | "LinkAccount";

export type Reprompt = {
  outputSpeech: OutputSpeech;
};

export type ResponseBody = {
  outputSpeech: OutputSpeech;
  card?: Card;
  reprompt?: Reprompt;
  shouldEndSession: bool;
};

export type ResponseT = {
  version: string;
  sessionAttributes: ?{[key:string]: Object};
  response: ResponseBody;
};

export type Context = {
  functionName: string;
  functionVersion: string;
  memoryLimitInMB: number;
  logGroupName: string;
  logStreamName: string;
  identity: Object;
  invokedFunctionArn: string;
  awsRequestId: string;
  // not null when lambda func is invoked by aws mobile sdk
  clientContext: any;

  succeed(result?: ?Object): void;
  fail(error?: ?Error): void;
  done(error?: Error, result?: Object): void;
  getRemainingTimeInMillis(): number;
}
